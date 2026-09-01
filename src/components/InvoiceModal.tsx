'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ShieldCheck, CheckCircle2, FileText, Wrench, MapPin, Calendar, Clock } from 'lucide-react';
import { Incident, Mechanic } from '../utils/store';
import { generateIncidentInvoicePDF } from '../utils/pdfGenerator';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: any;
  mechanic?: any;
}

export default function InvoiceModal({ isOpen, onClose, incident, mechanic }: InvoiceModalProps) {
  if (!isOpen || !incident) return null;

  const incidentDate = new Date(incident.timestamp || Date.now()).toLocaleString('en-LK', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const baseTariff = Number(incident.baseTariff) || 1000;
  const distKm = Number(incident.distanceKm) || 0;
  const distFee = Math.round(distKm * 150);
  const platformFee = 250;
  const grandTotal = baseTariff + distFee + platformFee;

  const handleDownload = () => {
    generateIncidentInvoicePDF(incident, mechanic);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-wide">Breakdown Repair Invoice</h3>
                <span className="text-[10px] text-slate-400 font-mono">#INV-{incident.id.slice(-6).toUpperCase()}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-5 text-slate-200 text-xs">
            {/* Status Stamp */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 size={16} />
                <span>Service Completed & Verified</span>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30">
                PAID & RESOLVED
              </span>
            </div>

            {/* Incident Details Grid */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Issue Category</span>
                <span className="font-extrabold text-orange-400 flex items-center gap-1">
                  <Wrench size={12} />
                  {incident.category}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Date & Time</span>
                <span className="font-semibold text-slate-300 text-[11px] block">{incidentDate}</span>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Assigned Mobile Garage</span>
                <span className="font-extrabold text-white text-xs">
                  {mechanic?.businessName || mechanic?.name || 'Verified RouteRescue LK Mobile Garage'}
                </span>
                {incident.assignedEmployee?.name && (
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Dispatched Technician: <strong className="text-slate-200">{incident.assignedEmployee.name}</strong> ({incident.assignedEmployee.role})
                  </span>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block px-1">Itemized Charges</span>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 overflow-hidden divide-y divide-slate-800/60">
                <div className="flex justify-between items-center p-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-200 block">Emergency Breakdown Triage</span>
                    <span className="text-[10px] text-slate-400">Base repair & diagnostic tariff</span>
                  </div>
                  <span className="font-bold text-slate-200">LKR {baseTariff.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-200 block">Mileage & Transit Fee</span>
                    <span className="text-[10px] text-slate-400">{distKm} km @ LKR 150/km</span>
                  </div>
                  <span className="font-bold text-slate-200">LKR {distFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-200 block">Platform Safety & GPS Fee</span>
                    <span className="text-[10px] text-slate-400">24/7 AI diagnostics & tracking</span>
                  </div>
                  <span className="font-bold text-slate-200">LKR {platformFee.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Grand Total Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-orange-500/30 flex justify-between items-center shadow-lg">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Payable</span>
                <span className="text-[10px] text-emerald-400 font-bold">Includes all fees & taxes</span>
              </div>
              <span className="text-xl font-black text-orange-400">
                LKR {grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 font-bold text-xs transition-all cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-black text-xs border border-orange-400 shadow-lg shadow-orange-950/50 cursor-pointer transition-all active:scale-95"
            >
              <Download size={15} />
              <span>Download Invoice (PDF)</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
