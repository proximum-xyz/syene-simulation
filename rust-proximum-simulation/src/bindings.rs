#![allow(non_snake_case)]
use crate::types::Simulation;
use lazy_static::lazy_static;
use serde_json;
use std::sync::Mutex;
use wasm_bindgen::prelude::*;

// TODO: there must be a cleaner way to do this than a global variable
lazy_static! {
    static ref SIMULATION: Mutex<Option<Simulation>> = Mutex::new(None);
}

#[wasm_bindgen]
pub fn get_simulation_json() -> JsValue {
    let simulation_option = SIMULATION.lock().expect("couldn't get simulation");
    match *simulation_option {
        Some(ref simulation) => {
            let json_string = serde_json::to_string(simulation).unwrap();
            JsValue::from_str(&json_string)
        }
        None => JsValue::NULL,
    }
}

#[wasm_bindgen]
pub fn create_simulation(
    h3Resolution: i32,
    nNodes: usize,
    realChannelSpeedMin: f64,
    realChannelSpeedMax: f64,
    realLatencyMin: f64,
    realLatencyMax: f64,
    modelDistanceMax: f64,
    modelStateNoiseScale: f64,
    modelMeasurementVariance: f64,
    modelSignalSpeedFraction: f64,
    modelNodeLatency: f64,
    nEpochs: usize,
    nMeasurements: usize,
) -> JsValue {
    let simulation = Simulation::new(
        h3Resolution,
        nNodes,
        realChannelSpeedMin,
        realChannelSpeedMax,
        realLatencyMin,
        realLatencyMax,
        modelDistanceMax,
        modelStateNoiseScale,
        modelMeasurementVariance,
        modelSignalSpeedFraction,
        modelNodeLatency,
        nEpochs,
        nMeasurements,
    );
    *SIMULATION.lock().unwrap() = Some(simulation);
    return get_simulation_json();
}

#[wasm_bindgen]
pub fn run_simulation() -> JsValue {
    if let Some(simulation) = &mut *SIMULATION.lock().unwrap() {
        simulation.run_simulation();
    }

    return get_simulation_json();
}

#[wasm_bindgen]
pub fn get_n_nodes() -> usize {
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
