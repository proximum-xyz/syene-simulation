use crate::geometry::{ecef_to_h3, h3_to_ecef, random_h3_index};
extern crate nav_types;
use crate::kalman::{
    NonlinearObservationModel, State, StationaryStateModel, N_MEASUREMENTS, N_NODES, SS,
};
use crate::physics::generate_measurements;
use crate::types::{Node, Simulation};
use adskalman::KalmanFilterNoControl;
use h3o::{CellIndex, Resolution};
use log::info;
use nalgebra::{OMatrix, U1};
use nav_types::{ECEF, WGS84};
use rand::Rng;

// Track each node in the network
impl Node {
    fn new(
        id: usize,
        true_index: CellIndex,
        asserted_index: CellIndex,
        channel_speed: f64,
        latency: f64,
    ) -> Self {
        let true_position = h3_to_ecef(true_index);

        Node {
            id,
            true_index,
            asserted_index,
            estimated_index: asserted_index,
            true_position,
            estimated_position: true_position,
            true_wgs84: WGS84::from(true_position),
            estimated_wgs84: WGS84::from(true_position),
            channel_speed,
            latency,
        }
    }

    fn update_estimated_position(&mut self, measurement: ECEF<f64>) {
        self.estimated_position = measurement;
        self.estimated_wgs84 = WGS84::from(measurement);
        self.estimated_index = ecef_to_h3(measurement, Resolution::try_from(10).unwrap());
    }
}

impl Simulation {
    pub fn new(
        h3_resolution: i32,
        real_channel_speed_min: f64,
        real_channel_speed_max: f64,
        real_latency_min: f64,
        real_latency_max: f64,
        model_distance_max: f64,
        model_state_variance: f64,
        model_measurement_variance: f64,
        model_signal_speed_fraction: f64,
        model_node_latency: f64,
        n_epochs: usize,
    ) -> Self {
        let mut nodes: Vec<Node> = Vec::new();
        let resolution = Resolution::try_from(h3_resolution).expect("invalid H3 resolution");

        for _ in 0..N_NODES {
            // TODO: assert false locations
            let cell_index = random_h3_index(resolution);

            let node = Node::new(
                nodes.len(),
                cell_index,
                cell_index,
                rand::thread_rng().gen_range(real_channel_speed_min..=real_channel_speed_max),
                rand::thread_rng().gen_range(real_latency_min..=real_latency_max),
            );
            nodes.push(node);
        }

        let initial_state_iterator = nodes.iter().flat_map(|node| {
            [
                node.true_position.x(),
                node.true_position.y(),
                node.true_position.z(),
            ]
        });

        let initial_state = OMatrix::<f64, SS, U1>::from_iterator(initial_state_iterator);

        let initial_covariance = OMatrix::<f64, SS, SS>::identity() * model_state_variance;

        // Initialize the state of the Kalman filter with the asserted positions.
        let state = State::new(initial_state, initial_covariance);
        let state_model = StationaryStateModel::new(model_state_variance);
        let observation_model_generator =
            NonlinearObservationModel::new(model_measurement_variance);

        Simulation {
            nodes,
            h3_resolution,
            real_channel_speed_min,
            real_channel_speed_max,
            real_latency_min,
            real_latency_max,
            model_distance_max,
            model_state_variance,
            model_measurement_variance,
            model_signal_speed_fraction,
            model_node_latency,
            n_epochs,
            state_model,
            observation_model_generator: observation_model_generator,
            state,
        }
    }

    // Update the estimated position of the node based on new measurements using the Kalman filter
    fn estimate_positions(&mut self) {
        let (indices, distances) = generate_measurements(
            &self.nodes,
            N_MEASUREMENTS,
            self.model_distance_max,
            self.model_signal_speed_fraction,
            self.model_node_latency,
        );

        info!(
            "Generating {} measurements: indices: {:#?}, distances: {}",
            indices.len(),
            indices,
            distances
        );

        let observation_model = self
            .observation_model_generator
            .linearize_at(&self.state.state(), indices);

        info!("built observation model");

        let kf = KalmanFilterNoControl::new(&self.state_model, &observation_model);

        info!("built kalman filter");

        self.state = kf
            .step(&self.state, &distances)
            .expect("bad kalman filter step");

        info!("finished Kalman filter step");

        self.state
            .state()
            .as_slice()
            .chunks_exact(3)
            .enumerate()
            .for_each(|(i, chunk)| {
                let position = ECEF::new(chunk[0], chunk[1], chunk[2]);
                // let clamped_position = clamp_ecef_to_ellipsoid(position);
                self.nodes[i].update_estimated_position(position);
            });

        info!("updated positions of all nodes");
    }

    pub fn run_simulation(&mut self) -> bool {
        info!("Running simulation: for {} epochs!", self.n_epochs);
        for i in 0..self.n_epochs {
            info!("Running epoch {}!", i);
            // in each epoch we generate one set of measurements and update node location estimates with these measurements
            self.estimate_positions();
        }
        true
    }
}
