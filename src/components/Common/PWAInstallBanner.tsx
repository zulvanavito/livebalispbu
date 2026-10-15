'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);

  useEffect(() => {
    // Check if already in standalone mode (installed app)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    // Check if dismissed before in this session
    const isDismissed = sessionStorage.getItem('pwa_banner_dismissed');
    if (isDismissed) return;

    // Check if iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    // Handler for Chrome / Android beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // If iOS and not standalone, show optional prompt after 3s
    if (isIosDevice && !isStandalone) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[950] animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-zinc-900 text-white rounded-2xl p-4 shadow-2xl border border-zinc-700">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Pasang di Layar HP</h4>
              <p className="text-xs text-zinc-400 leading-snug mt-0.5">
                Akses cepat info antrean BBM Bali langsung dari Home Screen.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Tutup saran pasang aplikasi"
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {showIOSGuide ? (
          <div className="mt-3 p-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700 text-xs text-zinc-300 space-y-1.5 animate-in fade-in">
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <Share className="w-3.5 h-3.5 text-blue-400" />
              Cara Pasang di iPhone/iPad:
            </div>
            <p className="text-[11px] text-zinc-400">
              1. Tap tombol <strong>Share</strong> (ikon kotak panah ke atas) di Safari bawah.
            </p>
            <p className="text-[11px] text-zinc-400">
              2. Gulir ke bawah lalu pilih <strong>&quot;Tambah ke Layar Utama&quot;</strong> (*Add to Home Screen*).
            </p>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Nanti saja
            </button>
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              {isIOS ? 'Lihat Petunjuk' : 'Pasang Sekarang'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
