use std::f32::MIN;

use crate::geometry::{clamp_ecef_to_ellipsoid, ecef_to_h3, h3_to_ecef, random_h3_index};

extern crate nav_types;
use crate::kalman::{
    NonlinearObservationModel, State, StationaryStateModel, N_MEASUREMENTS, N_NODES, OS, SS,
};
use crate::physics::{generate_measurements, simulate_distance_measurement};
use crate::types::{Measurement, Node, Simulation};
use adskalman::{KalmanFilterNoControl, StateAndCovariance};
use h3o::{CellIndex, Resolution};
use log::info;
use nalgebra::{Matrix, Matrix2, OMatrix, OVector, Vector1, Vector2, Vector3, U1};
use nav_types::{ECEF, ENU, WGS84};
use rand::distributions::Uniform;
use rand::prelude::*;

const MINIMUM_DISTANCE: f64 = 1.0;

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
                draw_from_range(real_channel_speed_min, real_channel_speed_max),
                draw_from_range(real_latency_min, real_latency_max),
                model_state_variance,
                model_measurement_variance,
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
            NonlinearObservationModel::new(model_measurement_variance, MINIMUM_DISTANCE);

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
    fn estimate_positions(&mut self, measurements: Vec<Measurement>) {
        // let (indices, distances): (Vec<_>, Vec<_>) = measurements
        //     .into_iter()
        //     .map(|m| (m.node_indices, m.distance))
        //     .unzip();

        let distances =
            OVector::<f64, OS>::from_iterator(measurements.into_iter().map(|m| m.distance));

        let indices: Vec<(usize, usize)> =
            measurements.into_iter().map(|m| m.node_indices).collect();

        let observation_model = self
            .observation_model_generator
            .linearize_at(&self.state.state(), indices);

        let kf = KalmanFilterNoControl::new(&self.state_model, &observation_model);

        self.state = kf
            .step(&self.state, &distances)
            .expect("bad kalman filter step");

        self.state
            .state()
            .as_slice()
            .chunks_exact(3)
            .enumerate()
            .map(|(i, chunk)| {
                let position = ECEF::new(chunk[0], chunk[1], chunk[2]);
                let clamped_position = clamp_ecef_to_ellipsoid(position);
                self.nodes[i].update_estimated_position(position);
            });
    }

    pub fn run_simulation(&mut self) -> bool {
        info!("Running simulation: for {} epochs!", self.n_epochs);
        for i in 0..self.n_epochs {
            info!("Running epoch {}!", i);
            let mut measurements: Vec<Measurement> = generate_measurements(
                &self.nodes,
                N_MEASUREMENTS,
                self.model_distance_max,
                self.model_signal_speed_fraction,
                self.model_node_latency,
            );

            self.estimate_positions(measurements);
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
