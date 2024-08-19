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
    beta_variance: f64,
    tau_variance: f64,
    rng: &mut impl Rng,
) -> Result<f64, Box<dyn Error>> {
    let true_distance = (true_position - n2.true_position).norm();

    let beta_dist = Normal::new(1.0, beta_variance.sqrt())?;

    let beta_1 = beta_dist.sample(rng).clamp(0.0, 1.0) * true_beta;
    let beta_2 = beta_dist.sample(rng).clamp(0.0, 1.0) * n2.true_beta;

    let tau_1 = {
        let tau_dist = LogNormal::new(true_tau.ln(), tau_variance.sqrt().ln())?;
        tau_dist.sample(rng)
    };

    let tau_2 = {
        let tau_dist = LogNormal::new(n2.true_tau.ln(), tau_variance.sqrt().ln())?;
        tau_dist.sample(rng)
    };

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

// Simulate a bunch of real world measurements between node at one index and other nodes.
pub fn generate_measurements(
    true_position: ECEF<f64>,
    true_beta: f64,
    true_tau: f64,
    my_node_index: Option<usize>,
    nodes: &[Node],
    n_measurements: usize,
    message_distance_max: f64,
    beta_variance: f64,
    tau_variance: f64,
) -> Result<(Vec<usize>, OVector<f64, OS>), Box<dyn Error>> {
    let mut rng = rand::thread_rng();

    let mut their_indices = Vec::with_capacity(n_measurements);
    let mut times = Vec::with_capacity(n_measurements);

    while their_indices.len() < n_measurements {
        let their_node_index = (0..nodes.len())
            .filter(|&i| Some(i) != my_node_index)
            .collect::<Vec<_>>()
            .choose(&mut rng)
            .copied()
            .unwrap();

        let distance = true_position.distance(&nodes[their_node_index].true_position);

        if distance <= message_distance_max {
            their_indices.push(their_node_index);

            // let beta = beta_dist.sample(&mut rng);
            // let tau = tau_dist.sample(&mut rng);
            // let time = distance / C * beta + tau;
            // times.push(time);
            times.push(simulate_ping_pong_tof(
                true_position,
                true_beta,
                true_tau,
                &nodes[their_node_index],
                beta_variance,
                tau_variance,
                &mut rng,
            )?)
        }
    }

    Ok((their_indices, OVector::<f64, OS>::from_vec(times)))
}
