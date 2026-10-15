'use client';

import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { SPBUItem, CitizenPhotoItem } from '@/types/spbu';
import { SPBUService } from '@/lib/spbu-service';
import { 
  X, 
  RefreshCw, 
  Video, 
  AlertTriangle, 
  MapPin, 
  Camera, 
  Play, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  MessageSquare,
  Clock,
  ExternalLink,
  PlusCircle,
  Cloud,
  ChevronLeft,
  ChevronRight,
  Layers
} from 'lucide-react';

interface CCTVPreviewModalProps {
  spbu: SPBUItem | null;
  onClose: () => void;
  onOpenReport?: (spbu: SPBUItem) => void;
}

type ModalTab = 'atcs' | 'citizen_photo';

const formatRelativeTime = (isoString?: string) => {
  if (!isoString) return '';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.max(1, Math.floor(diffMs / (60 * 1000)));
  if (diffMins < 60) return `${diffMins} mnt lalu`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} hari lalu`;
};

export const CCTVPreviewModal: React.FC<CCTVPreviewModalProps> = ({ 
  spbu, 
  onClose,
  onOpenReport 
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>(
    spbu?.cctv.hasCCTV ? 'atcs' : 'citizen_photo'
  );
  const [viewMode, setViewMode] = useState<'stream' | 'snapshot'>('stream');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [streamError, setStreamError] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Multi-Photo Carousel States (Opsi A)
  const [photoIndex, setPhotoIndex] = useState<number>(0);
  const [photosList, setPhotosList] = useState<CitizenPhotoItem[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState<boolean>(false);

  // Sync tab when target SPBU changes
  useEffect(() => {
    if (spbu) {
      setActiveTab(spbu.cctv.hasCCTV ? 'atcs' : 'citizen_photo');
      setStreamError(false);
    }
  }, [spbu?.id, spbu?.cctv.hasCCTV]);

  // Sync initial photos and dynamically fetch live photos from Cloudflare R2
  useEffect(() => {
    if (!spbu) return;

    // 1. Initial cached/local photos
    const initialPhotos = spbu.recentPhotos && spbu.recentPhotos.length > 0
      ? spbu.recentPhotos
      : spbu.latestPhoto
      ? [spbu.latestPhoto]
      : [];

    setPhotosList(initialPhotos);
    setPhotoIndex(0);

    // 2. Query live photo list directly from Cloudflare R2
    let isCancelled = false;
    setIsLoadingPhotos(true);
    SPBUService.fetchSPBUPhotos(spbu.id)
      .then((livePhotos) => {
        if (!isCancelled && livePhotos && livePhotos.length > 0) {
          setPhotosList(livePhotos);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch live R2 photos:', err);
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingPhotos(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [spbu?.id, refreshKey]);

  // Aksesibilitas Keyboard: Tutup modal dengan tombol Escape (R-32)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const spbuId = spbu?.id;
  const streamUrl = spbu?.cctv.streamUrl;
  const hasLiveStream = Boolean(streamUrl);

  // Setup HLS.js streaming directly on native HTML5 <video> with deep buffer cushion
  useEffect(() => {
    if (!spbuId || activeTab !== 'atcs' || viewMode !== 'stream' || !streamUrl || !videoRef.current) return;

    const video = videoRef.current;
    const streamBase = streamUrl;
    const m3u8Url = streamBase.endsWith('/') ? `${streamBase}index.m3u8` : `${streamBase}/index.m3u8`;

    setStreamError(false);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 8,
        maxLiveSyncPlaybackRate: 1.15,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        backBufferLength: 30,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.2,
        nudgeMaxRetry: 5,
      });

      hls.loadSource(m3u8Url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(() => setIsPlaying(true)).catch((err) => {
          console.warn('Autoplay prevented, click play to start:', err);
          setIsPlaying(false);
        });
      });

      let retryCount = 0;
      hls.on(Hls.Events.ERROR, (evt, data) => {
        if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
          if (video.paused && !video.ended) {
            video.play().catch(() => {});
          }
          return;
        }

        if (data.fatal) {
          retryCount++;
          if (retryCount >= 2) {
            setStreamError(true);
            setViewMode('snapshot');
            return;
          }

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setTimeout(() => {
                if (hlsRef.current) {
                  hls.loadSource(m3u8Url);
                  hls.startLoad();
                }
              }, 1200);
              break;
          }
        }
      });

      hlsRef.current = hls;

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / iOS native HLS
      video.src = m3u8Url;
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [activeTab, viewMode, spbuId, streamUrl, refreshKey]);

  if (!spbu) return null;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey(Date.now());
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const rawSnapshotUrl = spbu.cctv.snapshotUrl || '/api/cctv-proxy';
  const snapshotSrc = refreshKey > 0
    ? (rawSnapshotUrl.includes('?') ? `${rawSnapshotUrl}&t=${refreshKey}` : `${rawSnapshotUrl}?t=${refreshKey}`)
    : rawSnapshotUrl;

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleManualPlay = () => {
    if (videoRef.current) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleTriggerReport = () => {
    if (onOpenReport) {
      onOpenReport(spbu);
    }
  };

  const currentPhoto = photosList[photoIndex] || photosList[0] || spbu.latestPhoto;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="cctv-modal-title"
        className="bg-white border border-zinc-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-zinc-50 border-b border-zinc-200">
          <div className="flex items-center space-x-2.5 min-w-0">
            <span className="flex h-3 w-3 relative shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                activeTab === 'atcs' ? 'bg-red-400' : 'bg-emerald-400'
              } opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                activeTab === 'atcs' ? 'bg-red-500' : 'bg-emerald-500'
              }`}></span>
            </span>
            <div className="min-w-0">
              <h3 id="cctv-modal-title" className="font-bold text-zinc-900 text-sm sm:text-base flex items-center gap-1.5 truncate">
                {activeTab === 'atcs' ? (
                  <Video className="w-4 h-4 text-red-500 shrink-0" />
                ) : (
                  <Camera className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                {spbu.cctv.hasCCTV ? `Pantauan Visual: ${spbu.name}` : `Foto Antrean: ${spbu.name}`}
              </h3>
              <p className="text-xs text-zinc-500 truncate">
                {spbu.regency} • {spbu.district}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              title="Muat ulang tampilan"
              aria-label="Muat ulang pantauan"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-black transition-colors focus-visible:ring-2 focus-visible:ring-black cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-black' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pantauan"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-black transition-colors focus-visible:ring-2 focus-visible:ring-black cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation (Hybrid CCTV + Foto Warga R2) */}
        <div className="flex items-center border-b border-zinc-200 bg-zinc-100/80 px-4 sm:px-5 gap-2 pt-2">
          {spbu.cctv.hasCCTV && (
            <button
              type="button"
              onClick={() => setActiveTab('atcs')}
              className={`min-h-[42px] px-3.5 py-2 text-xs font-bold rounded-t-xl border-t border-x flex items-center gap-2 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-black ${
                activeTab === 'atcs'
                  ? 'bg-white border-zinc-200 text-zinc-900 shadow-xs'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-red-600" />
              <span>Live Simpang ATCS</span>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('citizen_photo')}
            className={`min-h-[42px] px-3.5 py-2 text-xs font-bold rounded-t-xl border-t border-x flex items-center gap-2 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-black ${
              activeTab === 'citizen_photo'
                ? 'bg-white border-zinc-200 text-zinc-900 shadow-xs'
                : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            <span>Foto Antrean Warga</span>
            {photosList.length > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {photosList.length} Foto
              </span>
            ) : spbu.latestPhoto ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Ada
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-200 text-zinc-600">
                0
              </span>
            )}
          </button>

          {/* Sub-toggle for ATCS Stream vs Snapshot */}
          {activeTab === 'atcs' && hasLiveStream && (
            <div className="ml-auto hidden sm:flex bg-zinc-200/80 p-0.5 rounded-lg border border-zinc-300/80 mb-1.5">
              <button
                type="button"
                onClick={() => setViewMode('stream')}
                className={`px-2.5 py-1 text-xs rounded-md font-bold flex items-center gap-1 transition-colors ${
                  viewMode === 'stream'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                <Video className="w-3 h-3" />
                Video
              </button>
              <button
                type="button"
                onClick={() => setViewMode('snapshot')}
                className={`px-2.5 py-1 text-xs rounded-md font-bold flex items-center gap-1 transition-colors ${
                  viewMode === 'snapshot'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                <Camera className="w-3 h-3" />
                Snapshot
              </button>
            </div>
          )}
        </div>

        {/* Viewport Content */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden group">
          {activeTab === 'atcs' ? (
            /* ATCS DISHUB CCTV TAB */
            <>
              {viewMode === 'stream' && hasLiveStream && !streamError ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted={isMuted}
                    playsInline
                    controls
                    className="w-full h-full object-cover bg-black"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />

                  {!isPlaying && (
                    <button
                      onClick={handleManualPlay}
                      className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white gap-2 transition-opacity cursor-pointer"
                    >
                      <div className="w-16 h-16 rounded-full bg-red-600/90 hover:bg-red-500 flex items-center justify-center shadow-2xl transition-transform hover:scale-105">
                        <Play className="w-8 h-8 fill-current ml-1" />
                      </div>
                      <span className="text-xs font-semibold tracking-wide">Klik untuk Putar Live Video</span>
                    </button>
                  )}
                </>
              ) : (
                /* Snapshot mode fallback */
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={`img-${refreshKey}`}
                  src={snapshotSrc}
                  alt={`CCTV ${spbu.name}`}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Floating live indicator badge */}
              <div className="absolute top-3 left-3 bg-zinc-950/90 px-2.5 py-1 rounded-lg text-xs font-mono text-zinc-100 border border-zinc-700 flex items-center gap-1.5 pointer-events-none shadow-md">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span>ATCS DISHUB: {spbu.cctv.locationName || 'Simpang Jalan'}</span>
              </div>

              {/* Volume toggle */}
              {viewMode === 'stream' && hasLiveStream && (
                <button
                  type="button"
                  onClick={toggleMute}
                  className="absolute bottom-12 right-4 p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-900 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title={isMuted ? 'Nyalakan Audio' : 'Bisukan'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}
            </>
          ) : (
            /* FOTO ANTREAN WARGA TAB (CLOUDFLARE R2) */
            <>
              {currentPhoto?.url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={`photo-${currentPhoto.url}-${refreshKey}`}
                    src={currentPhoto.url}
                    alt={`Foto Antrean ${spbu.name}`}
                    className="w-full h-full object-contain bg-zinc-950 transition-opacity duration-200"
                  />

                  {/* Top-left R2 badge */}
                  <div className="absolute top-3 left-3 bg-zinc-950/90 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white border border-zinc-700 flex items-center gap-1.5 shadow-md">
                    <Cloud className="w-3.5 h-3.5 text-sky-400" />
                    <span>Foto Warga (Cloudflare R2)</span>
                  </div>

                  {/* Top-right timestamp badge */}
                  <div className="absolute top-3 right-3 bg-zinc-950/90 px-2.5 py-1.5 rounded-lg text-xs text-zinc-200 border border-zinc-700 flex items-center gap-1.5 shadow-md">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{formatRelativeTime(currentPhoto.createdAt)}</span>
                  </div>

                  {/* Left & Right Carousel Navigation Overlays (when photosList.length > 1) */}
                  {photosList.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPhotoIndex((prev) => (prev > 0 ? prev - 1 : photosList.length - 1));
                        }}
                        className="min-h-[44px] min-w-[44px] absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer shadow-xl hover:scale-105 border border-white/20 focus-visible:ring-2 focus-visible:ring-white"
                        title="Foto Sebelumnya"
                        aria-label="Foto Sebelumnya"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPhotoIndex((prev) => (prev < photosList.length - 1 ? prev + 1 : 0));
                        }}
                        className="min-h-[44px] min-w-[44px] absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer shadow-xl hover:scale-105 border border-white/20 focus-visible:ring-2 focus-visible:ring-white"
                        title="Foto Selanjutnya"
                        aria-label="Foto Selanjutnya"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}

                  {/* Bottom Counter (when photosList.length > 1) */}
                  {photosList.length > 1 && (
                    <div className="absolute bottom-3 left-3 bg-black/80 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white border border-white/20 flex items-center gap-1.5 shadow-md">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Foto {photoIndex + 1} dari {photosList.length}</span>
                    </div>
                  )}

                  {/* Bottom external link action */}
                  <div className="absolute bottom-3 right-3">
                    <a
                      href={currentPhoto.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[40px] px-3 py-1.5 rounded-lg bg-black/80 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs border border-white/20 transition-all cursor-pointer shadow-lg"
                      title="Buka gambar resolusi penuh"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Resolusi Penuh</span>
                    </a>
                  </div>
                </>
              ) : (
                /* Empty state when no citizen photo is uploaded yet */
                <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-300 max-w-sm">
                  <div className="w-16 h-16 rounded-full bg-zinc-800/90 border border-zinc-700 flex items-center justify-center mb-3">
                    <Camera className="w-8 h-8 text-zinc-400" />
                  </div>
                  <h4 className="text-white font-bold text-sm sm:text-base mb-1">
                    Belum Ada Foto Antrean
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                    Bantu sesama pengendara dengan membagikan foto kondisi antrean terkini saat Anda tiba di SPBU ini.
                  </p>
                  <button
                    type="button"
                    onClick={handleTriggerReport}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Kirim Foto Antrean Sekarang</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Filmstrip Thumbnail Bar (Opsi A: Multi-Foto Terkini) */}
        {activeTab === 'citizen_photo' && photosList.length > 1 && (
          <div className="bg-zinc-900 border-b border-zinc-800 px-3.5 py-2 flex items-center gap-2.5 overflow-x-auto">
            <span className="text-[11px] font-semibold text-zinc-400 shrink-0 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Sudut Pandang:
            </span>
            <div className="flex items-center gap-2">
              {photosList.map((item, idx) => (
                <button
                  key={`${item.url}-${idx}`}
                  type="button"
                  onClick={() => setPhotoIndex(idx)}
                  className={`min-h-[44px] px-2 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-2 border-2 ${
                    photoIndex === idx
                      ? 'border-emerald-500 bg-zinc-800 shadow-md ring-1 ring-emerald-500/50'
                      : 'border-zinc-800 bg-zinc-950 opacity-70 hover:opacity-100 hover:border-zinc-700'
                  }`}
                  title={`Tampilkan foto ke-${idx + 1} (${formatRelativeTime(item.createdAt)})`}
                >
                  <img
                    src={item.url}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-10 h-7 object-cover rounded-md bg-black shrink-0"
                  />
                  <div className="text-left pr-1 whitespace-nowrap">
                    <span className="text-[10px] font-bold block text-white leading-tight">
                      {idx === 0 ? 'Paling Baru' : `Foto #${idx + 1}`}
                    </span>
                    <span className="text-[9px] text-zinc-400 block leading-tight">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Sub-toggle for ATCS Stream vs Snapshot */}
        {activeTab === 'atcs' && hasLiveStream && (
          <div className="sm:hidden flex bg-zinc-50 px-4 py-2 border-b border-zinc-200 justify-between items-center text-xs">
            <span className="text-zinc-600 font-medium">Mode Tayang:</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setViewMode('stream')}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold ${
                  viewMode === 'stream'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                Live Video
              </button>
              <button
                type="button"
                onClick={() => setViewMode('snapshot')}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold ${
                  viewMode === 'snapshot'
                    ? 'bg-black text-white'
                    : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                Snapshot
              </button>
            </div>
          </div>
        )}

        {/* SPBU Details & Footer */}
        <div className="p-4 sm:p-5 bg-white space-y-3 overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="font-bold text-zinc-900 text-sm sm:text-base leading-snug">
                {spbu.name}
              </h4>
              <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                {spbu.address}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                spbu.queueLevel === 'congested'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : spbu.queueLevel === 'moderate'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}>
                {spbu.queueLevel === 'congested'
                  ? 'Antrean >30 Mnt'
                  : spbu.queueLevel === 'moderate'
                  ? 'Antrean 15-20 Mnt'
                  : 'Lancar (<10 Mnt)'}
              </span>
            </div>
          </div>

          {/* Dynamic Citizen Note */}
          {spbu.latestNote?.text && (
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 flex items-start gap-2.5">
              <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-semibold text-[11px] text-zinc-600 mb-0.5">
                  <span>Catatan Warga Terkini</span>
                  <span>•</span>
                  <span>{formatRelativeTime(spbu.latestNote.createdAt)}</span>
                </div>
                <p className="text-zinc-800 leading-relaxed break-words font-medium">
                  &ldquo;{spbu.latestNote.text}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Footer Clean Status & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between text-xs text-zinc-500 pt-3 border-t border-zinc-200 gap-2.5">
            <span className="flex items-center gap-1.5 text-zinc-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {activeTab === 'atcs'
                  ? 'Kamera ATCS Dishub Bali'
                  : 'Penyimpanan Foto Terdistribusi Cloudflare R2'}
              </span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTriggerReport}
                className="min-h-[44px] flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-700" />
                <span>Unggah Foto Baru</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] flex-1 sm:flex-initial px-4 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-black cursor-pointer flex items-center justify-center"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
