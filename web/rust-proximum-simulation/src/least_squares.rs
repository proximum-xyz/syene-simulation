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

use log::info;
use nalgebra::{Const, Matrix3, OMatrix, OVector, Vector3};
use nav_types::{ECEF, WGS84};
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

    if their_indices.len() < 4 {
        return Err("At least four nodes are required for 3D positioning.".into());
    }

    for _ in 0..ls_iterations {
        let mut a_matrix = OMatrix::<f64, Const<9>, Const<3>>::zeros();
        let mut b_vector = OVector::<f64, Const<9>>::zeros();

        let reference_node = &nodes[their_indices[0]];
        let reference_distance = C * ls_model_beta * (times[0] - 2.0 * ls_model_tau);
        let reference_distance_sq = reference_distance.powi(2);

        for (i, &index) in their_indices.iter().enumerate().skip(1) {
            let node = &nodes[index];
            let diff_vec = OVector::<f64, Const<3>>::new(
                node.ls_estimated_position.x() - reference_node.ls_estimated_position.x(),
                node.ls_estimated_position.y() - reference_node.ls_estimated_position.y(),
                node.ls_estimated_position.z() - reference_node.ls_estimated_position.z(),
            );

            let distance = C * ls_model_beta * (times[i] - 2.0 * ls_model_tau);
            let d_i_sq = distance.powi(2);
            let d = d_i_sq - reference_distance_sq;

            a_matrix.set_row(i - 1, &(-2.0 * diff_vec.transpose()));
            b_vector[i - 1] = d;
        }

        // Solve Ax = b using pseudoinverse
        let a_transpose = a_matrix.transpose();
        let pseudo_inverse = (a_transpose * a_matrix)
            .try_inverse()
            .ok_or("Failed to compute pseudoinverse")?;
        let delta_estimate: OVector<f64, Const<3>> = pseudo_inverse * a_transpose * b_vector;

        estimate = ECEF::new(
            estimate.x() + delta_estimate[0],
            estimate.y() + delta_estimate[1],
            estimate.z() + delta_estimate[2],
        );

        if delta_estimate.norm() < ls_tolerance {
            break;
        }
    }

    // Ok(estimate)

    let wgs84_estimate: WGS84<f64> = estimate.into();

    let clamped_estimate: ECEF<f64> = WGS84::from_radians_and_meters(
        wgs84_estimate.latitude_radians(),
        wgs84_estimate.longitude_radians(),
        0.0,
    )
    .into();

    Ok(clamped_estimate)
}
