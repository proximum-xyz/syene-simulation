use crate::geometry::{
    clamp_ecef_to_ellipsoid, ecef_to_enu, ecef_to_h3, ecef_to_lat_lng, enu_to_ecef,
    euclidean_distance, h3_to_ecef, random_h3_index,
};
use crate::kalman::{DistanceObservationModel, StationaryNode2DModel};
use crate::physics::distance_measurement;
use crate::types::{Measurement, Node, Simulation};
use adskalman::{KalmanFilterNoControl, StateAndCovariance};
use h3o::{CellIndex, Resolution};
use nalgebra::{Matrix2, Vector1, Vector2};
use rand::distributions::Uniform;
use rand::prelude::*;

// Track each node in the network
impl Node {
    fn new(
        id: usize,
        true_index: CellIndex,
        asserted_index: CellIndex,
        channel_speed: f64,
        latency: f64,
        model_state_noise_scale: f64,
        model_measurement_variance: f64,
    ) -> Self {
        let true_position = h3_to_ecef(true_index);
        let state_model = StationaryNode2DModel::new(model_state_noise_scale);
        let observation_model = DistanceObservationModel::new(model_measurement_variance);
        // let kf = KalmanFilterNoControl::new(&state_model, &observation_model);

        // Note: we assume the node position is accurate to begin
        Node {
            id,
            true_index,
            asserted_index,
            estimated_index: asserted_index,
            true_position,
            estimated_position: true_position,
            true_lat_lng: ecef_to_lat_lng(true_position),
            estimated_lat_lng: ecef_to_lat_lng(true_position),
            channel_speed,
            latency,
            // kalman filter stuff
            state_model,
            observation_model,
            // kf,
        }
    }

    // Update the estimated position of the node based on new measurements using the Kalman filter
    fn update_estimated_position(
        &mut self,
        measurements: Vec<Measurement>,
        resolution: Resolution,
    ) {
        // We assume the node's initial estimate of its position is (0, 0) in the ENU reference frame.
        let estimated_state = Vector2::new(0.0, 0.0);

        let initial_covariance = Matrix2::identity() * 0.5;

        let previous_estimate = StateAndCovariance::new(estimated_state, initial_covariance);

        for measurement in measurements.iter() {
            // TODO: filter by model_distance_max and node quality
            // Update the observation matrix based on the current positions of the two nodes
            let their_enu_position = ecef_to_enu(
                &measurement.other_node_estimated_position,
                &self.estimated_position,
            );

            self.observation_model
                .update_observation_matrix(&estimated_state, &their_enu_position);

            let kf = KalmanFilterNoControl::new(&self.state_model, &mut self.observation_model);

            let observation = Vector1::new(measurement.measured_distance);

            kf.step(&previous_estimate, &observation)
                .expect("bad kalman filter step");
        }

        // Convert back to ECEF (the origin was the prior estimated position in ECEF coordinates)
        let position_ecef = enu_to_ecef(&estimated_state, &self.estimated_position);

        // clamp back to earth's surface
        let position_ecf_clamped = clamp_ecef_to_ellipsoid(&position_ecef);

        // Record the new estimated position of the node in various coordinate systems
        self.estimated_position = position_ecf_clamped;
        self.estimated_lat_lng = ecef_to_lat_lng(position_ecf_clamped);
        self.estimated_index = ecef_to_h3(position_ecf_clamped, resolution);
    }
}

impl Simulation {
    pub fn new(
        h3_resolution: i32,
        num_nodes: usize,
        real_channel_speed_min: f64,
        real_channel_speed_max: f64,
        real_latency_min: f64,
        real_latency_max: f64,
        model_distance_max: f64,
        model_state_noise_scale: f64,
        model_measurement_variance: f64,
        model_signal_speed_fraction: f64,
        model_node_latency: f64,
        n_epochs: usize,
        n_measurements: usize,
    ) -> Self {
        let mut nodes: Vec<Node> = Vec::new();

        for _ in 0..num_nodes {
            let resolution = Resolution::try_from(h3_resolution).expect("invalid H3 resolution");
            let cell_index = random_h3_index(resolution);

            let node = Node::new(
                nodes.len(),
                cell_index,
                cell_index,
                draw_from_range(real_channel_speed_min, real_channel_speed_max),
                draw_from_range(real_latency_min, real_latency_max),
                model_state_noise_scale,
                model_measurement_variance,
            );
            nodes.push(node);
        }

        Simulation {
            nodes: Vec::new(),
            h3_resolution,
            num_nodes,
            real_channel_speed_min,
            real_channel_speed_max,
            real_latency_min,
            real_latency_max,
            model_distance_max,
            model_state_noise_scale,
            model_measurement_variance,
            model_signal_speed_fraction,
            model_node_latency,
            n_epochs,
            n_measurements,
        }
    }

    pub fn run_simulation(&mut self) -> bool {
        let resolution = Resolution::try_from(self.h3_resolution).expect("invalid H3 resolution");

        for _ in 0..self.n_epochs {
            let mut measurements: Vec<Measurement> = Vec::new();

            for i in 0..self.n_measurements {
                if i + 1 < self.nodes.len() {
                    let node = &self.nodes[0];
                    let other_node = &self.nodes[i + 1];

                    let true_distance =
                        euclidean_distance(&node.true_position, &other_node.true_position);

                    if true_distance <= self.model_distance_max {
                        let measured_distance = distance_measurement(
                            node,
                            other_node,
                            self.model_signal_speed_fraction,
                            self.model_node_latency,
                        );
                        measurements.push(Measurement {
                            other_node_estimated_position: other_node.estimated_position,
                            measured_distance,
                        });
                    }
                }
            }

            let node = &mut self.nodes[0];
            node.update_estimated_position(measurements, resolution);
        }
        true
    }
}

fn draw_from_range(min: f64, max: f64) -> f64 {
    let distribution = Uniform::new(min, max);
    let mut rng = thread_rng();
    distribution.sample(&mut rng)
}
