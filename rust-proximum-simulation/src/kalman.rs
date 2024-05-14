use adskalman::{ObservationModel, TransitionModelLinearNoControl};
use nalgebra::DimName;
use nalgebra::{
    allocator::Allocator, Const, DefaultAllocator, DimMin, OMatrix, OVector, RealField,
};

use crate::physics::C;
use crate::types::Node;

// Dimensions: ECEF coordinates +  [x_ECEF; y_ECEF; z_ECEF; β_c; τ]
// β_c: average message propagation speed from this node to other nodes
// τ: average latency from this node to other nodes
pub type SS = Const<5>;

// Observation size is the number of distance measurements
#[cfg(n_measurements = "1")]
pub type OS = Const<1>;
#[cfg(n_measurements = "1")]
pub const N_MEASUREMENTS: usize = 1;

#[cfg(n_measurements = "10")]
pub type OS = Const<10>;
#[cfg(n_measurements = "10")]
pub const N_MEASUREMENTS: usize = 10;

#[cfg(n_measurements = "25")]
pub type OS = Const<25>;
#[cfg(n_measurements = "25")]
pub const N_MEASUREMENTS: usize = 25;

#[cfg(n_measurements = "50")]
pub type OS = Const<50>;
#[cfg(n_measurements = "50")]
pub const N_MEASUREMENTS: usize = 50;

#[cfg(n_measurements = "100")]
pub type OS = Const<100>;
#[cfg(n_measurements = "100")]
pub const N_MEASUREMENTS: usize = 100;

// Minimum distance between nodes for a valid measurement
const MINIMUM_DISTANCE: f64 = 1.0;

// We use the same precision for all numbers
type Precision = f64;

// State update model (nothing changes by default)
// TODO: move node closer to asserted position with spring constant (delta proportional to distance between estimated and asserted position)
// Even with a relatively small constant, this should prevent position drift of all nodes
pub struct StationaryStateModel<R>
where
    R: RealField,
    // DefaultAllocator: Allocator<R, SS, SS>, // Adjust SS to your dimensions
    // DefaultAllocator: Allocator<R, SS>,
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
        let transition_model = OMatrix::<R, SS, SS>::identity();
        let transition_noise_covariance = OMatrix::<R, SS, SS>::identity() * noise_scale;
        let transition_model_transpose = transition_model.transpose();

        Self {
            transition_model,
            transition_model_transpose,
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

pub struct NonlinearObservationModel {}

impl NonlinearObservationModel {
    pub fn new() -> Self {
        Self {}
    }

    // Get the evaluation function and Jacobian of the observation model for one node at the node index measuring time of flight to other nodes
    // Note: the linearization is obviously only useful for the specified node indices and positions!
    pub fn linearize_at(
        &self,
        nodes: &Vec<Node>,
        my_index: usize,
        their_indices: Vec<usize>,
        observation_noise_covariance: f64,
    ) -> LinearizedObservationModel {
        // Create a new matrix representing positions of the other nodes used in this observation.
        // This is a fixed size matrix with the number of rows equal to the number of measurements
        let mut their_node_states = OMatrix::<f64, SS, OS>::zeros();

        for i in 0..OS::dim() {
            let their_state = nodes[their_indices[i]].state_and_covariance.state();
            their_node_states
                .view_mut((0, i), (3, 1))
                .copy_from(their_state);
        }

        let evaluation_func = Box::new(move |state: &OVector<f64, SS>| {
            let mut y = OVector::<f64, OS>::zeros();

            for i in 0..OS::dim() {
                let their_state = their_node_states.column(i);
                // calculate the distance between nodes (rows 0-2 are the X,Y,Z positions)
                let distance = (their_state.rows(0, 3) - state.rows(0, 3)).norm();

                // calculate estimated time-of-flight between nodes: we assume a ping with our parameters and a pong with their parameters
                y[i] = distance / (C * state[3])
                    + state[4]
                    + distance / (C * their_state[3])
                    + their_state[4];
            }
            y
        });

        let state = nodes[my_index].state_and_covariance.state();
        let mut observation_matrix = OMatrix::<f64, OS, SS>::zeros();

        for i in 0..OS::dim() {
            let delta = their_node_states.column(i).rows(0, 3) - state.rows(0, 3);
            let distance = delta.rows(0, 3).norm();

            // if the distance is below the minimum, we expect a measurement of ~zero
            if distance > MINIMUM_DISTANCE {
                // Partial derivatives with respect to x, y, z
                let jacobian_position = delta.rows(0, 3).transpose() / distance;

                // Partial derivative with respect to β_c (average message speed fraction of c)
                let jacobian_beta = distance / (C * state[3] * state[3]);

                // Partial derivative with respect to τ (average latency)
                let jacobian_tau = 1.0;

                // Fill in the Jacobian matrix
                observation_matrix
                    .view_mut((i, 0), (1, 3))
                    .copy_from(&jacobian_position);
                observation_matrix[(i, 3)] = jacobian_beta;
                observation_matrix[(i, 4)] = jacobian_tau;
            }
        }

        let observation_matrix_transpose = observation_matrix.transpose();
        let observation_noise_covariance =
            OMatrix::<f64, OS, OS>::identity() * observation_noise_covariance;

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
