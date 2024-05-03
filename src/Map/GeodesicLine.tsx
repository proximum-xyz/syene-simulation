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
  // const map = useMap()

  const line = new LeafletGeodesicLine(points, { weight: 1, steps: 100, ...options });

  console.log('*** rendering geodesic', { points, line, linepoints: line.points, line_latlngs: line.getLatLngs() });


  return (
    <Polyline pathOptions={options} positions={line.getLatLngs() as unknown as LatLngExpression[]} />
  );

  // createLeafletElement(props: any) {
  //   const { positions, options } = props
  //   return new LeafletGeodesicLine(positions, options)
  // }

  // updateLeafletElement(fromProps: any, toProps: any) {
  //   if (toProps.positions !== fromProps.positions) {
  //     this.leafletElement.setLatLngs(toProps.positions)
  //   }
  //   this.setStyleIfChanged(fromProps, toProps)
  // }
}

export default GeodesicLine;