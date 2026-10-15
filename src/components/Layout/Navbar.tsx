'use client';

import React, { useState, useEffect } from 'react';
import { Navigation, RefreshCw, Info, Share2, Menu, X } from 'lucide-react';
import { Logo } from '../Common/Logo';

interface NavbarProps {
  onLocateUser: () => void;
  isLocating: boolean;
  onRefreshData: () => void;
  isRefreshing: boolean;
  totalSPBU?: number;
  smoothCount?: number;
  congestedCount?: number;
  onOpenTransparency?: () => void;
  onOpenShare?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onLocateUser,
  isLocating,
  onRefreshData,
  isRefreshing,
  totalSPBU,
  smoothCount,
  congestedCount,
  onOpenTransparency,
  onOpenShare,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on Escape key press
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40 px-3 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Brand / Logo */}
          <Logo size="md" />

          {/* Center: Integrated Live Crisis Stats with transparency click (Desktop only) */}
          {totalSPBU !== undefined && (
            <button
              type="button"
              onClick={onOpenTransparency}
              title="Klik untuk rincian cakupan wilayah Sarbagita & verifikasi data"
              className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-xs transition-colors cursor-pointer group shrink-0"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="font-semibold text-zinc-900">Cakupan Bali:</span>
              <span className="text-zinc-700 font-medium">{totalSPBU} SPBU</span>
              <span className="text-zinc-300">•</span>
              <span className="text-emerald-700 font-semibold">{smoothCount} Lancar</span>
              <span className="text-zinc-300">•</span>
              <span className="text-rose-700 font-semibold">{congestedCount} Macet</span>
              <Info className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-800 ml-0.5" />
            </button>
          )}

          {/* Desktop Action Controls (hidden on mobile, visible on sm and up) */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {/* Info / Data Transparency Button */}
            <button
              type="button"
              onClick={onOpenTransparency}
              title="Tentang data, verifikasi & cakupan wilayah"
              aria-label="Informasi transparansi data dan cakupan wilayah"
              className="h-10 px-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black transition-all flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none cursor-pointer"
            >
              <Info className="w-4 h-4 text-zinc-600 shrink-0" />
              <span className="text-xs font-semibold whitespace-nowrap">Info Data</span>
            </button>

            {/* Share Button */}
            <button
              type="button"
              onClick={onOpenShare}
              title="Bagikan kondisi BBM (Story, Post, Pesan)"
              aria-label="Bagikan kondisi BBM ke Instagram, WhatsApp, atau Pesan"
              className="h-10 px-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black transition-all flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-zinc-600 shrink-0" />
              <span className="text-xs font-semibold whitespace-nowrap">Bagikan</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={onRefreshData}
              title="Muat ulang status terbaru"
              aria-label="Muat ulang status SPBU terbaru"
              className="h-10 px-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black transition-all flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-zinc-600 shrink-0 ${isRefreshing ? 'animate-spin text-black' : ''}`} />
              <span className="text-xs font-semibold whitespace-nowrap">Perbarui</span>
            </button>

            {/* Desktop GPS Locator Button */}
            <button
              type="button"
              onClick={onLocateUser}
              title="Cari SPBU terdekat dari lokasi saya"
              aria-label="Cari SPBU terdekat dari lokasi saya"
              className="h-10 px-3.5 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
            >
              <Navigation className={`w-4 h-4 shrink-0 ${isLocating ? 'animate-spin' : ''}`} />
              <span className="whitespace-nowrap">
                {isLocating ? 'Mencari...' : 'Dekat Saya'}
              </span>
            </button>
          </div>

          {/* Mobile Action Controls: Only Dekat Saya + Menu Drawer Trigger */}
          <div className="flex sm:hidden items-center gap-2 shrink-0">
            {/* Primary Action: Dekat Saya (Full text, prominent, never cut off) */}
            <button
              type="button"
              onClick={onLocateUser}
              title="Cari SPBU terdekat dari lokasi saya"
              aria-label="Cari SPBU terdekat dari lokasi saya"
              className="h-10 px-3.5 rounded-xl bg-black hover:bg-zinc-800 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
            >
              <Navigation className={`w-4 h-4 shrink-0 ${isLocating ? 'animate-spin' : ''}`} />
              <span className="whitespace-nowrap">
                {isLocating ? 'Mencari...' : 'Dekat Saya'}
              </span>
            </button>

            {/* Mobile Menu Trigger (Opens Bottom Sheet) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Buka menu opsi lainnya"
              aria-expanded={isMobileMenuOpen}
              className="h-10 w-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:scale-95 text-zinc-800 border border-zinc-200 flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5 text-zinc-800 shrink-0" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Bottom Sheet */}
      {isMobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu Opsi Aplikasi"
          className="fixed inset-0 z-[9999] flex flex-col justify-end bg-black/60 backdrop-blur-xs transition-opacity sm:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="bg-white rounded-t-2xl p-5 border-t border-zinc-200 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pull pill handle */}
            <div className="w-12 h-1 bg-zinc-300 rounded-full mx-auto" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div>
                <h3 className="font-bold text-sm text-zinc-950">Menu &amp; Informasi</h3>
                <p className="text-xs text-zinc-500">Live SPBU Bali</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Tutup menu"
                className="h-9 w-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-black flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Crisis Stats Summary inside Menu */}
            {totalSPBU !== undefined && (
              <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-semibold text-zinc-900">Total SPBU:</span>
                  <span className="font-bold text-zinc-800">{totalSPBU} Titik</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-semibold">
                  <span className="text-emerald-700">{smoothCount} Lancar</span>
                  <span className="text-zinc-300">•</span>
                  <span className="text-rose-700">{congestedCount} Macet</span>
                </div>
              </div>
            )}

            {/* Action Cards */}
            <div className="space-y-2 pt-1">
              {/* Action 1: Refresh */}
              <button
                type="button"
                onClick={() => {
                  onRefreshData();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full min-h-[52px] p-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 active:bg-zinc-100 text-left flex items-center gap-3 transition-colors cursor-pointer group"
              >
                <div className="h-10 w-10 rounded-lg bg-zinc-100 group-hover:bg-zinc-200 flex items-center justify-center shrink-0">
                  <RefreshCw className={`w-4 h-4 text-zinc-800 ${isRefreshing ? 'animate-spin text-black' : ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-zinc-900">Perbarui Data Realtime</div>
                  <div className="text-[11px] text-zinc-500 truncate">Muat ulang status antrean &amp; stok terbaru</div>
                </div>
              </button>

              {/* Action 2: Share */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenShare?.();
                }}
                className="w-full min-h-[52px] p-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 active:bg-zinc-100 text-left flex items-center gap-3 transition-colors cursor-pointer group"
              >
                <div className="h-10 w-10 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center shrink-0">
                  <Share2 className="w-4 h-4 text-emerald-800" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-zinc-900">Bagikan Kondisi BBM</div>
                  <div className="text-[11px] text-zinc-500 truncate">Story Instagram, Post feed, atau WhatsApp</div>
                </div>
              </button>

              {/* Action 3: Info Data */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenTransparency?.();
                }}
                className="w-full min-h-[52px] p-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 active:bg-zinc-100 text-left flex items-center gap-3 transition-colors cursor-pointer group"
              >
                <div className="h-10 w-10 rounded-lg bg-sky-50 group-hover:bg-sky-100 flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4 text-sky-800" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-zinc-900">Transparansi &amp; Metodologi Data</div>
                  <div className="text-[11px] text-zinc-500 truncate">Cakupan Sarbagita, verifikasi data, &amp; sumber</div>
                </div>
              </button>
            </div>

            {/* Footer note */}
            <div className="pt-2 text-center text-[10px] text-zinc-400">
              Live SPBU Bali &bull; Informasi independen &amp; laporan warga realtime
            </div>
          </div>
        </div>
      )}
    </>
  );
};

