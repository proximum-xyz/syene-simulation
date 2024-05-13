import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, Popup, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Ellipse, { EllipseProps } from './LeafletEllipse';
import init, { simulate, get_compile_parameters, InitOutput } from 'rust-proximum-simulation';
import { COLORS, CompilerParams, Simulation, SimulationParams } from '../types';
import GeodesicLine from './GeodesicLine';
import SimulationOverlay from './SimulationOverlay';
import styled from 'styled-components';
import { CoordPair, cellToBoundary } from 'h3-js';

function rad2deg(radians: number) {
  return radians * 180 / Math.PI;
}

const DarkModePopup = styled(Popup)`
  .leaflet-popup-content-wrapper {
    background-color: #1f1f1f;
    color: #ffffff;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .leaflet-popup-tip {
    background-color: #1f1f1f;
  }

  .leaflet-popup-close-button {
    color: #ffffff;
  }

  .leaflet-popup-close-button:hover {
    color: #ff4081;
  }
`;

const Map = () => {
  const [simulation, setSimulation] = useState<Simulation>();

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

    console.log('***', { sim });

  }

  const nodeContent = (simulation && simulation.nodes.length > 0) ? simulation.nodes.map((node, i) => {
    // asserted H3 index
    const assertedPolygonBoundary = cellToBoundary(node.asserted_index);
    const estimatedPolygonBoundary = cellToBoundary(node.estimated_index);
    const trueLatLngDeg = [node.true_wgs84.latitude, node.true_wgs84.longitude].map(rad2deg) as [number, number];
    const assertedLatLngDeg = [node.asserted_wgs84.latitude, node.asserted_wgs84.longitude].map(rad2deg) as [number, number];
    const estLatLngDeg = [node.estimated_wgs84.latitude, node.estimated_wgs84.longitude].map(rad2deg) as [number, number];

    // Convert covariances to standard deviations: the ellipse represents the 1 Std. Dev. confidence interval.
    const ellipseRadii1StdDev = [node.en_variance_semimajor_axis_length, node.en_variance_semiminor_axis_length].map(Math.sqrt) as [number, number];
    const ellipseTilt = rad2deg(Math.atan2(node.en_variance_semimajor_axis[1], node.en_variance_semimajor_axis[0]));
    const ellipseConfig: EllipseProps = {
      center: estLatLngDeg,
      radii: ellipseRadii1StdDev,
      tilt: ellipseTilt,
      options: {
        color: COLORS.blue
      }
    }

    return (
      <React.Fragment key={i}>
        {/* H3 tilse */}
        <Polygon positions={assertedPolygonBoundary} color={COLORS.purple} fillColor={COLORS.purple} fillOpacity={0.2} weight={1}>
          <DarkModePopup>Node {i}: asserted H3 polygon {node.asserted_index}</DarkModePopup>
        </Polygon>

        <Polyline positions={[assertedLatLngDeg, trueLatLngDeg, estLatLngDeg]} color={COLORS.green} weight={1} />
        {/* {i > 0 && <GeodesicLine points={[node0TrueLatLngDeg, trueLatLngDeg]} options={{ color: "gray", opacity: 0.5 }} />} */}
        <CircleMarker center={estLatLngDeg} color={COLORS.blue} fill fillColor={COLORS.blue} radius={3} />
        <CircleMarker center={assertedLatLngDeg} color={COLORS.purple} fill fillColor={COLORS.purple} radius={3}>
          <DarkModePopup>Node {i}: asserted position</DarkModePopup>
        </CircleMarker>

        {/* 1 standard deviation location confidence ellipse */}

        <Ellipse {...ellipseConfig}>
          <DarkModePopup>Node {i}: estimated position and 1σ uncertainty ellipse</DarkModePopup>
        </Ellipse>

        {/* <CircleMarker center={trueLatLngDeg} color={COLORS.green} fill fillColor={COLORS.green} radius={4} /> */}

        {/* <GeodesicLine points={[trueLatLngDeg, assertedLatLngDeg]} options={{ color: "ff8c00" }} />
        <GeodesicLine points={[trueLatLngDeg, estLatLngDeg]} options={{ color: COLORS.blue }} /> */}
        <Marker position={trueLatLngDeg} icon={L.divIcon({
          className: 'leaflet-custom-marker',
          html: `<div>${i}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })}>
          <DarkModePopup>Node {i}: true position</DarkModePopup>
        </Marker>
      </React.Fragment >
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