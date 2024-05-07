import React from 'react';
import { useMap, Polyline } from 'react-leaflet'
import { GeodesicLine as LeafletGeodesicLine } from 'leaflet.geodesic'
import { LatLngExpression } from 'leaflet'

interface GeodesicOptions extends L.PolylineOptions {
  wrap?: boolean;
  steps?: number;
  radius?: number;
}

const GeodesicLine = ({ points, options }: { points: LatLngExpression[], options?: GeodesicOptions }) => {
  const line = new LeafletGeodesicLine(points, { weight: 1, steps: 100, ...options });
  return (
    <Polyline pathOptions={options} positions={line.getLatLngs() as unknown as LatLngExpression[]} />
  );
}

export default GeodesicLine;