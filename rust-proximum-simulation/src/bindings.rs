#![allow(non_snake_case)]
use crate::types::Simulation;
use console_log::{init, init_with_level};
use log::LevelFilter;
use nalgebra::Matrix3;
use serde_json;
// use serde_wasm_bindgen::to_value;
use wasm_bindgen::prelude::*;

pub fn init_logger() {
    // ;
    if log::max_level() == LevelFilter::Off {
        init_with_level(log::Level::Trace).expect("error initializing logger");
    }
}

#[wasm_bindgen]
pub fn simulate(
    h3Resolution: i32,
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
) -> String {
    let mut simulation = Simulation::new(
        h3Resolution,
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
    );
    // some helpful instrumentation for JS work.
    init_logger();
    console_error_panic_hook::set_once();
    simulation.run_simulation();

    let json = serde_json::to_string(&simulation).unwrap();
    json

    // TODO: figure out how to handle the H3 indices which are blowing up the serialization
    // to_value(&simulation).unwrap()
}
