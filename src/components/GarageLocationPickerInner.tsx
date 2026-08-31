'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface GarageLocationPickerProps {
  location: [number, number];
  onLocationChange: (lat: number, lng: number) => void;
}

const createWorkshopIcon = () =>
  L.divIcon({
    className: 'custom-workshop-picker-icon',
    html: `
      <div class="relative flex items-center justify-center h-10 w-10">
        <div class="absolute inset-0 bg-emerald-500/25 rounded-full border border-emerald-400 animate-pulse"></div>
        <div class="relative flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500 text-slate-950 shadow-2xl border border-slate-950 font-bold text-sm">
          🛠️
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

function RecenterMap({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, 14);
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [position, map]);
  return null;
}

function MapClickHandler({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function GarageLocationPickerInner({ location, onLocationChange }: GarageLocationPickerProps) {
  const markerRef = useRef<any>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          onLocationChange(latLng.lat, latLng.lng);
        }
      },
    }),
    [onLocationChange]
  );

  return (
    <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-800 shadow-inner select-none">
      <MapContainer
        center={location}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full z-10"
        zoomControl={false}
      >
        <TileLayer
          className="dark-tiles"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <RecenterMap position={location} />
        <MapClickHandler onLocationChange={onLocationChange} />

        <Marker
          draggable={true}
          eventHandlers={eventHandlers}
          position={location}
          icon={createWorkshopIcon()}
          ref={markerRef}
        >
          <Popup>
            <div className="text-xs p-1 text-slate-200">
              <span className="font-bold text-emerald-400">🛠️ Garage Workshop Pin</span>
              <br />
              <span className="text-[10px] text-slate-400">Drag pin or click map to set location</span>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Floating Instruction Badge */}
      <div className="absolute top-2 left-2 z-20 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-2.5 py-1 rounded-lg text-[10px] text-emerald-400 font-bold flex items-center gap-1.5 shadow-md">
        <span>📍 Click or Drag Pin on Map</span>
      </div>
    </div>
  );
}
