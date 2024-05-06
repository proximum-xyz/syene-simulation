use adskalman::{ObservationModel, StateAndCovariance, TransitionModelLinearNoControl};
use nalgebra::{DimMin, OVector, Vector2, Vector3, Vector4, U1, U10, U100, U30, U6};
use typenum::U300;

use nalgebra::{allocator::Allocator, DefaultAllocator, OMatrix, RealField};

// State size is 3 * n: each node stores an [x, y, z] position in ECEF coordinates
#[cfg(n_nodes = "2")]
pub type SS = U6;
#[cfg(n_nodes = "2")]
pub const N_NODES: usize = 2;

#[cfg(n_nodes = "10")]
pub type SS = U30;
#[cfg(n_nodes = "10")]
pub const N_NODES: usize = 10;

#[cfg(n_nodes = "100")]
pub type SS = U300;
#[cfg(n_nodes = "100")]
pub const N_NODES: usize = 100;

// Observation size is the number of distance measurements
#[cfg(n_measurements = "1")]
pub type OS = U1;
#[cfg(n_measurements = "1")]
pub const N_MEASUREMENTS: usize = 1;

#[cfg(n_measurements = "10")]
pub type OS = U10;
#[cfg(n_measurements = "10")]
pub const N_MEASUREMENTS: usize = 10;

#[cfg(n_measurements = "100")]
pub type OS = U100;
#[cfg(n_measurements = "100")]
pub const N_MEASUREMENTS: usize = 100;

// We use the same precision for all numbers
type Precision = f64;

pub type State = StateAndCovariance<f64, SS>;

// State update model (nothing moves)
pub struct StationaryStateModel<R>
where
    R: RealField,
    DefaultAllocator: Allocator<R, SS, SS>,
    DefaultAllocator: Allocator<R, SS>,
{
    pub transition_model: OMatrix<R, SS, SS>,
    pub transition_model_transpose: OMatrix<R, SS, SS>,
    pub transition_noise_covariance: OMatrix<R, SS, SS>,
}

impl<R> StationaryStateModel<R>
where
    R: RealField + Copy,
{
    pub fn new(noise_scale: R) -> Self {
        // Transition model is the identity matrix - the node does not move.
        let transition_model = OMatrix::<R, SS, SS>::identity();

        let transition_noise_covariance = OMatrix::<R, SS, SS>::identity() * noise_scale;

        Self {
            transition_model,
            transition_model_transpose: transition_model.transpose(),
            transition_noise_covariance,
        }
    }
}

impl<R> TransitionModelLinearNoControl<R, SS> for StationaryStateModel<R>
where
    R: RealField,
    DefaultAllocator: Allocator<R, SS, SS>,
    DefaultAllocator: Allocator<R, SS>,
{
    fn F(&self) -> &OMatrix<R, SS, SS> {
        &self.transition_model
    }

    fn FT(&self) -> &OMatrix<R, SS, SS> {
        &self.transition_model_transpose
    }

    fn Q(&self) -> &OMatrix<R, SS, SS> {
        &self.transition_noise_covariance
    }
}

// // Observation model
// pub struct DistanceObservationModel<R: RealField>
// where
//     DefaultAllocator: Allocator<R, U2, U2>,
//     DefaultAllocator: Allocator<R, U1, U2>,
//     DefaultAllocator: Allocator<R, U2, U1>,
//     DefaultAllocator: Allocator<R, U1, U1>,
//     DefaultAllocator: Allocator<R, U2>,
// {
//     pub observation_matrix: OMatrix<R, U1, U2>,
//     pub observation_matrix_transpose: OMatrix<R, U2, U1>,
//     pub observation_noise_covariance: OMatrix<R, U1, U1>,
// }

// impl<R: RealField + Copy> DistanceObservationModel<R> {
//     pub fn new(var: R) -> Self {
//         let one = convert(1.0);

//         // Create observation model. We observe the distance between nodes.
//         let observation_matrix = OMatrix::<R, U1, U2>::new(one, one);

//         let observation_noise_covariance = OMatrix::<R, U1, U1>::new(var);

//         Self {
//             observation_matrix,
//             observation_matrix_transpose: observation_matrix.transpose(),
//             observation_noise_covariance,
//         }
//     }

//     // Update the observation matrix based on the current positions of the two nodes
//     pub fn update_observation_matrix(&mut self, node1_pos: &Vector2<R>, node2_pos: &Vector2<R>) {
//         info!(
//             "Updating observation matrix! Initial matrix: {:#?}",
//             self.observation_matrix
//         );
//         let dx = node2_pos[0] - node1_pos[0];
//         let dy = node2_pos[1] - node1_pos[1];
//         let distance = (dx * dx + dy * dy).sqrt();

//         let h1 = -dx / distance;
//         let h2 = -dy / distance;

//         self.observation_matrix = OMatrix::<R, U1, U2>::new(h1, h2);
//         self.observation_matrix_transpose = self.observation_matrix.transpose();
//         info!(
//             "Updating observation matrix! Final matrix: {:#?}",
//             self.observation_matrix
//         );
//     }
// }

// impl<R: RealField> ObservationModel<R, U2, U1> for DistanceObservationModel<R>
// where
//     DefaultAllocator: Allocator<R, U2, U2>,
//     DefaultAllocator: Allocator<R, U1, U2>,
//     DefaultAllocator: Allocator<R, U2, U1>,
//     DefaultAllocator: Allocator<R, U1, U1>,
//     DefaultAllocator: Allocator<R, U2>,
//     DefaultAllocator: Allocator<R, U1>,
//     DefaultAllocator: Allocator<(usize, usize), U1>,
//     U1: DimMin<U1, Output = U1>,
// {
//     fn H(&self) -> &OMatrix<R, U1, U2> {
//         &self.observation_matrix
//     }

//     fn HT(&self) -> &OMatrix<R, U2, U1> {
//         &self.observation_matrix_transpose
//     }

//     fn R(&self) -> &OMatrix<R, U1, U1> {
//         &self.observation_noise_covariance
//     }
// }

pub struct NonlinearObservationModel {
    observation_noise_covariance: f64,
    minimum_distance: f64,
}

impl NonlinearObservationModel {
    pub fn new(observation_noise_covariance: f64, minimum_distance: f64) -> Self {
        Self {
            observation_noise_covariance: observation_noise_covariance,
            minimum_distance: minimum_distance,
        }
    }

    // Get the evaluation function and Jacobian of the observation model for a slice of nodes.
    pub fn linearize_at(
        &self,
        state: &OVector<f64, SS>,
        measurement_indices: Vec<(usize, usize)>,
        // measurement_indices: [(usize, usize); N_MEASUREMENTS],
    ) -> LinearizedObservationModel {
        let evaluation_func = Box::new(move |x: &OVector<f64, SS>| {
            let mut y = OVector::<f64, OS>::zeros();

            for (i, &(node1, node2)) in measurement_indices.iter().enumerate() {
                let x1 = Vector3::new(x[3 * node1], x[3 * node1 + 1], x[3 * node1 + 2]);
                let x2 = Vector3::new(x[3 * node2], x[3 * node2 + 1], x[3 * node2 + 2]);
                let distance = (x2 - x1).norm();
                y[i] = distance;
            }

            y
        });

        let mut observation_matrix = OMatrix::<f64, OS, SS>::zeros();

        for (i, &(node1, node2)) in measurement_indices.iter().enumerate() {
            let x1 = Vector3::new(state[3 * node1], state[3 * node1 + 1], state[3 * node1 + 2]);
            let x2 = Vector3::new(state[3 * node2], state[3 * node2 + 1], state[3 * node2 + 2]);
            let delta = x2 - x1;
            let distance = delta.norm();

            // if the distance is below the minimum, we expect a measurement of ~zero
            if distance > self.minimum_distance {
                let jacobian_row = -delta.transpose() / distance;
                observation_matrix
                    .slice_mut((i, 3 * node1), (1, 3))
                    .copy_from(&jacobian_row);
                observation_matrix
                    .slice_mut((i, 3 * node2), (1, 3))
                    .copy_from(&jacobian_row);
            }
        }

        let observation_matrix_transpose = observation_matrix.transpose();
        let observation_noise_covariance =
            OMatrix::<f64, OS, OS>::identity() * self.observation_noise_covariance;

        LinearizedObservationModel {
            evaluation_func,
            observation_matrix,
            observation_matrix_transpose,
            observation_noise_covariance,
        }
    }
}

type EvaluationFn = Box<dyn Fn(&OVector<Precision, SS>) -> OVector<Precision, OS>>;

pub struct LinearizedObservationModel
where
    DefaultAllocator: Allocator<Precision, SS, SS>,
    DefaultAllocator: Allocator<Precision, OS, SS>,
    DefaultAllocator: Allocator<Precision, SS, OS>,
    DefaultAllocator: Allocator<Precision, OS, OS>,
    DefaultAllocator: Allocator<Precision, SS>,
{
    evaluation_func: EvaluationFn,
    observation_matrix: OMatrix<Precision, OS, SS>,
    observation_matrix_transpose: OMatrix<Precision, SS, OS>,
    observation_noise_covariance: OMatrix<Precision, OS, OS>,
}

impl ObservationModel<Precision, SS, OS> for LinearizedObservationModel
where
    DefaultAllocator: Allocator<Precision, SS, SS>,
    DefaultAllocator: Allocator<Precision, OS, SS>,
    DefaultAllocator: Allocator<Precision, SS, OS>,
    DefaultAllocator: Allocator<Precision, OS, OS>,
    DefaultAllocator: Allocator<Precision, SS>,
    DefaultAllocator: Allocator<Precision, OS>,
    DefaultAllocator: Allocator<(usize, usize), OS>,
    OS: DimMin<OS, Output = OS>,
{
    fn H(&self) -> &OMatrix<Precision, OS, SS> {
        &self.observation_matrix
    }
    fn HT(&self) -> &OMatrix<Precision, SS, OS> {
        &self.observation_matrix_transpose
    }
    fn R(&self) -> &OMatrix<Precision, OS, OS> {
        &self.observation_noise_covariance
    }
    fn predict_observation(&self, state: &OVector<Precision, SS>) -> OVector<Precision, OS> {
        (*self.evaluation_func)(state)
    }
}
