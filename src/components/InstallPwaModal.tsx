import React, { useState, useEffect } from 'react';
import { X, Download, Check, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PWA_LOGO_URL = 'https://i.ibb.co/Qv0ZyF0w/IMG-20260713-WA0032.jpg';

export const InstallPwaModal: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showFloatingBanner, setShowFloatingBanner] = useState<boolean>(false);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);
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
        setShowFloatingBanner(true);
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
        setShowFloatingBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      localStorage.setItem('bny_pwa_installed', 'true');
      setShowFloatingBanner(false);
      setShowInstallModal(false);
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 3500);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleDismissBanner = () => {
    setShowFloatingBanner(false);
    localStorage.setItem('bny_pwa_dismissed', 'true');
  };

  const handleOpenInstallDialog = () => {
    setShowInstallModal(true);
  };

  const handleCancelModal = () => {
    setShowInstallModal(false);
  };

  const handleConfirmInstall = async () => {
    localStorage.setItem('bny_pwa_installed', 'true');
    setShowInstallModal(false);
    setShowFloatingBanner(false);

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setInstalledSuccess(true);
          setTimeout(() => setInstalledSuccess(false), 3500);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('PWA install error:', err);
        setInstalledSuccess(true);
        setTimeout(() => setInstalledSuccess(false), 3500);
      }
    } else {
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 3500);
    }
  };

  return (
    <AnimatePresence>
      {/* Floating Bottom Prompt Banner */}
      {showFloatingBanner && !showInstallModal && (
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
                onClick={handleOpenInstallDialog}
                id="install-pwa-now-btn"
                className="mt-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-extrabold px-3 py-1 rounded-lg shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Download size={12} />
                <span>Install App</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={handleDismissBanner}
              id="close-pwa-popup-btn"
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer z-10"
              title="Close"
            >
              <X size={14} />
            </button>
          </motion.div>
        </div>
      )}

      {/* CENTERED ANDROID NATIVE STYLE INSTALL APP DIALOG MODAL */}
      {showInstallModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="bg-white rounded-[28px] max-w-sm w-full p-6 text-left shadow-2xl space-y-6 relative border border-slate-100"
          >
            {/* Title */}
            <h3 className="text-2xl font-normal text-slate-900 tracking-tight">
              Install app
            </h3>

            {/* Content Row: Logo + App Details */}
            <div className="flex items-center gap-4 py-1">
              {/* App Icon */}
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-900 shrink-0 shadow-xs">
                <img
                  src={PWA_LOGO_URL}
                  alt="BNY SHOP Logo"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Title & Domain */}
              <div className="min-w-0 flex-1">
                <h4 className="text-base sm:text-lg font-medium text-slate-900 leading-snug line-clamp-2">
                  BNY SHOP - Game Topup Nepal
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5 truncate">
                  www.bnyshop.xyz
                </p>
              </div>
            </div>

            {/* Footer Buttons: Cancel / Install */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancelModal}
                id="pwa-dialog-cancel-btn"
                className="px-5 py-2.5 rounded-full text-indigo-700 hover:bg-indigo-50/80 active:bg-indigo-100 text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmInstall}
                id="pwa-dialog-install-btn"
                className="px-5 py-2.5 rounded-full text-indigo-700 hover:bg-indigo-50/80 active:bg-indigo-100 text-sm font-semibold transition-colors cursor-pointer"
              >
                Install
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* SUCCESS TOAST */}
      {installedSuccess && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[210] bg-emerald-600 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
          <Check size={16} />
          <span>BNY SHOP Installed on Home Screen!</span>
        </div>
      )}
    </AnimatePresence>
  );
};

