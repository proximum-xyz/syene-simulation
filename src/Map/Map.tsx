import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
// import * as h3 from 'h3-js';
import init, { simulate, get_compile_parameters, initSync } from 'rust-proximum-simulation';
import SimulationControls, { SimulationParams } from './SimulationControls';
import { CompileParameters, Node } from '../types';
import IntroModal from './IntroModal';
import GeodesicLine from './GeodesicLine';

function rad2deg(radians: number) {
  return radians * 180 / Math.PI;
}

const Map = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [showIntroModal, setShowIntroModal] = useState(true);
  const [compileParameters, setCompilerParameters] = useState<CompileParameters>();

  useEffect(() => {
    (async () => {
      await init(); // initialize WASM code
      const compileParameters = JSON.parse(get_compile_parameters());
      setCompilerParameters(compileParameters);
    })()
  }, []);

  function runSimulation(simulationParams: SimulationParams) {
    const simString = simulate(
      simulationParams.h3Resolution,
      simulationParams.realChannelSpeed[0],
      simulationParams.realChannelSpeed[1],
      // convert µs to seconds
      simulationParams.realLatency[0] * 1e-6,
      // convert µs to seconds
      simulationParams.realLatency[1] * 1e-6,
      // convert km to meters
      simulationParams.modelDistanceMax * 1000,
      simulationParams.modelStateNoiseScale,
      simulationParams.modelMeasurementVariance,
      simulationParams.modelSignalSpeedFraction,
      // convert µs to seconds
      simulationParams.modelNodeLatency * 1e-6,
      simulationParams.nEpochs,
    );

    const sim = JSON.parse(simString);
    setNodes(sim.nodes);
  }

  const closeIntroModal = () => setShowIntroModal(false);


  if (showIntroModal) {
    return <IntroModal onClose={closeIntroModal} />;
  }

  const nodeContent = nodes.map((node, i) => {
    if (nodes.length === 0) return null;
    const trueLatLngDeg = [node.true_wgs84.latitude, node.true_wgs84.longitude].map(rad2deg) as [number, number];
    const estLatLngDeg = [node.estimated_wgs84.latitude, node.estimated_wgs84.longitude].map(rad2deg) as [number, number];

    const node0TrueLatLngDeg = [nodes[0].true_wgs84.latitude, nodes[0].true_wgs84.longitude].map(rad2deg) as [number, number]

    return (
      <React.Fragment key={i}>
        {i > 0 && <GeodesicLine points={[node0TrueLatLngDeg, trueLatLngDeg]} options={{ color: "gray", opacity: 0.5 }} />}
        <GeodesicLine points={[trueLatLngDeg, estLatLngDeg]} />
        <CircleMarker center={estLatLngDeg} color="orange" fill fillColor="orange" radius={3} />
        <CircleMarker center={trueLatLngDeg} color="blue" radius={3} />
        <Marker position={trueLatLngDeg} icon={L.divIcon({
          className: 'leaflet-custom-marker',
          html: `<div>${i}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })} />
      </React.Fragment>
    );
  });

  return (
    <>
      <MapContainer center={[0, 0]} zoom={3} zoomControl={false} style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          subdomains='abcd'
          minZoom={1}
          maxZoom={20}
          noWrap={true}
        />

        {nodeContent}
        {/* <Pane name="custom-control-pane" style={{ zIndex: 1000000, position: 'absolute', top: 0, left: 0, height: '100%', width: '100%' }}> */}
        {compileParameters && <div style={{ zIndex: 1000000, position: 'absolute', top: 0, left: 0, height: '100%', width: '100%' }}>
          <SimulationControls runSimulation={runSimulation} nNodes={compileParameters.n_nodes} nMeasurements={compileParameters.n_measurements} />
        </div>}
        {/* </Pane> */}
      </MapContainer >

    </>
  );
};

export default Map;