use adskalman::{
    CovarianceUpdateMethod, Error, ErrorKind, ObservationModel, StateAndCovariance,
    TransitionModelLinearNoControl,
};
use log::trace;
#[allow(unused_imports)]
use nalgebra::{
    allocator::Allocator, Const, DMatrix, DefaultAllocator, Dim, DimMin, Dyn, Matrix, OMatrix,
    OVector, RealField, Vector2, Vector3, Vector4, U1, U10, U100, U120, U30, U50, U6,
};
use num_traits::identities::One;

// State size is 3 * n: each node stores an [x, y, z] position in ECEF coordinates
#[cfg(n_nodes = "2")]
pub type SS = Const<6>;
#[cfg(n_nodes = "2")]
pub const N_NODES: usize = 2;

#[cfg(n_nodes = "10")]
pub type SS = U30;
#[cfg(n_nodes = "10")]
pub const N_NODES: usize = 10;

#[cfg(n_nodes = "100")]
pub type SS = Const<300>;
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
const MINIMUM_DISTANCE: f64 = 100.0;

// We use the same precision for all numbers
type Precision = f64;

pub type MyStateAndCovariance = StateAndCovariance<f64, SS>;

// State update model (nothing moves)
pub struct StationaryStateModel<R>
where
    R: RealField,
    // DefaultAllocator: Allocator<R, SS, SS>, // Adjust SS to your dimensions
    // DefaultAllocator: Allocator<R, SS>,
{
    pub transition_model: Box<OMatrix<R, SS, SS>>,
    pub transition_model_transpose: Box<OMatrix<R, SS, SS>>,
    pub transition_noise_covariance: Box<OMatrix<R, SS, SS>>,
}

impl<R> StationaryStateModel<R>
where
    R: RealField + Copy,
{
    pub fn new(noise_scale: R) -> Self {
        // Allocate on the heap to avoid stack overflow for large matrices
        let transition_model = Box::new(OMatrix::<R, SS, SS>::identity());
        let transition_noise_covariance = Box::new(OMatrix::<R, SS, SS>::identity() * noise_scale);
        let transition_model_transpose = Box::new(transition_model.transpose());

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

// Taken from adskalman library - we cannot use the stack for big matrices!
pub fn update<R: RealField>(
    observation_model: &dyn ObservationModel<R, SS, OS>,
    prior: &StateAndCovariance<R, SS>,
    observation: &OVector<R, OS>,
) -> Result<StateAndCovariance<R, SS>, Error> {
    let h = observation_model.H();
    trace!("h {}", h);
    let p = prior.covariance();
    trace!("p {}", p);

    let ht = observation_model.HT();
    trace!("ht {}", ht);
    let r = observation_model.R();
    trace!("r {}", r);

    let s = (h * p * ht) + r;
    trace!("s {}", s);

    let s_chol = match nalgebra::linalg::Cholesky::new(s) {
        Some(v) => v,
        None => {
            return Err(ErrorKind::CovarianceNotPositiveSemiDefinite.into());
        }
    };
    let s_inv: Box<OMatrix<R, OS, OS>> = Box::new(s_chol.inverse());
    trace!("s_inv {}", s_inv);

    let k_gain: Box<OMatrix<R, SS, OS>> = Box::new(p * ht * *s_inv);
    trace!("k_gain {}", k_gain);

    let predicted: OVector<R, OS> = observation_model.predict_observation(prior.state());
    trace!("predicted {}", predicted);
    trace!("observation {}", observation);

    let innovation: OVector<R, OS> = observation - predicted;
    trace!("innovation {}", innovation);

    let state: OVector<R, SS> = prior.state() + &*k_gain * innovation;
    trace!("state {}", state);

    trace!("self.observation_matrix() {}", observation_model.H());

    let kh: Box<OMatrix<R, SS, SS>> = Box::new(&*k_gain * observation_model.H());
    trace!("kh {}", kh);

    let one_minus_kh = OMatrix::<R, SS, SS>::one() - *kh;
    trace!("one_minus_kh {}", one_minus_kh);

    let covariance_method = CovarianceUpdateMethod::JosephForm;
    let covariance: Box<OMatrix<R, SS, SS>> = match covariance_method {
        CovarianceUpdateMethod::JosephForm => {
            let left = &one_minus_kh * prior.covariance() * &one_minus_kh.transpose();
            let right = &*k_gain * r * &k_gain.transpose();
            Box::new(left + right)
        }
        CovarianceUpdateMethod::OptimalKalman => Box::new(one_minus_kh * prior.covariance()),
        CovarianceUpdateMethod::OptimalKalmanForcedSymmetric => {
            let covariance1 = one_minus_kh * prior.covariance();
            trace!("covariance1 {}", covariance1);
            Box::new(covariance1.symmetric_part())
        }
    };
    trace!("covariance {}", covariance);

    Ok(StateAndCovariance::new(state, *covariance))
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

        let mut observation_matrix = Box::new(OMatrix::<f64, OS, SS>::zeros());

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

        let observation_matrix_transpose = Box::new(observation_matrix.transpose());
        let observation_noise_covariance =
            Box::new(OMatrix::<f64, OS, OS>::identity() * self.observation_noise_covariance);

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
    observation_matrix: Box<OMatrix<Precision, OS, SS>>,
    observation_matrix_transpose: Box<OMatrix<Precision, SS, OS>>,
    observation_noise_covariance: Box<OMatrix<Precision, OS, OS>>,
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
