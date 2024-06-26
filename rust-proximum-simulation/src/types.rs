use crate::kalman::SS;
use adskalman::StateAndCovariance;
use h3o::CellIndex;
use serde::Serialize;
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

#[derive(Serialize)]
pub struct Node {
    pub id: usize,
    #[serde(with = "serialize_h3_index")]
    pub true_index: CellIndex,
    #[serde(with = "serialize_h3_index")]
    pub asserted_index: CellIndex,
    #[serde(with = "serialize_h3_index")]
    pub estimated_index: CellIndex,
    #[serde(with = "serialize_ecef")]
    pub true_position: ECEF<f64>,
    #[serde(with = "serialize_ecef")]
    pub asserted_position: ECEF<f64>,
    #[serde(with = "serialize_ecef")]
    pub estimated_position: ECEF<f64>,
    pub estimated_beta: f64,
    pub estimated_tau: f64,
    pub en_variance_semimajor_axis: OVector<f64, Const<2>>,
    pub en_variance_semimajor_axis_length: f64,
    pub en_variance_semiminor_axis_length: f64,
    pub true_wgs84: WGS84<f64>,
    pub estimated_wgs84: WGS84<f64>,
    pub asserted_wgs84: WGS84<f64>,
    pub beta: f64,
    pub tau: f64,
    // Kalman filter state and covariance
    #[serde(skip)]
    pub state_and_covariance: StateAndCovariance<f64, SS>,
}

#[derive(Serialize)]
pub struct Stats {
    // simulation stats for each epoch
    // meters
    pub estimation_rms_error: Vec<f64>,
    // meters
    pub assertion_rms_error: Vec<f64>,
}

#[derive(Serialize)]
pub struct Simulation {
    // simulation parameters (note that the numbers of measurements is a compiler flag)
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
    // model parameters
    pub model_position_variance: f64,
    pub model_beta: f64,
    pub model_beta_variance: f64,
    pub model_tau: f64,
    pub model_tau_variance: f64,
    pub model_tof_observation_variance: f64,

    // save internal data
    pub nodes: Vec<Node>,
    pub stats: Stats,
}
