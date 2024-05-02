import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import L, { map } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as h3 from 'h3-js';
import arc from 'arc';
import init, {
  simulate
} from 'rust-proximum-simulation';
import SimulationControls, { SimulationParams } from './SimulationControls';
import { Node, Simulation } from './types';

function rad2deg(radians: number): number {
  return radians * (180 / Math.PI);
}

// ref: https://github.com/clupasq/h3-viewer

const Map = () => {
  const mapRef = useRef<L.Map | null>(null);
  const controlRef = useRef<HTMLDivElement | null>(null);

  const [nodes, setNodes] = useState<Node[]>([]);

  useEffect(() => {
    const initializeMap = () => {
      if (!mapRef.current) {
        mapRef.current = L.map('map', {
          center: [40.75, -124.36951217339822],
          zoom: 6,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          minZoom: 1, // Minimum zoom level - prevent zooming out too far
          maxZoom: 20, // Maximum zoom level
        }).addTo(mapRef.current);
      }

      return mapRef.current
    }

    const updateMapDisplay = () => {
      if (!mapRef.current) return;
      const map = mapRef.current;
      const zoom = map.getZoom();
      const h3Res = getH3ResForMapZoom(zoom);
      const bounds = map.getBounds();

      const boundsPolygon = [
        [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
        [bounds.getNorthEast().lat, bounds.getSouthWest().lng],
        [bounds.getNorthEast().lat, bounds.getNorthEast().lng],
        [bounds.getSouthWest().lat, bounds.getNorthEast().lng],
        [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
      ];
      // TODO: fix bug when view latitude hits poles
      // const cells = h3.polygonToCells(boundsPolygon, h3Res);
      // displayCells(cells);
    };

    const map = initializeMap();
    updateMapDisplay();

    // Add a control pane
    if (!controlRef.current) {
      const controlPane = map.createPane('custom-control-pane');
      controlPane.style.zIndex = '1000000';

      const controlContainer = L.DomUtil.create('div', 'custom-control-container', controlPane);
      controlRef.current = controlContainer;

      map.getContainer().appendChild(controlPane);


      const root = createRoot(controlRef.current);
      root.render(
        <SimulationControls
          runSimulation={runSimulation}
        />
      );
    }

    // Listen to map events to update hexagons on zoom or pan
    if (mapRef.current) {
      mapRef.current.on('moveend', updateMapDisplay);
      mapRef.current.on('zoomend', updateMapDisplay);
    }

    // initialize WASM code
    init()

    // Cleanup function to remove event listeners
    return () => {
      if (mapRef.current) {
        mapRef.current.off('moveend', updateMapDisplay);
        mapRef.current.off('zoomend', updateMapDisplay);
      }
    };
  }, []);

  // display node locations
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing node location markers and vectors
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Polyline || layer instanceof L.Marker) {
        mapRef.current!.removeLayer(layer);
      }
    });

    console.log('***', { nodes });

    if (nodes.length === 0) return;
    const node0TrueLatLngDeg = [nodes[0].true_wgs84.latitude, nodes[0].true_wgs84.longitude].map(rad2deg) as [number, number]

    // Display true node locations
    nodes?.forEach((node, i) => {
      const trueLatLngDeg = [node.true_wgs84.latitude, node.true_wgs84.longitude].map(rad2deg) as [number, number]
      const estLatLngDeg = [node.estimated_wgs84.latitude, node.estimated_wgs84.longitude].map(rad2deg) as [number, number]
      // Line from true to estimated position for this node
      if (i == 0) {
        const errorGreatCircle = new arc.GreatCircle({ x: trueLatLngDeg[1], y: trueLatLngDeg[0] }, { x: estLatLngDeg[1], y: estLatLngDeg[0] }, { 'name': 'One measurement' }).Arc(100, { offset: 1 }).json();

        L.polyline(errorGreatCircle.geometry.coordinates.map(c => ([c[1], c[0]])), {
          color: 'orange',
          weight: 2,
          opacity: 0.7,
        }).addTo(mapRef.current!);

        // Line from node 0 to this node
      } else if (i > 0) {
        const measurementGreatCircle = new arc.GreatCircle({ x: node0TrueLatLngDeg[1], y: node0TrueLatLngDeg[0] }, { x: trueLatLngDeg[1], y: trueLatLngDeg[0] }, { 'name': 'One measurement' }).Arc(100, { offset: 1 }).json();

        console.log('***', { node0TrueLatLngDeg, trueLatLngDeg, measurementGreatCircle });

        L.polyline(measurementGreatCircle.geometry.coordinates.map(c => ([c[1], c[0]])), {
          color: 'darkgray',
          weight: 1,
          opacity: 0.4,
        }).addTo(mapRef.current!);
      }

      L.circleMarker(estLatLngDeg, {
        color: 'orange',
        fillColor: 'orange',
        fillOpacity: 1,
        radius: i == 0 ? 5 : 3,
        opacity: 1,
      }).addTo(mapRef.current!);

      L.circleMarker(trueLatLngDeg, {
        color: 'blue',
        fillColor: 'blue',
        fillOpacity: 1,
        radius: i == 0 ? 5 : 3,
        opacity: 1,
      }).addTo(mapRef.current!);
    });

    nodes?.forEach((node, i) => {
      const trueLatLngDeg = [node.true_wgs84.latitude, node.true_wgs84.longitude].map(rad2deg) as [number, number]
      const estLatLngDeg = [node.estimated_wgs84.latitude, node.estimated_wgs84.longitude].map(rad2deg) as [number, number]

      L.circleMarker(estLatLngDeg, {
        color: 'orange',
        fillColor: 'orange',
        fillOpacity: 1,
        radius: i == 0 ? 5 : 3,
        opacity: 1,
      }).addTo(mapRef.current!);

      L.circleMarker(trueLatLngDeg, {
        color: 'blue',
        fillColor: 'blue',
        fillOpacity: 1,
        radius: i == 0 ? 5 : 3,
        opacity: 1,
      }).addTo(mapRef.current!);

      L.marker(trueLatLngDeg, {
        icon: L.divIcon({
          className: 'leaflet-custom-marker',
          html: `<div>${i}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
      }).addTo(mapRef.current!);

    });

    // Display a great circle path between two nodes

  }, [nodes]);

  function runSimulation(simulationParams: SimulationParams) {
    console.log('*** Map: about to start simulation with these parameters', { simulationParams });

    const simString = simulate(
      simulationParams.h3Resolution,
      simulationParams.nNodes,
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
      simulationParams.nMeasurements
    );

    const sim = JSON.parse(simString) as Simulation;

    setNodes(sim.nodes);

    console.log('*** Map: simulation done');
  }

  const displayCells = (cells: string[]) => {
    if (!mapRef.current) return;
    // Clear existing layers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Polygon) {
        mapRef.current!.removeLayer(layer);
      }
    });

    cells.forEach(cell => {
      const boundary = h3.cellToBoundary(cell);
      L.polygon(boundary, {
        color: 'white',
        fillOpacity: 0,
        weight: 1
      }).addTo(mapRef.current!);
    });
  };

  const zoomToH3 = {
    5: 1,
    6: 2,
    7: 3,
    8: 3,
    // 9: 4,
    // 10: 5,
    // 11: 6,
    // 12: 6,
    // 13: 7,
    // 14: 8,
    // 15: 9,
    // 16: 9,
    // 17: 10,
    // 18: 10,
    // 19: 11,
    // 20: 11,
    // 21: 12,
    // 22: 13,
    // 23: 14,
    // 24: 15,
  };

  const getH3ResForMapZoom = (zoom: number) => {
    return 1;
    // return Math.min(MAX_ZOOM, zoomToH3[zoom] || Math.floor((zoom - 1) * 0.7));
  };

  return (
    <div id="map" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
  );
};

export default Map;