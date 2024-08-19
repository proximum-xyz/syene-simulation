use crate::types::{Node, PositionType, Stats};
use log::trace;

impl Stats {
    pub fn new() -> Self {
        Stats {
            kf_estimation_rms_error: Vec::new(),
            ls_estimation_rms_error: Vec::new(),
            assertion_rms_error: Vec::new(),
        }
    }
}

fn calculate_rms_error(nodes: &[Node], position_type: PositionType) -> f64 {
    let mut squared_diff_sum = 0.0;

    for node in nodes {
        let diff = match position_type {
            PositionType::KfEstimated => node.true_position - node.kf_estimated_position,
            PositionType::LsEstimated => node.true_position - node.ls_estimated_position,
            PositionType::Asserted => node.true_position - node.asserted_position,
        };
        let squared_diff = diff.norm().powi(2);
        squared_diff_sum += squared_diff;

        if position_type == PositionType::KfEstimated {
            trace!(
              "node true position: {:#?}, asserted pos: {:#?}, est position: {:#?}, squared diff: {}",
              node.true_position,node.asserted_position, node.kf_estimated_position, squared_diff
          );
        }

        if position_type == PositionType::LsEstimated {
            trace!(
            "node true position: {:#?}, asserted pos: {:#?}, est position: {:#?}, squared diff: {}",
            node.true_position,node.asserted_position, node.ls_estimated_position, squared_diff
        );
        }
    }

    let rms_error = squared_diff_sum / nodes.len() as f64;
    let rms_error = rms_error.sqrt();

    rms_error
}

pub fn log_stats(stats: &mut Stats, nodes: &Vec<Node>) {
    stats
        .kf_estimation_rms_error
        .push(calculate_rms_error(&nodes, PositionType::KfEstimated));

    // Push the initial stats
    stats
        .ls_estimation_rms_error
        .push(calculate_rms_error(&nodes, PositionType::LsEstimated));

    stats
        .assertion_rms_error
        .push(calculate_rms_error(&nodes, PositionType::Asserted));
}
