'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getCancelledIncidentIds, getTierColorScheme, type TierColorScheme } from '../utils/store';

export { type TierColorScheme, getTierColorScheme };

interface Incident {
  id: string;
  category: string;
  lat: number;
  lng: number;
  status: string;
  baseTariff: number;
  timestamp: string;
}

interface Mechanic {
  id: string | number;
  name: string;
  businessName?: string;
  phone?: string;
  nic?: string;
  city?: string;
  lat: number;
  lng: number;
  tier: string;
  radius?: number;
  isAvailable?: boolean;
  isOpen?: boolean;
  maxCapacity?: number;
  activeJobs?: number;
  employees?: any[];
  pendingLocation?: any;
}

interface MapInnerProps {
  userLocation: [number, number];
  mapCenter?: [number, number];
  isBrowsingRegion?: boolean;
  incidents: Incident[];
  mechanics: Mechanic[];
  reportMode: boolean;
  reportLocation: [number, number];
  onReportLocationChange: (lat: number, lng: number) => void;
  audioAlertEnabled: boolean;
  zoom?: number;
}

const createUserIcon = () => {
  if (typeof window === 'undefined' || typeof L === 'undefined') return null as any;
  return L.divIcon({
    className: 'custom-user-icon',
    html: `
      <div class="relative flex items-center justify-center h-10 w-10">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
        <div class="relative flex items-center justify-center h-8 w-8 rounded-full bg-cyan-500 text-slate-950 shadow-2xl border-2 border-white font-extrabold text-sm">
          🚗
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const createReportIcon = () => {
  if (typeof window === 'undefined' || typeof L === 'undefined') return null as any;
  return L.divIcon({
    className: 'custom-report-icon',
    html: `
      <div class="relative flex items-center justify-center h-10 w-10">
        <span class="absolute inline-flex h-full w-full rounded-full bg-accent-orange opacity-40 animate-ping"></span>
        <div class="relative flex items-center justify-center h-8 w-8 rounded-full bg-accent-orange border border-white text-white font-bold text-sm shadow-xl shadow-orange-950/50">
          📍
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const createIncidentIcon = (category: string) => {
  if (typeof window === 'undefined' || typeof L === 'undefined') return null as any;
  const iconEmoji =
    category === 'Smoke/Overheating'
      ? '💨'
      : category === 'Flat Tire'
      ? '🛞'
      : category === 'Electrical/Won\'t Start'
      ? '⚡'
      : '🛑';
  return L.divIcon({
    className: 'custom-incident-icon',
    html: `
      <div class="relative flex items-center justify-center h-10 w-10">
        <div class="absolute inset-0 bg-accent-orange/20 rounded-full border border-accent-orange/40 animate-pulse"></div>
        <div class="relative flex items-center justify-center h-7 w-7 rounded-full bg-accent-orange text-white shadow-lg border border-slate-900 text-xs">
          ${iconEmoji}
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};


const createMechanicIcon = (tier: string) => {
  if (typeof window === 'undefined' || typeof L === 'undefined') return null as any;
  const scheme = getTierColorScheme(tier);
  return L.divIcon({
    className: 'custom-mechanic-icon',
    html: `
      <div class="relative flex items-center justify-center h-10 w-10">
        <div class="absolute inset-0 rounded-full opacity-75 animate-ping" style="background-color: ${scheme.hexColor}25; border: 1px solid ${scheme.hexColor}60;"></div>
        <div class="relative flex items-center justify-center h-8 w-8 rounded-full text-slate-950 shadow-xl border-2 border-slate-950 text-xs font-black" style="background-color: ${scheme.hexColor};">
          ${scheme.iconSymbol}
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const createRegionCenterIcon = () => {
  if (typeof window === 'undefined' || typeof L === 'undefined') return null as any;
  return L.divIcon({
    className: 'custom-region-icon',
    html: `
      <div class="relative flex items-center justify-center h-10 w-10">
        <div class="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500 text-slate-950 shadow-2xl border-2 border-white font-extrabold text-sm">
          📍
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

function RecenterMap({ position, zoom }: { position: [number, number]; zoom: number }) {
  const map = useMap();
  const prevRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);

  useEffect(() => {
    const lat = position[0];
    const lng = position[1];

    if (
      !prevRef.current ||
      prevRef.current.lat !== lat ||
      prevRef.current.lng !== lng ||
      prevRef.current.zoom !== zoom
    ) {
      prevRef.current = { lat, lng, zoom };
      map.setView([lat, lng], zoom);
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [position[0], position[1], zoom, map]);

  return null;
}

export default function MapInner({
  userLocation,
  mapCenter,
  isBrowsingRegion,
  incidents,
  mechanics,
  reportMode,
  reportLocation,
  onReportLocationChange,
  audioAlertEnabled,
  zoom = 14,
}: MapInnerProps) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const userMarkerRef = useRef<any>(null);

  const effectiveCenter = mapCenter || userLocation;

  // Active hazards filtering
  const activeIncidents = useMemo(() => {
    const cancelledIds = getCancelledIncidentIds();
    return incidents.filter((i) => i.status !== 'Cancelled' && i.status !== 'Resolved' && !cancelledIds.has(String(i.id)));
  }, [incidents]);

  // Audio warning alert beeps logic
  useEffect(() => {
    if (!audioAlertEnabled || typeof window === 'undefined') return;

    const playWarningBeep = () => {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, audioCtxRef.current.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtxRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(audioCtxRef.current.destination);
        osc.start();
        osc.stop(audioCtxRef.current.currentTime + 0.4);
      } catch (e) {
        console.log('Audio Context Error', e);
      }
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3;
      const phi1 = (lat1 * Math.PI) / 180;
      const phi2 = (lat2 * Math.PI) / 180;
      const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
      const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const interval = setInterval(() => {
      let isNearHazard = false;
      for (const incident of activeIncidents) {
        const dist = calculateDistance(userLocation[0], userLocation[1], incident.lat, incident.lng);
        if (dist <= 2000) {
          isNearHazard = true;
          break;
        }
      }
      if (isNearHazard) {
        playWarningBeep();
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [audioAlertEnabled, userLocation, activeIncidents]);

  const reportMarkerHandlers = useMemo(
    () => ({
      dragend(e: any) {
        const marker = e.target;
        if (marker != null) {
          const latLng = marker.getLatLng();
          onReportLocationChange(latLng.lat, latLng.lng);
        }
      },
    }),
    [onReportLocationChange]
  );

  return (
    <MapContainer
      center={effectiveCenter}
      zoom={zoom}
      scrollWheelZoom={true}
      className="w-full h-full z-10"
      zoomControl={false}
    >
      {/* High-Performance Watermark-Free Dark Map Tiles */}
      <TileLayer
        className="dark-tiles"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &mdash; RouteRescue LK'
        maxZoom={19}
      />

      <RecenterMap position={effectiveCenter} zoom={zoom} />

      {/* Driver Vehicle Car Location Marker */}
      <Marker position={userLocation} icon={createUserIcon()} ref={userMarkerRef}>
        <Popup>
          <div className="text-xs p-1 text-slate-200">
            <span className="font-bold text-cyan-400">
              {userLocation[0] === 7.8731 ? '📍 Platform Central Operations Node' : '🚗 Your Vehicle GPS Location'}
            </span>
            <br />
            <span className="text-[10px] text-slate-400">{userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}</span>
          </div>
        </Popup>
      </Marker>

      {/* Browsing Region Center Marker */}
      {isBrowsingRegion && mapCenter && (
        <Marker position={mapCenter} icon={createRegionCenterIcon()}>
          <Popup>
            <div className="text-xs p-1 text-slate-200">
              <span className="font-bold text-amber-400">📍 Region Inspection Center</span>
              <br />
              <span className="text-[10px] text-slate-400">Showing regional rescue garages</span>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Report breakdown draggable pin marker */}
      {reportMode && (
        <Marker
          position={reportLocation}
          icon={createReportIcon()}
          draggable={true}
          eventHandlers={reportMarkerHandlers}
        >
          <Popup>
            <div className="text-xs p-1 font-semibold text-slate-100">
              Drag pin to adjust exact breakdown location.
            </div>
          </Popup>
        </Marker>
      )}

      {/* Active Incident Pins with 2km Hazard Rings (Excludes Cancelled/Resolved) */}
      {activeIncidents.map((incident) => (
        <React.Fragment key={incident.id}>
          <Marker position={[incident.lat, incident.lng]} icon={createIncidentIcon(incident.category)}>
            <Popup>
              <div className="text-xs p-2 text-slate-200">
                <div className="font-bold text-accent-orange text-sm mb-1">{incident.category}</div>
                <div className="text-slate-400 mb-1">Status: <span className="text-accent-yellow">{incident.status}</span></div>
                <div className="text-slate-400 mb-1">Fee Estimate: <span className="text-accent-green font-semibold">{incident.baseTariff.toLocaleString()} LKR</span></div>
                <div className="text-[10px] text-slate-500">Reported: {new Date(incident.timestamp).toLocaleTimeString()}</div>
              </div>
            </Popup>
          </Marker>

          <Circle
            center={[incident.lat, incident.lng]}
            radius={2000}
            pathOptions={{
              className: 'pulsing-radar-circle',
              color: '#FF5722',
              fillColor: '#FF5722',
              fillOpacity: 0.05,
              weight: 1.5,
              dashArray: '4, 8',
            }}
          />
        </React.Fragment>
      ))}

      {/* Verified Mechanics - All Approved Garages Remain Permanently Visible with Tier-Colored Coverage Circles */}
      {mechanics.map((mech) => {
        const scheme = getTierColorScheme(mech.tier);
        const maxCap = Number(mech.maxCapacity) || 3;
        const activeJobsCount = mech.activeJobs || 0;
        const isFull = activeJobsCount >= maxCap;
        const radiusMeters = (Number(mech.radius) || 5) * 1000;

        return (
          <React.Fragment key={mech.id}>
            {/* Translucent Dispatch Radius Circle color-matched to tier (Only shown when garage is OPEN) */}
            {mech.isOpen !== false && (
              <Circle
                center={[mech.lat, mech.lng]}
                radius={radiusMeters}
                pathOptions={{
                  color: scheme.ringStroke,
                  fillColor: scheme.hexColor,
                  fillOpacity: 0.08,
                  weight: 1.5,
                  dashArray: '5, 5',
                }}
              />
            )}

            <Marker position={[mech.lat, mech.lng]} icon={createMechanicIcon(mech.tier)}>
              <Popup>
                <div className="text-xs p-2.5 text-slate-100 min-w-[220px] space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 gap-2">
                    <div className="font-black text-white text-xs sm:text-sm flex items-center gap-1">
                      🏢 {mech.businessName || mech.name}
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-black shrink-0 uppercase ${scheme.badgeBg} ${scheme.badgeText} ${scheme.badgeBorder}`}>
                      {scheme.iconSymbol} {mech.tier || 'BASIC'} ({mech.radius || 5}km)
                    </span>
                  </div>

                  <div className="space-y-1 bg-slate-950/80 p-2 rounded-xl border border-slate-800 text-[11px]">
                    {mech.name && <div className="text-slate-300">Owner: <strong className="text-white">{mech.name}</strong></div>}
                    {mech.phone && <div className="text-slate-300">Phone: <strong className="text-amber-400">{mech.phone}</strong></div>}
                    {mech.nic && <div className="text-slate-300">NIC: <strong className="text-slate-200">{mech.nic}</strong></div>}
                    {mech.city && <div className="text-slate-400 text-[10px]">District: <strong className="text-slate-300">{mech.city}</strong></div>}
                  </div>

                  <div className="text-[11px] font-bold">
                    {mech.isOpen === false ? (
                      <div className="text-red-400 bg-red-950/60 p-1.5 rounded-lg border border-red-500/40 flex items-center gap-1">
                        <span>🔴 CLOSED / ON LEAVE (Off-Duty)</span>
                      </div>
                    ) : isFull ? (
                      <div className="text-amber-400 bg-amber-950/60 p-1.5 rounded-lg border border-amber-500/40 flex items-center justify-between">
                        <span>🟡 Full Concurrent Capacity</span>
                        <span className="font-mono text-[10px]">{activeJobsCount}/{maxCap} At Same Time</span>
                      </div>
                    ) : (
                      <div className="text-emerald-400 bg-emerald-950/60 p-1.5 rounded-lg border border-emerald-500/40 flex items-center justify-between">
                        <span>🟢 Ready for Dispatch</span>
                        <span className="font-mono text-[10px]">{activeJobsCount}/{maxCap} At Same Time</span>
                      </div>
                    )}
                  </div>

                  {mech.employees && (
                    <div className="text-[10px] text-slate-400 font-medium">
                      Staff: <strong className="text-emerald-400 font-black">{mech.employees.length || 1} Technicians</strong> on Roster
                    </div>
                  )}

                  {mech.pendingLocation && (
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold leading-tight">
                      ⚠️ Location Update Requested: <span className="underline">{mech.pendingLocation.city}</span> (Pending Admin Review)
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
}
