'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, AlertTriangle, BatteryCharging, ShieldAlert, Store, Navigation, Clock, CheckCircle2, Star } from 'lucide-react';
import { useSharedState, DEFAULT_ADMIN_SETTINGS, AdminSettings } from '@/utils/store';

interface Mechanic {
  id: string | number;
  name: string;
  businessName?: string;
  phone?: string;
  lat: number;
  lng: number;
  tier: string;
  radius: number;
  isAvailable?: boolean;
  isOpen?: boolean;
  maxCapacity?: number;
  activeJobs?: number;
  pendingLocation?: any;
}

interface TriageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reportLocation: [number, number];
  mechanics: Mechanic[];
  onSubmitIncident: (category: string, baseTariff: number, mechanicId: string | number, distanceKm: number) => void;
}

interface NearbyOption {
  garage: Mechanic;
  distanceKm: number;
  surcharge: number;
  totalFee: number;
  etaMins: number;
}

const SYMPTOMS = [
  {
    id: 'Smoke/Overheating',
    label: 'Smoke / Overheating',
    description: 'Engine smoke, hot coolant leak, high temperature gage',
    icon: Flame,
    color: 'border-red-500/50 hover:border-red-500 text-red-400 bg-red-950/20',
  },
  {
    id: 'Flat Tire',
    label: 'Flat Tire',
    description: 'Puncture, damaged rim, needs spare wheel fitting',
    icon: AlertTriangle,
    color: 'border-amber-500/50 hover:border-amber-500 text-amber-400 bg-amber-950/20',
  },
  {
    id: 'Electrical/Won\'t Start',
    label: 'Electrical / Won\'t Start',
    description: 'Dead battery, click sound, dashboard lights flashing',
    icon: BatteryCharging,
    color: 'border-yellow-500/50 hover:border-yellow-500 text-yellow-400 bg-yellow-950/20',
  },
  {
    id: 'Completely Stalled',
    label: 'Completely Stalled',
    description: 'Sudden loss of power, stuck in middle of lane',
    icon: ShieldAlert,
    color: 'border-orange-500/50 hover:border-orange-500 text-orange-400 bg-orange-950/20',
  },
];

export default function TriageDrawer({
  isOpen,
  onClose,
  reportLocation,
  mechanics,
  onSubmitIncident,
}: TriageDrawerProps) {
  const [adminSettings] = useSharedState<AdminSettings>('routerescue_admin_settings', DEFAULT_ADMIN_SETTINGS);
  const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null);
  const [nearbyGarages, setNearbyGarages] = useState<NearbyOption[]>([]);
  const [selectedGarageId, setSelectedGarageId] = useState<string | number | null>(null);

  const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const flatArrivalFee = Number(adminSettings?.flatRate) || 1000;
  const distanceRate = Number(adminSettings?.perKmRate) || 150;

  useEffect(() => {
    if (!isOpen) return;

    const options: NearbyOption[] = [];

    mechanics.forEach((mech) => {
      if (mech.isOpen === false) return; // Closed / On Leave garages cannot accept emergency calls
      const maxCap = Number(mech.maxCapacity) || 3;
      const activeJobsCount = mech.activeJobs || 0;
      if (activeJobsCount >= maxCap) return;

      const d = getDistanceInKm(reportLocation[0], reportLocation[1], mech.lat, mech.lng);
      const maxRadius = Number(mech.radius) || 5;

      if (d <= maxRadius) {
        const distKm = parseFloat(d.toFixed(1));
        const distSurcharge = Math.ceil(distKm * distanceRate);
        const totalFee = flatArrivalFee + distSurcharge;
        const etaMins = Math.max(2, Math.round(2 + distKm * 2.5));

        options.push({
          garage: mech,
          distanceKm: distKm,
          surcharge: distSurcharge,
          totalFee,
          etaMins,
        });
      }
    });

    // Sort closest first
    options.sort((a, b) => a.distanceKm - b.distanceKm);
    setNearbyGarages(options);

    if (options.length > 0) {
      setSelectedGarageId((prev) => {
        if (prev && options.some((opt) => String(opt.garage.id) === String(prev))) {
          return prev;
        }
        return options[0].garage.id;
      });
    } else {
      setSelectedGarageId(null);
    }
  }, [reportLocation, mechanics, isOpen, flatArrivalFee, distanceRate]);

  const selectedOption = nearbyGarages.find((opt) => String(opt.garage.id) === String(selectedGarageId));

  const handleSubmit = () => {
    if (!selectedSymptom || !selectedOption) return;
    onSubmitIncident(selectedSymptom, selectedOption.totalFee, selectedOption.garage.id, selectedOption.distanceKm);
    setSelectedSymptom(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950 z-[1100]"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-[1200] glass-panel-heavy rounded-t-3xl pb-8 shadow-2xl flex flex-col"
          >
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-3 cursor-pointer shrink-0" />

            <div className="px-5 overflow-y-auto max-h-[80vh]">
              {/* Header */}
              <div className="mb-4">
                <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                  <span>🚨 Breakdown Triage & Garage Selection</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select your vehicle symptom, compare nearby garages, and pick your preferred responder.
                </p>
              </div>

              {/* Step 1: Symptom Selection */}
              <div className="mb-5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                  Step 1: Select Breakdown Issue
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {SYMPTOMS.map((sym) => {
                    const IconComponent = sym.icon;
                    const isSelected = selectedSymptom === sym.id;

                    return (
                      <button
                        key={sym.id}
                        type="button"
                        onClick={() => setSelectedSymptom(sym.id)}
                        className={`p-3 rounded-xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-accent-orange bg-accent-orange/15 shadow-md shadow-orange-950/20'
                            : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 text-slate-300'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg w-fit ${isSelected ? 'bg-accent-orange text-white' : sym.color}`}>
                          <IconComponent size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-100">{sym.label}</div>
                          <div className="text-[9px] text-slate-500 leading-tight mt-0.5 line-clamp-2">{sym.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Garage Selection List */}
              {selectedSymptom && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5"
                >
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Step 2: Choose Nearby Active Garage ({nearbyGarages.length} Available)
                    </label>
                    <span className="text-[9px] text-emerald-400 font-semibold">Live Tariff Calculator</span>
                  </div>

                  {nearbyGarages.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                      ⚠️ No active garages available within operating radius of this location. Try dragging your map location pin to a nearby town center.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {nearbyGarages.map((opt) => {
                        const isSelected = String(opt.garage.id) === String(selectedGarageId);

                        return (
                          <div
                            key={opt.garage.id}
                            onClick={() => setSelectedGarageId(opt.garage.id)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-950/30'
                                : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-300'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-base ${
                                  isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  🏢
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="text-xs font-black text-slate-100">
                                      {opt.garage.businessName || opt.garage.name}
                                    </h4>
                                    {opt.garage.tier === 'Premium Pro' || (opt.garage.tier as string) === 'premium' ? (
                                      <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[8px] px-1.5 py-0.2 rounded-full font-bold flex items-center gap-0.5">
                                        <Star size={8} className="fill-amber-400 text-amber-400" />
                                        <span>PRO</span>
                                      </span>
                                    ) : (
                                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] px-1.5 py-0.2 rounded-full font-bold">
                                        Basic
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                                    <span className="flex items-center gap-0.5">
                                      <Navigation size={10} className="text-slate-500" />
                                      <strong>{opt.distanceKm} km away</strong>
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                      <Clock size={10} className="text-slate-500" />
                                      <span>ETA ~{opt.etaMins} mins</span>
                                    </span>
                                  </div>
                                  {opt.garage.pendingLocation && (
                                    <div className="mt-1.5 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-extrabold inline-block">
                                      ℹ️ A new location update has been requested to {opt.garage.pendingLocation.city} (Pending Admin Approval)
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-xs font-black text-emerald-400">
                                  {opt.totalFee.toLocaleString()} LKR
                                </div>
                                <div className="text-[9px] text-slate-500">
                                  Base {flatArrivalFee.toLocaleString()} + {opt.surcharge.toLocaleString()} LKR
                                </div>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="mt-2.5 pt-2 border-t border-emerald-900/50 flex items-center justify-between text-[10px] text-emerald-300 font-semibold">
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 size={12} className="text-emerald-400" />
                                  Selected by Driver
                                </span>
                                <span>Awaiting Garage Confirmation</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs cursor-pointer transition-all active:scale-[0.97]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedSymptom || !selectedOption}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSubmit();
                  }}
                  className={`flex-[2] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.97] ${
                    selectedSymptom && selectedOption
                      ? 'bg-gradient-to-r from-accent-orange to-red-500 text-white shadow-lg shadow-orange-950/20 border border-orange-400'
                      : 'bg-slate-800 text-slate-500 border border-slate-800/50 cursor-not-allowed'
                  }`}
                >
                  {selectedOption
                    ? `Send Request to ${selectedOption.garage.businessName || selectedOption.garage.name}`
                    : 'Select Garage to Request'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
