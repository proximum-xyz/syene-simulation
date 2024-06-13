use adskalman::{ObservationModel, TransitionModelLinearNoControl};
use log::trace;
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
#[cfg(n_measurements = "10")]
pub type OS = Const<10>;
#[cfg(n_measurements = "10")]
pub const N_MEASUREMENTS: usize = 10;

// Minimum distance between nodes for a valid measurement
const MINIMUM_DISTANCE: f64 = 1.0;

// We use the same precision for all numbers
type Precision = f64;

pub fn normalize_state (state: &OVector<f64, SS>) -> OVector<f64, SS> {
  OVector::<f64, SS>::new(
    state[0] * 6_371_000.0,
    state[1] * 6_371_000.0,
    state[2] * 6_371_000.0,
    // bound the real message speed to (0, 1)
    state[3].tanh() / 2.0 + 0.5,
    state[4] * 0.1,
  )

}

// all Kalman values are internally normalized by these factors to reduce numerical instability. Multiply the state by this factor to get meaningful values (meters, seconds).
pub const STATE_FACTOR: OVector<f64, SS> = OVector::<f64, SS>::new(
    // [x, y, z] positions (meters) ranges from [0, ~6,371,000) (the earth's radius)
    6_371_000.0,
    6_371_000.0,
    6_371_000.0,
    // beta (% of c) ranges from (0, 1) so it is already normalized
    1.0,
    // tau ranges from (0, ~0.1s) in practice
    0.1,
);

// State update model (nothing changes by default)
// TODO: move node closer to asserted position with spring constant (delta proportional to distance between estimated and asserted position)
// Even with a relatively small constant, this should prevent position drift of all nodes
pub struct StationaryStateModel<R>
where
    R: RealField,
{
    pub transition_model: OMatrix<R, SS, SS>,
    pub transition_model_transpose: OMatrix<R, SS, SS>,
    pub transition_noise_covariance: OMatrix<R, SS, SS>,
}

impl<R> StationaryStateModel<R>
where
    R: RealField + Copy,
{
    pub fn new(
        position_variance: R,
        beta_variance: R,
        tau_variance: R,
        // passed in to infer type
        state_factor: OVector<R, SS>,
    ) -> Self {
        let transition_model = OMatrix::<R, SS, SS>::identity();

        let transition_noise_diagonal = OVector::<R, SS>::new(
            position_variance,
            position_variance,
            position_variance,
            beta_variance,
            tau_variance,
        );
        // .zip_map(&state_factor, |a, b| a / (b * b));
        let transition_noise_covariance =
            OMatrix::<R, SS, SS>::from_diagonal(&transition_noise_diagonal);

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
        let mut their_normalized_states = OMatrix::<f64, SS, OS>::zeros();

        for i in 0..OS::dim() {
            // we do our distance calculations in real units, so normalize from internal to real units
            let their_normalized_state = normalize_state(nodes[their_indices[i]]
                .state_and_covariance
                .state());
            their_normalized_states
                .view_mut((0, i), (5, 1))
                .copy_from(&their_normalized_state);
        }

        let evaluation_func = Box::new(move |state: &OVector<f64, SS>| {
            let mut y = OVector::<f64, OS>::zeros();

            let normalized_state = normalize_state(state);

            for i in 0..OS::dim() {
                let their_normalized_state = their_normalized_states.column(i);
                // calculate the distance between nodes (rows 0-2 are the X,Y,Z positions)
                let distance =
                    (their_normalized_state.rows(0, 3) - normalized_state.rows(0, 3)).norm();

                // calculate estimated time-of-flight between nodes: we assume a ping with our parameters and a pong with their parameters
                y[i] = 
                  // ping
                  distance / (C * normalized_state[3]) + normalized_state[4]
                  // pong
                  + distance / (C * their_normalized_state[3]) + their_normalized_state[4];

                trace!("our normalized state: {:#?}, their normalized state: {:#?}, predicted measurement: {}", normalized_state, their_normalized_state, y[i]);
            }
            y
        });

        let normalized_state = normalize_state(nodes[my_index].state_and_covariance.state());
        let mut observation_matrix = OMatrix::<f64, OS, SS>::zeros();

        for i in 0..OS::dim() {
            let delta = their_normalized_states.column(i).rows(0, 3) - normalized_state.rows(0, 3);
            let distance = delta.norm();

            // if the distance is below the minimum, we expect a measurement of ~zero
            if distance > MINIMUM_DISTANCE {
                // Partial derivatives with respect to x, y, z
                let jacobian_position = -delta.transpose() / distance;

                // Partial derivative with respect to β_c (average message speed fraction of c)
                let jacobian_beta = distance / (C * normalized_state[3] * normalized_state[3]);

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
            OMatrix::<f64, OS, OS>::identity() * 10.0; // TODO - better values observation_noise_covariance;

        trace!("ob ns cov: {:#?}", observation_noise_covariance);

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
