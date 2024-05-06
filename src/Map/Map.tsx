import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
// import * as h3 from 'h3-js';
import init, { simulate } from 'rust-proximum-simulation';
import SimulationControls, { SimulationParams } from './SimulationControls';
import { Node } from '../types';
import IntroModal from './IntroModal';
import GeodesicLine from './GeodesicLine';

function rad2deg(radians: number) {
  return radians * 180 / Math.PI;
}

const Map = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [showIntroModal, setShowIntroModal] = useState(true);

  useEffect(() => {
    init(); // initialize WASM code
  }, []);

  function runSimulation(simulationParams: SimulationParams) {
    const simString = simulate(
      simulationParams.h3Resolution,
      simulationParams.realChannelSpeedMin,
      simulationParams.realChannelSpeedMax,
      simulationParams.realLatencyMin,
      simulationParams.realLatencyMax,
      simulationParams.modelDistanceMax,
      simulationParams.modelStateNoiseScale,
      simulationParams.modelMeasurementVariance,
      simulationParams.modelSignalSpeedFraction,
      simulationParams.modelNodeLatency,
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
        <div style={{ zIndex: 1000000, position: 'absolute', top: 0, left: 0, height: '100%', width: '100%' }}>
          <SimulationControls runSimulation={runSimulation} />
        </div>
        {/* </Pane> */}
      </MapContainer >

    </>
  );
};

export default Map;



// import React, { useEffect, useState, useRef } from 'react';
// import { createRoot } from 'react-dom/client';
// import L, { map } from 'leaflet';
// import 'leaflet/dist/leaflet.css';
// import * as h3 from 'h3-js';
// import arc from 'arc';
// import init, {
//   simulate
// } from 'rust-proximum-simulation';
// import SimulationControls, { SimulationParams } from './SimulationControls';
// import { Node, Simulation } from '../types';

// import IntroModal from './IntroModal';

// function rad2deg(radians: number): number {
//   return radians * (180 / Math.PI);
// }

// // ref: https://github.com/clupasq/h3-viewer

// const Map = () => {
//   const mapRef = useRef<L.Map | null>(null);
//   const controlRef = useRef<HTMLDivElement | null>(null);

//   const [nodes, setNodes] = useState<Node[]>([]);
//   const [showIntroModal, setShowIntroModal] = useState(true);
//   const [activeHelpText, setActiveHelpText] = useState('');

//   const closeIntroModal = () => {
//     setShowIntroModal(false);
//   };

//   useEffect(() => {
//     const initializeMap = () => {
//       if (!mapRef.current) {
//         mapRef.current = L.map('map', {
//           center: [40.75, -124.36951217339822],
//           zoom: 6,
//         });

//         L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
//           attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
//           subdomains: 'abcd',
//           minZoom: 1, // Minimum zoom level - prevent zooming out too far
//           maxZoom: 20, // Maximum zoom level
//         }).addTo(mapRef.current);
//       }

//       return mapRef.current
//     }

//     const updateMapDisplay = () => {
//       if (!mapRef.current) return;
//       const map = mapRef.current;
//       const zoom = map.getZoom();
//       const h3Res = getH3ResForMapZoom(zoom);
//       const bounds = map.getBounds();

//       const boundsPolygon = [
//         [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
//         [bounds.getNorthEast().lat, bounds.getSouthWest().lng],
//         [bounds.getNorthEast().lat, bounds.getNorthEast().lng],
//         [bounds.getSouthWest().lat, bounds.getNorthEast().lng],
//         [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
//       ];
//       // TODO: fix bug when view latitude hits poles
//       // const cells = h3.polygonToCells(boundsPolygon, h3Res);
//       // displayCells(cells);
//     };

//     const map = initializeMap();
//     updateMapDisplay();

//     // Add a control pane
//     if (!controlRef.current) {
//       const controlPane = map.createPane('custom-control-pane');
//       controlPane.style.zIndex = '1000000';

//       const controlContainer = L.DomUtil.create('div', 'custom-control-container', controlPane);
//       controlRef.current = controlContainer;

//       map.getContainer().appendChild(controlPane);


//       const root = createRoot(controlRef.current);
//       root.render(
//         <SimulationControls
//           runSimulation={runSimulation}
//         />
//       );
//     }

//     // Listen to map events to update hexagons on zoom or pan
//     if (mapRef.current) {
//       mapRef.current.on('moveend', updateMapDisplay);
//       mapRef.current.on('zoomend', updateMapDisplay);
//     }

//     // initialize WASM code
//     init()

//     // Cleanup function to remove event listeners
//     return () => {
//       if (mapRef.current) {
//         mapRef.current.off('moveend', updateMapDisplay);
//         mapRef.current.off('zoomend', updateMapDisplay);
//       }
//     };
//   }, []);

//   // display node locations
//   useEffect(() => {
//     if (!mapRef.current) return;

//     // Clear existing node location markers and vectors
//     mapRef.current.eachLayer((layer) => {
//       if (layer instanceof L.CircleMarker || layer instanceof L.Polyline || layer instanceof L.Marker) {
//         mapRef.current!.removeLayer(layer);
//       }
//     });

//     console.log('***', { nodes });

//     if (nodes.length === 0) return;
//     const node0TrueLatLngDeg = [nodes[0].true_wgs84.latitude, nodes[0].true_wgs84.longitude].map(rad2deg) as [number, number]

//     // Display true node locations
//     nodes?.forEach((node, i) => {
//       const trueLatLngDeg = [node.true_wgs84.latitude, node.true_wgs84.longitude].map(rad2deg) as [number, number]
//       const estLatLngDeg = [node.estimated_wgs84.latitude, node.estimated_wgs84.longitude].map(rad2deg) as [number, number]
//       // Line from true to estimated position for this node
//
//     });

//     nodes?.forEach((node, i) => {
//       const trueLatLngDeg = [node.true_wgs84.latitude, node.true_wgs84.longitude].map(rad2deg) as [number, number]
//       const estLatLngDeg = [node.estimated_wgs84.latitude, node.estimated_wgs84.longitude].map(rad2deg) as [number, number]

//       L.circleMarker(estLatLngDeg, {
//         color: 'orange',
//         fillColor: 'orange',
//         fillOpacity: 1,
//         radius: i == 0 ? 5 : 3,
//         opacity: 1,
//       }).addTo(mapRef.current!);

//       L.circleMarker(trueLatLngDeg, {
//         color: 'blue',
//         fillColor: 'blue',
//         fillOpacity: 1,
//         radius: i == 0 ? 5 : 3,
//         opacity: 1,
//       }).addTo(mapRef.current!);

//       L.marker(trueLatLngDeg, {
//         icon: L.divIcon({
//           className: 'leaflet-custom-marker',
//           html: `<div>${i}</div>`,
//           iconSize: [30, 30],
//           iconAnchor: [15, 15],
//         }),
//       }).addTo(mapRef.current!);

//     });

//     // Display a great circle path between two nodes

//   }, [nodes]);

//   function runSimulation(simulationParams: SimulationParams) {
//     console.log('*** Map: about to start simulation with these parameters', { simulationParams });

//     const simString = simulate(
//       simulationParams.h3Resolution,
//       simulationParams.nNodes,
//       simulationParams.realChannelSpeedMin,
//       simulationParams.realChannelSpeedMax,
//       simulationParams.realLatencyMin,
//       simulationParams.realLatencyMax,
//       simulationParams.modelDistanceMax,
//       simulationParams.modelStateNoiseScale,
//       simulationParams.modelMeasurementVariance,
//       simulationParams.modelSignalSpeedFraction,
//       simulationParams.modelNodeLatency,
//       simulationParams.nEpochs,
//       simulationParams.nMeasurements
//     );

//     const sim = JSON.parse(simString) as Simulation;

//     setNodes(sim.nodes);

//     console.log('*** Map: simulation done');
//   }

//   const displayCells = (cells: string[]) => {
//     if (!mapRef.current) return;
//     // Clear existing layers
//     mapRef.current.eachLayer((layer) => {
//       if (layer instanceof L.Polygon) {
//         mapRef.current!.removeLayer(layer);
//       }
//     });

//     cells.forEach(cell => {
//       const boundary = h3.cellToBoundary(cell);
//       L.polygon(boundary, {
//         color: 'white',
//         fillOpacity: 0,
//         weight: 1
//       }).addTo(mapRef.current!);
//     });
//   };

//   const zoomToH3 = {
//     5: 1,
//     6: 2,
//     7: 3,
//     8: 3,
//     // 9: 4,
//     // 10: 5,
//     // 11: 6,
//     // 12: 6,
//     // 13: 7,
//     // 14: 8,
//     // 15: 9,
//     // 16: 9,
//     // 17: 10,
//     // 18: 10,
//     // 19: 11,
//     // 20: 11,
//     // 21: 12,
//     // 22: 13,
//     // 23: 14,
//     // 24: 15,
//   };

//   const getH3ResForMapZoom = (zoom: number) => {
//     return 1;
//     // return Math.min(MAX_ZOOM, zoomToH3[zoom] || Math.floor((zoom - 1) * 0.7));
//   };

//   return (
//     <>
//       <div id="map" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
//       {showIntroModal && <IntroModal onClose={closeIntroModal} />}
//     </>
//   );
// };

// export default Map;