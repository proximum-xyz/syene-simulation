# Proximum Syene Simulation
Simulate the location oracle provided by Proximum's Syene Testnet.

## Use
Try it out at [syene.proximum.io](https://syene.proximum.io). Everything runs in your browser.

## How It Works
This repo includes two components.
* React frontend
* Rust simulation (compiled to WASM)

The interesting stuff all happens in Rust:

## Development
* Install npm: ``
* Install JS dependencies: `npm install`
* install [Rust](https://www.rust-lang.org/tools/install) and [Cargo](https://doc.rust-lang.org/cargo/getting-started/installation.html) 
* Install Rust dependencies and ompile the Rust to WASM: `npm run compile-wasm`
* Run the dev server: `npm start`
* Try the app at `localhost:3000`


