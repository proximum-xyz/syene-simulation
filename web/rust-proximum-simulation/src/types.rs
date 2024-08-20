use crate::kalman::{NonlinearObservationModel, StationaryStateModel, SS};
use adskalman::StateAndCovariance;
use h3o::CellIndex;
use rand::rngs::ThreadRng;
use serde::{Deserialize, Serialize};
extern crate nav_types;
use nalgebra::{Const, OVector};
use nav_types::{ECEF, WGS84};

mod serialize_ecef {
    use super::*;
    use serde::Serializer;

    pub fn serialize<S>(ecef: &ECEF<f64>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let coordinates = (ecef.x(), ecef.y(), ecef.z());
        serializer.serialize_newtype_struct("ECEF", &coordinates)
    }
}

mod serialize_h3_index {
    use super::*;
    use serde::Serializer;

    pub fn serialize<S>(index: &CellIndex, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let hex_string = format!("{:x}", index);
        serializer.serialize_str(&hex_string)
    }
}

#[derive(Serialize)]
pub struct CompilerParams {
    pub n_measurements: usize,
}

#[derive(Serialize, Debug, Clone)]
pub struct Node {
    pub id: usize,
    #[serde(with = "serialize_h3_index")]
    pub true_index: CellIndex,
    #[serde(with = "serialize_ecef")]
    pub true_position: ECEF<f64>,
    pub true_wgs84: WGS84<f64>,
    pub true_beta: f64,
    pub true_tau: f64,
    #[serde(with = "serialize_h3_index")]
    pub asserted_index: CellIndex,
    #[serde(with = "serialize_ecef")]
    pub asserted_position: ECEF<f64>,
    pub asserted_wgs84: WGS84<f64>,
    // Least-squares estimates
    #[serde(with = "serialize_h3_index")]
    pub ls_estimated_index: CellIndex,
    #[serde(with = "serialize_ecef")]
    pub ls_estimated_position: ECEF<f64>,
    pub ls_estimated_wgs84: WGS84<f64>,
    // extended Kalman filter estimates
    #[serde(with = "serialize_h3_index")]
    pub kf_estimated_index: CellIndex,
    #[serde(with = "serialize_ecef")]
    pub kf_estimated_position: ECEF<f64>,
    pub kf_estimated_wgs84: WGS84<f64>,
    pub kf_estimated_beta: f64,
    pub kf_estimated_tau: f64,
    pub kf_en_variance_semimajor_axis: OVector<f64, Const<2>>,
    pub kf_en_variance_semimajor_axis_length: f64,
    pub kf_en_variance_semiminor_axis_length: f64,
    #[serde(skip)]
    pub kf_state_and_covariance: StateAndCovariance<f64, SS>,
}

#[derive(Serialize, Clone, Debug)]
pub struct Stats {
    // simulation stats for each epoch
    // meters
    pub kf_estimation_rms_error: Vec<f64>,
    // meters
    pub ls_estimation_rms_error: Vec<f64>,
    // meters
    pub assertion_rms_error: Vec<f64>,
}

#[derive(Serialize)]
pub struct Simulation {
    // save internal data
    pub config: SimulationConfig,
    pub nodes: Vec<Node>,
    pub stats: Stats,
    #[serde(skip)]
    pub rng: ThreadRng,
    #[serde(skip)]
    pub kf_state_model: StationaryStateModel<f64>,
    #[serde(skip)]
    pub kf_observation_model_generator: NonlinearObservationModel,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SimulationConfig {
    // simulation parameters (note that the numbers of measurements per update is a compiler flag)
    pub n_nodes: usize,
    pub n_epochs: usize,
    pub h3_resolution: i32,
    // physical parameters
    pub asserted_position_variance: f64,
    pub beta_min: f64,
    pub beta_max: f64,
    pub beta_variance: f64,
    pub tau_min: f64,
    pub tau_max: f64,
    pub tau_variance: f64,
    pub message_distance_max: f64,
    // least squares model parameters
    pub ls_model_beta: f64,
    pub ls_model_tau: f64,
    pub ls_tolerance: f64,
    pub ls_iterations: usize,
    // kalman filter model parameters
    pub kf_model_position_variance: f64,
    pub kf_model_beta: f64,
    pub kf_model_beta_variance: f64,
    pub kf_model_tau: f64,
    pub kf_model_tau_variance: f64,
    pub kf_model_tof_observation_variance: f64,
}

#[derive(PartialEq)]
pub enum PositionType {
    KfEstimated,
    LsEstimated,
    Asserted,
}

#[derive(Serialize, Debug)]
pub struct ChunkResult {
    pub nodes: Vec<Node>,
    pub stats: Stats,
}
