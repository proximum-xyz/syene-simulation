use crate::types::Simulation;
use lazy_static::lazy_static;
use std::sync::Mutex;
use wasm_bindgen::prelude::*;

lazy_static! {
    static ref SIMULATION: Mutex<Option<Simulation>> = Mutex::new(None);
}

#[wasm_bindgen]
pub fn create_simulation(
    h3_resolution: i32,
    num_nodes: usize,
    real_channel_speed_min: f64,
    real_channel_speed_max: f64,
    real_latency_min: f64,
    real_latency_max: f64,
    model_state_noise_scale: f64,
    model_measurement_variance: f64,
    model_signal_speed_fraction: f64,
    model_node_latency: f64,
) {
    let simulation = Simulation::new(
        h3_resolution,
        num_nodes,
        real_channel_speed_min,
        real_channel_speed_max,
        real_latency_min,
        real_latency_max,
        model_state_noise_scale,
        model_measurement_variance,
        model_signal_speed_fraction,
        model_node_latency,
    );
    *SIMULATION.lock().unwrap() = Some(simulation);
}

#[wasm_bindgen]
pub fn initialize_simulation() {
    if let Some(simulation) = &mut *SIMULATION.lock().unwrap() {
        simulation.initialize_simulation();
    }
}

#[wasm_bindgen]
pub fn run_simulation(n_epochs: usize, n_measurements: usize, d_max: f64) {
    if let Some(simulation) = &mut *SIMULATION.lock().unwrap() {
        simulation.run_simulation(n_epochs, n_measurements, d_max);
    }
}

#[wasm_bindgen]
pub fn get_num_nodes() -> usize {
    if let Some(simulation) = &*SIMULATION.lock().unwrap() {
        simulation.nodes.len()
    } else {
        0
    }
}

#[wasm_bindgen]
pub fn get_node_position(index: usize) -> Option<Vec<f64>> {
    if let Some(simulation) = &*SIMULATION.lock().unwrap() {
        if index < simulation.nodes.len() {
            let node = &simulation.nodes[index];
            Some(vec![
                node.estimated_position[0],
                node.estimated_position[1],
                node.estimated_position[2],
            ])
        } else {
            None
        }
    } else {
        None
    }
}
