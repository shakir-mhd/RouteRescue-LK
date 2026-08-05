'use client';

import React from 'react';
import { Map, ShieldAlert, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  trackerActive: boolean;
}

export default function BottomNav({ activeTab, setActiveTab, trackerActive }: BottomNavProps) {
  const tabs = [
    { id: 'map', label: 'Safety Map', icon: Map },
    { id: 'tracker', label: 'Live Tracker', icon: ShieldAlert, highlight: trackerActive },
    { id: 'portal', label: 'Mechanic Portal', icon: Wrench },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[1000] px-4 pb-5 pt-2 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent">
      <div className="max-w-md mx-auto glass-panel rounded-2xl flex items-center justify-around py-2 px-3 shadow-2xl shadow-orange-950/20">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors duration-200 cursor-pointer focus:outline-none"
            >
              {/* Highlight background animation */}
              {isActive && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute inset-0 bg-accent-orange/15 rounded-xl border border-accent-orange/30 -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}

              {/* Icon Container with active colors and optional notification badge */}
              <div className="relative">
                <Icon
                  size={20}
                  className={`transition-colors duration-200 ${
                    isActive
                      ? 'text-accent-orange'
                      : tab.highlight
                      ? 'text-accent-yellow animate-pulse'
                      : 'text-slate-400'
                  }`}
                />
                {tab.highlight && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-orange opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-orange"></span>
                  </span>
                )}
              </div>

              {/* Text Label */}
              <span
                className={`text-[10px] font-medium tracking-wide transition-colors duration-200 ${
                  isActive ? 'text-slate-200' : 'text-slate-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
