import React, { useState, useEffect } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import rustWasmInit, { initialize_simulation, InitOutput, run_simulation_chunk } from 'rust-proximum-simulation';
import { PATHS, Simulation, SimulationConfig } from './types';
import SimulationOverlay from './simulation/SimulationOverlay';
import { SimulationMapContent } from './simulation/SimulationMapContent';
import WelcomeModal from './WelcomeModal';
import { TestnetMapContent } from './testnet/TestnetMapContent';

const Map = () => {
  // initialize WASM
  const [wasm, setWasm] = useState<InitOutput>();

  useEffect(() => {
    (async () => {
      setWasm(await rustWasmInit());
    })()
  }, []);

  // const [worker, setWorker] = useState<Worker | null>(null);

  // const [simulation, setSimulation] = useState<Simulation>();
  const [nodes, setNodes] = useState<Simulation["nodes"]>([]);
  const [stats, setStats] = useState<Simulation["stats"]>();
  // const [simulationInitialized, setSimulationInitialized] = useState(false);
  const [progress, setProgress] = useState(0);

  // set up a web worker
  // useEffect(() => {
  //   const worker = new Worker(new URL('./simulation-worker.ts', import.meta.url));
  //   setWorker(worker);

  //   worker.onmessage = (e) => {
  //     const { nodes, stats } = e.data;
  //     setNodes(nodes);
  //     setStats(stats);
  //   };

  //   return () => {
  //     worker.terminate();
  //   };
  // }, []);

  async function resetSimulation(): Promise<void> {
    // set up wasm
    setNodes([]);
    setStats(undefined);
  }

  async function runSimulation(config: SimulationConfig): Promise<void> {
    // This is clearly a new simulation
    if (nodes?.length === 0) {
      await initialize_simulation(config);
      await resetSimulation()
      // setSimulationInitialized(true);
    }

    console.log('***', { config });


    const CHUNK_SIZE = 25; // Adjust based on performance

    const totalEpochs = config.n_epochs;
    const chunks = Math.ceil(totalEpochs / CHUNK_SIZE);

    // run through each chunk in the background using a web worker
    for (let i = 0; i < chunks; i++) {
      const remainingEpochs = totalEpochs - i * CHUNK_SIZE;
      const chunkSize = Math.min(CHUNK_SIZE, remainingEpochs);

      const { nodes, stats } = await run_simulation_chunk(chunkSize);

      setNodes(nodes);
      setStats(stats);

      setProgress((i + 1) / chunks * 100);

      // give UI a chance to update
      await new Promise(resolve => setTimeout(resolve, 0));
      // if (worker) {
      //   worker.postMessage(chunkSize);
      // }
      // else {
      //   alert("worker not yet initialized")
      // }
    }

    setProgress(0);
  }

  return (
    <MapContainer center={[0, 0]} zoom={3} zoomControl={false} style={{ position: 'absolute', top: 0, left: 0, height: '100vh', width: '100%' }}>
      <TileLayer
        // select a tile layer: https://leaflet-extras.github.io/leaflet-providers/preview/
        // url='https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=b7362424-dc93-458c-9271-a2190be7a1d4'
        // url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        url='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        subdomains='abcd'
        minZoom={1}
        maxZoom={20}
        noWrap={true}
      />

      <Routes>
        <Route path={PATHS.home} element={<Outlet />}>
          <Route index element={<WelcomeModal />} />
          <Route path={PATHS.register} element={<TestnetMapContent />} />
          <Route path={PATHS.simulation} element={
            <>
              <SimulationMapContent nodes={nodes} />
              {wasm && <SimulationOverlay
                progress={progress}
                wasm={wasm}
                stats={stats}
                runSimulation={runSimulation}
                resetSimulation={resetSimulation}
              />}
            </>
          } />
        </Route>
      </Routes>
    </MapContainer >
  );
};

export default Map;