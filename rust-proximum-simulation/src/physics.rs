use crate::{kalman::OS, types::Node};
use log::{info, trace};
use nalgebra::OVector;
use rand::prelude::*;

// const C: f64 = 299_792_458.0; // speed of light in m/s

// simulate a two-way time of flight measurement to another node
// the measurement has a basic constant model for signal speed and node latency
// but the actual time of flight depends on the variable signal speed and latency of the nodes
pub fn simulate_distance_measurement(
    n1: &Node,
    n2: &Node,
    _model_signal_speed_fraction: f64,
    _model_node_latency: f64,
) -> f64 {
    // True distance
    (n1.true_position - n2.true_position).norm() * 1.1

    // Todo: add noise

    // let true_distance = &n1.true_position.distance(&n2.true_position);

    // // the time it takes for a signal to be received by n2 (latency is in ms)
    // let t1 = true_distance / C; //  + n2.latency / 1000.0;
    //                             // the time it takes for the return signal to be received by n2
    // let t2 = true_distance / C; // + n1.latency / 1000.0;

    // let measured_distance = (C * 1.0) * (t1 + t2) / 2.0; //  - 2.0 * model_node_latency) / 2.0;

    // // we model the signal speed and node latency as constants despite real-world variation
    // // let measured_distance =
    // // (C * model_signal_speed_fraction) * (t1 + t2 - 2.0 * model_node_latency) / 2.0;

    // measured_distance
}

// Simulate a bunch of real world measurements between node pairs.
pub fn generate_measurements(
    nodes: &[Node],
    n_measurements: usize,
    model_distance_max: f64,
    model_signal_speed_fraction: f64,
    model_node_latency: f64,
) -> (Vec<(usize, usize)>, OVector<f64, OS>) {
    info!("Generating {} measurements", n_measurements);

    let mut rng = rand::thread_rng();

    let mut indices: Vec<(usize, usize)> = Vec::new();
    let mut distances: OVector<f64, OS> = OVector::<f64, OS>::zeros();

    for i in 0..n_measurements {
        // Randomly select two distinct nodes
        trace!("Generating measurement {}/{}: ", i + 1, n_measurements);
        let (pair, distance) = loop {
            let indices = (0..nodes.len()).choose_multiple(&mut rng, 2);
            if indices[0] == indices[1] {
                trace!("Message to self (node {}), retrying", indices[0]);
                continue;
            }
            let node_a = &nodes[indices[0]];
            let node_b = &nodes[indices[1]];

            if (node_a.true_position - node_b.true_position).norm() > model_distance_max {
                trace!(
                    "Nodes too far apart ({} m > max: {} m), retrying",
                    (node_a.true_position - node_b.true_position).norm(),
                    model_distance_max
                );
                // TODO: handle special case where no nodes are close enough - currently this creates an infinite loop
                continue;
            }

            let measured_distance = simulate_distance_measurement(
                &node_a,
                &node_b,
                model_signal_speed_fraction,
                model_node_latency,
            );

            break ((indices[0], indices[1]), measured_distance);
        };

        indices.push(pair);
        distances[i] = distance;
    }

    (indices, distances)
}
