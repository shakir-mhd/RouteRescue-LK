'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Download, X } from 'lucide-react';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show banner if not previously dismissed in session
      if (!sessionStorage.getItem('pwa_banner_dismissed')) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted PWA installation prompt');
    }
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed top-4 left-4 right-4 z-[2500] max-w-md mx-auto"
        >
          <div className="glass-panel-heavy p-4 rounded-2xl shadow-2xl border border-accent-orange/40 flex items-center justify-between gap-3 bg-slate-900/95 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent-orange/15 border border-accent-orange/30 text-accent-orange flex items-center justify-center shrink-0">
                <Smartphone size={20} />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-100 flex items-center gap-1.5">
                  <span>Install RouteRescue LK</span>
                </h4>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Add to home screen for 1-tap emergency rescue access.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstallClick}
                className="py-2 px-3 bg-accent-orange hover:bg-orange-600 text-slate-950 text-[10px] font-extrabold rounded-xl border border-orange-400 transition-all flex items-center gap-1 shadow-md cursor-pointer"
              >
                <Download size={13} />
                <span>Install</span>
              </button>
              <button
                onClick={handleDismiss}
                className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
