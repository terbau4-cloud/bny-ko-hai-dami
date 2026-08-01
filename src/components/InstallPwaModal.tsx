import React, { useState, useEffect } from 'react';
import { X, Download, Check, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PWA_LOGO_URL = 'https://i.ibb.co/Qv0ZyF0w/IMG-20260713-WA0032.jpg';

export const InstallPwaModal: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [installedSuccess, setInstalledSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Check if already in standalone mode or marked installed in localStorage
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    const isInstalledInStorage = localStorage.getItem('bny_pwa_installed') === 'true';

    if (isStandalone || isInstalledInStorage) {
      return;
    }

    // Check if user dismissed in localStorage
    const dismissed = localStorage.getItem('bny_pwa_dismissed') === 'true';
    if (!dismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1200);

      return () => clearTimeout(timer);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (
        !localStorage.getItem('bny_pwa_dismissed') &&
        !localStorage.getItem('bny_pwa_installed')
      ) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      localStorage.setItem('bny_pwa_installed', 'true');
      setIsVisible(false);
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 3000);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('bny_pwa_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    localStorage.setItem('bny_pwa_installed', 'true');
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsVisible(false);
          setInstalledSuccess(true);
          setTimeout(() => setInstalledSuccess(false), 3000);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('PWA install error:', err);
        setInstalledSuccess(true);
        setIsVisible(false);
        setTimeout(() => setInstalledSuccess(false), 3000);
      }
    } else {
      setInstalledSuccess(true);
      setIsVisible(false);
      setTimeout(() => setInstalledSuccess(false), 3000);
    }
  };

  if (!isVisible && !installedSuccess) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-[100] max-w-sm sm:w-80 pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3 shadow-2xl border border-indigo-500/30 relative overflow-hidden flex items-center gap-3"
          >
            {/* Top Accent Gradient Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400" />

            {/* App Small Icon */}
            <div className="w-11 h-11 rounded-xl overflow-hidden shadow-md border border-slate-700 bg-slate-800 shrink-0 relative">
              <img
                src={PWA_LOGO_URL}
                alt="BNY SHOP Logo"
                className="w-full h-full object-cover"
              />
              <div className="absolute -bottom-0.5 -right-0.5 bg-indigo-600 text-white p-0.5 rounded-full border border-slate-900">
                <Smartphone size={10} />
              </div>
            </div>

            {/* Text & Install Button */}
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-white tracking-tight truncate">
                  Install BNY SHOP App
                </h4>
              </div>
              <p className="text-[11px] text-slate-300 font-medium line-clamp-1 leading-tight mt-0.5">
                Add to Home Screen for faster access
              </p>
              <button
                onClick={handleInstallClick}
                id="install-pwa-now-btn"
                className="mt-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-extrabold px-3 py-1 rounded-lg shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Download size={12} />
                <span>Install App</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={handleDismiss}
              id="close-pwa-popup-btn"
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer z-10"
              title="Close"
            >
              <X size={14} />
            </button>
          </motion.div>
        </div>
      )}

      {installedSuccess && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
          <Check size={14} />
          <span>BNY SHOP Installed on Home Screen!</span>
        </div>
      )}
    </AnimatePresence>
  );
};
