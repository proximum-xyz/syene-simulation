use crate::geometry::{clamp_ecef_to_ellipsoid, ecef_to_h3, h3_to_ecef, random_h3_index};

extern crate nav_types;
use crate::kalman::{DistanceObservationModel, StationaryNode2DModel};
use crate::physics::simulate_distance_measurement;
use crate::types::{Measurement, Node, Simulation};
use adskalman::{KalmanFilterNoControl, StateAndCovariance};
use h3o::{CellIndex, Resolution};
use log::info;
use nalgebra::{Matrix2, Vector1, Vector2};
use nav_types::{ENU, WGS84};
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
        model_state_variance: f64,
        model_measurement_variance: f64,
    ) -> Self {
        let true_position = h3_to_ecef(true_index);
        let state_model = StationaryNode2DModel::new(model_state_variance);
        let observation_model = DistanceObservationModel::new(model_measurement_variance);

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
        let origin = Vector2::new(0.0, 0.0);
        // We assume the node's initial estimate of its position is (0, 0) in the ENU reference frame.
        // let estimated_state = origin.clone();

        let initial_covariance = Matrix2::identity() * 0.5;

        let mut state_and_covariance = StateAndCovariance::new(origin, initial_covariance);

        info!("Updating estimated position for node {}!", self.id);
        info!("Initial estimated position: {:#?}", self.estimated_position);

        for measurement in measurements.iter() {
            // TODO: filter by model_distance_max and node quality
            // Update the observation matrix based on the current positions of the two nodes
            let their_enu_position: ENU<f64> =
                ENU::from(measurement.other_node_estimated_position - self.estimated_position);

            let their_en_position =
                Vector2::from([their_enu_position.east(), their_enu_position.north()]);

            self.observation_model
                .update_observation_matrix(&origin, &their_en_position);

            let kf = KalmanFilterNoControl::new(&self.state_model, &mut self.observation_model);

            let observation = Vector1::new(measurement.measured_distance);

            info!("Estimate before step: {:#?}", state_and_covariance);
            info!("Observation: {:#?}", observation);

            state_and_covariance = kf
                .step(&state_and_covariance, &observation)
                .expect("bad kalman filter step");
            info!("Estimated state after step: {:#?}", state_and_covariance);
        }

        // Add the estimated ENU position to the prior ECEF position.
        let new_estimated_position = self.estimated_position
            + ENU::new(
                state_and_covariance.state()[0],
                state_and_covariance.state()[1],
                0.0,
            );

        // clamp back to earth's surface
        self.estimated_position = clamp_ecef_to_ellipsoid(new_estimated_position);
        self.estimated_wgs84 = self.estimated_position.into();
        self.estimated_index = ecef_to_h3(self.estimated_position, resolution);

        info!("Final origin: {:#?}", origin);
        info!("Final estimated position: {:#?}", self.estimated_position);
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
        model_state_variance: f64,
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
                model_state_variance,
                model_measurement_variance,
            );
            nodes.push(node);
        }

        // console::log_1(&"Creating simulation!".into());

        Simulation {
            nodes,
            h3_resolution,
            n_nodes,
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
            n_measurements,
        }
    }

    pub fn run_simulation(&mut self) -> bool {
        console_error_panic_hook::set_once();
        let resolution = Resolution::try_from(self.h3_resolution).expect("invalid H3 resolution");

        info!("Running simulation!");

        info!(
            "Running simulation: {} nodes, {} epochs!",
            self.n_nodes, self.n_epochs
        );
        for i in 0..self.n_epochs {
            let mut measurements: Vec<Measurement> = Vec::new();

            info!("Running epoch {}!", i);

            for j in 0..self.n_measurements {
                info!("Running measurement {}!", j);
                if j + 1 < self.nodes.len() {
                    let node = &self.nodes[0];
                    let other_node = &self.nodes[j + 1];

                    let true_distance = &node.true_position.distance(&other_node.true_position);

                    if true_distance <= &self.model_distance_max {
                        let measured_distance = simulate_distance_measurement(
                            node,
                            other_node,
                            self.model_signal_speed_fraction,
                            self.model_node_latency,
                        );
                        measurements.push(Measurement {
                            other_node_estimated_position: other_node.estimated_position,
                            measured_distance,
                        });

                        info!(
                            "Measured distance {} (true distance {}) between nodes {} and {}!",
                            measured_distance, true_distance, node.id, other_node.id
                        );
                    } else {
                        info!(
                            "Skipped measuring distance (too far, true distance {}) between nodes {} and {}!",
                            true_distance, node.id, other_node.id
                        );
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
    if min == max {
        return min;
    } else if min > max {
        panic!("Invalid range: min {} is greater than max {}", min, max);
    }

    let distribution = Uniform::new(min, max);
    let mut rng = thread_rng();
    distribution.sample(&mut rng)
}
