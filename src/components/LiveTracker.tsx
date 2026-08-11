'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Navigation, ShieldCheck, Wrench, XCircle, Clock, Phone, User, Building2 } from 'lucide-react';
import { Mechanic } from '../utils/store';

interface Incident {
  id: string;
  category: string;
  lat: number;
  lng: number;
  status: string;
  baseTariff: number;
  timestamp: string;
  mechanicId: string | number;
  assignedEmployee?: {
    name: string;
    phone: string;
    role: string;
  };
  cancellationReason?: string;
  cancelledBy?: 'driver' | 'mechanic' | 'admin';
}

interface LiveTrackerProps {
  activeIncident: Incident | null;
  mechanics: Mechanic[];
  onCancelIncident: () => void;
  onResolveIncident: () => void;
  onConfirmArrival?: () => void;
  onDismissCancelled?: () => void;
}

const STEPS = [
  { id: 'Request Sent', label: 'Request Sent', description: 'Matching with nearest responder', icon: Clock },
  { id: 'Mechanic Assigned', label: 'Mechanic Assigned', description: 'Garage assigned an employee', icon: User },
  { id: 'Mechanic En Route', label: 'En Route', description: 'Rescuer is driving to your coordinates', icon: Navigation },
  { id: 'On-Site Repair', label: 'On-Site', description: 'Diagnosis and breakdown resolution', icon: Wrench },
  { id: 'Resolved', label: 'Resolved', description: 'Assistance completed successfully', icon: ShieldCheck },
];

export default function LiveTracker({
  activeIncident,
  mechanics,
  onCancelIncident,
  onResolveIncident,
  onConfirmArrival,
  onDismissCancelled,
}: LiveTrackerProps) {
  const [eta, setEta] = useState<number>(12);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const matchedMechanic = activeIncident
    ? mechanics.find((m) => String(m.id) === String(activeIncident.mechanicId)) || mechanics[0]
    : null;

  useEffect(() => {
    if (!activeIncident) return;

    const statusMap: Record<string, number> = {
      'Request Sent': 0,
      'Mechanic Assigned': 1,
      'Mechanic En Route': 2,
      'On-Site Repair': 3,
      'Resolved': 4,
    };

    const idx = statusMap[activeIncident.status] ?? 0;
    setCurrentStepIndex(idx);

    if (idx === 0) setEta(15);
    else if (idx === 1) setEta(12);
    else if (idx === 2) setEta(8);
    else setEta(0);
  }, [activeIncident]);

  if (!activeIncident) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-6 text-center bg-slate-950/80 min-h-[70vh]">
        <div className="glass-panel p-6 rounded-2xl max-w-sm border-slate-800 flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl animate-pulse">
            🔍
          </div>
          <h3 className="text-sm font-bold text-slate-200">No Active Rescue Sessions</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your vehicle is currently marked safe. In the event of a breakdown, navigate to the map dashboard to request emergency assistance.
          </p>
        </div>
      </div>
    );
  }

  if (activeIncident.status === 'Cancelled') {
    const cancelledByText =
      activeIncident.cancelledBy === 'mechanic'
        ? 'Garage Owner / Service Provider'
        : activeIncident.cancelledBy === 'admin'
        ? 'System Administrator'
        : 'Driver';

    return (
      <div className="flex-grow flex flex-col items-center justify-center p-6 text-center bg-slate-950/80 min-h-[70vh]">
        <div className="glass-panel p-6 rounded-2xl max-w-sm w-full border-red-500/40 bg-red-950/20 flex flex-col items-center gap-4 shadow-xl">
          <div className="h-14 w-14 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-2xl text-red-400 animate-pulse">
            ⚠️
          </div>
          <div>
            <span className="text-[10px] bg-red-500/20 text-red-400 px-2.5 py-0.5 rounded-full border border-red-500/30 font-bold uppercase tracking-wider">
              Booking Request Cancelled
            </span>
            <h3 className="text-sm font-extrabold text-slate-100 mt-2">
              Request Cancelled by {cancelledByText}
            </h3>
            <div className="text-xs text-slate-400 mt-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-left">
              <strong className="text-amber-400 block mb-1">Reason for Cancellation:</strong>
              <span className="text-slate-200">{activeIncident.cancellationReason || 'No cancellation reason specified.'}</span>
            </div>
          </div>
          <button
            onClick={onDismissCancelled || onCancelIncident}
            className="w-full py-3 px-4 rounded-xl bg-accent-orange hover:bg-orange-600 text-slate-950 font-bold text-xs border border-orange-400 shadow-md cursor-pointer transition-all active:scale-[0.98] mt-1"
          >
            Dismiss & Request New Rescue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow overflow-y-auto px-4 pt-20 pb-28 max-w-md mx-auto w-full flex flex-col gap-6">
      {/* Alert Header Summary */}
      <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-accent-orange border-slate-800">
        <div className="flex justify-between items-center">
          <span className="text-[10px] bg-red-500/20 text-red-400 px-2.5 py-0.5 rounded-full border border-red-500/30 font-bold uppercase tracking-wider">
            Active Emergency Response
          </span>
          {activeIncident.status === 'Request Sent' ? (
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
              <Clock size={10} className="animate-spin" />
              <span>Awaiting Garage Confirmation</span>
            </span>
          ) : (
            <span className="text-[10px] font-bold text-accent-green bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Booking Confirmed
            </span>
          )}
        </div>
        <h2 className="text-base font-extrabold text-slate-100 mt-2">{activeIncident.category}</h2>
        {matchedMechanic && (
          <p className="text-xs text-slate-300 font-semibold mt-1 flex items-center gap-1.5">
            <Building2 size={13} className="text-accent-orange" />
            {activeIncident.status === 'Request Sent' ? (
              <span>Request Sent to <strong className="text-amber-400">{matchedMechanic.businessName || matchedMechanic.name}</strong></span>
            ) : (
              <span>Booking Confirmed by <strong className="text-emerald-400">{matchedMechanic.businessName || matchedMechanic.name}</strong></span>
            )}
          </p>
        )}
        <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
          <Clock size={12} />
          <span>Reported at {new Date(activeIncident.timestamp).toLocaleTimeString()}</span>
        </p>
      </div>

      {/* Assigned Employee / Garage Card */}
      <div className="glass-panel p-5 rounded-2xl border-slate-800 flex flex-col gap-4">
        {activeIncident.assignedEmployee ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent-orange/15 border border-accent-orange/30 text-accent-orange flex items-center justify-center text-lg">
                  🛠️
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Assigned Mechanic</div>
                  <h4 className="text-sm font-extrabold text-slate-100">{activeIncident.assignedEmployee.name}</h4>
                  <div className="text-[10px] text-accent-yellow font-semibold">{activeIncident.assignedEmployee.role}</div>
                </div>
              </div>
              <a
                href={`tel:${activeIncident.assignedEmployee.phone}`}
                className="h-9 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 border border-emerald-400 shadow-md cursor-pointer"
              >
                <Phone size={13} />
                <span>Call</span>
              </a>
            </div>
            <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-xl border border-slate-800 flex items-center gap-1.5">
              <Phone size={12} className="text-emerald-400 shrink-0" />
              <span>Mobile: <strong className="text-slate-200">{activeIncident.assignedEmployee.phone}</strong></span>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-lg text-amber-400 animate-pulse">
                ⏳
              </div>
              <div>
                <div className="text-xs text-slate-400 font-semibold">Selected Responder</div>
                <h4 className="text-sm font-bold text-slate-200">{matchedMechanic?.businessName || matchedMechanic?.name}</h4>
                <p className="text-[10px] text-amber-400/90 mt-0.5">Awaiting garage owner confirmation & staff assignment...</p>
              </div>
            </div>
            {matchedMechanic && (
              <a
                href={`tel:${matchedMechanic.phone}`}
                className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 border border-slate-700"
              >
                <Phone size={12} />
                <span>Call</span>
              </a>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 border-t border-slate-800/60 pt-3">
          <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/40">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Estimated ETA</span>
            <span className="text-xs font-bold text-accent-yellow mt-0.5 block">
              {eta > 0 ? `${eta} mins` : currentStepIndex >= 3 ? 'Arrived On Site' : 'Arrived'}
            </span>
          </div>
          <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/40">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Arrival Fee</span>
            <span className="text-xs font-bold text-accent-green mt-0.5 block">
              {activeIncident.baseTariff.toLocaleString()} LKR
            </span>
          </div>
        </div>
      </div>

      {/* Progress Timeline Tracker */}
      <div className="glass-panel p-5 rounded-2xl border-slate-800">
        <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Rescue Timeline</h3>

        <div className="relative pl-6 space-y-6">
          <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-slate-800" />
          <motion.div
            className="absolute left-[9px] top-2 w-0.5 bg-accent-orange"
            initial={{ height: 0 }}
            animate={{
              height: `${(currentStepIndex / (STEPS.length - 1)) * 90}%`,
            }}
            transition={{ duration: 0.5 }}
          />

          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;
            const isPending = idx > currentStepIndex;

            return (
              <div key={step.id} className="relative flex gap-4">
                <div
                  className={`absolute -left-[23px] top-0.5 h-5 w-5 rounded-full flex items-center justify-center border transition-all z-10 ${
                    isCompleted
                      ? 'bg-accent-orange border-accent-orange text-white'
                      : isActive
                      ? 'bg-slate-950 border-accent-orange text-accent-orange shadow-md shadow-orange-950/20'
                      : 'bg-slate-950 border-slate-800 text-slate-600'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={12} className="stroke-[3px]" />
                  ) : (
                    <div className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-accent-orange animate-pulse' : 'bg-slate-700'}`} />
                  )}
                </div>

                <div className="flex-grow">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold transition-colors ${
                      isActive ? 'text-accent-orange' : isCompleted ? 'text-slate-300' : 'text-slate-500'
                    }`}>
                      {step.label}
                    </span>
                    {isActive && (
                      <span className="text-[8px] bg-accent-orange/10 text-accent-orange border border-accent-orange/20 px-1 rounded animate-pulse font-semibold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className={`text-[10px] leading-relaxed mt-0.5 transition-colors ${
                    isPending ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action controls */}
      <div className="flex flex-col gap-3">
        {(activeIncident.status === 'Mechanic Assigned' || activeIncident.status === 'Mechanic En Route') && onConfirmArrival && (
          <button
            onClick={onConfirmArrival}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/40 text-center flex items-center justify-center gap-2 cursor-pointer transition-all border border-emerald-300 animate-pulse"
          >
            <CheckCircle2 size={16} />
            <span>Confirm Mechanic Arrived On-Site</span>
          </button>
        )}

        {currentStepIndex >= 3 ? (
          <button
            onClick={onResolveIncident}
            className="w-full py-3.5 px-4 rounded-xl bg-accent-green hover:bg-emerald-600 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-950/20 text-center flex items-center justify-center gap-2 cursor-pointer transition-all border border-emerald-400"
          >
            <ShieldCheck size={16} />
            <span>Mark Resolved & Close Incident</span>
          </button>
        ) : (
          <button
            onClick={onCancelIncident}
            className="w-full py-3.5 px-4 rounded-xl border border-red-500/30 bg-red-950/10 hover:bg-red-950/30 text-red-400 font-bold text-xs text-center flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            <XCircle size={16} />
            <span>Cancel Rescue Request</span>
          </button>
        )}
      </div>
    </div>
  );
}
