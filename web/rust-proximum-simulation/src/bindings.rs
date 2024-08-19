#![allow(non_snake_case)]
use crate::types::{Simulation, SimulationConfig};
use console_log::init_with_level;
use log::LevelFilter;
use serde_json;
use serde_wasm_bindgen::from_value;
use wasm_bindgen::prelude::*;

pub fn init_logger() {
    // ;
    if log::max_level() == LevelFilter::Off {
        init_with_level(log::Level::Info).expect("error initializing logger");
    }
}

#[wasm_bindgen]
pub fn simulate(js_config: JsValue) -> Result<String, JsValue> {
    // some helpful instrumentation for JS work.
    init_logger();
    console_error_panic_hook::set_once();

    let config: SimulationConfig = from_value(js_config).map_err(|e| e.to_string())?;

    let mut simulation = Simulation::new(config);
    let _ = simulation.run_simulation();

    let json = serde_json::to_string(&simulation).unwrap();
    Ok(json)
}
