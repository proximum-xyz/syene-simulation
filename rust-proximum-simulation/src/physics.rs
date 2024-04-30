use crate::geometry::euclidean_distance;
use crate::types::Node;

const C: f64 = 299_792_458.0; // speed of light in m/s

// simulate a two-way time of flight measurement to another node
// the measurement has a basic constant model for signal speed and node latency
// but the actual time of flight depends on the variable signal speed and latency of the nodes
pub fn distance_measurement(
    n1: &Node,
    n2: &Node,
    model_signal_speed_fraction: f64,
    model_node_latency: f64,
) -> f64 {
    let true_distance = euclidean_distance(&n1.true_position, &n2.true_position);

    // the time it takes for a signal to be received by n2 (latency is in ms)
    let t1 = true_distance / n1.channel_speed + n2.latency / 1000.0;
    // the time it takes for the return signal to be received by n2
    let t2 = true_distance / n2.channel_speed + n1.latency / 1000.0;

    // we model the signal speed and node latency as constants despite real-world variation
    let measured_distance =
        (C * model_signal_speed_fraction) * (t1 + t2 - 2.0 * model_node_latency) / 2.0;

    measured_distance
}
