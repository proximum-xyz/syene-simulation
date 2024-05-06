use crate::types::{Measurement, Node};
use rand::prelude::*;

const C: f64 = 299_792_458.0; // speed of light in m/s

// simulate a two-way time of flight measurement to another node
// the measurement has a basic constant model for signal speed and node latency
// but the actual time of flight depends on the variable signal speed and latency of the nodes
pub fn simulate_distance_measurement(
    n1: &Node,
    n2: &Node,
    model_signal_speed_fraction: f64,
    model_node_latency: f64,
) -> f64 {
    // True distance
    (n1.true_position - n2.true_position).norm()

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

// Simulate a bunch of real world measurements.
pub fn generate_measurements(
    nodes: &[Node],
    n_measurements: usize,
    model_distance_max: f64,
    model_signal_speed_fraction: f64,
    model_node_latency: f64,
) -> Vec<Measurement> {
    let mut rng = rand::thread_rng();
    let mut measurements = Vec::with_capacity(n_measurements);

    for _ in 0..n_measurements {
        // Randomly select two distinct nodes
        let (index_a, index_b) = loop {
            let indices = (0..nodes.len()).choose_multiple(&mut rng, 2);
            if indices[0] != indices[1] {
                break (indices[0], indices[1]);
            }
        };

        let node_a = &nodes[index_a];
        let node_b = &nodes[index_b];

        let distance = simulate_distance_measurement(
            &node_a,
            &node_b,
            model_signal_speed_fraction,
            model_node_latency,
        );

        let measurement = Measurement {
            node_indices: (node_a.id, node_b.id),
            distance,
        };

        measurements.push(measurement);
    }

    measurements
}
