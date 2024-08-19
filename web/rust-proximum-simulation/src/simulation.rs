use crate::geometry::{normal_neighbor_index, uniform_h3_index};
extern crate nav_types;
use crate::kalman::{
    kf_step, NonlinearObservationModel, StationaryStateModel, N_MEASUREMENTS, STATE_FACTOR,
};
use crate::least_squares::ls_estimate_position_ecef;
use crate::physics::generate_measurements;
use crate::stats::log_stats;
use crate::types::{Node, Simulation, SimulationConfig, Stats};
use h3o::Resolution;
use log::{info, trace};
use rand::seq::SliceRandom;
use rand::thread_rng;
use rand::Rng;
use std::error::Error;

impl Simulation {
    pub fn new(config: SimulationConfig) -> Self {
        trace!("setting up simulation");
        let mut nodes: Vec<Node> = Vec::new();
        let resolution = Resolution::try_from(config.h3_resolution).expect("invalid H3 resolution");

        for i in 0..config.n_nodes {
            info!("creating node {}", i);
            // randomly place a node somewhere on the earth's surface
            let true_index = uniform_h3_index(resolution);

            // generate a random asserted position drawn from a gaussian distribution around the real position
            let asserted_index =
                normal_neighbor_index(true_index, config.asserted_position_variance, resolution);

            let node = Node::new(
                nodes.len(),
                true_index,
                asserted_index,
                rand::thread_rng().gen_range(config.beta_min..=config.beta_max),
                rand::thread_rng().gen_range(config.tau_min..=config.tau_max),
                config.kf_model_position_variance,
                config.kf_model_beta,
                config.kf_model_beta_variance,
                config.kf_model_tau,
                config.kf_model_tau_variance,
            );
            nodes.push(node);
        }

        Simulation {
            config,
            nodes,
            stats: Stats::new(),
        }
    }

    pub fn run_simulation(&mut self) -> Result<bool, Box<dyn Error>> {
        info!("Running simulation: for {} epochs!", self.config.n_epochs);

        // Set up the initial state of the Kalman filter for each node. Note that all nodes follow the same state and observation models!
        let state_model = StationaryStateModel::new(1.0, 10.0, 10.0, STATE_FACTOR);
        let observation_model_generator = NonlinearObservationModel::new();

        let mut rng = thread_rng();

        log_stats(&mut self.stats, &self.nodes);

        for i in 0..self.config.n_epochs {
            info!("Running epoch {}!", i);
            // Shuffle the order in which nodes are updated in each epoch
            let mut indices: Vec<usize> = (0..self.config.n_nodes).collect();
            indices.shuffle(&mut rng);
            trace!("Shuffled node order: {:#?}", indices);

            // Estimate the position of nodes in this order using various techniques
            for &i in &indices {
                // The indices and times of counterparties
                let measurements = generate_measurements(
                    self.nodes[i].true_position,
                    self.nodes[i].true_beta,
                    self.nodes[i].true_tau,
                    Some(i),
                    &self.nodes,
                    N_MEASUREMENTS,
                    self.config.message_distance_max,
                    self.config.beta_variance,
                    self.config.tau_variance,
                )?;

                // estimate position using extended Kalman filter
                self.nodes[i].kf_state_and_covariance = kf_step(
                    i,
                    &measurements,
                    &mut self.nodes,
                    &observation_model_generator,
                    &state_model,
                    self.config.kf_model_tof_observation_variance,
                );
                self.nodes[i].log_kf_estimated_positions();

                // estimate position using least-squares regression
                self.nodes[i].ls_estimated_position = ls_estimate_position_ecef(
                    self.nodes[i].ls_estimated_position,
                    &measurements,
                    &self.nodes,
                    self.config.ls_model_beta,
                    self.config.ls_model_tau,
                    self.config.ls_tolerance,
                    self.config.ls_iterations,
                )?;

                self.nodes[i].log_lf_estimated_positions();
            }

            log_stats(&mut self.stats, &self.nodes);
        }
        Ok(true)
    }
}
