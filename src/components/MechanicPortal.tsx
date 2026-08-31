'use client';

import React, { useState } from 'react';
import { Wrench, ShieldCheck, Check, Info, Radio, Star } from 'lucide-react';

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
  id: string;
  name: string;
  lat: number;
  lng: number;
  tier: 'basic' | 'premium';
  isAvailable: boolean;
  nic?: string;
  phone?: string;
  businessName?: string;
}

interface MechanicPortalProps {
  mechanics: Mechanic[];
  onRegisterMechanic: (mechanic: Omit<Mechanic, 'id' | 'lat' | 'lng' | 'isAvailable'>) => void;
  currentMechanic: Mechanic | null;
  openIncidents: Incident[];
  onAcceptIncident: (incidentId: string) => void;
  onUpdateStatus: (status: string) => void;
  activeIncident: Incident | null;
}

export default function MechanicPortal({
  mechanics,
  onRegisterMechanic,
  currentMechanic,
  openIncidents,
  onAcceptIncident,
  onUpdateStatus,
  activeIncident,
}: MechanicPortalProps) {
  // Form State
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [nic, setNic] = useState('');
  const [tier, setTier] = useState<'basic' | 'premium'>('basic');
  const [error, setError] = useState('');

  // Validate Sri Lankan NIC (old format: 9 numbers + V/X, new format: 12 numbers)
  const validateNIC = (value: string) => {
    const oldNicRegex = /^[0-9]{9}[vVxX]$/;
    const newNicRegex = /^[0-9]{12}$/;
    return oldNicRegex.test(value) || newNicRegex.test(value);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !businessName || !phone || !nic) {
      setError('Please fill in all registration fields.');
      return;
    }

    if (!validateNIC(nic)) {
      setError('Invalid Sri Lankan NIC format (e.g., 123456789V or 200112345678).');
      return;
    }

    onRegisterMechanic({
      name,
      businessName,
      phone,
      nic,
      tier,
    });
  };

  return (
    <div className="flex-grow overflow-y-auto px-4 pt-20 pb-28 max-w-md mx-auto w-full flex flex-col gap-6">
      {/* Mechanic Title Header */}
      <div className="glass-panel p-5 rounded-2xl border-slate-800">
        <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
          <Wrench className="text-accent-orange" size={20} />
          <span>Mechanic Service Portal</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Register as an emergency responder, subscribe to coverage tiers, and dispatch to Sri Lankan breakdowns.
        </p>
      </div>

      {currentMechanic ? (
        /* Registered Dashboard */
        <div className="space-y-6">
          {/* Subscriber Status Badge Card */}
          <div className="glass-panel p-5 rounded-2xl border-slate-800 bg-slate-900/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-accent-green/5 to-transparent rounded-full -z-10" />

            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Operational Profile</span>
                <h3 className="text-sm font-bold text-slate-200 mt-0.5">{currentMechanic.name}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{currentMechanic.businessName}</p>
              </div>

              {/* Verified Trust Badge */}
              <div className="flex items-center gap-1 bg-accent-green/10 text-accent-green border border-accent-green/30 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm">
                <ShieldCheck size={14} />
                <span>Verified Trust</span>
              </div>
            </div>

            {/* Coverage radius details */}
            <div className="mt-5 border-t border-slate-800/80 pt-4 flex justify-between items-center text-xs">
              <div>
                <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Coverage Radius</span>
                <span className="font-bold text-slate-200 mt-0.5 block flex items-center gap-1">
                  <Radio size={14} className="text-accent-orange animate-pulse" />
                  {currentMechanic.tier === 'premium' ? '25 km (Premium Pro)' : '5 km (Basic)'}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Monthly Subscription</span>
                <span className="font-bold text-slate-200 mt-0.5 block">
                  {currentMechanic.tier === 'premium' ? '5,000 LKR' : '1,500 LKR'}
                </span>
              </div>
            </div>
          </div>

          {/* Active Job / Incidents panel */}
          {activeIncident ? (
            /* Open active response controller */
            <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-accent-orange border-slate-800">
              <span className="text-[10px] bg-accent-orange/15 text-accent-orange border border-accent-orange/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Assigned Emergency Response
              </span>
              <h4 className="text-sm font-extrabold text-slate-200 mt-3">{activeIncident.category}</h4>
              <p className="text-xs text-slate-400 mt-1">Base payout: <span className="text-accent-green font-bold">{activeIncident.baseTariff.toLocaleString()} LKR</span></p>

              <div className="mt-5 space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Update Response Status</span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onUpdateStatus('Mechanic En Route')}
                    className={`py-2 px-3 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                      activeIncident.status === 'Mechanic En Route'
                        ? 'bg-accent-orange/20 text-accent-orange border-accent-orange'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🚗 En Route
                  </button>
                  <button
                    onClick={() => onUpdateStatus('On-Site Repair')}
                    className={`py-2 px-3 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                      activeIncident.status === 'On-Site Repair'
                        ? 'bg-accent-orange/20 text-accent-orange border-accent-orange'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🔧 On-Site Repair
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Open Incidents feed */
            <div className="glass-panel p-5 rounded-2xl border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Open breakdown requests</h4>

              {openIncidents.filter(inc => inc.status === 'Request Sent').length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  📡 Listening for active emergency beacons in your coverage radius...
                </div>
              ) : (
                <div className="space-y-3">
                  {openIncidents
                    .filter((inc) => inc.status === 'Request Sent')
                    .map((inc) => (
                      <div
                        key={inc.id}
                        className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 hover:border-slate-800 flex justify-between items-center transition-all"
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-slate-200">{inc.category}</div>
                          <div className="text-[10px] text-slate-500">Dispatch Fee: <span className="text-accent-green font-semibold">{inc.baseTariff.toLocaleString()} LKR</span></div>
                        </div>
                        <button
                          onClick={() => onAcceptIncident(inc.id)}
                          className="py-1.5 px-3 rounded-lg bg-accent-orange hover:bg-orange-600 text-slate-950 text-[10px] font-extrabold cursor-pointer border border-orange-400 transition-all active:scale-[0.96]"
                        >
                          Accept
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Registration Form */
        <form onSubmit={handleRegister} className="glass-panel p-5 rounded-2xl border-slate-800 flex flex-col gap-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Merchant Registration</h3>

          {error && <div className="text-xs bg-red-950/30 border border-red-500/30 text-red-400 p-3 rounded-xl">{error}</div>}

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Mechanic Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Shakir Silva"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-accent-orange transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Garage / Business Name</label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g., Silva Auto Care"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-accent-orange transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Mobile Number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., 0771234567"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-accent-orange transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">National Identity Card (NIC)</label>
            <input
              type="text"
              required
              value={nic}
              onChange={(e) => setNic(e.target.value)}
              placeholder="e.g., 123456789V or 200112345678"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-accent-orange transition-all"
            />
          </div>

          {/* Tier Selection Grid */}
          <div className="space-y-2 mt-2">
            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wide block">Select Subscription Tier</label>

            <div className="grid grid-cols-2 gap-3">
              {/* Basic Tier */}
              <button
                type="button"
                onClick={() => setTier('basic')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  tier === 'basic'
                    ? 'border-accent-green bg-accent-green/10'
                    : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-200">Basic Tier</span>
                  {tier === 'basic' && <Check size={14} className="text-accent-green" />}
                </div>
                <span className="text-[10px] text-accent-green font-bold">1,500 LKR / mo</span>
                <span className="text-[9px] text-slate-500 mt-1 leading-tight">5 km coverage radius. Standard dispatch routing.</span>
              </button>

              {/* Premium Pro Tier */}
              <button
                type="button"
                onClick={() => setTier('premium')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  tier === 'premium'
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                    Premium Pro
                    <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />
                  </span>
                  {tier === 'premium' && <Check size={14} className="text-amber-500" />}
                </div>
                <span className="text-[10px] text-amber-400 font-bold">5,000 LKR / mo</span>
                <span className="text-[9px] text-slate-500 mt-1 leading-tight">25 km coverage radius. Priority dispatch & client routing.</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-850 flex items-start gap-2 mt-2">
            <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
            <p className="text-[9px] leading-normal text-slate-500">
              Subscription billing cycles auto-charge monthly. Trust verification badges are updated dynamically after NIC validation.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 mt-2 rounded-xl bg-accent-orange hover:bg-orange-600 text-slate-950 font-bold text-xs text-center border border-orange-400 cursor-pointer transition-all active:scale-[0.98]"
          >
            Agree & Subscribe
          </button>
        </form>
      )}
    </div>
  );
}
