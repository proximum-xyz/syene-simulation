use crate::kalman::{NonlinearObservationModel, State, StationaryStateModel};
use h3o::CellIndex;
use serde::Serialize;
extern crate nav_types;
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

#[derive(Serialize)]
pub struct CompileParameters {
    pub n_nodes: usize,
    pub n_measurements: usize,
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
}

#[derive(Serialize)]
pub struct Simulation {
    // general simulation parameters
    pub nodes: Vec<Node>,
    pub h3_resolution: i32,
    // physical parameters
    pub real_channel_speed_min: f64,
    pub real_channel_speed_max: f64,
    pub real_latency_min: f64,
    pub real_latency_max: f64,
    // model parameters
    pub model_distance_max: f64,
    pub model_state_variance: f64,
    pub model_measurement_variance: f64,
    pub model_signal_speed_fraction: f64,
    pub model_node_latency: f64,
    // simulation parameters (note that the numbers of nodes and measurements are compiler flags)
    pub n_epochs: usize,
    // kalman filter implementation
    #[serde(skip)]
    pub state_model: StationaryStateModel<f64>,
    #[serde(skip)]
    pub observation_model_generator: NonlinearObservationModel,
    #[serde(skip)]
    pub state: State,
}
