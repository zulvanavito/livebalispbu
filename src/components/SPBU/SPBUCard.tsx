'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SPBUItem } from '@/types/spbu';
import { Video, Clock, MapPin, ThumbsUp, Edit3, Navigation, Camera } from 'lucide-react';
import { isWithin24Hours } from '@/lib/spbu-service';

interface SPBUCardProps {
  spbu: SPBUItem;
  onSelect: (spbu: SPBUItem) => void;
  onOpenCCTV: (spbu: SPBUItem) => void;
  onOpenReport: (spbu: SPBUItem) => void;
  onUpvote: (spbuId: string) => void;
  isSelected?: boolean;
  userLocation?: { lat: number; lng: number } | null;
}

export const SPBUCard: React.FC<SPBUCardProps> = ({
  spbu,
  onSelect,
  onOpenCCTV,
  onOpenReport,
  onUpvote,
  isSelected = false,
  userLocation,
}) => {
  const [relativeTime, setRelativeTime] = useState<string>('Baru saja');
  const [isStale, setIsStale] = useState<boolean>(false);

  // Calculate actual Haversine distance if user GPS is available
  const distanceKm = useMemo(() => {
    if (!userLocation) return null;
    const R = 6371; // km
    const dLat = ((spbu.coordinates.lat - userLocation.lat) * Math.PI) / 180;
    const dLng = ((spbu.coordinates.lng - userLocation.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLocation.lat * Math.PI) / 180) *
        Math.cos((spbu.coordinates.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`;
  }, [userLocation, spbu.coordinates]);

  useEffect(() => {
    if (!spbu.lastReportedAt) return;
    const diffMs = Date.now() - new Date(spbu.lastReportedAt).getTime();
    const diffMins = Math.max(1, Math.floor(diffMs / (60 * 1000)));
    setIsStale(diffMins >= 60);

    if (diffMins < 60) {
      setRelativeTime(`${diffMins} mnt lalu`);
    } else {
      const diffHours = Math.floor(diffMins / 60);
      setRelativeTime(`${diffHours} jam lalu`);
    }
  }, [spbu.lastReportedAt]);

  const getQueueBadge = () => {
    switch (spbu.queueLevel) {
      case 'congested':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-800',
          dot: 'bg-rose-600',
          label: 'Macet Mengular',
          time: `~${spbu.estimatedWaitMinutes} mnt antre`,
        };
      case 'moderate':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          dot: 'bg-amber-500',
          label: 'Ramai Sedang',
          time: `~${spbu.estimatedWaitMinutes} mnt antre`,
        };
      case 'smooth':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          dot: 'bg-emerald-600',
          label: 'Relatif Lancar',
          time: `~${spbu.estimatedWaitMinutes} mnt antre`,
        };
      case 'empty':
        return {
          bg: 'bg-zinc-100 border-zinc-200 text-zinc-700',
          dot: 'bg-zinc-400',
          label: 'Kosong / Tutup',
          time: 'Nihil',
        };
      default:
        return {
          bg: 'bg-zinc-100 border-zinc-200 text-zinc-600',
          dot: 'bg-zinc-400',
          label: 'Belum Ada Data',
          time: '-',
        };
    }
  };

  const queueInfo = getQueueBadge();

  return (
    <article
      className={`p-4 rounded-2xl border transition-all relative ${
        isSelected
          ? 'bg-white border-black shadow-md ring-2 ring-black'
          : 'bg-white hover:bg-zinc-50 border-zinc-200 hover:border-zinc-300 shadow-xs'
      }`}
    >
      {/* Clickable Card Body for SPBU Selection */}
      <div
        onClick={() => onSelect(spbu)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(spbu);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`Pilih SPBU ${spbu.name}, kondisi ${queueInfo.label}`}
        className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-xl -m-1 p-1"
      >
        {/* Top row: Metadata + Timestamp */}
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 text-zinc-800 border border-zinc-200">
            {spbu.code}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
            {spbu.regency} • {spbu.district}
          </span>
          {distanceKm && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
              <Navigation className="w-2.5 h-2.5" />
              {distanceKm}
            </span>
          )}
        </div>

        <span
          className={`text-[10px] whitespace-nowrap flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded ${
            isStale
              ? 'bg-amber-50 text-amber-700 border border-amber-200 font-medium'
              : 'text-zinc-600'
          }`}
          title={isStale ? 'Laporan lebih dari 1 jam lalu. Kondisi mungkin sudah berubah.' : undefined}
        >
          <Clock className={`w-3 h-3 ${isStale ? 'text-amber-600' : 'text-zinc-500'}`} />
          {relativeTime}
          {isStale && <span className="font-semibold text-[9px] hidden sm:inline">(Perlu update)</span>}
        </span>
      </div>

      {/* Main row: Name, Address & Queue Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-black text-sm leading-snug truncate">
            {spbu.name}
          </h4>
          <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            {spbu.address}
          </p>
        </div>

        {/* Queue badge */}
        <div className={`px-2.5 py-1 rounded-xl border text-right shrink-0 ${queueInfo.bg}`}>
          <div className="flex items-center justify-end gap-1.5">
            <span className={`w-2 h-2 rounded-full ${queueInfo.dot}`}></span>
            <span className="font-bold text-xs">{queueInfo.label}</span>
          </div>
          <div className="text-[11px] font-medium opacity-90 mt-0.5">
            {queueInfo.time}
          </div>
        </div>
      </div>

      {/* Fuel Availability Grid */}
      <div className="mt-2.5 pt-2 border-t border-zinc-100 grid grid-cols-3 gap-1.5 text-center text-xs">
        {/* Pertalite */}
        <div className="px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200/80 flex flex-col items-center">
          <span className="text-[10px] font-medium text-zinc-500">Pertalite</span>
          <span
            className={`font-bold text-xs mt-0.5 ${
              spbu.fuelStock.pertalite === 'available'
                ? 'text-emerald-700'
                : spbu.fuelStock.pertalite === 'low'
                ? 'text-amber-700'
                : 'text-rose-700 line-through'
            }`}
          >
            {spbu.fuelStock.pertalite === 'available'
              ? 'Ada'
              : spbu.fuelStock.pertalite === 'low'
              ? 'Menipis'
              : 'Habis'}
          </span>
        </div>

        {/* Pertamax */}
        <div className="px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200/80 flex flex-col items-center">
          <span className="text-[10px] font-medium text-zinc-500">Pertamax</span>
          <span
            className={`font-bold text-xs mt-0.5 ${
              spbu.fuelStock.pertamax === 'available'
                ? 'text-zinc-900'
                : spbu.fuelStock.pertamax === 'low'
                ? 'text-amber-700'
                : 'text-rose-700 line-through'
            }`}
          >
            {spbu.fuelStock.pertamax === 'available'
              ? 'Ada'
              : spbu.fuelStock.pertamax === 'low'
              ? 'Menipis'
              : 'Habis'}
          </span>
        </div>

        {/* Solar */}
        <div className="px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200/80 flex flex-col items-center">
          <span className="text-[10px] font-medium text-zinc-500">Bio Solar</span>
          <span
            className={`font-bold text-xs mt-0.5 ${
              spbu.fuelStock.solar === 'available'
                ? 'text-emerald-700'
                : spbu.fuelStock.solar === 'low'
                ? 'text-amber-700'
                : 'text-rose-700 line-through'
            }`}
          >
            {spbu.fuelStock.solar === 'available'
              ? 'Ada'
              : spbu.fuelStock.solar === 'low'
              ? 'Menipis'
              : 'Habis'}
          </span>
        </div>
      </div>
      </div>

      {/* Action Buttons: CCTV, Rute, Report, Upvote */}
      <div className="mt-2.5 pt-2 flex items-center justify-between gap-1.5 border-t border-zinc-100">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {spbu.cctv.hasCCTV ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCCTV(spbu);
              }}
              title={`Lihat siaran CCTV ${spbu.name}`}
              aria-label={`Lihat siaran CCTV ${spbu.name}`}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-black cursor-pointer whitespace-nowrap shadow-xs"
            >
              <Video className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>Lihat CCTV</span>
            </button>
          ) : ((spbu.latestPhoto && isWithin24Hours(spbu.latestPhoto.createdAt)) || (spbu.recentPhotos && spbu.recentPhotos.some(p => isWithin24Hours(p.createdAt)))) ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCCTV(spbu);
              }}
              title={`Lihat foto antrean ${spbu.name}`}
              aria-label={`Lihat foto antrean ${spbu.name}`}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-black cursor-pointer whitespace-nowrap shadow-xs"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Foto Antrean</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCCTV(spbu);
              }}
              title={`Pantau antrean visual ${spbu.name}`}
              aria-label={`Pantau antrean visual ${spbu.name}`}
              className="min-h-[44px] px-2.5 py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200 text-xs font-medium flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-black cursor-pointer whitespace-nowrap"
            >
              <Camera className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>Pantau Visual</span>
            </button>
          )}

          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${spbu.name}, ${spbu.address}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={`Buka rute navigasi ke ${spbu.name}`}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-black cursor-pointer whitespace-nowrap"
          >
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
            <span>Rute</span>
          </a>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenReport(spbu);
            }}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-black cursor-pointer shadow-xs ml-auto whitespace-nowrap"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Lapor</span>
          </button>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUpvote(spbu.id);
          }}
          title="Konfirmasi data ini akurat"
          aria-label="Konfirmasi data SPBU ini akurat"
          className="min-h-[44px] min-w-[44px] px-2.5 py-1.5 flex items-center justify-center gap-1 text-zinc-600 hover:text-emerald-700 hover:bg-zinc-100 border border-transparent hover:border-zinc-200 transition-colors focus-visible:ring-2 focus-visible:ring-black rounded-xl cursor-pointer shrink-0"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">{spbu.upvotes || 0}</span>
        </button>
      </div>
    </article>
  );
};
