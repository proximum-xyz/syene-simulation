// #![allow(non_snake_case)]
use crate::{
    kalman::N_MEASUREMENTS,
    types::{ChunkResult, CompilerParams, Simulation, SimulationConfig},
};
use console_log::init_with_level;
use log::{info, LevelFilter};
// use serde_json;
// use serde_wasm_bindgen::from_value;
// use wasm_bindgen::prelude::*;

// #[wasm_bindgen]
// pub fn simulate(js_config: JsValue) -> Result<String, JsValue> {
//     // some helpful instrumentation for JS work.
//     init_logger();
//     console_error_panic_hook::set_once();

//     let config: SimulationConfig = from_value(js_config).map_err(|e| e.to_string())?;

//     let mut simulation = Simulation::new(config);
//     let _ = simulation.run_simulation().map_err(|e| e.to_string())?;

//     let json = serde_json::to_string(&simulation).unwrap();
//     Ok(json)
// }

use std::cell::RefCell;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn get_compile_parameters() -> String {
    let parameters = CompilerParams {
        n_measurements: N_MEASUREMENTS,
    };
    let json = serde_json::to_string(&parameters).unwrap();
    json
}

pub fn init_logger() {
    // ;
    if log::max_level() == LevelFilter::Off {
        init_with_level(log::Level::Info).expect("error initializing logger");
    }
}

thread_local! {
    static SIMULATION: RefCell<Option<Simulation>> = RefCell::new(None);
}

#[wasm_bindgen]
pub fn initialize_simulation(config: JsValue) -> Result<(), JsValue> {
    init_logger();
    let config: SimulationConfig = serde_wasm_bindgen::from_value(config)?;
    let simulation = Simulation::new(config);
    SIMULATION.with(|sim| {
        *sim.borrow_mut() = Some(simulation);
    });

    info!("initialized simulation: {:#?}", SIMULATION);
    Ok(())
}

#[wasm_bindgen]
pub fn run_simulation_chunk(epochs: u32) -> Result<JsValue, JsValue> {
    SIMULATION.with(|sim| {
        let mut simulation = sim.borrow_mut();
        let simulation = simulation.as_mut().ok_or("Simulation not initialized")?;

        // info!("loaded simulation: {:#?}", SIMULATION);

        for i in 0..epochs {
            if let Err(e) = simulation.run_epoch() {
                return Err(JsValue::from_str(&format!(
                    "Error running epoch {}: {}",
                    i, e
                )));
            }
        }

        // info!("nodes after epoch: {:#?}", simulation.nodes);

        let chunk_result = ChunkResult {
            nodes: simulation.nodes.clone(),
            stats: simulation.stats.clone(),
        };

        // info!("chunk result: {:#?}", chunk_result);

        Ok(serde_wasm_bindgen::to_value(&chunk_result)?)
    })
}
