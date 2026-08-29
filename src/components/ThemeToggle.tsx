'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export default function ThemeToggle({ className = '', compact = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      className={`relative group inline-flex items-center select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 rounded-full transition-transform active:scale-[0.96] ${className}`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Outer Metallic Bezel Ring */}
      <div
        className={`relative flex items-center justify-between rounded-full p-[3px] transition-all duration-500 ${
          compact ? 'w-[120px] h-[36px]' : 'w-[144px] h-[42px]'
        } ${
          isDark
            ? 'bg-gradient-to-b from-slate-700/80 via-slate-800 to-slate-900 shadow-[0_4px_14px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)] border border-slate-700/60'
            : 'bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 shadow-[0_4px_14px_rgba(0,0,0,0.15),inset_0_1px_2px_rgba(255,255,255,0.9)] border border-slate-300/80'
        }`}
      >
        {/* Inner Glass Track */}
        <div
          className={`relative w-full h-full rounded-full overflow-hidden flex items-center justify-between px-3 transition-colors duration-500 ${
            isDark
              ? 'bg-gradient-to-r from-slate-950 via-[#0d1424] to-[#151c30] shadow-[inset_0_2px_5px_rgba(0,0,0,0.8)]'
              : 'bg-gradient-to-r from-amber-200/90 via-orange-300/80 to-amber-400/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.12)]'
          }`}
        >
          {/* Ambient Glow Aura */}
          <div
            className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
              isDark
                ? 'opacity-40 bg-gradient-to-r from-indigo-600/20 via-blue-500/15 to-purple-600/20'
                : 'opacity-70 bg-gradient-to-r from-orange-400/30 via-amber-300/40 to-yellow-400/30 blur-xs'
            }`}
          />

          {/* Left Text: LIGHT / DAY MODE */}
          <div
            className={`z-10 flex flex-col justify-center transition-all duration-500 ${
              compact ? 'text-[8.5px]' : 'text-[9.5px]'
            } font-black tracking-wider leading-none uppercase select-none ${
              isDark
                ? 'text-slate-600/60 opacity-0 transform -translate-x-2'
                : 'text-amber-950/80 opacity-100 transform translate-x-0 drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]'
            }`}
          >
            <span>Day</span>
            <span className="text-[7.5px] tracking-widest opacity-80">Mode</span>
          </div>

          {/* Right Text: DARK / NIGHT MODE */}
          <div
            className={`z-10 flex flex-col items-end justify-center transition-all duration-500 ${
              compact ? 'text-[8.5px]' : 'text-[9.5px]'
            } font-black tracking-wider leading-none uppercase select-none ${
              isDark
                ? 'text-cyan-200/90 opacity-100 transform translate-x-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                : 'text-slate-400/40 opacity-0 transform translate-x-2'
            }`}
          >
            <span>Night</span>
            <span className="text-[7.5px] tracking-widest text-cyan-300/70">Mode</span>
          </div>

          {/* Sliding Tactile Dial / Knob */}
          <motion.div
            layout
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 32,
              mass: 0.8,
            }}
            style={{
              position: 'absolute',
              top: '2px',
              bottom: '2px',
              left: isDark ? '2px' : 'auto',
              right: isDark ? 'auto' : '2px',
            }}
            className={`rounded-full flex items-center justify-center cursor-pointer transition-colors duration-300 z-20 ${
              compact ? 'w-[30px] h-[30px]' : 'w-[36px] h-[36px]'
            } ${
              isDark
                ? 'bg-gradient-to-b from-slate-900 via-[#111726] to-slate-950 border border-slate-600/40 shadow-[0_2px_8px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                : 'bg-gradient-to-b from-white via-slate-50 to-slate-100 border border-white shadow-[0_3px_10px_rgba(234,88,12,0.35),inset_0_1px_2px_rgba(255,255,255,1)]'
            }`}
          >
            {isDark ? (
              /* Moon & Stars Icon */
              <div className="relative flex items-center justify-center text-cyan-300">
                {/* Crescent Moon */}
                <svg
                  className={compact ? 'w-4 h-4' : 'w-4.5 h-4.5'}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path
                    d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
                    className="fill-cyan-400/20 stroke-cyan-300"
                  />
                  {/* Sparkle star 1 */}
                  <path
                    d="M19 3v4m-2-2h4"
                    strokeWidth="2"
                    className="stroke-cyan-200 animate-pulse"
                  />
                </svg>
              </div>
            ) : (
              /* Sun Dial Icon with Rays */
              <div className="relative flex items-center justify-center text-amber-500">
                {/* Radiant Sun */}
                <svg
                  className={compact ? 'w-4 h-4' : 'w-4.5 h-4.5'}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="4"
                    className="fill-amber-400/30 stroke-amber-600"
                  />
                  <path d="M12 2v2" className="stroke-amber-600" />
                  <path d="M12 20v2" className="stroke-amber-600" />
                  <path d="m4.93 4.93 1.41 1.41" className="stroke-amber-600" />
                  <path d="m17.66 17.66 1.41 1.41" className="stroke-amber-600" />
                  <path d="M2 12h2" className="stroke-amber-600" />
                  <path d="M20 12h2" className="stroke-amber-600" />
                  <path d="m6.34 17.66-1.41 1.41" className="stroke-amber-600" />
                  <path d="m19.07 4.93-1.41 1.41" className="stroke-amber-600" />
                </svg>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </button>
  );
}
