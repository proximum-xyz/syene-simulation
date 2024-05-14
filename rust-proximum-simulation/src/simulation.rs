use crate::geometry::{ecef_to_h3, h3_to_ecef, normal_neighbor_index, uniform_h3_index};
extern crate nav_types;
use crate::kalman::{NonlinearObservationModel, StationaryStateModel, N_MEASUREMENTS, SS};
use crate::physics::generate_measurements;
use crate::types::{Node, Simulation, Stats};
use adskalman::{KalmanFilterNoControl, StateAndCovariance};
use h3o::{CellIndex, Resolution};
use log::{info, trace};
use nalgebra::{Const, Matrix3, OMatrix, OVector, Vector3};
use nav_types::{ECEF, WGS84};
use rand::seq::SliceRandom;
use rand::thread_rng;
use rand::Rng;

enum PositionType {
    Estimated,
    Asserted,
}

fn calculate_rms_error(nodes: &[Node], position_type: PositionType) -> f64 {
    let mut squared_diff_sum = 0.0;

    for node in nodes {
        let diff = match position_type {
            PositionType::Estimated => node.true_position - node.estimated_position,
            PositionType::Asserted => node.true_position - node.asserted_position,
        };
        let squared_diff = diff.norm().powi(2);
        squared_diff_sum += squared_diff;
    }

    let rms_error = squared_diff_sum / nodes.len() as f64;
    let rms_error = rms_error.sqrt();

    rms_error
}

// Track each node in the network
impl Node {
    fn new(
        id: usize,
        true_index: CellIndex,
        asserted_index: CellIndex,
        beta: f64,
        tau: f64,
        model_position_variance: f64,
        model_beta: f64,
        model_beta_variance: f64,
        model_tau: f64,
        model_tau_variance: f64,
    ) -> Self {
        let true_position = h3_to_ecef(true_index);
        let asserted_position = h3_to_ecef(asserted_index);

        let mut covariance = OMatrix::<f64, SS, SS>::identity() * model_position_variance;
        covariance[(3, 3)] = model_beta_variance;
        covariance[(4, 4)] = model_tau_variance;

        Node {
            id,
            true_index,
            asserted_index,
            estimated_index: asserted_index,
            true_position,
            asserted_position,
            estimated_position: asserted_position,
            en_variance_semimajor_axis: OVector::<f64, Const<2>>::zeros(),
            en_variance_semimajor_axis_length: 0.0,
            en_variance_semiminor_axis_length: 0.0,
            true_wgs84: WGS84::from(true_position),
            // asserted and estimated position will diverge as the simulation progresses
            estimated_wgs84: WGS84::from(asserted_position),
            asserted_wgs84: WGS84::from(asserted_position),
            channel_speed: beta,
            latency: tau,
            state_and_covariance: StateAndCovariance::new(
                // start with the asserted position and generic channel speed & latency parameters as a reasonable guess
                OVector::<f64, SS>::new(
                    asserted_position.x(),
                    asserted_position.y(),
                    asserted_position.z(),
                    model_beta,
                    model_tau,
                ),
                covariance,
            ),
        }
    }

    fn update_estimated_position(&mut self) {
        let state = self.state_and_covariance.state();

        // update positions in various reference frames
        let estimated_position = ECEF::new(state.x, state.y, state.z);
        self.estimated_position = estimated_position;
        self.estimated_wgs84 = WGS84::from(estimated_position);
        self.estimated_index = ecef_to_h3(estimated_position, Resolution::try_from(10).unwrap());

        // get the variance in ECEF coordinates and project eigenvectors/values onto EN coordinates to plot confidence ellipse.
        let covariance = self.state_and_covariance.covariance();
        let ecef_covariance = covariance.view((0, 0), (3, 3));
        let eigendecomposition = ecef_covariance.symmetric_eigen();
        let eigenvectors = eigendecomposition.eigenvectors;
        let eigenvalues = eigendecomposition.eigenvalues;

        // TODO: sort eigenvalues, fix issue returning zeros
        // TODO: surely there is some way to do this transformation in nav_types?

        info!("Covariance: {:#?}", covariance);

        let lat = self.estimated_wgs84.latitude_radians();
        let lon = self.estimated_wgs84.longitude_radians();

        // Calculate sine and cosine of latitude and longitude
        let sin_lat = lat.sin();
        let cos_lat = lat.cos();
        let sin_lon = lon.sin();
        let cos_lon = lon.cos();

        // Construct the ENU transformation matrix
        let ecef_to_enu_matrix = Matrix3::new(
            -sin_lon,
            cos_lon,
            0.0,
            -sin_lat * cos_lon,
            -sin_lat * sin_lon,
            cos_lat,
            cos_lat * cos_lon,
            cos_lat * sin_lon,
            sin_lat,
        );

        let enu_eigenvectors = ecef_to_enu_matrix * eigenvectors;

        let en_semimajor_axis_projection =
            Vector3::new(enu_eigenvectors[(0, 0)], enu_eigenvectors[(1, 0)], 0.0);

        let en_semiminor_axis_projection =
            Vector3::new(enu_eigenvectors[(0, 1)], enu_eigenvectors[(1, 1)], 0.0);

        let en_semimajor_length_projection = (en_semimajor_axis_projection[0].powi(2)
            + en_semimajor_axis_projection[1].powi(2))
        .sqrt()
            * eigenvalues[0].sqrt();

        let en_semiminor_length_projection = (en_semiminor_axis_projection[0].powi(2)
            + en_semiminor_axis_projection[1].powi(2))
        .sqrt()
            * eigenvalues[1].sqrt();

        // Project the ENU eigenvectors onto the East-North plane
        self.en_variance_semimajor_axis =
            OVector::<f64, Const<2>>::new(enu_eigenvectors[(0, 0)], enu_eigenvectors[(1, 0)]);

        self.en_variance_semimajor_axis_length = en_semimajor_length_projection;
        self.en_variance_semiminor_axis_length = en_semiminor_length_projection;
    }
}

impl Simulation {
    pub fn new(
        n_nodes: usize,
        n_epochs: usize,
        h3_resolution: i32,
        asserted_position_variance: f64,
        beta_min: f64,
        beta_max: f64,
        beta_variance: f64,
        tau_min: f64,
        tau_max: f64,
        tau_variance: f64,
        message_distance_max: f64,
        model_position_variance: f64,
        model_beta: f64,
        model_beta_variance: f64,
        model_tau: f64,
        model_tau_variance: f64,
        model_tof_observation_variance: f64,
    ) -> Self {
        let mut nodes: Vec<Node> = Vec::new();
        let resolution = Resolution::try_from(h3_resolution).expect("invalid H3 resolution");

        for _ in 0..n_nodes {
            // randomly place a node somewhere on the earth's surface
            let true_index = uniform_h3_index(resolution);

            // generate a random asserted position drawn from a gaussian distribution around the real position
            let asserted_index =
                normal_neighbor_index(true_index, asserted_position_variance, resolution);

            let node = Node::new(
                nodes.len(),
                true_index,
                asserted_index,
                rand::thread_rng().gen_range(beta_min..=beta_max),
                rand::thread_rng().gen_range(tau_min..=tau_max),
                model_position_variance,
                model_beta,
                model_beta_variance,
                model_tau,
                model_tau_variance,
            );
            nodes.push(node);
        }

        Simulation {
            n_nodes,
            n_epochs,
            h3_resolution,
            asserted_position_variance,
            beta_min,
            beta_max,
            beta_variance,
            tau_min,
            tau_max,
            tau_variance,
            message_distance_max,
            model_position_variance,
            model_beta,
            model_beta_variance,
            model_tau,
            model_tau_variance,
            model_tof_observation_variance,
            nodes,
            stats: Stats {
                estimation_rms_error: Vec::new(),
                assertion_rms_error: Vec::new(),
            },
        }
    }

    // Update the estimated position of a specific node based on new measurements using the Kalman filter
    fn estimate_position(
        &mut self,
        node_index: usize,
        observation_model_generator: &NonlinearObservationModel,
        state_model: &StationaryStateModel<f64>,
    ) {
        let (indices, times) = generate_measurements(
            node_index,
            &self.nodes,
            N_MEASUREMENTS,
            self.message_distance_max,
            self.beta_variance,
            self.tau_variance,
            self.model_beta,
            self.model_tau,
        );

        let observation_model = observation_model_generator.linearize_at(
            &self.nodes,
            node_index,
            indices,
            self.model_tof_observation_variance,
        );

        trace!("built observation model");

        let node = &mut self.nodes[node_index];

        let kf = KalmanFilterNoControl::new(state_model, &observation_model);

        trace!("built kalman filter");

        trace!("state before: {:#?}", node.state_and_covariance);

        node.state_and_covariance = kf
            .step(&node.state_and_covariance, &times)
            .expect("bad kalman filter step");

        trace!("state after: {:#?}", node.state_and_covariance);

        trace!("finished Kalman filter step");

        // record new position in various coordinates
        node.update_estimated_position();
    }

    pub fn run_simulation(&mut self) -> bool {
        info!("Running simulation: for {} epochs!", self.n_epochs);

        // Set up the initial state of the Kalman filter for each node. Note that all nodes follow the same state and observation models!
        let state_model = StationaryStateModel::new(self.model_position_variance);
        let observation_model_generator = NonlinearObservationModel::new();

        let mut rng = thread_rng();

        // Push the initial stats
        self.stats
            .estimation_rms_error
            .push(calculate_rms_error(&self.nodes, PositionType::Estimated));

        self.stats
            .assertion_rms_error
            .push(calculate_rms_error(&self.nodes, PositionType::Asserted));

        for i in 0..self.n_epochs {
            info!("Running epoch {}!", i);
            // Shuffle the order in which nodes are updated in each epoch
            let mut indices: Vec<usize> = (0..self.n_nodes).collect();
            indices.shuffle(&mut rng);
            trace!("Shuffled node order: {:#?}", indices);

            for &i in &indices {
                self.estimate_position(i, &observation_model_generator, &state_model);
            }

            // calculate the mean squared error for this epoch
            // Push the initial stats
            self.stats
                .estimation_rms_error
                .push(calculate_rms_error(&self.nodes, PositionType::Estimated));

            self.stats
                .assertion_rms_error
                .push(calculate_rms_error(&self.nodes, PositionType::Asserted));
        }
        true
    }
}
