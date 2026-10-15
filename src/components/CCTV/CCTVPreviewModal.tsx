'use client';

import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { SPBUItem } from '@/types/spbu';
import { X, RefreshCw, Video, AlertTriangle, MapPin, Camera, Play, Volume2, VolumeX, ShieldCheck, MessageSquare } from 'lucide-react';

interface CCTVPreviewModalProps {
  spbu: SPBUItem | null;
  onClose: () => void;
}

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

export const CCTVPreviewModal: React.FC<CCTVPreviewModalProps> = ({ spbu, onClose }) => {
  const [viewMode, setViewMode] = useState<'stream' | 'snapshot'>('stream');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [streamError, setStreamError] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

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
    if (!spbuId || viewMode !== 'stream' || !streamUrl || !videoRef.current) return;

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
  }, [viewMode, spbuId, streamUrl, refreshKey]);

  if (!spbu || !spbu.cctv.hasCCTV) return null;

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
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <div className="min-w-0">
              <h3 id="cctv-modal-title" className="font-bold text-zinc-900 text-sm sm:text-base flex items-center gap-1.5 truncate">
                <Video className="w-4 h-4 text-red-500 shrink-0" />
                Live CCTV — {spbu.name}
              </h3>
              <p className="text-xs text-zinc-500 truncate">
                {spbu.cctv.locationName} • {spbu.cctv.sourceName}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* View Mode Switcher */}
            {hasLiveStream && (
              <div className="hidden sm:flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                <button
                  type="button"
                  onClick={() => setViewMode('stream')}
                  className={`px-2.5 py-1 text-xs rounded-md font-bold flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-black ${
                    viewMode === 'stream'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-black'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  Live Video
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('snapshot')}
                  className={`px-2.5 py-1 text-xs rounded-md font-bold flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-black ${
                    viewMode === 'snapshot'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-zinc-600 hover:text-black'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  Snapshot
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleRefresh}
              title="Muat ulang pemutar"
              aria-label="Muat ulang feed CCTV"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-black transition-colors focus-visible:ring-2 focus-visible:ring-black"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-black' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pemantau CCTV"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-black transition-colors focus-visible:ring-2 focus-visible:ring-black"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stream Error / Server Maintenance Notice */}
        {streamError && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">Siaran langsung ATCS Dishub sedang pemeliharaan server. Menampilkan snapshot lalu lintas.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setStreamError(false);
                setViewMode('stream');
                setRefreshKey(Date.now());
              }}
              className="underline font-bold text-amber-950 ml-2 shrink-0 cursor-pointer"
            >
              Coba Video
            </button>
          </div>
        )}

        {/* Video / Snapshot Viewport */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden group">
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

              {/* Play overlay if browser pauses autoplay */}
              {!isPlaying && (
                <button
                  onClick={handleManualPlay}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs text-white gap-2 transition-opacity"
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
          <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-mono text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 pointer-events-none shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {viewMode === 'stream'
              ? 'SIARAN LANGSUNG (LIVE STREAM)'
              : 'MODE SNAPSHOT RADAR'}
          </div>

          {/* Volume toggle helper for video */}
          {viewMode === 'stream' && hasLiveStream && (
            <button
              onClick={toggleMute}
              className="absolute bottom-12 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
              title={isMuted ? 'Nyalakan Audio' : 'Bisukan'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Mobile View Toggle Bar */}
        {hasLiveStream && (
          <div className="sm:hidden flex bg-zinc-50 px-4 py-2 border-b border-zinc-200 justify-between items-center text-xs">
            <span className="text-zinc-600 font-medium">Tayangan:</span>
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

        {/* SPBU Details and Context */}
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

          {/* Dynamic Citizen Note (Tampil otomatis hanya jika ada laporan warga terkini) */}
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

          {/* Footer Clean Status */}
          <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-200">
            <span className="flex items-center gap-1.5 text-zinc-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Siaran Langsung Lalu Lintas Bali
            </span>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-black cursor-pointer"
            >
              Tutup Pantauan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
