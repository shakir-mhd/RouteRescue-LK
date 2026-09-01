'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Download, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';

interface ReportRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedMonth: string, startDate?: string, endDate?: string) => void;
  availableMonths: string[];
}

export default function ReportRangeModal({
  isOpen,
  onClose,
  onConfirm,
  availableMonths,
}: ReportRangeModalProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths[0] || new Date().toLocaleString('en-LK', { month: 'long', year: 'numeric' })
  );

  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  if (!isOpen) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'custom' && startDate && endDate) {
      onConfirm(selectedMonth, startDate, endDate);
    } else {
      onConfirm(selectedMonth);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-wide">Generate Monthly Operations Report</h3>
                <span className="text-[10px] text-slate-400">Select reporting period & date range</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleConfirm} className="p-6 space-y-5 text-slate-200 text-xs">
            {/* Mode Selector Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
              <button
                type="button"
                onClick={() => setMode('preset')}
                className={`flex-1 py-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
                  mode === 'preset'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Month Preset
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className={`flex-1 py-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
                  mode === 'custom'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Custom Range
              </button>
            </div>

            {mode === 'preset' ? (
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Select Calendar Month
                </label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m} className="bg-slate-900 text-slate-200">
                        🗓️ {m}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-slate-400 italic mt-1">
                  ℹ️ Generates full 1st to 31st monthly audit for {selectedMonth}.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>
                {startDate && endDate && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold flex items-center gap-2">
                    <CheckCircle2 size={14} />
                    <span>Report Period: {startDate} to {endDate}</span>
                  </div>
                )}
              </div>
            )}

            {/* Action Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 font-bold text-xs cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs border border-emerald-400 shadow-lg shadow-emerald-950/50 cursor-pointer transition-all active:scale-95"
              >
                <Download size={15} />
                <span>Confirm & Generate PDF</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
