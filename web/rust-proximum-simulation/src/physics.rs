use crate::kalman::N_MEASUREMENTS;
use crate::types::SimulationConfig;
use crate::{kalman::OS, types::Node};
use log::trace;
use nalgebra::OVector;
use nav_types::ECEF;
use rand::prelude::*;
use rand_distr::LogNormal;
use rand_distr::Normal;
use std::error::Error;

pub const C: f64 = 299_792_458.0; // speed of light in m/s

pub fn simulate_ping_pong_tof(
    // n1: &Node,
    true_position: ECEF<f64>,
    true_beta: f64,
    true_tau: f64,
    n2: &Node,
    config: &SimulationConfig,
    rng: &mut impl Rng,
) -> Result<f64, Box<dyn Error>> {
    let true_distance = (true_position - n2.true_position).norm();

    let beta_1 = Normal::new(true_beta, config.beta_variance.sqrt())?
        .sample(rng)
        .clamp(config.beta_min, config.beta_max);

    let beta_2 = Normal::new(n2.true_beta, config.beta_variance.sqrt())?
        .sample(rng)
        .clamp(config.beta_min, config.beta_max);

    let tau_1 = LogNormal::new(true_tau.ln(), config.tau_variance.sqrt().ln())?
        .sample(rng)
        .clamp(config.tau_min, config.tau_max);

    let tau_2 = LogNormal::new(n2.true_tau.ln(), config.tau_variance.sqrt().ln())?
        .sample(rng)
        .clamp(config.tau_min, config.tau_max);

    let ping_time = true_distance / (C * beta_1) + tau_1;
    let pong_time = true_distance / (C * beta_2) + tau_2;
    let total_time = ping_time + pong_time;

    trace!(
      "beta_1: {:.6}, tau_1: {:.9}, ping_time: {:.9}, beta_2: {:.6}, tau_2: {:.9}, pong_time: {:.9}",
      beta_1,
      tau_1,
      ping_time,
      beta_2,
      tau_2,
      pong_time
  );

    trace!(
        "true distance: {:.3}, measured time: {:.9}",
        true_distance,
        total_time,
    );

    Ok(total_time)
}

pub fn generate_measurements(
    true_position: ECEF<f64>,
    true_beta: f64,
    true_tau: f64,
    my_node_index: Option<usize>,
    nodes: &[Node],
    config: &SimulationConfig,
) -> Result<(Vec<usize>, OVector<f64, OS>), Box<dyn Error>> {
    let mut rng = rand::thread_rng();

    // Filter nodes within range and exclude the current node
    let eligible_nodes: Vec<(usize, &Node)> = nodes
        .iter()
        .enumerate()
        .filter(|&(i, node)| {
            Some(i) != my_node_index
                && true_position.distance(&node.true_position) <= config.message_distance_max
        })
        .collect();

    if eligible_nodes.len() < N_MEASUREMENTS {
        return Err(format!(
            "Not enough eligible nodes. Found {} but need {}",
            eligible_nodes.len(),
            N_MEASUREMENTS
        )
        .into());
    }

    // Randomly select N_MEASUREMENTS unique nodes
    let selected_nodes = eligible_nodes
        .choose_multiple(&mut rng, N_MEASUREMENTS)
        .collect::<Vec<_>>();

    let their_indices: Vec<usize> = selected_nodes.iter().map(|&(i, _)| *i).collect();
    let mut times = Vec::with_capacity(N_MEASUREMENTS);

    for &(i, node) in &selected_nodes {
        assert!(my_node_index != Some(*i));
        times.push(simulate_ping_pong_tof(
            true_position,
            true_beta,
            true_tau,
            node,
            config,
            &mut rng,
        )?);
    }

    Ok((their_indices, OVector::<f64, OS>::from_vec(times)))
}
