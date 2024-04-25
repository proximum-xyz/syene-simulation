import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as h3 from 'h3-js';

// ref: https://github.com/clupasq/h3-viewer

const MAX_ZOOM = 3;

const H3Map = () => {
  const mapRef = useRef(null);

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
          zoom: 6, // Initial zoom level
          minZoom: 1, // Minimum zoom level - prevent zooming out too far
          maxZoom: 20, // Maximum zoom level
        }).addTo(mapRef.current);

        console.log('*** set up map', { mapRef });
      }
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

      console.log('***', { boundsPolygon, cells});
      
      displayCells(cells);
    };




    // const map = mapRef.current;

    // const displayAllCellsAtResolution = (resolution) => {
    //   const cells = h3.getRes0Cells().flatMap(cell =>
    //     h3.cellToChildren(cell, resolution)
    //   );

    //   console.log('***', { cells });
      
    //   cells.forEach(cell => {
    //     const boundary = h3.cellToBoundary(cell);
    //     // const boundary = h3.cellToBoundary(cell).map(([lng, lat]) => [lat, lng]);
    //     L.polygon(boundary, {
    //       color: 'white',
    //       fillOpacity: 0,
    //       weight: 1
    //     }).addTo(mapRef.current);
    //   });
    // };

    // displayAllCellsAtResolution(1);

    initializeMap();
    updateMapDisplay();

    // Listen to map events to update hexagons on zoom or pan
    mapRef.current.on('moveend', updateMapDisplay);
    mapRef.current.on('zoomend', updateMapDisplay);

    // Cleanup function to remove event listeners
    return () => {
      if (mapRef.current) {
        mapRef.current.off('moveend', updateMapDisplay);
        mapRef.current.off('zoomend', updateMapDisplay);
      }
    };
  }, []);

  const displayCells = (cells) => {
    // Clear existing layers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Polygon) {
        mapRef.current.removeLayer(layer);
      }
    });

    cells.forEach(cell => {
      const boundary = h3.cellToBoundary(cell);
      L.polygon(boundary, {
        color: 'white',
        fillOpacity: 0,
        weight: 1
      }).addTo(mapRef.current);
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

  const getH3ResForMapZoom = (zoom) => {
    return 1;
    return Math.min(MAX_ZOOM, zoomToH3[zoom] || Math.floor((zoom - 1) * 0.7));
  };

  return <div id="map" style={{ height: '100vh' }} />;
};

export default H3Map;