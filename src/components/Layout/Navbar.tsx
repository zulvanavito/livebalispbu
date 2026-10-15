'use client';

import React from 'react';
import { Navigation, RefreshCw, RotateCcw } from 'lucide-react';
import { Logo } from '../Common/Logo';

interface NavbarProps {
  onLocateUser: () => void;
  isLocating: boolean;
  onRefreshData: () => void;
  isRefreshing: boolean;
  totalSPBU?: number;
  smoothCount?: number;
  congestedCount?: number;
  onResetData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onLocateUser,
  isLocating,
  onRefreshData,
  isRefreshing,
  totalSPBU,
  smoothCount,
  congestedCount,
  onResetData,
}) => {
  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-40 px-4 py-2 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <Logo size="md" />

        {/* Center: Integrated Live Crisis Stats (Removes redundant alert bar) */}
        {totalSPBU !== undefined && (
          <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-zinc-50 border border-zinc-200 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="font-semibold text-zinc-900">Krisis BBM:</span>
            <span className="text-zinc-700 font-medium">{totalSPBU} SPBU</span>
            <span className="text-zinc-300">•</span>
            <span className="text-emerald-700 font-semibold">{smoothCount} Lancar</span>
            <span className="text-zinc-300">•</span>
            <span className="text-rose-700 font-semibold">{congestedCount} Macet</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {onResetData && (
            <button
              onClick={onResetData}
              title="Kembalikan data ke kondisi awal"
              aria-label="Reset data ke default"
              className="min-h-[40px] px-2.5 py-1.5 text-zinc-500 hover:text-black hover:bg-zinc-100 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-black cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Reset</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={onRefreshData}
            title="Muat ulang status terbaru"
            aria-label="Muat ulang status SPBU terbaru"
            className="min-h-[40px] min-w-[40px] px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-black cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-black' : ''}`} />
            <span className="hidden md:inline">Perbarui</span>
          </button>

          {/* GPS Locator Button */}
          <button
            onClick={onLocateUser}
            aria-label="Cari SPBU terdekat dari lokasi saya"
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-black cursor-pointer shadow-xs"
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Mencari...' : 'Dekat Saya'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
