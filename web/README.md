# Proximum Syene Simulation
Simulate the location oracle provided by Proximum's Syene Testnet.

## Use
Try it out at [syene.proximum.xyz](https://syene.proximum.xyz). Everything runs in your browser.

## How It Works
This repo includes two components.
* React frontend
* Rust simulation (compiled to WASM so it runs in your browser)

The interesting stuff all happens in Rust:
* Nodes are randomly positioned around the Earth
* We simulate trustless time-of-flight distance measurements between these nodes
* Each node updates its estimated position using an [Extended Kalman Filter](https://en.wikipedia.org/wiki/Extended_Kalman_filter) based on a measurement model of these messages.

See the [Proximum Lightpaper](https://proximum.xyz/proximum-lightpaper.pdf) for more background information.

## Development
* Install [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm), [Rust](https://www.rust-lang.org/tools/install), [Cargo](https://doc.rust-lang.org/cargo/getting-started/installation.html), and [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)
* Install JS dependencies: `npm install`
* Install Rust dependencies and compile the Rust to WASM: `npm run compile-wasm`
* Run the dev server: `npm start`
* Try the app at `localhost:3000`
