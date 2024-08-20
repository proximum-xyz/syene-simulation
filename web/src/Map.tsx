import React, { useState, useEffect } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import init, { simulate, InitOutput } from 'rust-proximum-simulation';
import { PATHS, Simulation, SimulationConfig } from './types';
import SimulationOverlay from './simulation/SimulationOverlay';
import { SimulationMapContent } from './simulation/SimulationMapContent';
import WelcomeModal from './WelcomeModal';
import { TestnetMapContent } from './testnet/TestnetMapContent';

const Map = () => {
  const [simulation, setSimulation] = useState<Simulation>();

  // initialize WASM
  const [wasm, setWasm] = useState<InitOutput>();

  useEffect(() => {
    (async () => {
      setWasm(await init());
    })()
  }, []);

  function runSimulation(simulationConfig: SimulationConfig) {
    const simString = simulate(simulationConfig);

    const sim = JSON.parse(simString);
    setSimulation(sim);

    console.log('***', { sim });

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
              <SimulationMapContent nodes={simulation?.nodes} />
              {wasm && <SimulationOverlay
                runSimulation={runSimulation}
                simulation={simulation}
                wasm={wasm}
              />}
            </>
          } />
        </Route>
      </Routes>
    </MapContainer >
  );
};

export default Map;