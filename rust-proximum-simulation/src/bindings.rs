#![allow(non_snake_case)]
use crate::{
    kalman::N_MEASUREMENTS,
    types::{CompilerParams, Simulation},
};
use console_log::init_with_level;
use log::LevelFilter;
use serde_json;
// use serde_wasm_bindgen::to_value;
use wasm_bindgen::prelude::*;

pub fn init_logger() {
    // ;
    if log::max_level() == LevelFilter::Off {
        init_with_level(log::Level::Info).expect("error initializing logger");
    }
}

#[wasm_bindgen]
pub fn simulate(
    nNodes: usize,
    nEpochs: usize,
    h3Resolution: i32,
    assertedPositionVariance: f64,
    betaMin: f64,
    betaMax: f64,
    betaVariance: f64,
    tauMin: f64,
    tauMax: f64,
    tauVariance: f64,
    messageDistanceMax: f64,
    modelPositionVariance: f64,
    modelBeta: f64,
    modelBetaVariance: f64,
    modelTau: f64,
    modelTauVariance: f64,
    modelTofObservationVariance: f64,
) -> String {
    let mut simulation = Simulation::new(
        nNodes,
        nEpochs,
        h3Resolution,
        assertedPositionVariance,
        betaMin,
        betaMax,
        betaVariance,
        tauMin,
        tauMax,
        tauVariance,
        messageDistanceMax,
        modelPositionVariance,
        modelBeta,
        modelBetaVariance,
        modelTau,
        modelTauVariance,
        modelTofObservationVariance,
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

#[wasm_bindgen]
pub fn get_compile_parameters() -> String {
    let parameters: CompilerParams = CompilerParams {
        n_measurements: N_MEASUREMENTS,
    };
    let json = serde_json::to_string(&parameters).unwrap();
    json
}
