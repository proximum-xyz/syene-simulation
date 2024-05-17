import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Ellipse, { EllipseProps } from './LeafletEllipse';
import init, { simulate, InitOutput } from 'rust-proximum-simulation';
import { COLORS, Simulation, SimulationParams } from '../types';
import SimulationOverlay from './SimulationOverlay';
import NodeDescriptionPopup, { POSITION_TYPE } from './NodeDescriptionPopup';
import { cellToBoundary } from 'h3-js';

function rad2deg(radians: number) {
  return radians * 180 / Math.PI;
}



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
      simulationParams.assertedPositionVariance,
      simulationParams.betaMin,
      simulationParams.betaMax,
      simulationParams.betaVariance,
      simulationParams.tauMin,
      simulationParams.tauMax,
      simulationParams.tauVariance,
      simulationParams.messageDistanceMax,
      simulationParams.modelPositionVariance,
      simulationParams.modelBeta,
      simulationParams.modelBetaVariance,
      simulationParams.modelTau,
      simulationParams.modelTauVariance,
      simulationParams.modelTofObservationVariance,
    );

    const sim = JSON.parse(simString);
    setSimulation(sim);

    console.log('***', { sim });

  }

  const nodeContent = (simulation && simulation.nodes.length > 0) ? simulation.nodes.map((node, i) => {
    // asserted H3 index
    const assertedPolygonBoundary = cellToBoundary(node.asserted_index);
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
        <Polygon positions={assertedPolygonBoundary} color={COLORS.pink} fillColor={COLORS.pink} fillOpacity={0.2} weight={1}>
          <NodeDescriptionPopup node={node} positionType={POSITION_TYPE.assertedCell} />
        </Polygon>

        <Polyline positions={[assertedLatLngDeg, trueLatLngDeg, estLatLngDeg]} color={COLORS.green} weight={1} />
        <CircleMarker center={estLatLngDeg} color={COLORS.blue} fill fillColor={COLORS.blue} radius={3}>
          <NodeDescriptionPopup node={node} positionType={POSITION_TYPE.estimated} />
        </CircleMarker>
        <CircleMarker center={assertedLatLngDeg} color={COLORS.pink} fill fillColor={COLORS.pink} radius={3}>
          <NodeDescriptionPopup node={node} positionType={POSITION_TYPE.asserted} />
        </CircleMarker>
        <Ellipse {...ellipseConfig}>
          <NodeDescriptionPopup node={node} positionType={POSITION_TYPE.estimatedEllipse} />
        </Ellipse>

        {/* <GeodesicLine points={[trueLatLngDeg, assertedLatLngDeg]} options={{ color: "ff8c00" }} />
        <GeodesicLine points={[trueLatLngDeg, estLatLngDeg]} options={{ color: COLORS.blue }} /> */}
        <Marker position={trueLatLngDeg} icon={L.divIcon({
          className: 'leaflet-custom-marker',
          html: `<div>${i}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })}>
          <NodeDescriptionPopup node={node} positionType={POSITION_TYPE.true} />
        </Marker>
      </React.Fragment >
    );
  }) : null;

  return (
    <>
      <MapContainer center={[0, 0]} zoom={3} zoomControl={false} style={{ position: 'absolute', top: 0, left: 0, height: '100vh', width: '100%' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          // attribution="&copy; OpenStreetMap contributors &copy; CARTO"
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