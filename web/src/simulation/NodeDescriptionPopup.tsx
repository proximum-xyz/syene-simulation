import React from 'react';
import { Popup } from 'react-leaflet';
import { Node } from '../types';
import styled from 'styled-components';
import Markdown from 'react-markdown';
import { rad2deg } from '../utils';

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

function distanceKm(a: [number, number, number], b: [number, number, number]) {
  return (Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) / 1000).toFixed(1);
}

export enum POSITION_TYPE {
  true,
  asserted,
  assertedCell,
  lsEstimated,
  kfEstimated,
  kfEstimatedEllipse
}

const formatState = (node: Node, positionType: POSITION_TYPE) => (
  `
Latitude: ${rad2deg(node.true_wgs84.latitude).toFixed(2)}° ${positionType === POSITION_TYPE.kfEstimated && `(Est: ${rad2deg(node.kf_estimated_wgs84.latitude).toFixed(2)}°)`}

Longitude: ${rad2deg(node.true_wgs84.longitude).toFixed(2)}° ${positionType === POSITION_TYPE.kfEstimated && `(Est: ${rad2deg(node.kf_estimated_wgs84.longitude).toFixed(2)}°)`}

β: ${node.true_beta.toFixed(2)} c ${positionType === POSITION_TYPE.kfEstimated && `(Est: ${node.kf_estimated_beta.toFixed(2)} c)`}

τ: ${(node.true_tau * 1000).toFixed(2)} ms ${positionType === POSITION_TYPE.kfEstimated && `(Est: ${(node.kf_estimated_tau * 1000).toFixed(2)} ms)`}
`
)

const NodePopup = ({ node, positionType }: { node: Node, positionType: POSITION_TYPE }) => {

  let title: string;
  let body: string;

  switch (positionType) {
    case POSITION_TYPE.true: {
      title = `Node ${node.id}: true position`
      body = `
${formatState(node, positionType)}
      `;
      break;
    }
    case POSITION_TYPE.asserted: {
      title = `Node ${node.id}: asserted position`
      body = `
Asserted Position Error: ${distanceKm(node.true_position, node.asserted_position)} km
`;
      break;
    }
    case POSITION_TYPE.assertedCell: {
      title = `Node ${node.id}: asserted H3 cell`
      body = `
Asserted Position Error: ${distanceKm(node.true_position, node.asserted_position)} km
`;
      break;
    }
    case POSITION_TYPE.lsEstimated: {
      title = `Node ${node.id}: least-squares estimated position`
      body = `
${formatState(node, positionType)}

Position Error: ${distanceKm(node.true_position, node.ls_estimated_position)} km
`;
      break;
    }
    case POSITION_TYPE.kfEstimated: {
      title = `Node ${node.id}: kalman filter estimated position`
      body = `
${formatState(node, positionType)}

Position Error: ${distanceKm(node.true_position, node.kf_estimated_position)} km
`;
      break;
    }
    case POSITION_TYPE.kfEstimatedEllipse: {
      title = `Node ${node.id}: kalman filter estimated position 1σ ellipse`
      body = `
${formatState(node, positionType)}

Position Error: ${distanceKm(node.true_position, node.kf_estimated_position)} km
`;
      break;
    }
  }
  return (
    <DarkModePopup>
      <h4>{title}</h4>
      <Markdown>
        {body}
      </Markdown>
    </DarkModePopup>
  );
}

export default NodePopup;