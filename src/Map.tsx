import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as h3 from 'h3-js';
import init, {
  create_simulation,
  run_simulation,
} from 'proximum-simulation';
import SimulationControls, { SimulationParams } from './SimulationControls';

// ref: https://github.com/clupasq/h3-viewer

const Map = () => {
  const mapRef = useRef<L.Map | null>(null);
  const controlRef = useRef<HTMLDivElement | null>(null);
  // const simulationRef = useRef(null);

  // const updateSimulationParams = (newParams: Partial<SimulationParams>) => {
  //   console.log('*** Map here are new params', { newParams });

  //   setSimulationParams((prevParams: SimulationParams) => ({
  //     ...prevParams,
  //     ...newParams,
  //   }));
  // }

  const [trueNodeLocations, setTrueNodeLocations] = useState([]);
  const [estimatedNodeLocations, setEstimatedNodeLocations] = useState([]);

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

        console.log('*** set up map', { mapRef });
      }

      return mapRef.current
    }

    const updateMapDisplay = () => {
      if (!mapRef.current) return;

      console.log("*** updating map")
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

      const cells = h3.polygonToCells(boundsPolygon, h3Res);

      console.log('***', { boundsPolygon, cells });

      displayCells(cells);
    };

    const displayNodeLocations = () => {

      if (!mapRef.current) return;
      // Clear existing node location markers
      mapRef.current.eachLayer((layer) => {
        if (layer instanceof L.CircleMarker) {
          mapRef.current!.removeLayer(layer);
        }
      });

      // Display true node locations
      trueNodeLocations.forEach(([lat, lng]) => {
        L.circleMarker([lat, lng], {
          color: 'green',
          fillColor: 'green',
          fillOpacity: 1,
          radius: 5,
        }).addTo(mapRef.current!);
      });

      // Display estimated node locations
      estimatedNodeLocations.forEach(([lat, lng]) => {
        L.circleMarker([lat, lng], {
          color: 'red',
          fillColor: 'red',
          fillOpacity: 1,
          radius: 5,
        }).addTo(mapRef.current!);
      });
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

  function runSimulation(simulationParams: SimulationParams) {
    console.log('*** Map: about to start simulation with these parameters', { simulationParams });
    create_simulation(
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
    run_simulation();

    console.log('*** Map: simulation done', {});
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