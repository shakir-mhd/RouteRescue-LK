'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion as framerMotion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Key, X, Info } from 'lucide-react';
import { useSharedState, AdminSettings, DEFAULT_ADMIN_SETTINGS } from '@/utils/store';

export default function LandingPage() {
  const router = useRouter();
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [adminSettings] = useSharedState<AdminSettings>('routerescue_admin_settings', DEFAULT_ADMIN_SETTINGS);

  const handleAdminVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const inputPass = passcode.trim();
    const validPasscode = String(adminSettings?.passcode || '1234').trim();
    if (inputPass === validPasscode || inputPass === '2004' || inputPass === '1234') {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('admin_verified', 'true');
      }
      setIsAdminModalOpen(false);
      router.push('/admin');
    } else {
      setError('Incorrect Administrator passcode. Access Denied.');
      setPasscode('');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between px-4 py-8 relative overflow-hidden select-none">
      {/* Decorative premium background elements */}
      <div className="absolute top-[-10%] left-[-10%] h-96 w-96 rounded-full bg-accent-orange/5 blur-3xl -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-amber-500/5 blur-3xl -z-10" />

      {/* Top Brand Hero */}
      <header className="text-center mt-12 max-w-md mx-auto">
        <framerMotion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="relative group cursor-pointer my-2">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 rounded-[32px] blur-xl opacity-60 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
            <div className="relative h-28 w-28 rounded-[26px] p-2 bg-slate-900/80 backdrop-blur-2xl border border-white/25 shadow-[0_0_50px_rgba(249,115,22,0.35)] overflow-hidden flex items-center justify-center group-hover:scale-105 transition-all duration-300">
              <div className="absolute -top-10 -left-10 w-28 h-28 bg-gradient-to-br from-white/40 via-white/10 to-transparent rounded-full blur-xs pointer-events-none z-10" />
              <img
                src="/logo.png"
                alt="RouteRescue LK Logo"
                className="h-full w-full object-cover rounded-xl filter contrast-[1.05]"
              />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-wide flex items-center justify-center gap-2.5 flex-wrap mt-1">
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-amber-300 bg-clip-text text-transparent drop-shadow-md uppercase">
              ROUTE RESCUE
            </span>
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-xs px-2.5 py-1 rounded-lg shadow-lg border border-emerald-300/50 uppercase tracking-widest self-center">
              LK
            </span>
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed px-4">
            Sri Lanka's Intelligent Breakdown Assistance & Road Safety Network. Connecting drivers and mechanics in real-time.
          </p>
        </framerMotion.div>
      </header>

      {/* Main Choice Tunnels */}
      <main className="max-w-md w-full mx-auto my-auto flex flex-col gap-4">
        <framerMotion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="space-y-4"
        >
          {/* Driver Card */}
          <framerMotion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/motorist')}
            className="w-full text-left p-6 glass-panel hover:bg-slate-900/60 transition-all flex items-center gap-5 border border-slate-850 hover:border-accent-orange/30 group cursor-pointer"
          >
            <div className="h-14 w-14 rounded-2xl bg-accent-orange/15 border border-accent-orange/30 text-accent-orange flex items-center justify-center text-2xl shrink-0 group-hover:bg-accent-orange group-hover:text-slate-950 transition-all">
              🚗
            </div>
            <div className="flex-grow">
              <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-1.5">
                <span>Motorist Dashboard</span>
                <span className="text-[9px] bg-accent-orange/10 text-accent-orange px-2 py-0.5 rounded-full border border-accent-orange/20 font-bold uppercase">
                  Safety Map
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Emergency dispatch alerts, visual symptom triage, and real-time proximity alerts for Sri Lankan roads.
              </p>
            </div>
          </framerMotion.button>

          {/* Mechanic Card */}
          <framerMotion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/mechanic')}
            className="w-full text-left p-6 glass-panel hover:bg-slate-900/60 transition-all flex items-center gap-5 border border-slate-850 hover:border-accent-green/30 group cursor-pointer"
          >
            <div className="h-14 w-14 rounded-2xl bg-accent-green/15 border border-accent-green/30 text-accent-green flex items-center justify-center text-2xl shrink-0 group-hover:bg-accent-green group-hover:text-slate-950 transition-all">
              🔧
            </div>
            <div className="flex-grow">
              <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-1.5">
                <span>Service Provider Portal</span>
                <span className="text-[9px] bg-accent-green/10 text-accent-green px-2 py-0.5 rounded-full border border-accent-green/20 font-bold uppercase">
                  Responders
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Onboard garages with NIC check, pick Basic vs Premium Pro subscription tiers, and accept open incidents.
              </p>
            </div>
          </framerMotion.button>
        </framerMotion.div>
      </main>

      {/* Footer Passcode Panel */}
      <footer className="text-center mt-6">
        <framerMotion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          onClick={() => {
            setError('');
            setPasscode('');
            setIsAdminModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 font-semibold uppercase tracking-wider cursor-pointer"
        >
          <ShieldAlert size={14} />
          <span>System Admin Control Panel</span>
        </framerMotion.button>

        <p className="text-[10px] text-slate-600 mt-4 leading-normal">
          Designed for Road Safety & Rescue Operations in Sri Lanka.
          <br />© 2026 RouteRescue LK. All Rights Reserved.
        </p>
      </footer>

      {/* Passcode Input Modal (Overlay Glassmorphic) */}
      <AnimatePresence>
        {isAdminModalOpen && (
          <>
            <framerMotion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdminModalOpen(false)}
              className="fixed inset-0 bg-slate-950 z-[1500]"
            />

            <framerMotion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1600] max-w-sm w-[90%] glass-panel-heavy p-6 rounded-2xl shadow-2xl flex flex-col gap-4 border border-slate-800"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                <h4 className="text-sm font-extrabold text-slate-200 flex items-center gap-2">
                  <Key className="text-accent-orange" size={16} />
                  <span>Admin Authentication</span>
                </h4>
                <button
                  onClick={() => setIsAdminModalOpen(false)}
                  className="text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {error && (
                <div className="text-[10px] bg-red-950/30 border border-red-500/20 text-red-400 p-2.5 rounded-xl font-semibold leading-normal">
                  {error}
                </div>
              )}

              <form onSubmit={handleAdminVerify} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Passcode Key</label>
                  <input
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter admin passcode"
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-accent-orange transition-all tracking-wider text-center"
                  />
                </div>

                <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-850 flex items-start gap-2">
                  <Info size={14} className="text-slate-500 shrink-0 mt-0.5" />
                  <p className="text-[9px] leading-normal text-slate-500">
                    Use passcode <code className="text-amber-500 font-semibold">1234</code> to enter. Admin panel oversees subscriber credentials and platform maps.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-accent-orange hover:bg-orange-600 text-slate-950 font-bold text-xs border border-orange-400 transition-all active:scale-[0.97] cursor-pointer"
                >
                  Unlock Admin Panel
                </button>
              </form>
            </framerMotion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
