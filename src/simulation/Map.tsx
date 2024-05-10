import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import init, { simulate, get_compile_parameters, InitOutput } from 'rust-proximum-simulation';
import { CompilerParams, Simulation, SimulationParams } from '../types';
import IntroModal from './IntroModal';
import GeodesicLine from './GeodesicLine';
import SimulationOverlay from './SimulationOverlay';

function rad2deg(radians: number) {
  return radians * 180 / Math.PI;
}

const Map = () => {
  const [simulation, setSimulation] = useState<Simulation>();
  const [showIntroModal, setShowIntroModal] = useState(true);

  // initialize WASM
  const [wasm, setWasm] = useState<InitOutput>();

  useEffect(() => {
    (async () => {
      setWasm(await init());
    })()
  }, []);

  function runSimulation(simulationParams: SimulationParams) {
    const simString = simulate(
      simulationParams.nNodes,
      simulationParams.nEpochs,
      simulationParams.h3Resolution,
      // convert km stddev to meters^2 variance
      (simulationParams.realAssertedPositionStddev * 1000) ** 2,
      simulationParams.realChannelSpeed[0],
      simulationParams.realChannelSpeed[1],
      // convert µs to seconds
      simulationParams.realLatency[0] * 1e-6,
      // convert µs to seconds
      simulationParams.realLatency[1] * 1e-6,
      // convert km to meters
      simulationParams.modelDistanceMax * 1000,
      // convert km stddev to meters variance
      (simulationParams.modelStateStddev * 1000) ** 2,
      // convert km stddev to meters variance
      (simulationParams.modelMeasurementStddev * 1000) ** 2,
      simulationParams.modelSignalSpeedFraction,
      // convert µs to seconds
      simulationParams.modelNodeLatency * 1e-6,
    );

    const sim = JSON.parse(simString);
    setSimulation(sim);
  }

  const closeIntroModal = () => setShowIntroModal(false);

  if (showIntroModal) {
    return <IntroModal onClose={closeIntroModal} />;
  }

  const nodeContent = (simulation && simulation.nodes.length > 0) ? simulation.nodes.map((node, i) => {
    const trueLatLngDeg = [node.true_wgs84.latitude, node.true_wgs84.longitude].map(rad2deg) as [number, number];
    const estLatLngDeg = [node.estimated_wgs84.latitude, node.estimated_wgs84.longitude].map(rad2deg) as [number, number];
    const assertedLatLngDeg = [node.asserted_wgs84.latitude, node.asserted_wgs84.longitude].map(rad2deg) as [number, number];
    // const node0TrueLatLngDeg = [simulation.nodes[0].true_wgs84.latitude, simulation.nodes[0].true_wgs84.longitude].map(rad2deg) as [number, number]

    return (
      <React.Fragment key={i}>
        {/* {i > 0 && <GeodesicLine points={[node0TrueLatLngDeg, trueLatLngDeg]} options={{ color: "gray", opacity: 0.5 }} />} */}
        <CircleMarker center={estLatLngDeg} color="blue" fill fillColor="blue" radius={3} />
        <CircleMarker center={assertedLatLngDeg} color="orange" fill fillColor="orange" radius={3} />
        <CircleMarker center={trueLatLngDeg} color="green" fill fillColor="green" radius={4} />

        <GeodesicLine points={[trueLatLngDeg, assertedLatLngDeg]} options={{ color: "orange" }} />
        <GeodesicLine points={[trueLatLngDeg, estLatLngDeg]} options={{ color: "blue" }} />
        <Marker position={trueLatLngDeg} icon={L.divIcon({
          className: 'leaflet-custom-marker',
          html: `<div>${i}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })} />
      </React.Fragment>
    );
  }) : null;

  return (
    <>
      <MapContainer center={[0, 0]} zoom={3} zoomControl={false} style={{ position: 'absolute', top: 0, left: 0, height: '100vh', width: '100%' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          subdomains='abcd'
          minZoom={1}
          maxZoom={20}
          noWrap={true}
        />

        {nodeContent}

        {wasm && <SimulationOverlay
          runSimulation={runSimulation}
          simulation={simulation}
          wasm={wasm}
        />}
      </MapContainer >

    </>
  );
};

export default Map;