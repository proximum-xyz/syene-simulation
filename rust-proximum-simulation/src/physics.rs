use crate::{kalman::OS, types::Node};
use log::{info, trace};
use nalgebra::OVector;
use rand::prelude::*;
use rand::thread_rng;
use rand_distr::Distribution;
use rand_distr::{LogNormal, Normal};

pub const C: f64 = 299_792_458.0; // speed of light in m/s

pub fn simulate_ping_pong_tof(
    n1: &Node,
    n2: &Node,
    beta_variance: f64,
    tau_variance: f64,
    model_beta: f64,
    model_tau: f64,
) -> f64 {
    // simulate a two-way time of flight measurement to another node
    // the measurement has a basic constant model for signal speed and node latency
    // but the actual time of flight depends on the variable signal speed and latency of the nodes
    // * each measurement consists of a ping from node n1 to node n2 and a pong from node n2 to node n1.
    // * the distance estimation models the time it would take for a ping and pong to occur using a fixed message transmission speed (% of c) and fixed latency (s) for each node to respond.
    // * the actual time taken by the ping is determined by the message speed c * n1.channel_speed plus n1.latency
    // * the actual time taken by the pong is determined by the message speed c * n2.channel_speed plus n2.latency
    let true_distance = (n1.true_position - n2.true_position).norm();

    // Noise distributions for message speed and latency
    let mut rng = thread_rng();
    let beta_1_noise_dist = Normal::new(n1.channel_speed, beta_variance.powf(0.5))
        .expect("could not create normal distribution");
    let tau_1_noise_dist = LogNormal::new(n1.latency.ln(), tau_variance.powf(0.5).ln())
        .expect("could not create lognormal distribution");

    // ensure the speed is between 0 c and 1 c
    let mut beta_1 = beta_1_noise_dist.sample(&mut rng);
    while beta_1 <= 0.0 || beta_1 >= 1.0 {
        trace!("beta 1 out of range");
        beta_1 = beta_1_noise_dist.sample(&mut rng);
    }

    let tau_1 = tau_1_noise_dist.sample(&mut rng);

    let beta_2_noise_dist = Normal::new(n2.channel_speed, beta_variance.powf(0.5))
        .expect("could not create normal distribution");
    let tau_2_noise_dist = LogNormal::new(n2.latency.ln(), tau_variance.powf(0.5).ln())
        .expect("could not create lognormal distribution");

    let mut beta_2 = beta_2_noise_dist.sample(&mut rng);
    while beta_2 <= 0.0 || beta_2 >= 1.0 {
        trace!("beta 2 out of range");
        beta_2 = beta_2_noise_dist.sample(&mut rng);
    }

    let tau_2 = tau_2_noise_dist.sample(&mut rng);

    // Calculate the time taken for the ping
    let ping_time = true_distance / (C * beta_1) + tau_1;

    // Calculate the time taken for the pong
    let pong_time = true_distance / (C * beta_2) + tau_2;

    // Calculate the total time for the ping-pong round trip
    let total_time = ping_time + pong_time;

    // Calculate the estimated distance based on the model parameters
    let estimated_distance = (total_time / 2.0 - model_tau) * C * model_beta;

    trace!(
        "true distance: {}, estimated distance, {}, % error {}",
        true_distance,
        estimated_distance,
        (estimated_distance - true_distance) / true_distance
    );

    estimated_distance
}

// Simulate a bunch of real world measurements between node at one index and other nodes.
pub fn generate_measurements(
    my_index: usize,
    nodes: &[Node],
    n_measurements: usize,
    message_distance_max: f64,
    beta_variance: f64,
    tau_variance: f64,
    model_beta: f64,
    model_tau: f64,
) -> (Vec<usize>, OVector<f64, OS>) {
    info!("Generating {} measurements", n_measurements);

    let mut rng = rand::thread_rng();

    let mut indices: Vec<usize> = Vec::new();
    let mut times: OVector<f64, OS> = OVector::<f64, OS>::zeros();

    for i in 0..n_measurements {
        // Randomly select two distinct nodes
        trace!("Generating measurement {}/{}: ", i + 1, n_measurements);
        let node_a = &nodes[my_index];

        let mut loop_counter = 0;
        let (their_index, time_of_flight) = loop {
            loop_counter += 1;

            let their_index = (0..nodes.len()).choose(&mut rng).unwrap();
            if my_index == their_index {
                trace!("Message to self (node {}), retrying", my_index);
                continue;
            };

            let node_b = &nodes[their_index];

            if (node_a.true_position - node_b.true_position).norm() > message_distance_max {
                trace!(
                    "Nodes too far apart ({} m > max: {} m), retrying",
                    (node_a.true_position - node_b.true_position).norm(),
                    message_distance_max
                );

                if loop_counter > 1000 {
                    info!(
                      "Loop counter exceeded (too few close nodes), breaking, no measurement will be used for this update."
                  );
                    break (their_index, std::f64::NAN);
                }
                // TODO: handle special case where no nodes are close enough - currently this creates an infinite loop
                continue;
            }

            // Simulate a trustless ping-pong time of flight measurement
            let measured_tof = simulate_ping_pong_tof(
                &node_a,
                &node_b,
                beta_variance,
                tau_variance,
                model_beta,
                model_tau,
            );

            break (their_index, measured_tof);
        };

        indices.push(their_index);
        times[i] = time_of_flight;
    }

    (indices, times)
}
