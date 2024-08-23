import React, { useState, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import rustWasmInit, { initialize_simulation, InitOutput, run_simulation_chunk } from 'rust-proximum-simulation';
import { Simulation, SimulationConfig } from '../types';
import SimulationOverlay from './SimulationOverlay';
import { SimulationMapContent } from './SimulationMapContent';
import Map from '../Map';

const SimulationView = () => {
  // initialize WASM
  const [wasm, setWasm] = useState<InitOutput>();

  useEffect(() => {
    (async () => {
      setWasm(await rustWasmInit());
    })()
  }, []);

  const [nodes, setNodes] = useState<Simulation["nodes"]>([]);
  const [stats, setStats] = useState<Simulation["stats"]>();
  const [progress, setProgress] = useState(0);

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
    }

    setProgress(0);
  }

  return (
    <>
      {wasm && <SimulationOverlay
        progress={progress}
        wasm={wasm}
        stats={stats}
        runSimulation={runSimulation}
        resetSimulation={resetSimulation}
      />}
      <Map>
        <SimulationMapContent nodes={nodes} />
      </Map>
    </>
  );
};

export default SimulationView;