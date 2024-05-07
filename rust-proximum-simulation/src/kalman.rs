use adskalman::{ObservationModel, StateAndCovariance, TransitionModelLinearNoControl};
#[allow(unused_imports)]
use nalgebra::{Dim, DimMin, OVector, Vector2, Vector3, Vector4, U1, U10, U100, U30, U50, U6};
use typenum::U300;

use nalgebra::{allocator::Allocator, DefaultAllocator, Matrix, OMatrix, RealField, U120};

// State size is 3 * n: each node stores an [x, y, z] position in ECEF coordinates
#[cfg(n_nodes = "2")]
pub type SS = U6;
#[cfg(n_nodes = "2")]
pub const N_NODES: usize = 2;

#[cfg(n_nodes = "10")]
pub type SS = U30;
#[cfg(n_nodes = "10")]
pub const N_NODES: usize = 10;

#[cfg(n_nodes = "40")]
pub type SS = U120;
#[cfg(n_nodes = "40")]
pub const N_NODES: usize = 120;

// Observation size is the number of distance measurements
#[cfg(n_measurements = "1")]
pub type OS = U1;
#[cfg(n_measurements = "1")]
pub const N_MEASUREMENTS: usize = 1;

#[cfg(n_measurements = "10")]
pub type OS = U10;
#[cfg(n_measurements = "10")]
pub const N_MEASUREMENTS: usize = 10;

#[cfg(n_measurements = "50")]
pub type OS = U50;
#[cfg(n_measurements = "50")]
pub const N_MEASUREMENTS: usize = 50;

// Minimum distance between nodes for a valid measurement
const MINIMUM_DISTANCE: f64 = 100.0;

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

pub struct NonlinearObservationModel {
    observation_noise_covariance: f64,
}

impl NonlinearObservationModel {
    pub fn new(observation_noise_covariance: f64) -> Self {
        Self {
            observation_noise_covariance: observation_noise_covariance,
        }
    }

    // Get the evaluation function and Jacobian of the observation model for a slice of nodes.
    pub fn linearize_at(
        &self,
        state: &OVector<f64, SS>,
        measurement_indices: Vec<(usize, usize)>,
        // measurement_indices: [(usize, usize); N_MEASUREMENTS],
    ) -> LinearizedObservationModel {
        let measurement_indices_clone = measurement_indices.clone();
        let evaluation_func = Box::new(move |x: &OVector<f64, SS>| {
            let mut y = OVector::<f64, OS>::zeros();

            for (i, &(node1, node2)) in measurement_indices_clone.iter().enumerate() {
                let x1 = Vector3::new(x[3 * node1], x[3 * node1 + 1], x[3 * node1 + 2]);
                let x2 = Vector3::new(x[3 * node2], x[3 * node2 + 1], x[3 * node2 + 2]);
                let distance = (x2 - x1).norm();
                y[i] = distance;
            }

            y
        });

        let mut observation_matrix = OMatrix::<f64, OS, SS>::zeros();

        for (i, &(a, b)) in measurement_indices.iter().enumerate() {
            let x1 = Vector3::new(state[3 * a], state[3 * a + 1], state[3 * a + 2]);
            let x2 = Vector3::new(state[3 * b], state[3 * b + 1], state[3 * b + 2]);
            let delta = x2 - x1;
            let distance = delta.norm();

            // if the distance is below the minimum, we expect a measurement of ~zero
            if distance > MINIMUM_DISTANCE {
                let jacobian_row = -delta.transpose() / distance;
                observation_matrix
                    .view_mut((i, 3 * a), (1, 3))
                    .copy_from(&jacobian_row);
                observation_matrix
                    .view_mut((i, 3 * b), (1, 3))
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
