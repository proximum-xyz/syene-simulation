use crate::kalman::{DistanceObservationModel, StationaryNode2DModel};
use h3o::{CellIndex, LatLng};
use nalgebra::Vector3;
use serde::Serialize;

#[derive(Serialize)]
pub struct Node {
    pub id: usize,
    pub true_index: CellIndex,
    pub asserted_index: CellIndex,
    pub estimated_index: CellIndex,
    pub true_position: Vector3<f64>,
    pub estimated_position: Vector3<f64>,
    pub true_lat_lng: LatLng,
    pub estimated_lat_lng: LatLng,
    pub channel_speed: f64,
    pub latency: f64,
    #[serde(skip)]
    pub state_model: StationaryNode2DModel<f64>,
    #[serde(skip)]
    pub observation_model: DistanceObservationModel<f64>,
}

pub struct Measurement {
    pub other_node_estimated_position: Vector3<f64>,
    pub measured_distance: f64,
}

#[derive(Serialize)]
pub struct Simulation {
    // general simulation parameters
    pub nodes: Vec<Node>,
    pub h3_resolution: i32,
    pub num_nodes: usize,
    // physical parameters
    pub real_channel_speed_min: f64,
    pub real_channel_speed_max: f64,
    pub real_latency_min: f64,
    pub real_latency_max: f64,
    // model parameters
    pub model_state_noise_scale: f64,
    pub model_measurement_variance: f64,
    pub model_signal_speed_fraction: f64,
    pub model_node_latency: f64,
}
