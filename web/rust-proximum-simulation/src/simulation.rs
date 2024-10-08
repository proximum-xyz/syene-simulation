use crate::geometry::{normal_neighbor_index, uniform_h3_index};
extern crate nav_types;
use crate::kalman::{kf_step, NonlinearObservationModel, StationaryStateModel, STATE_FACTOR};
use crate::least_squares::ls_estimate_position_ecef;
use crate::physics::generate_measurements;
use crate::stats::log_stats;
use crate::types::{Node, Simulation, SimulationConfig, Stats};
use h3o::Resolution;
use log::{info, trace, warn};
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

            let mut node = Node::new(
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

            node.log_kf_estimated_positions();
            node.log_ls_estimated_positions();

            // info!("{:#?}", node);
            nodes.push(node);
        }

        Simulation {
            config,
            nodes,
            stats: Stats::new(),
            kf_state_model: StationaryStateModel::new(1.0, 10.0, 10.0, STATE_FACTOR),
            kf_observation_model_generator: NonlinearObservationModel::new(),
            rng: thread_rng(),
        }
    }

    pub fn run_epoch(&mut self) -> Result<bool, Box<dyn Error>> {
        // info!("Running epoch");
        let mut indices: Vec<usize> = (0..self.config.n_nodes).collect();
        indices.shuffle(&mut self.rng);

        for &i in &indices {
            match generate_measurements(
                self.nodes[i].true_position,
                self.nodes[i].true_beta,
                self.nodes[i].true_tau,
                Some(i),
                &self.nodes,
                &self.config,
            ) {
                Ok(measurements) => {
                    if false {
                        self.nodes[i].kf_state_and_covariance = kf_step(
                            i,
                            &measurements,
                            &mut self.nodes,
                            &self.kf_observation_model_generator,
                            &self.kf_state_model,
                            self.config.kf_model_tof_observation_variance,
                        );
                    }
                    self.nodes[i].log_kf_estimated_positions();

                    self.nodes[i].ls_estimated_position = ls_estimate_position_ecef(
                        self.nodes[i].ls_estimated_position,
                        self.nodes[i].asserted_position,
                        self.nodes[i].true_position,
                        &measurements,
                        &self.nodes,
                        &self.config,
                    )?;

                    self.nodes[i].log_ls_estimated_positions();
                }
                Err(e) => {
                    warn!("Skipping update for node {}: {}", i, e);
                    continue;
                }
            }
        }

        log_stats(&mut self.stats, &self.nodes);

        // info!("Finished epoch");
        Ok(true)
    }
}
