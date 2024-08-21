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

// use log::trace;
// use nalgebra::{Const, OMatrix, OVector};
// use nav_types::{ECEF, WGS84};
// use std::error::Error;

// // The first measurement is used as a reference node
// pub const N_PARAMETERS: usize = N_MEASUREMENTS - 1;

// use crate::{
//     kalman::{N_MEASUREMENTS, OS},
//     physics::C,
//     types::{Node, SimulationConfig},
// };

// pub fn ls_estimate_position_ecef(
//     initial_estimate: ECEF<f64>,
//     asserted_position: ECEF<f64>,
//     true_position: ECEF<f64>,
//     measurements: &(Vec<usize>, OVector<f64, OS>),
//     nodes: &[Node],
//     config: &SimulationConfig,
// ) -> Result<ECEF<f64>, Box<dyn Error>> {
//     let (their_indices, times) = measurements;

//     if their_indices.len() < 4 {
//         return Err("At least four nodes are required for 3D positioning.".into());
//     }

//     let mut estimate = initial_estimate;

//     for _ in 0..config.ls_iterations {
//         let mut a_matrix = OMatrix::<f64, Const<N_PARAMETERS>, Const<3>>::zeros();
//         let mut b_vector = OVector::<f64, Const<N_PARAMETERS>>::zeros();

//         let reference_node = &nodes[their_indices[0]];
//         let reference_distance =
//             (C * config.ls_model_beta * (times[0] - 2.0 * config.ls_model_tau)) / 2.0;
//         let reference_distance_sq = reference_distance.powi(2);

//         trace!("measurements: {:#?}", measurements);

//         for (i, &node_index) in their_indices.iter().enumerate().skip(1) {
//             let node = &nodes[node_index];
//             let diff_vec = OVector::<f64, Const<3>>::new(
//                 node.ls_estimated_position.x() - reference_node.ls_estimated_position.x(),
//                 node.ls_estimated_position.y() - reference_node.ls_estimated_position.y(),
//                 node.ls_estimated_position.z() - reference_node.ls_estimated_position.z(),
//             );

//             let distance = ((C * config.ls_model_beta * (times[i] - 2.0 * config.ls_model_tau))
//                 / 2.0)
//                 // distance cannot be negative
//                 .max(1.0);

//             let d_true = (true_position - node.true_position).norm();
//             trace!(
//                 "t: {:}\nd_meas: {:}\nd_real: {:}\npercentage:{:}%",
//                 times[i],
//                 distance,
//                 d_true,
//                 (distance / d_true) * 100.0
//             );
//             let d_i_sq = distance.powi(2);
//             let d = d_i_sq - reference_distance_sq;

//             a_matrix.set_row(i - 1, &(-2.0 * diff_vec.transpose()));
//             b_vector[i - 1] = d;
//         }

//         // Solve Ax = b using pseudoinverse
//         let a_transpose = a_matrix.transpose();
//         let pseudo_inverse = (a_transpose * a_matrix)
//             .try_inverse()
//             .ok_or("Failed to compute pseudoinverse")?;
//         let x: OVector<f64, Const<3>> = pseudo_inverse * a_transpose * b_vector;

//         trace!("x{:#?}", x);

//         estimate = ECEF::new(x[0], x[1], x[2]);
//     }

//     Ok(estimate)

use log::trace;
use nalgebra::{Const, OMatrix, OVector, Vector3};
use nav_types::ECEF;
use std::error::Error;

use crate::{
    kalman::{N_MEASUREMENTS, OS},
    physics::C,
    types::{Node, SimulationConfig},
};

// WGS84 Earth radius in meters
const EARTH_RADIUS: f64 = 6_371_000.0;

pub fn ls_estimate_position_ecef(
    initial_estimate: ECEF<f64>,
    asserted_position: ECEF<f64>,
    _true_position: ECEF<f64>,
    measurements: &(Vec<usize>, OVector<f64, OS>),
    nodes: &[Node],
    config: &SimulationConfig,
) -> Result<ECEF<f64>, Box<dyn Error>> {
    let (node_indices, measured_times) = measurements;
    let n = node_indices.len();

    if n < 4 {
        return Err("At least 4 measurements are required for 3D position estimation".into());
    }

    // Scale initial estimate and node positions
    let mut x = Vector3::<f64>::new(
        initial_estimate.x(),
        initial_estimate.y(),
        initial_estimate.z(),
    ) / EARTH_RADIUS;

    let scaled_nodes: Vec<OVector<f64, Const<3>>> = nodes
        .iter()
        .map(|node| {
            Vector3::<f64>::new(
                node.ls_estimated_position.x(),
                node.ls_estimated_position.y(),
                node.ls_estimated_position.z(),
            ) / EARTH_RADIUS
        })
        .collect();

    let max_iterations = 10;
    let tolerance = 1e-9;

    // Levenberg-Marquardt damping
    let mut lambda = 1.0f64;

    trace!("Initial: |x| = {}", x.norm(),);

    for iteration in 0..max_iterations {
        let mut h = OMatrix::<f64, Const<N_MEASUREMENTS>, Const<3>>::zeros();
        let mut z = OVector::<f64, OS>::zeros();

        for i in 0..n {
            let node_pos = &scaled_nodes[node_indices[i]];
            let dx = &x - node_pos;
            let r = dx.norm() * EARTH_RADIUS; // Unscale for time calculation

            // Compute the Jacobian (keep it scaled)
            h.set_row(i, &(dx.transpose() / dx.norm()));

            // Compute the residual
            let predicted_time = 2.0 * (r / (config.ls_model_beta * C) + config.ls_model_tau);
            z[i] = measured_times[i] - predicted_time;
        }

        // Scale the Jacobian to match the time units
        let scaled_h = h * (EARTH_RADIUS / (config.ls_model_beta * C));

        // Solve the normal equations with Levenberg-Marquardt damping
        let h_t = scaled_h.transpose();
        let delta_x = (h_t * &scaled_h + lambda * nalgebra::DMatrix::identity(3, 3))
            .try_inverse()
            .ok_or("Matrix inversion failed")?
            * h_t
            * z;

        // Constrain the update to keep the object near the Earth's surface
        let new_x = x + delta_x;
        let new_x_norm = new_x.norm();
        let scale_factor = if new_x_norm > 1.01 || new_x_norm < 0.99 {
            1.0 / new_x_norm
        } else {
            1.0
        };

        // Apply the constrained update
        let constrained_delta_x = (new_x * scale_factor - x) / 2.0; // Trust region: limit to half the full step
        x += constrained_delta_x;

        trace!(
            "Iteration {}: |x| = {}, |delta_x| = {}",
            iteration + 1,
            x.norm(),
            constrained_delta_x.norm()
        );

        if constrained_delta_x.norm() < tolerance {
            trace!("Converged after {} iterations", iteration + 1);
            break;
        }

        // Adjust Levenberg-Marquardt damping factor
        if constrained_delta_x.norm() < delta_x.norm() {
            lambda *= 10.0; // Increase damping if the step was reduced
        } else {
            lambda = (lambda / 10.0).max(1e-7); // Decrease damping, but not below a minimum value
        }

        trace!(
            "Iteration {}: |x| = {}, z={}, |delta_x| = {}",
            iteration + 1,
            x.norm(),
            z,
            delta_x.norm()
        );

        if delta_x.norm() < tolerance {
            trace!("Converged after {} iterations", iteration + 1);
            // Unscale before returning
            break;
        }
    }

    // spring constant back to asserted location.
    let estimate = ECEF::new(
        x[0] * EARTH_RADIUS,
        x[1] * EARTH_RADIUS,
        x[2] * EARTH_RADIUS,
    );

    let spring_direction = asserted_position - estimate;
    // let force = spring_direction.norm();

    return Ok(estimate + spring_direction / 500.0);
}
