import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Share, PlusSquare, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PWA_LOGO_URL = 'https://i.ibb.co/Qv0ZyF0w/IMG-20260713-WA0032.jpg';

export const InstallPwaModal: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [installedSuccess, setInstalledSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // Check if user dismissed in this session
    const dismissed = sessionStorage.getItem('bny_pwa_dismissed');
    if (!dismissed) {
      // Show modal after slight delay so user sees app open
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);

      return () => clearTimeout(timer);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!sessionStorage.getItem('bny_pwa_dismissed')) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      setIsVisible(false);
      setInstalledSuccess(true);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('bny_pwa_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsVisible(false);
          setInstalledSuccess(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('PWA install error:', err);
        setShowGuide(true);
      }
    } else {
      // Fallback instruction guide if browser doesn't support direct trigger (e.g. iOS Safari)
      setShowGuide(true);
    }
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  if (!isVisible && !installedSuccess) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 relative overflow-hidden"
          >
            {/* Top Accent Gradient Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500" />

            {/* Cross / Close Option Button */}
            <button
              onClick={handleDismiss}
              id="close-pwa-popup-btn"
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer z-10 active:scale-90"
              title="Close"
            >
              <X size={18} />
            </button>

            <div className="pt-2 flex flex-col items-center text-center">
              {/* App Logo */}
              <div className="relative mb-3.5">
                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg border-2 border-indigo-100 p-0.5 bg-white">
                  <img
                    src={PWA_LOGO_URL}
                    alt="BNY SHOP Logo"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-1 rounded-full shadow-md border-2 border-white">
                  <Smartphone size={14} />
                </div>
              </div>

              {/* App Name */}
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                BNY SHOP
              </h3>
              <p className="text-xs font-semibold text-indigo-600 mb-2">
                Official Web App & Game Topup Nepal
              </p>

              <p className="text-xs text-slate-600 font-medium px-3 mb-5 leading-relaxed">
                Install <span className="font-bold text-slate-900">BNY SHOP</span> on your home screen for faster access, instant notifications, and a smooth full-screen experience!
              </p>

              {/* Action Buttons */}
              <div className="w-full space-y-2.5">
                <button
                  onClick={handleInstallClick}
                  id="install-pwa-now-btn"
                  className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-800 text-white font-extrabold text-sm py-3 px-5 rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Download size={18} />
                  <span>Install Now</span>
                </button>

                <button
                  onClick={handleDismiss}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>

              {/* iOS / Safari Step Guide Modal / Section */}
              {showGuide && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-3.5 border-t border-slate-100 text-left w-full text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl"
                >
                  <p className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <Smartphone size={14} className="text-indigo-600" />
                    How to Install BNY SHOP:
                  </p>
                  {isIOS ? (
                    <ol className="list-decimal list-inside space-y-1 text-[11px] font-medium text-slate-700">
                      <li>Tap the <Share size={12} className="inline text-indigo-600 mx-0.5" /> <strong>Share</strong> button in Safari toolbar</li>
                      <li>Scroll down and tap <PlusSquare size={12} className="inline text-indigo-600 mx-0.5" /> <strong>Add to Home Screen</strong></li>
                      <li>Tap <strong>Add</strong> at top right corner</li>
                    </ol>
                  ) : (
                    <ol className="list-decimal list-inside space-y-1 text-[11px] font-medium text-slate-700">
                      <li>Tap the <strong>⋮ Menu</strong> icon at top right of browser</li>
                      <li>Select <strong>Add to Home screen</strong> or <strong>Install app</strong></li>
                      <li>Confirm to add <strong className="text-indigo-600">BNY SHOP</strong> to your device</li>
                    </ol>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {installedSuccess && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <Check size={16} />
          <span>BNY SHOP Installed Successfully!</span>
        </div>
      )}
    </AnimatePresence>
  );
};
