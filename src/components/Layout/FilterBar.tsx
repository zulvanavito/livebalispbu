'use client';

import React from 'react';
import { Search, Video, CheckCircle, X } from 'lucide-react';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedRegency: 'all' | 'Denpasar' | 'Badung';
  onRegencyChange: (reg: 'all' | 'Denpasar' | 'Badung') => void;
  onlyWithCCTV: boolean;
  onToggleCCTV: () => void;
  onlyPertaliteAvailable: boolean;
  onTogglePertalite: () => void;
  viewMode: 'map' | 'list';
  onViewModeChange: (mode: 'map' | 'list') => void;
  totalFiltered: number;
  cctvCount?: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedRegency,
  onRegencyChange,
  onlyWithCCTV,
  onToggleCCTV,
  onlyPertaliteAvailable,
  onTogglePertalite,
  viewMode,
  onViewModeChange,
  totalFiltered,
  cctvCount,
}) => {
  return (
    <div className="bg-white border-b border-zinc-200 px-4 py-2 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
        {/* Search Input with quick clear */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari nama SPBU, jalan, atau daerah..."
            aria-label="Cari SPBU, nama jalan, atau kecamatan"
            className="w-full min-h-[40px] pl-8.5 pr-8 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs sm:text-sm text-black placeholder-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-black rounded-full hover:bg-zinc-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Chips & View Mode Controls */}
        <div className="flex items-center justify-between md:justify-end gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 md:pb-0">
          {/* Regency selector */}
          <div className="flex bg-zinc-100 p-0.5 rounded-xl border border-zinc-200 shrink-0">
            {(['all', 'Denpasar', 'Badung'] as const).map((reg) => (
              <button
                key={reg}
                type="button"
                onClick={() => onRegencyChange(reg)}
                className={`min-h-[34px] px-2.5 sm:px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                  selectedRegency === reg
                    ? 'bg-black text-white font-bold shadow-xs'
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                {reg === 'all' ? 'Semua' : reg}
              </button>
            ))}
          </div>

          {/* CCTV Filter toggle with live count */}
          <button
            type="button"
            onClick={onToggleCCTV}
            aria-pressed={onlyWithCCTV}
            title="Filter hanya SPBU yang terpantau kamera CCTV"
            className={`min-h-[36px] px-2.5 sm:px-3 py-1 rounded-xl text-xs font-medium border flex items-center gap-1.5 shrink-0 transition-colors focus-visible:ring-2 focus-visible:ring-black cursor-pointer ${
              onlyWithCCTV
                ? 'bg-red-50 border-red-300 text-red-700 font-bold'
                : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-black'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-red-600" />
            <span>CCTV {cctvCount !== undefined ? `(${cctvCount})` : ''}</span>
          </button>

          {/* Pertalite Filter toggle */}
          <button
            type="button"
            onClick={onTogglePertalite}
            aria-pressed={onlyPertaliteAvailable}
            title="Filter hanya SPBU dengan stok Pertalite tersedia"
            className={`min-h-[36px] px-2.5 sm:px-3 py-1 rounded-xl text-xs font-medium border flex items-center gap-1.5 shrink-0 transition-colors focus-visible:ring-2 focus-visible:ring-black cursor-pointer ${
              onlyPertaliteAvailable
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold'
                : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-black'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pertalite Siap</span>
          </button>

          {/* View Mode Toggle (Map vs List) */}
          <div className="flex bg-zinc-100 p-0.5 rounded-xl border border-zinc-200 shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange('map')}
              aria-label="Tampilan Peta Interaktif"
              className={`min-h-[34px] px-2.5 sm:px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-black text-white font-bold shadow-xs'
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              Peta
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              aria-label={`Tampilan Daftar ${totalFiltered} SPBU`}
              className={`min-h-[34px] px-2.5 sm:px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-black text-white font-bold shadow-xs'
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              Daftar ({totalFiltered})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

