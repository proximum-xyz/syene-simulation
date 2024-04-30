use crate::kalman::{DistanceObservationModel, StationaryNode2DModel};
use h3o::{CellIndex, LatLng};
use nalgebra::Vector3;
use serde::{Serialize, Serializer};
extern crate nav_types;
use nav_types::{ECEF, ENU, WGS84};

// Wrapper struct for ECEF<f64> allowing serialization
#[derive(Debug, Clone)]
pub struct ECEFWrapper(ECEF<f64>);

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

#[derive(Serialize)]
pub struct Node {
    pub id: usize,
    pub true_index: CellIndex,
    pub asserted_index: CellIndex,
    pub estimated_index: CellIndex,
    #[serde(with = "serialize_ecef")]
    pub true_position: ECEF<f64>,
    #[serde(with = "serialize_ecef")]
    pub estimated_position: ECEF<f64>,
    pub true_wgs84: WGS84<f64>,
    pub estimated_wgs84: WGS84<f64>,
    pub channel_speed: f64,
    pub latency: f64,
    #[serde(skip)]
    pub state_model: StationaryNode2DModel<f64>,
    #[serde(skip)]
    pub observation_model: DistanceObservationModel<f64>,
}

pub struct Measurement {
    pub other_node_estimated_position: ECEF<f64>,
    pub measured_distance: f64,
}

#[derive(Serialize)]
pub struct Simulation {
    // general simulation parameters
    pub nodes: Vec<Node>,
    pub h3_resolution: i32,
    pub n_nodes: usize,
    // physical parameters
    pub real_channel_speed_min: f64,
    pub real_channel_speed_max: f64,
    pub real_latency_min: f64,
    pub real_latency_max: f64,
    // model parameters
    pub model_distance_max: f64,
    pub model_state_noise_scale: f64,
    pub model_measurement_variance: f64,
    pub model_signal_speed_fraction: f64,
    pub model_node_latency: f64,
    // simulation parameters
    pub n_epochs: usize,
    pub n_measurements: usize,
}
