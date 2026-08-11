'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Volume2, VolumeX, ShieldAlert, Navigation, LocateFixed } from 'lucide-react';

import { getCancelledIncidentIds } from '../utils/store';

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
  lat: number;
  lng: number;
  tier: string;
  isAvailable?: boolean;
  pendingLocation?: any;
}

interface MapDashboardProps {
  userLocation: [number, number];
  mapCenter?: [number, number];
  isBrowsingRegion?: boolean;
  incidents: Incident[];
  mechanics: Mechanic[];
  reportMode: boolean;
  reportLocation: [number, number];
  onReportLocationChange: (lat: number, lng: number) => void;
  onRequestAssistance?: () => void;
  onLocateMe?: () => void;
  zoom?: number;
}

const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[450px] flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent-orange"></div>
      <span className="text-xs font-semibold tracking-wider">Loading Safety Radar...</span>
    </div>
  ),
});

export default function MapDashboard({
  userLocation,
  mapCenter,
  isBrowsingRegion,
  incidents,
  mechanics,
  reportMode,
  reportLocation,
  onReportLocationChange,
  onRequestAssistance,
  onLocateMe,
  zoom,
}: MapDashboardProps) {
  const [audioAlertEnabled, setAudioAlertEnabled] = useState(true);
  const [isNearHazard, setIsNearHazard] = useState(false);

  // Active hazards filtering
  const activeIncidents = useMemo(() => {
    const cancelledIds = getCancelledIncidentIds();
    return incidents.filter((i) => i.status !== 'Cancelled' && i.status !== 'Resolved' && !cancelledIds.has(String(i.id)));
  }, [incidents]);

  // Check proximity for visual banner warning (Active non-cancelled, non-resolved hazards only)
  useEffect(() => {
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

    let foundNear = false;
    for (const incident of activeIncidents) {
      const d = calculateDistance(userLocation[0], userLocation[1], incident.lat, incident.lng);
      if (d <= 2000) {
        foundNear = true;
        break;
      }
    }
    setIsNearHazard(foundNear);
  }, [userLocation, activeIncidents]);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      {/* Visual Proximity Alert Banner */}
      {isNearHazard && (
        <div className="absolute top-16 left-4 right-4 z-[999] max-w-md mx-auto">
          <div className="bg-red-500/90 text-white font-bold px-4 py-2.5 rounded-xl border border-red-400 shadow-lg flex items-center gap-3 backdrop-blur-md animate-pulse">
            <ShieldAlert size={22} className="text-white shrink-0 animate-bounce" />
            <div className="flex-grow text-xs leading-snug">
              <div className="font-extrabold uppercase tracking-wide">Approaching Hazard Zone</div>
              <div className="opacity-90 font-normal">Active breakdown reported within 2.0 km. Drive cautiously.</div>
            </div>
          </div>
        </div>
      )}

      {/* Map Content */}
      <div className="absolute inset-0 z-10">
        <MapInner
          userLocation={userLocation}
          mapCenter={mapCenter}
          isBrowsingRegion={isBrowsingRegion}
          incidents={incidents}
          mechanics={mechanics}
          reportMode={reportMode}
          reportLocation={reportLocation}
          onReportLocationChange={onReportLocationChange}
          audioAlertEnabled={audioAlertEnabled}
          zoom={zoom}
        />
      </div>

      {/* Top Floating Control Actions (Glassmorphic) */}
      <div className="absolute top-16 right-4 z-40 flex flex-col gap-2">
        {onLocateMe && (
          <button
            onClick={onLocateMe}
            className="h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg glass-panel text-cyan-400 hover:text-cyan-300 border border-cyan-500/40 bg-slate-900/80"
            title="Center Map on My GPS Location"
          >
            <LocateFixed size={20} className="animate-pulse" />
          </button>
        )}

        <button
          onClick={() => setAudioAlertEnabled(!audioAlertEnabled)}
          className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg ${
            audioAlertEnabled
              ? 'bg-accent-orange text-white border border-orange-400 shadow-orange-950/20'
              : 'glass-panel text-slate-300 hover:text-white'
          }`}
          title={audioAlertEnabled ? 'Mute Proximity Beeps' : 'Unmute Proximity Beeps'}
        >
          {audioAlertEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>

    </div>
  );
}
