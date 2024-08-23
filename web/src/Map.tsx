import React, { ReactNode } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  children?: ReactNode;
}

const Map: React.FC<MapProps> = ({ children }) => {
  return (
    <div className="absolute inset-0 z-0">
      <MapContainer center={[0, 0]} zoom={3} zoomControl={false} style={{ position: 'absolute', top: 0, left: 0, height: '100vh', width: '100%' }}>
        <TileLayer
          // select a tile layer: https://leaflet-extras.github.io/leaflet-providers/preview/
          // url='https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=b7362424-dc93-458c-9271-a2190be7a1d4'
          // url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
          url='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          subdomains='abcd'
          minZoom={1}
          maxZoom={20}
          noWrap={true}
        />
        {children}
      </MapContainer >
    </div>
  );
};

export default Map;