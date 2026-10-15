'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { SPBUItem } from '@/types/spbu';
import { INITIAL_SPBU_DATA } from '@/data/spbu-denpasar-badung';
import { SPBUService } from '@/lib/spbu-service';
import { Navbar } from '@/components/Layout/Navbar';
import { FilterBar } from '@/components/Layout/FilterBar';
import { SPBUCard } from '@/components/SPBU/SPBUCard';
import { CCTVPreviewModal } from '@/components/CCTV/CCTVPreviewModal';
import { QuickReportModal } from '@/components/Report/QuickReportModal';
import { PWAInstallBanner } from '@/components/Common/PWAInstallBanner';
import { Fuel, Map, List } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ToastProvider, useToast } from '@/components/Common/Toast';
import { ConfirmDialogProvider, useConfirmDialog } from '@/components/Common/ConfirmDialog';

// Dynamic import Leaflet map with SSR disabled
const DynamicSPBUMap = dynamic(
  () => import('@/components/Map/SPBUMap').then((mod) => mod.SPBUMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[420px] bg-zinc-100 flex flex-col items-center justify-center text-zinc-600 gap-3">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Memuat Peta Interaktif Denpasar &amp; Badung...</p>
      </div>
    ),
  }
);

function LiveSPBUApp() {
  const { showToast } = useToast();
  const [spbus, setSpbus] = useState<SPBUItem[]>(INITIAL_SPBU_DATA);
  const [selectedSpbu, setSelectedSpbu] = useState<SPBUItem | null>(null);
  const [cctvModalSpbu, setCctvModalSpbu] = useState<SPBUItem | null>(null);
  const [reportModalSpbu, setReportModalSpbu] = useState<SPBUItem | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRegency, setSelectedRegency] = useState<'all' | 'Denpasar' | 'Badung'>('all');
  const [onlyWithCCTV, setOnlyWithCCTV] = useState<boolean>(false);
  const [onlyPertaliteAvailable, setOnlyPertaliteAvailable] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Load SPBU data
  const loadData = async () => {
    setIsRefreshing(true);
    const data = await SPBUService.getSPBUs();
    setSpbus(data);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    loadData();

    // 1. Supabase Realtime Subscription for instant crowd updates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel('spbus-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'spbus' },
          () => {
            loadData();
          }
        )
        .subscribe();
    }

    // 2. Listen to local update events
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SPBUItem[]>;
      if (customEvent.detail) {
        setSpbus(customEvent.detail);
      }
    };

    window.addEventListener('spbu_updated', handleUpdate);
    return () => {
      window.removeEventListener('spbu_updated', handleUpdate);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Filtered SPBUs
  const filteredSPBUs = useMemo(() => {
    return spbus.filter((item) => {
      // Regency
      if (selectedRegency !== 'all' && item.regency !== selectedRegency) {
        return false;
      }

      // CCTV filter
      if (onlyWithCCTV && !item.cctv.hasCCTV) {
        return false;
      }

      // Pertalite available
      if (onlyPertaliteAvailable && item.fuelStock.pertalite !== 'available') {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchAddr = item.address.toLowerCase().includes(q);
        const matchDistrict = item.district.toLowerCase().includes(q);
        const matchCode = item.code.toLowerCase().includes(q);
        if (!matchName && !matchAddr && !matchDistrict && !matchCode) {
          return false;
        }
      }

      return true;
    });
  }, [spbus, selectedRegency, onlyWithCCTV, onlyPertaliteAvailable, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = spbus.length;
    const congested = spbus.filter((s) => s.queueLevel === 'congested').length;
    const smooth = spbus.filter((s) => s.queueLevel === 'smooth').length;
    const pertaliteOut = spbus.filter((s) => s.fuelStock.pertalite === 'out_of_stock').length;
    const withCCTV = spbus.filter((s) => s.cctv.hasCCTV).length;
    return { total, congested, smooth, pertaliteOut, withCCTV };
  }, [spbus]);

  // GPS User location
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      showToast('error', 'Browser Anda tidak mendukung akses lokasi GPS.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setIsLocating(false);

        // Find nearest SPBU
        let nearest: SPBUItem | null = null;
        let minDist = Infinity;

        for (const spbu of spbus) {
          const d = Math.hypot(spbu.coordinates.lat - coords.lat, spbu.coordinates.lng - coords.lng);
          if (d < minDist) {
            minDist = d;
            nearest = spbu;
          }
        }

        if (nearest) {
          const targetSpbu = nearest as SPBUItem;
          setSelectedSpbu(targetSpbu);
          showToast('success', `Lokasi GPS terdeteksi. Menampilkan ${targetSpbu.name}`);
        } else {
          showToast('info', 'Lokasi GPS Anda berhasil ditentukan.');
        }
      },
      (err) => {
        setIsLocating(false);
        showToast('error', 'Gagal mendeteksi lokasi GPS. Pastikan izin lokasi telah diaktifkan di browser Anda.');
        console.warn('Geolocation error:', err);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleUpvote = async (spbuId: string) => {
    try {
      await SPBUService.upvoteSPBU(spbuId);
      showToast('success', 'Konfirmasi akurasi berhasil dikirim!');
    } catch (err: unknown) {
      if (err instanceof Error) {
        showToast('error', err.message);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-zinc-900">
      {/* 1. Unified Header Navbar with live crisis stats */}
      <Navbar
        onLocateUser={handleLocateUser}
        isLocating={isLocating}
        onRefreshData={loadData}
        isRefreshing={isRefreshing}
        totalSPBU={stats.total}
        smoothCount={stats.smooth}
        congestedCount={stats.congested}
      />

      {/* 2. Streamlined Filter and Search Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedRegency={selectedRegency}
        onRegencyChange={setSelectedRegency}
        onlyWithCCTV={onlyWithCCTV}
        onToggleCCTV={() => setOnlyWithCCTV(!onlyWithCCTV)}
        onlyPertaliteAvailable={onlyPertaliteAvailable}
        onTogglePertalite={() => setOnlyPertaliteAvailable(!onlyPertaliteAvailable)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalFiltered={filteredSPBUs.length}
        cctvCount={stats.withCCTV}
      />

      {/* 4. Main Body: Split Desktop (Map + Sidebar) or Mobile Tab */}
      <main className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
        {/* Map View */}
        <div
          className={`flex-1 h-full w-full relative ${
            viewMode === 'list' ? 'hidden md:block' : 'block'
          }`}
        >
          <DynamicSPBUMap
            spbus={filteredSPBUs}
            selectedSpbu={selectedSpbu}
            onSelectSpbu={setSelectedSpbu}
            onOpenCCTV={(spbu) => setCctvModalSpbu(spbu)}
            onOpenReport={(spbu) => setReportModalSpbu(spbu)}
            userLocation={userLocation}
          />
        </div>

        {/* List / Sidebar View */}
        <aside
          className={`w-full md:w-[420px] lg:w-[460px] h-full bg-zinc-50 border-l border-zinc-200 flex flex-col shrink-0 ${
            viewMode === 'map' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-white">
            <h2 className="font-bold text-sm text-black">
              Daftar SPBU Denpasar &amp; Badung ({filteredSPBUs.length})
            </h2>
            <span className="text-xs text-zinc-500">
              {onlyWithCCTV ? 'Filter: CCTV Aktif' : 'Semua Kondisi'}
            </span>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredSPBUs.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 space-y-2">
                <Fuel className="w-10 h-10 mx-auto text-zinc-400" />
                <p className="font-medium text-sm">Tidak ada SPBU yang cocok dengan filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedRegency('all');
                    setOnlyWithCCTV(false);
                    setOnlyPertaliteAvailable(false);
                  }}
                  className="text-xs text-black underline hover:text-zinc-700 font-semibold focus-visible:ring-2 focus-visible:ring-black p-1"
                >
                  Reset semua filter
                </button>
              </div>
            ) : (
              filteredSPBUs.map((spbu) => (
                <SPBUCard
                  key={spbu.id}
                  spbu={spbu}
                  isSelected={selectedSpbu?.id === spbu.id}
                  onSelect={(item) => setSelectedSpbu(item)}
                  onOpenCCTV={(item) => setCctvModalSpbu(item)}
                  onOpenReport={(item) => setReportModalSpbu(item)}
                  onUpvote={handleUpvote}
                  userLocation={userLocation}
                />
              ))
            )}
          </div>
        </aside>
      </main>

      {/* 5. CCTV Preview Modal */}
      {cctvModalSpbu && (
        <CCTVPreviewModal
          spbu={cctvModalSpbu}
          onClose={() => setCctvModalSpbu(null)}
        />
      )}

      {/* 6. Quick Crowdsource Report Modal */}
      {reportModalSpbu && (
        <QuickReportModal
          spbu={reportModalSpbu}
          onClose={() => setReportModalSpbu(null)}
          onReportSuccess={(updated) => {
            setSpbus((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item))
            );
            if (selectedSpbu?.id === updated.id) {
              setSelectedSpbu(updated);
            }
          }}
        />
      )}

      {/* 7. PWA Mobile Home-Screen Install Prompt */}
      <PWAInstallBanner />

      {/* 8. Mobile Floating Switcher Button (Always accessible at thumb level) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 md:hidden">
        <button
          type="button"
          onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
          className="min-h-[46px] px-5 py-2.5 rounded-full bg-black text-white text-xs font-bold flex items-center gap-2 shadow-2xl border border-zinc-700 active:scale-95 transition-all cursor-pointer"
          aria-label={viewMode === 'map' ? 'Buka tampilan daftar SPBU' : 'Buka tampilan peta'}
        >
          {viewMode === 'map' ? (
            <>
              <List className="w-4 h-4" />
              <span>Daftar SPBU ({filteredSPBUs.length})</span>
            </>
          ) : (
            <>
              <Map className="w-4 h-4" />
              <span>Lihat Peta</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        <LiveSPBUApp />
      </ConfirmDialogProvider>
    </ToastProvider>
  );
}
