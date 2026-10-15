'use client';

import React from 'react';
import { Search, Video, CheckCircle, X, Map, List, MapPin, ChevronDown } from 'lucide-react';
import { BaliRegency } from '@/types/spbu';

export type RegencyFilterOption = 'all' | BaliRegency;

export const BALI_REGENCIES: { value: RegencyFilterOption; label: string }[] = [
  { value: 'all', label: 'Semua Bali' },
  { value: 'Denpasar', label: 'Kota Denpasar' },
  { value: 'Badung', label: 'Kab. Badung' },
  { value: 'Gianyar', label: 'Kab. Gianyar' },
  { value: 'Tabanan', label: 'Kab. Tabanan' },
  { value: 'Buleleng', label: 'Kab. Buleleng' },
  { value: 'Bangli', label: 'Kab. Bangli' },
  { value: 'Klungkung', label: 'Kab. Klungkung' },
  { value: 'Karangasem', label: 'Kab. Karangasem' },
  { value: 'Jembrana', label: 'Kab. Jembrana' },
];

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedRegency: RegencyFilterOption;
  onRegencyChange: (reg: RegencyFilterOption) => void;
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
  const isRegencyActive = selectedRegency !== 'all';

  return (
    <div className="bg-white border-b border-zinc-200 px-4 py-2.5 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Search input with quick clear button */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari nama SPBU, jalan, atau daerah..."
            aria-label="Cari SPBU, nama jalan, atau kecamatan"
            className="w-full min-h-[44px] pl-9 pr-10 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs sm:text-sm text-zinc-900 placeholder-zinc-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Hapus kata kunci pencarian"
              className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-500 hover:text-black transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mobile view mode switcher */}
        <div className="grid grid-cols-2 bg-zinc-100 p-1 rounded-xl border border-zinc-200 w-full md:hidden">
          <button
            type="button"
            onClick={() => onViewModeChange('map')}
            aria-label="Tampilan Peta Interaktif"
            className={`min-h-[44px] py-1.5 text-xs rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'map'
                ? 'bg-black text-white shadow-xs'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            <Map className="w-4 h-4" />
            <span>Peta</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            aria-label={`Tampilan Daftar ${totalFiltered} SPBU`}
            className={`min-h-[44px] py-1.5 text-xs rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-black text-white shadow-xs'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Daftar ({totalFiltered})</span>
          </button>
        </div>

        {/* Filter controls: compact regency dropdown, CCTV, and Pertalite */}
        <div 
          className="flex items-center gap-2 overflow-x-auto sm:overflow-visible pb-1 md:pb-0 w-full md:w-auto touch-pan-x" 
          style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
        >
          {/* Compact regency selector */}
          <div className="relative shrink-0">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MapPin className={`w-3.5 h-3.5 ${isRegencyActive ? 'text-white' : 'text-zinc-600'}`} />
            </div>
            <select
              value={selectedRegency}
              onChange={(e) => onRegencyChange(e.target.value as RegencyFilterOption)}
              aria-label="Filter wilayah kabupaten atau kota di Bali"
              className={`min-h-[44px] pl-8.5 pr-8 py-2 rounded-xl text-xs sm:text-sm font-bold cursor-pointer appearance-none transition-colors focus-visible:ring-2 focus-visible:ring-black focus:outline-none ${
                isRegencyActive
                  ? 'bg-black text-white border border-black shadow-xs'
                  : 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-900 border border-zinc-200'
              }`}
            >
              {BALI_REGENCIES.map((reg) => (
                <option key={reg.value} value={reg.value} className="text-zinc-900 bg-white">
                  {reg.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
              <ChevronDown className={`w-3.5 h-3.5 ${isRegencyActive ? 'text-white' : 'text-zinc-600'}`} />
            </div>
          </div>

          {/* CCTV toggle */}
          <button
            type="button"
            onClick={onToggleCCTV}
            aria-pressed={onlyWithCCTV}
            title="Filter hanya SPBU yang terpantau kamera CCTV"
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 shrink-0 transition-colors focus-visible:ring-2 focus-visible:ring-black cursor-pointer ${
              onlyWithCCTV
                ? 'bg-red-50 border-red-300 text-red-700 font-bold'
                : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-black'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-red-600" />
            <span>CCTV {cctvCount !== undefined ? `(${cctvCount})` : ''}</span>
          </button>

          {/* Pertalite toggle */}
          <button
            type="button"
            onClick={onTogglePertalite}
            aria-pressed={onlyPertaliteAvailable}
            title="Filter hanya SPBU dengan stok Pertalite tersedia"
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 shrink-0 transition-colors focus-visible:ring-2 focus-visible:ring-black cursor-pointer ${
              onlyPertaliteAvailable
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold'
                : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-black'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pertalite Siap</span>
          </button>
        </div>
      </div>
    </div>
  );
};
