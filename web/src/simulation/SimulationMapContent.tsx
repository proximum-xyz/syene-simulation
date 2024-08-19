import React from 'react';
import { CircleMarker, Marker, Polyline, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Ellipse, { EllipseProps } from './LeafletEllipse';
import { COLORS } from '../types';
import NodeDescriptionPopup, { POSITION_TYPE } from './NodeDescriptionPopup';
import { cellToBoundary } from 'h3-js';
import { rad2deg } from '../utils';
import { Node } from '../types';

export const SimulationMapContent = ({ nodes }: { nodes: Node[] | undefined }) => {

  if (!nodes || nodes.length == 0) {
    return null;
  }

  const content = nodes.map((node, i) => {
    // asserted H3 index
    const assertedPolygonBoundary = cellToBoundary(node.asserted_index);
    const trueLatLngDeg = [node.true_wgs84.latitude, node.true_wgs84.longitude].map(rad2deg) as [number, number];
    const assertedLatLngDeg = [node.asserted_wgs84.latitude, node.asserted_wgs84.longitude].map(rad2deg) as [number, number];
    const estLatLngDeg = [node.kf_estimated_wgs84.latitude, node.kf_estimated_wgs84.longitude].map(rad2deg) as [number, number];

    // Convert covariances to standard deviations: the ellipse represents the 1 Std. Dev. confidence interval.
    const ellipseRadii1StdDev = [node.kf_en_variance_semimajor_axis_length, node.kf_en_variance_semiminor_axis_length].map(Math.sqrt) as [number, number];
    const ellipseTilt = rad2deg(Math.atan2(node.kf_en_variance_semimajor_axis[1], node.kf_en_variance_semimajor_axis[0]));
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

        <Polyline positions={[assertedLatLngDeg, trueLatLngDeg, estLatLngDeg]} color={COLORS.grey} weight={1} />
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
  })

  return (
    <>
      {content}
    </>
  )
}