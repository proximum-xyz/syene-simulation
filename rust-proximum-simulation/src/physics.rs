use crate::{kalman::OS, types::Node};
use log::{info, trace};
use nalgebra::OVector;
use rand::prelude::*;

const C: f64 = 299_792_458.0; // speed of light in m/s

pub fn simulate_distance_measurement(
    n1: &Node,
    n2: &Node,
    model_signal_speed_fraction: f64,
    model_node_latency: f64,
) -> f64 {
    // simulate a two-way time of flight measurement to another node
    // the measurement has a basic constant model for signal speed and node latency
    // but the actual time of flight depends on the variable signal speed and latency of the nodes
    // * each measurement consists of a ping from node n1 to node n2 and a pong from node n2 to node n1.
    // * the distance estimation models the time it would take for a ping and pong to occur using a fixed message transmission speed (% of c) and fixed latency (s) for each node to respond.
    // * the actual time taken by the ping is determined by the message speed c * n1.channel_speed plus n1.latency
    // * the actual time taken by the pong is determined by the message speed c * n2.channel_speed plus n2.latency
    let true_distance = (n1.true_position - n2.true_position).norm();

    // Calculate the time taken for the ping
    let ping_time = true_distance / (C * n1.channel_speed) + n1.latency;

    // Calculate the time taken for the pong
    let pong_time = true_distance / (C * n2.channel_speed) + n2.latency;

    // Calculate the total time for the ping-pong round trip
    let total_time = ping_time + pong_time;

    // Calculate the estimated distance based on the model parameters
    let estimated_distance =
        (total_time / 2.0 - model_node_latency) * C * model_signal_speed_fraction;

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
    model_distance_max: f64,
    model_signal_speed_fraction: f64,
    model_node_latency: f64,
) -> (Vec<usize>, OVector<f64, OS>) {
    info!("Generating {} measurements", n_measurements);

    let mut rng = rand::thread_rng();

    let mut indices: Vec<usize> = Vec::new();
    let mut distances: OVector<f64, OS> = OVector::<f64, OS>::zeros();

    for i in 0..n_measurements {
        // Randomly select two distinct nodes
        trace!("Generating measurement {}/{}: ", i + 1, n_measurements);
        let node_a = &nodes[my_index];

        let mut loop_counter = 0;
        let (their_index, distance) = loop {
            loop_counter += 1;

            let their_index = (0..nodes.len()).choose(&mut rng).unwrap();
            if my_index == their_index {
                trace!("Message to self (node {}), retrying", my_index);
                continue;
            };

            let node_b = &nodes[their_index];

            if (node_a.true_position - node_b.true_position).norm() > model_distance_max {
                trace!(
                    "Nodes too far apart ({} m > max: {} m), retrying",
                    (node_a.true_position - node_b.true_position).norm(),
                    model_distance_max
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

            let measured_distance = simulate_distance_measurement(
                &node_a,
                &node_b,
                model_signal_speed_fraction,
                model_node_latency,
            );

            break (their_index, measured_distance);
        };

        indices.push(their_index);
        distances[i] = distance;
    }

    (indices, distances)
}
