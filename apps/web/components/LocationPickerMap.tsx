'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface Props {
  position: { lat: number; lng: number } | null;
  onPositionChange: (pos: { lat: number; lng: number }) => void;
  searchCenter?: { lat: number; lng: number } | null;
}

function LocationMarker({ position, onPositionChange }: { position: { lat: number; lng: number } | null, onPositionChange: (pos: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={icon}></Marker>
  );
}

function MapUpdater({ center }: { center: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo([center.lat, center.lng], 15);
    }
  }, [center, map]);
  return null;
}

export default function LocationPickerMap({ position, onPositionChange, searchCenter }: Props) {
  // Default to Vietnam/Hanoi center if no position selected
  const initialCenter = position || { lat: 21.0285, lng: 105.8542 };

  return (
    <MapContainer center={initialCenter} zoom={13} style={{ height: '300px', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationMarker position={position} onPositionChange={onPositionChange} />
      <MapUpdater center={searchCenter || position} />
    </MapContainer>
  );
}
