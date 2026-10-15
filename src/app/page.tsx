'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { SPBUItem, MapBounds } from '@/types/spbu';
import { INITIAL_SPBU_DATA } from '@/data/spbu-denpasar-badung';
import { SPBUService, isWithin24Hours } from '@/lib/spbu-service';
import { Navbar } from '@/components/Layout/Navbar';
import { FilterBar, RegencyFilterOption } from '@/components/Layout/FilterBar';
import { SPBUCard } from '@/components/SPBU/SPBUCard';
import { CCTVPreviewModal } from '@/components/CCTV/CCTVPreviewModal';
import { QuickReportModal } from '@/components/Report/QuickReportModal';
import { PWAInstallBanner } from '@/components/Common/PWAInstallBanner';
import { Fuel, Map, List, Compass } from 'lucide-react';
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
  const [selectedRegency, setSelectedRegency] = useState<RegencyFilterOption>('all');
  const [onlyVisual, setOnlyVisual] = useState<boolean>(false);
  const [visualSpbuIds, setVisualSpbuIds] = useState<Set<string>>(new Set());
  const [onlyPertaliteAvailable, setOnlyPertaliteAvailable] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(15);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [filterByBounds, setFilterByBounds] = useState<boolean>(true);

  // Load SPBU data & Visual Monitoring summary (CCTV + Citizen Photos <= 24h)
  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [data, visualSummary] = await Promise.all([
        SPBUService.getSPBUs(),
        SPBUService.fetchVisualSummary(),
      ]);

      const visualSet = new Set<string>();
      for (const item of data) {
        if (item.cctv.hasCCTV) {
          visualSet.add(item.id);
        } else if (item.latestPhoto && isWithin24Hours(item.latestPhoto.createdAt)) {
          visualSet.add(item.id);
        } else if (item.recentPhotos && item.recentPhotos.some((p) => isWithin24Hours(p.createdAt))) {
          visualSet.add(item.id);
        }
      }

      if (visualSummary && visualSummary.recentSpbuIds) {
        for (const id of visualSummary.recentSpbuIds) {
          visualSet.add(id);
        }
      }

      setSpbus(data);
      setVisualSpbuIds(visualSet);
    } catch (err) {
      console.warn('Error loading SPBU data with visual summary:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime subscription for instant crowd updates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel('spbus-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'spbus' },
          (payload) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updatedRow = payload.new as any;
            if (updatedRow && updatedRow.id) {
              setSpbus((prev) =>
                prev.map((item) => {
                  if (item.id === updatedRow.id) {
                    return {
                      ...item,
                      queueLevel: updatedRow.queue_level ?? item.queueLevel,
                      estimatedWaitMinutes: updatedRow.estimated_wait_minutes ?? item.estimatedWaitMinutes,
                      fuelStock: updatedRow.fuel_stock ?? item.fuelStock,
                      reportCount: updatedRow.report_count ?? item.reportCount,
                      upvotes: updatedRow.upvotes ?? item.upvotes,
                      lastReportedAt: updatedRow.last_reported_at ?? item.lastReportedAt,
                    };
                  }
                  return item;
                })
              );
            } else {
              loadData();
            }
          }
        )
        .subscribe();
    }

    // Local update event listener
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

      // Pantau Visual filter (CCTV or Citizen photo within 24 hours)
      if (onlyVisual && !visualSpbuIds.has(item.id)) {
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
  }, [spbus, selectedRegency, onlyVisual, visualSpbuIds, onlyPertaliteAvailable, searchQuery]);

  // SPBUs visible in current map viewport (if filterByBounds is active)
  const visibleListSPBUs = useMemo(() => {
    if (!filterByBounds || !mapBounds) {
      return filteredSPBUs;
    }
    return filteredSPBUs.filter((item) => {
      // Selected SPBU always stays visible in the list
      if (selectedSpbu?.id === item.id) return true;

      const { lat, lng } = item.coordinates;
      return (
        lat >= mapBounds.south &&
        lat <= mapBounds.north &&
        lng >= mapBounds.west &&
        lng <= mapBounds.east
      );
    });
  }, [filteredSPBUs, filterByBounds, mapBounds, selectedSpbu]);

  // Reset pagination count when filter criteria change or bounds mode toggles
  useEffect(() => {
    setVisibleCount(15);
  }, [selectedRegency, onlyVisual, onlyPertaliteAvailable, searchQuery, filterByBounds]);

  // Ensure selected SPBU is within visible slice when selected from map
  useEffect(() => {
    if (selectedSpbu) {
      const idx = visibleListSPBUs.findIndex((item) => item.id === selectedSpbu.id);
      if (idx >= 0 && idx >= visibleCount) {
        setVisibleCount(Math.ceil((idx + 1) / 15) * 15);
      }
    }
  }, [selectedSpbu, visibleListSPBUs, visibleCount]);

  // Paginated visible items
  const displayedSPBUs = useMemo(
    () => visibleListSPBUs.slice(0, visibleCount),
    [visibleListSPBUs, visibleCount]
  );

  // Statistics
  const stats = useMemo(() => {
    const total = spbus.length;
    const congested = spbus.filter((s) => s.queueLevel === 'congested').length;
    const smooth = spbus.filter((s) => s.queueLevel === 'smooth').length;
    const pertaliteOut = spbus.filter((s) => s.fuelStock.pertalite === 'out_of_stock').length;
    
    // Dynamic visual count for currently selected regency
    const visualCount = spbus.filter((s) => {
      if (selectedRegency !== 'all' && s.regency !== selectedRegency) {
        return false;
      }
      return visualSpbuIds.has(s.id);
    }).length;

    return { total, congested, smooth, pertaliteOut, visualCount };
  }, [spbus, selectedRegency, visualSpbuIds]);

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
      {/* Header Navbar */}
      <Navbar
        onLocateUser={handleLocateUser}
        isLocating={isLocating}
        onRefreshData={loadData}
        isRefreshing={isRefreshing}
        totalSPBU={stats.total}
        smoothCount={stats.smooth}
        congestedCount={stats.congested}
      />

      {/* Filter and Search Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedRegency={selectedRegency}
        onRegencyChange={setSelectedRegency}
        onlyVisual={onlyVisual}
        onToggleVisual={() => setOnlyVisual(!onlyVisual)}
        onlyPertaliteAvailable={onlyPertaliteAvailable}
        onTogglePertalite={() => setOnlyPertaliteAvailable(!onlyPertaliteAvailable)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalFiltered={filteredSPBUs.length}
        visualCount={stats.visualCount}
      />

      {/* Main Body: Split Desktop or Mobile View */}
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
            onBoundsChange={setMapBounds}
          />
        </div>

        {/* List / Sidebar View */}
        <aside
          className={`w-full md:w-[420px] lg:w-[460px] h-full bg-zinc-50 border-l border-zinc-200 flex flex-col shrink-0 ${
            viewMode === 'map' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-3.5 sm:p-4 border-b border-zinc-200 flex items-center justify-between bg-white shrink-0 gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-sm text-black truncate">
                {filterByBounds
                  ? `SPBU di Area Peta (${visibleListSPBUs.length})`
                  : selectedRegency === 'all'
                  ? `Daftar Seluruh SPBU (${filteredSPBUs.length})`
                  : `Daftar SPBU ${selectedRegency} (${filteredSPBUs.length})`}
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                {filterByBounds
                  ? `Menampilkan ${displayedSPBUs.length} SPBU yang tampak di layar`
                  : `Menampilkan ${displayedSPBUs.length} dari ${filteredSPBUs.length} SPBU`}
              </p>
            </div>

            {/* Toggle Area Peta */}
            <button
              type="button"
              onClick={() => setFilterByBounds((prev) => !prev)}
              title={
                filterByBounds
                  ? 'Sedang memfilter sesuai area peta yang tampak. Klik untuk tampilkan semua.'
                  : 'Klik untuk membatasi daftar hanya pada area peta yang sedang tampak.'
              }
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-black min-h-[38px] ${
                filterByBounds
                  ? 'bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800'
                  : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100 hover:text-black'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{filterByBounds ? 'Sesuai Peta' : 'Semua Area'}</span>
            </button>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {visibleListSPBUs.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 space-y-3 px-4">
                <Fuel className="w-10 h-10 mx-auto text-zinc-400" />
                <div>
                  <p className="font-semibold text-sm text-zinc-800">
                    {filterByBounds
                      ? 'Tidak ada SPBU di area peta yang sedang tampak.'
                      : 'Tidak ada SPBU yang cocok dengan filter.'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {filterByBounds
                      ? 'Geser atau perkecil zoom peta untuk melihat SPBU di sekitarnya.'
                      : 'Coba ubah kata kunci atau reset filter pencarian.'}
                  </p>
                </div>
                {filterByBounds ? (
                  <button
                    type="button"
                    onClick={() => setFilterByBounds(false)}
                    className="inline-flex items-center justify-center text-xs text-black font-semibold underline hover:text-zinc-700 p-2 min-h-[44px] cursor-pointer"
                  >
                    Tampilkan semua SPBU ({filteredSPBUs.length})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedRegency('all');
                      setOnlyVisual(false);
                      setOnlyPertaliteAvailable(false);
                    }}
                    className="inline-flex items-center justify-center text-xs text-black font-semibold underline hover:text-zinc-700 p-2 min-h-[44px] cursor-pointer"
                  >
                    Reset semua filter
                  </button>
                )}
              </div>
            ) : (
              <>
                {displayedSPBUs.map((spbu) => (
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
                ))}

                {/* Pagination Controls */}
                {visibleCount < visibleListSPBUs.length && (
                  <div className="pt-2 pb-6 flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + 15)}
                      className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-300 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-black cursor-pointer"
                    >
                      <span>Muat 15 SPBU Lainnya</span>
                      <span className="text-[11px] font-semibold text-zinc-600">
                        (Tersisa {visibleListSPBUs.length - visibleCount})
                      </span>
                    </button>
                    {visibleListSPBUs.length - visibleCount > 15 && (
                      <button
                        type="button"
                        onClick={() => setVisibleCount(visibleListSPBUs.length)}
                        className="text-xs text-zinc-600 hover:text-black underline font-medium p-1 cursor-pointer"
                      >
                        Tampilkan Semua ({visibleListSPBUs.length})
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </main>

      {/* CCTV Preview Modal */}
      {cctvModalSpbu && (
        <CCTVPreviewModal
          spbu={cctvModalSpbu}
          onClose={() => setCctvModalSpbu(null)}
          onOpenReport={(item) => {
            setCctvModalSpbu(null);
            setReportModalSpbu(item);
          }}
        />
      )}

      {/* Quick Crowdsource Report Modal */}
      {reportModalSpbu && (
        <QuickReportModal
          spbu={reportModalSpbu}
          onClose={() => setReportModalSpbu(null)}
          onReportSuccess={(updated) => {
            setSpbus((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item))
            );
            if (updated.latestPhoto && isWithin24Hours(updated.latestPhoto.createdAt)) {
              setVisualSpbuIds((prev) => new Set([...prev, updated.id]));
            }
            if (selectedSpbu?.id === updated.id) {
              setSelectedSpbu(updated);
            }
          }}
        />
      )}

      {/* PWA Mobile Home-Screen Install Prompt */}
      <PWAInstallBanner />

      {/* Mobile Floating Switcher Button */}
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
