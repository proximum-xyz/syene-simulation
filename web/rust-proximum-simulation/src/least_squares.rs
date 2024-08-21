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
use nalgebra::{Const, OMatrix, OVector};
use nav_types::{ECEF, WGS84};
use std::error::Error;

// The first measurement is used as a reference node
pub const N_PARAMETERS: usize = N_MEASUREMENTS - 1;

use crate::{
    kalman::{N_MEASUREMENTS, OS},
    physics::C,
    types::{Node, SimulationConfig},
};
pub fn ls_estimate_position_ecef(
    initial_estimate: ECEF<f64>,
    asserted_position: ECEF<f64>,
    true_position: ECEF<f64>,
    measurements: &(Vec<usize>, OVector<f64, OS>),
    nodes: &[Node],
    config: &SimulationConfig,
) -> Result<ECEF<f64>, Box<dyn Error>> {
    let (their_indices, times) = measurements;

    if their_indices.len() < 4 {
        return Err("At least four nodes are required for 3D positioning.".into());
    }

    let mut estimate = initial_estimate;

    for _ in 0..config.ls_iterations {
        let mut a_matrix = OMatrix::<f64, Const<N_PARAMETERS>, Const<3>>::zeros();
        let mut b_vector = OVector::<f64, Const<N_PARAMETERS>>::zeros();

        let reference_node = &nodes[their_indices[0]];
        let reference_distance =
            (C * config.ls_model_beta * (times[0] - 2.0 * config.ls_model_tau)) / 2.0;
        let reference_distance_sq = reference_distance.powi(2);

        info!("measurements: {:#?}", measurements);

        for (i, &node_index) in their_indices.iter().enumerate().skip(1) {
            let node = &nodes[node_index];
            let diff_vec = OVector::<f64, Const<3>>::new(
                node.ls_estimated_position.x() - reference_node.ls_estimated_position.x(),
                node.ls_estimated_position.y() - reference_node.ls_estimated_position.y(),
                node.ls_estimated_position.z() - reference_node.ls_estimated_position.z(),
            );

            let distance = ((C * config.ls_model_beta * (times[i] - 2.0 * config.ls_model_tau))
                / 2.0)
                // distance cannot be negative
                .max(1.0);

            let d_true = (true_position - node.true_position).norm();
            info!(
                "t: {:}\nd_meas: {:}\nd_real: {:}\npercentage:{:}%",
                times[i],
                distance,
                d_true,
                (distance / d_true) * 100.0
            );
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
        let x: OVector<f64, Const<3>> = pseudo_inverse * a_transpose * b_vector;

        info!("x{:#?}", x);

        estimate = ECEF::new(x[0], x[1], x[2]);
    }

    // Ok(estimate)

    let wgs84_estimate: WGS84<f64> = estimate.into();

    let clamped_estimate: ECEF<f64> = WGS84::from_radians_and_meters(
        wgs84_estimate.latitude_radians(),
        wgs84_estimate.longitude_radians(),
        0.0,
    )
    .into();

    let init_wgs84: WGS84<f64> = initial_estimate.into();
    let true_wgs84: WGS84<f64> = true_position.into();

    let spring_displacement = (asserted_position - clamped_estimate) / 500.0;
    let adjusted_estimate = clamped_estimate + spring_displacement;

    // Ok(adjusted_estimate)

    let final_estimate = initial_estimate + (adjusted_estimate - initial_estimate) / 10.0;

    info!(
        "initial:{:#?}\nest:{:#?}\nfinal:{:#?}\nwgs84 before: {:#?}\nwgs84 after:{:#?}\nwgs84 true:{:#?}",
        initial_estimate, estimate, final_estimate, init_wgs84, wgs84_estimate, true_wgs84
    );
    Ok(final_estimate)
}
