use crate::geometry::{clamp_ecef_to_ellipsoid, ecef_to_h3, h3_to_ecef, random_h3_index};

extern crate nav_types;
use crate::kalman::{DistanceObservationModel, StationaryNode2DModel};
use crate::physics::distance_measurement;
use crate::types::{Measurement, Node, Simulation};
use adskalman::{KalmanFilterNoControl, StateAndCovariance};
use h3o::{CellIndex, Resolution};
use nalgebra::{Matrix2, Vector1, Vector2};
use nav_types::{ECEF, ENU, WGS84};
use rand::distributions::Uniform;
use rand::prelude::*;
use web_sys::console;

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
            true_wgs84: WGS84::from(true_position),
            estimated_wgs84: WGS84::from(true_position),
            channel_speed,
            latency,
            state_model,
            observation_model,
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
            let their_enu_position: ENU<f64> =
                ENU::from(measurement.other_node_estimated_position - self.estimated_position);

            let their_en_position =
                Vector2::from([their_enu_position.east(), their_enu_position.north()]);

            self.observation_model
                .update_observation_matrix(&estimated_state, &their_en_position);

            let kf = KalmanFilterNoControl::new(&self.state_model, &mut self.observation_model);

            let observation = Vector1::new(measurement.measured_distance);

            kf.step(&previous_estimate, &observation)
                .expect("bad kalman filter step");
        }

        // Add the estimated ENU position to the prior ECEF position.
        let new_estimated_position =
            self.estimated_position + ENU::new(estimated_state[0], estimated_state[1], 0.0);

        // clamp back to earth's surface
        self.estimated_position = clamp_ecef_to_ellipsoid(new_estimated_position);
        self.estimated_wgs84 = self.estimated_position.into();
        self.estimated_index = ecef_to_h3(self.estimated_position, resolution);
    }
}

impl Simulation {
    pub fn new(
        h3_resolution: i32,
        n_nodes: usize,
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

        for _ in 0..n_nodes {
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

        console::log_1(&"Creating simulation!".into());

        Simulation {
            nodes,
            h3_resolution,
            n_nodes,
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
        console_error_panic_hook::set_once();
        let resolution = Resolution::try_from(self.h3_resolution).expect("invalid H3 resolution");

        console::log_1(&"Running simulation!".into());
        console::log_1(&self.n_nodes.into());
        console::log_1(&self.nodes.len().into());
        for _ in 0..self.n_epochs {
            let mut measurements: Vec<Measurement> = Vec::new();

            for i in 0..self.n_measurements {
                if i + 1 < self.nodes.len() {
                    let node = &self.nodes[0];
                    let other_node = &self.nodes[i + 1];

                    let true_distance = &node.true_position.distance(&other_node.true_position);
                    // euclidean_distance(&node.true_position, &other_node.true_position);

                    if true_distance <= &self.model_distance_max {
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
