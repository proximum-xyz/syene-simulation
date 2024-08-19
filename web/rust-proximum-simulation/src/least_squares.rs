// 1. Setup:
// 	•	Suppose you have n reference nodes with known positions (x_i, y_i) for \(i = 1, 2, \dots, n\).
// 	•	The user’s position is (x, y), which you want to estimate.
// 	•	You have distance measurements d_i from each reference node to the user, but these measurements include some noise.
// 2. Formulate the problem:
// 	•	For each reference node i, the relationship between the true distance and the estimated distance is:
// d_i = \sqrt{(x - x_i)^2 + (y - y_i)^2} + \text{noise}
// 	•	To simplify, you can square both sides to linearize the problem:
// d_i^2 = (x - x_i)^2 + (y - y_i)^2
// Expanding and rearranging this equation gives you a system of linear equations.
// 3. Set up the equations:
// 	•	Write the equations for each reference node:
// d_i^2 = x^2 - 2x_ix + x_i^2 + y^2 - 2y_iy + y_i^2
// Let D_i = d_i^2 - x_i^2 - y_i^2, then:
// D_i = -2x_ix - 2y_iy + x^2 + y^2
// 	•	Subtract the equation for the first node from all others to eliminate the (x^2 + y^2) term, which simplifies to:
// D_i - D_1 = -2(x_i - x_1)x - 2(y_i - y_1)y
// 4. Least Squares Estimation:
// 	•	With all your equations in a matrix form Ax = b, where x = [x, y]^T, solve for x using the least squares method:
// x = (A^T A)^{-1} A^T b
// 	•	This gives you the estimated position of the user.

use nalgebra::{Matrix3, OVector, Vector3};
use nav_types::ECEF;
use std::error::Error;

use crate::{kalman::OS, physics::C, types::Node};

pub fn ls_estimate_position_ecef(
    initial_estimate: ECEF<f64>,
    measurements: &(Vec<usize>, OVector<f64, OS>),
    nodes: &[Node],
    ls_model_beta: f64,
    ls_model_tau: f64,
    ls_tolerance: f64,
    ls_iterations: usize,
) -> Result<ECEF<f64>, Box<dyn Error>> {
    let (their_indices, times) = measurements;
    let mut estimate: ECEF<f64> = initial_estimate;

    if their_indices.len() < 2 {
        return Err("At least two nodes are required.".into());
    }

    // Model the distance measurement from the ping + pong process
    let distances: Vec<f64> = times
        .into_iter()
        .map(|t| ls_model_beta * C * (t - 2.0 * ls_model_tau))
        .collect();

    let reference_node = &nodes[their_indices[0]];
    let reference_distance_sq = distances[0].powi(2);

    for _ in 0..ls_iterations {
        let mut a_matrix = Matrix3::zeros();
        let mut b_vector = Vector3::zeros();

        for (i, &index) in their_indices.iter().enumerate().skip(1) {
            let diff_vec = Vector3::new(
                nodes[index].ls_estimated_position.x() - reference_node.ls_estimated_position.x(),
                nodes[index].ls_estimated_position.x() - reference_node.ls_estimated_position.y(),
                nodes[index].ls_estimated_position.x() - reference_node.ls_estimated_position.z(),
            );
            // let diff_vec = Vector3::new(diff., diff.y, diff.z);

            let d_i_sq = distances[i].powi(2);
            let d = d_i_sq - reference_distance_sq;

            a_matrix += diff_vec * diff_vec.transpose();
            b_vector += diff_vec * (d / 2.0);
        }

        // Solve Ax = b
        let delta_estimate = a_matrix
            .try_inverse()
            .ok_or_else(|| "Singular matrix encountered")?
            * b_vector;

        estimate = ECEF::<f64>::new(
            estimate.x() + delta_estimate[0],
            estimate.y() + delta_estimate[1],
            estimate.z() + delta_estimate[2],
        );

        // Check if the update is smaller than tolerance
        if delta_estimate.norm() < ls_tolerance {
            break;
        }
    }

    Ok(estimate)
}
