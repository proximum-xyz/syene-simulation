use crate::geometry::{ecef_to_h3, h3_to_ecef, normal_neighbor_index, uniform_h3_index};
extern crate nav_types;
use crate::kalman::{NonlinearObservationModel, StationaryStateModel, N_MEASUREMENTS, SS};
use crate::physics::generate_measurements;
use crate::types::{Node, Simulation, Stats};
use adskalman::{KalmanFilterNoControl, StateAndCovariance};
use h3o::{CellIndex, Resolution};
use log::{info, trace};
use nalgebra::{Const, OMatrix, OVector};
use nav_types::{ECEF, WGS84};
use rand::seq::SliceRandom;
use rand::thread_rng;
use rand::Rng;

fn calculate_rms_error(nodes: &[Node]) -> f64 {
    let mut squared_diff_sum = 0.0;

    for node in nodes {
        let diff = node.true_position - node.estimated_position;
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
        channel_speed: f64,
        latency: f64,
        model_state_variance: f64,
    ) -> Self {
        let true_position = h3_to_ecef(true_index);
        let estimated_position = h3_to_ecef(asserted_index);

        Node {
            id,
            true_index,
            asserted_index,
            estimated_index: asserted_index,
            true_position,
            estimated_position,
            estimation_variance: OVector::<f64, SS>::zeros(),
            en_variance_semimajor_axis: OVector::<f64, Const<2>>::zeros(),
            en_variance_semiminor_axis: OVector::<f64, Const<2>>::zeros(),
            en_variance_semimajor_axis_length: 0.0,
            en_variance_semiminor_axis_length: 0.0,
            true_wgs84: WGS84::from(true_position),
            // asserted and estimated position will diverge as the simulation progresses
            estimated_wgs84: WGS84::from(estimated_position),
            asserted_wgs84: WGS84::from(estimated_position),
            channel_speed,
            latency,
            state_and_covariance: StateAndCovariance::new(
                // dummy state for now
                OVector::<f64, SS>::new(
                    estimated_position.x(),
                    estimated_position.y(),
                    estimated_position.z(),
                ),
                OMatrix::<f64, SS, SS>::identity() * model_state_variance,
            ),
        }
    }

    fn update_estimated_position(&mut self) {
        let state = self.state_and_covariance.state();

        // get the variance for ENU axes and the EN eigenvectors/values
        let covariance = self.state_and_covariance.covariance();

        let en_covariance = covariance.view((0, 0), (2, 2));
        let eigendecomposition = en_covariance.symmetric_eigen();
        let eigenvectors = eigendecomposition.eigenvectors;
        let eigenvalues = eigendecomposition.eigenvalues;

        self.en_variance_semimajor_axis_length = eigenvalues[0].sqrt();
        self.en_variance_semiminor_axis_length = eigenvalues[1].sqrt();

        self.en_variance_semimajor_axis =
            OVector::from([eigenvectors[(0, 0)], eigenvectors[(1, 0)]]);
        self.en_variance_semiminor_axis =
            OVector::from([eigenvectors[(0, 1)], eigenvectors[(1, 1)]]);

        self.estimation_variance = covariance.diagonal();

        let measurement = ECEF::new(state.x, state.y, state.z);
        self.estimated_position = measurement;
        self.estimated_wgs84 = WGS84::from(measurement);
        self.estimated_index = ecef_to_h3(measurement, Resolution::try_from(10).unwrap());
    }
}

impl Simulation {
    pub fn new(
        n_nodes: usize,
        n_epochs: usize,
        h3_resolution: i32,
        real_asserted_position_variance: f64,
        real_channel_speed_min: f64,
        real_channel_speed_max: f64,
        real_latency_min: f64,
        real_latency_max: f64,
        model_distance_max: f64,
        model_state_variance: f64,
        model_measurement_variance: f64,
        model_signal_speed_fraction: f64,
        model_node_latency: f64,
    ) -> Self {
        let mut nodes: Vec<Node> = Vec::new();
        let resolution = Resolution::try_from(h3_resolution).expect("invalid H3 resolution");

        for _ in 0..n_nodes {
            // randomly place a node somewhere on the earth's surface
            let true_index = uniform_h3_index(resolution);

            // generate a random asserted position drawn from a gaussian distribution around the real position
            let asserted_index =
                normal_neighbor_index(true_index, real_asserted_position_variance, resolution);

            let node = Node::new(
                nodes.len(),
                true_index,
                asserted_index,
                rand::thread_rng().gen_range(real_channel_speed_min..=real_channel_speed_max),
                rand::thread_rng().gen_range(real_latency_min..=real_latency_max),
                model_state_variance,
            );
            nodes.push(node);
        }

        Simulation {
            n_nodes,
            n_epochs,
            h3_resolution,
            real_asserted_position_variance,
            real_channel_speed_min,
            real_channel_speed_max,
            real_latency_min,
            real_latency_max,
            model_distance_max,
            model_state_variance,
            model_measurement_variance,
            model_signal_speed_fraction,
            model_node_latency,
            nodes,
            stats: Stats {
                estimation_rms_error: Vec::new(),
                assertion_stddev: Vec::new(),
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
        let (indices, distances) = generate_measurements(
            node_index,
            &self.nodes,
            N_MEASUREMENTS,
            self.model_distance_max,
            self.model_signal_speed_fraction,
            self.model_node_latency,
        );

        let observation_model = observation_model_generator.linearize_at(
            &self.nodes,
            node_index,
            indices,
            self.model_measurement_variance,
        );

        trace!("built observation model");

        let node = &mut self.nodes[node_index];

        let kf = KalmanFilterNoControl::new(state_model, &observation_model);

        trace!("built kalman filter");

        node.state_and_covariance = kf
            .step(&node.state_and_covariance, &distances)
            .expect("bad kalman filter step");

        // let state_and_covariance = node.state_and_covariance.state();

        trace!("finished Kalman filter step");
    }

    pub fn run_simulation(&mut self) -> bool {
        info!("Running simulation: for {} epochs!", self.n_epochs);

        // Set up the initial state of the Kalman filter for each node. Note that all nodes follow the same state and observation models!
        let state_model = StationaryStateModel::new(self.model_state_variance);
        let observation_model_generator = NonlinearObservationModel::new();

        let mut rng = thread_rng();

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
            self.stats
                .estimation_rms_error
                .push(calculate_rms_error(&self.nodes));

            // log the (constant) error in the asserted position
            self.stats
                .assertion_stddev
                .push(self.real_asserted_position_variance.sqrt());
        }

        // record new location and variance in various (redundant) reference frames for easier display
        for node in &mut self.nodes {
            node.update_estimated_position();

            trace!(
                "Node {}: true position: {:?}, estimated position: {:?}, error: {:?} meters",
                node.id,
                node.true_position,
                node.estimated_position,
                (node.true_position - node.estimated_position).norm()
            );
        }
        true
    }
}
