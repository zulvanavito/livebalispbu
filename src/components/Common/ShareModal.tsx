'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { SPBUItem } from '@/types/spbu';
import { Logo } from '@/components/Common/Logo';
import {
  generateStoryImage,
  generatePostImage,
  shareOrDownloadImage,
  getSPBUStatusColor,
  projectCoordinates,
} from '@/lib/share-image-generator';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  spbus: SPBUItem[];
  onShowToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

type TabType = 'story' | 'post' | 'message';

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  spbus,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('story');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasCopiedText, setHasCopiedText] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeMs(now.getTime());
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Makassar',
        })
      );
    };
    updateTime();
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = spbus.length;
    let smooth = 0;
    let crowded = 0;
    let congested = 0;
    let stale = 0;

    for (const s of spbus) {
      const { category } = getSPBUStatusColor(s, currentTimeMs);
      if (category === 'smooth') smooth++;
      else if (category === 'crowded') crowded++;
      else if (category === 'congested') congested++;
      else stale++;
    }

    const available = smooth + crowded;

    // Regional breakdown
    const getAreaStat = (regency: string) => {
      const areaSPBUs = spbus.filter((s) => s.regency === regency);
      const totalCount = areaSPBUs.length;
      const availCount = areaSPBUs.filter(
        (s) => s.fuelStock.pertalite !== 'out_of_stock' && s.queueLevel !== 'congested'
      ).length;
      const congestCount = areaSPBUs.filter(
        (s) => s.queueLevel === 'congested' || s.fuelStock.pertalite === 'out_of_stock'
      ).length;
      return { total: totalCount, available: availCount, congested: congestCount };
    };

    return {
      total,
      smooth,
      crowded,
      congested,
      stale,
      available,
      denpasar: getAreaStat('Denpasar'),
      badung: getAreaStat('Badung'),
      gianyar: getAreaStat('Gianyar'),
      tabanan: getAreaStat('Tabanan'),
    };
  }, [spbus, currentTimeMs]);

  // Preformatted text for sharing / messaging
  const shareMessageText = useMemo(() => {
    return `⛽ Pantauan Antrean SPBU Bali (${currentTime} WITA):\n` +
      `Dari ${stats.total} titik SPBU se-Bali:\n` +
      `• ${stats.available} SPBU Lancar & Tersedia BBM\n` +
      `• ${stats.crowded} SPBU Antrean Sedang\n` +
      `• ${stats.congested} SPBU Padat / Stok Habis\n\n` +
      `Kawasan Metropolitan Sarbagita:\n` +
      `- Kota Denpasar: ${stats.denpasar.available}/${stats.denpasar.total} SPBU lancar\n` +
      `- Kab. Badung: ${stats.badung.available}/${stats.badung.total} SPBU lancar\n` +
      `- Kab. Gianyar: ${stats.gianyar.available}/${stats.gianyar.total} SPBU lancar\n` +
      `- Kab. Tabanan: ${stats.tabanan.available}/${stats.tabanan.total} SPBU lancar\n\n` +
      `Pantau CCTV ATCS live & lapor kondisi SPBU di sekitarmu:\n` +
      `https://livebali.my.id`;
  }, [currentTime, stats]);

  if (!isOpen) return null;

  // Handle sharing action
  const handleShareStory = async () => {
    try {
      setIsGenerating(true);
      const blob = await generateStoryImage(spbus);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `live-spbu-bali-story-${timestamp}.png`;

      const result = await shareOrDownloadImage(
        blob,
        filename,
        'Live SPBU Bali - Pantauan Antrean BBM Terkini',
        `Kondisi BBM di Bali saat ini: ${stats.available} dari ${stats.total} SPBU tersedia BBM. Pantau realtime di https://livebali.my.id`
      );

      if (result.success) {
        if (result.method === 'download') {
          onShowToast?.(
            'success',
            'Gambar Story berhasil diunduh! Teks caption disalin ke clipboard.'
          );
        } else {
          onShowToast?.('success', 'Berhasil membuka menu berbagi.');
        }
      }
    } catch (err) {
      console.error('Error generating story image:', err);
      onShowToast?.('error', 'Gagal memproses gambar. Silakan coba kembali.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSharePost = async () => {
    try {
      setIsGenerating(true);
      const blob = await generatePostImage(spbus);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `live-spbu-bali-feed-${timestamp}.png`;

      const result = await shareOrDownloadImage(
        blob,
        filename,
        'Live SPBU Bali - Pantauan Antrean BBM Terkini',
        `Kondisi BBM di Bali saat ini: ${stats.available} dari ${stats.total} SPBU tersedia BBM. Pantau realtime di https://livebali.my.id`
      );

      if (result.success) {
        if (result.method === 'download') {
          onShowToast?.(
            'success',
            'Gambar Feed Post berhasil diunduh! Teks caption disalin ke clipboard.'
          );
        } else {
          onShowToast?.('success', 'Berhasil membuka menu berbagi.');
        }
      }
    } catch (err) {
      console.error('Error generating post image:', err);
      onShowToast?.('error', 'Gagal memproses gambar. Silakan coba kembali.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareMessage = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Live SPBU Bali - Pantau Antrean BBM',
          text: shareMessageText,
          url: 'https://livebali.my.id',
        });
        onShowToast?.('success', 'Pesan berhasil dibagikan.');
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    handleCopyMessageText();
  };

  const handleCopyMessageText = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareMessageText);
      setHasCopiedText(true);
      onShowToast?.('success', 'Teks ringkasan berhasil disalin ke clipboard!');
      setTimeout(() => setHasCopiedText(false), 2500);
    }
  };

  const openWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessageText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent('https://livebali.my.id')}&text=${encodeURIComponent(shareMessageText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Render SVG Dot Map helper for previews
  const renderDotMapSVG = (width: number, height: number, haloR = 12, dotR = 3.5) => {
    const pad = 12;
    const mapW = width - pad * 2;
    const mapH = height - pad * 2;

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto select-none pointer-events-none"
        aria-hidden="true"
      >
        {/* Ambient Halos */}
        <g fill="#eceae4" opacity="0.8">
          {spbus.map((s) => {
            const { x, y } = projectCoordinates(
              s.coordinates.lat,
              s.coordinates.lng,
              pad,
              pad,
              mapW,
              mapH
            );
            return <circle key={`halo-${s.id}`} cx={x} cy={y} r={haloR} />;
          })}
        </g>
        {/* Status Dots */}
        <g stroke="#ffffff" strokeWidth="0.75">
          {spbus.map((s) => {
            const { x, y } = projectCoordinates(
              s.coordinates.lat,
              s.coordinates.lng,
              pad,
              pad,
              mapW,
              mapH
            );
            const { color } = getSPBUStatusColor(s, currentTimeMs);
            return (
              <circle
                key={`dot-${s.id}`}
                cx={x}
                cy={y}
                r={dotR}
                fill={color}
              />
            );
          })}
        </g>
      </svg>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="bg-white border border-zinc-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <Logo size="sm" showText={false} />
            <div>
              <h3 id="share-modal-title" className="text-sm font-bold text-zinc-950 leading-tight">
                Bagikan Pantauan BBM Bali
              </h3>
              <p className="text-[11px] text-zinc-500 font-medium leading-none mt-0.5">
                Kondisi 281 SPBU se-Bali &amp; Kawasan Sarbagita
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup menu bagikan"
            className="min-w-[44px] min-h-[44px] rounded-xl text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Story | Post | Message */}
        <div className="px-5 pt-3">
          <div className="grid grid-cols-3 p-1 rounded-2xl bg-zinc-100/90 text-xs font-semibold gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('story')}
              className={`min-h-[44px] py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none ${
                activeTab === 'story'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-700 hover:text-zinc-950'
              }`}
            >
              Story (9:16)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('post')}
              className={`min-h-[44px] py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none ${
                activeTab === 'post'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-700 hover:text-zinc-950'
              }`}
            >
              Post Feed (1:1)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('message')}
              className={`min-h-[44px] py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none ${
                activeTab === 'message'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-700 hover:text-zinc-950'
              }`}
            >
              Pesan WhatsApp
            </button>
          </div>
        </div>

        {/* Scrollable Preview Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex flex-col items-center">
          {/* TAB 1: STORY PREVIEW */}
          {activeTab === 'story' && (
            <div className="w-full flex flex-col items-center">
              <div className="w-full max-w-[315px] bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3 flex flex-col items-center shadow-xs">
                {/* Simulated Tall Phone / Story Card */}
                <div className="w-full bg-white rounded-2xl border border-zinc-200/90 overflow-hidden shadow-xs flex flex-col text-left">
                  {/* Card Header (Live SPBU Bali Branding) */}
                  <div className="p-3.5 pb-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Logo size="sm" showText={false} />
                        <span className="font-extrabold text-xs text-zinc-950 tracking-tight">
                          Live SPBU <span className="text-emerald-700">Bali</span>
                        </span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        livebali.my.id
                      </span>
                    </div>

                    <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider mt-1">
                      PANTAUAN REALTIME BALI • {currentTime || '06:25'} WITA
                    </div>

                    <div className="pt-0.5">
                      <div className="text-emerald-700 font-extrabold text-lg leading-tight">
                        {stats.available} dari {stats.total} SPBU
                      </div>
                      <div className="text-zinc-950 font-extrabold text-sm leading-tight">
                        Lancar &amp; Tersedia BBM
                      </div>
                    </div>
                  </div>

                  {/* Dot Map Container */}
                  <div className="px-2 py-1">
                    <div className="bg-zinc-50/70 rounded-xl p-1.5 border border-zinc-100">
                      {renderDotMapSVG(280, 160, 10, 3)}
                    </div>
                  </div>

                  {/* Dot Legend */}
                  <div className="px-3 py-1 grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] text-zinc-600">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                      <span>Lancar: {stats.smooth}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                      <span>Ramai: {stats.crowded}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                      <span>Padat/Habis: {stats.congested}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                      <span>Perlu Update: {stats.stale}</span>
                    </div>
                  </div>

                  {/* Summary Metric Pill */}
                  <div className="mx-3 my-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-[10px] text-emerald-800 font-semibold text-center flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>281 SPBU Se-Bali • CCTV Dishub &amp; Warga</span>
                  </div>

                  {/* Area Breakdown (Sarbagita) */}
                  <div className="px-3 py-1 space-y-1 text-[10px]">
                    <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">
                      KAWASAN METROPOLITAN SARBAGITA
                    </div>
                    <div className="space-y-1 text-zinc-700 font-medium">
                      <div className="flex items-center justify-between">
                        <span>Kota Denpasar</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden flex">
                            <div
                              className="h-full bg-emerald-500"
                              style={{
                                width: `${(stats.denpasar.available / stats.denpasar.total) * 100}%`,
                              }}
                            />
                            <div
                              className="h-full bg-rose-500"
                              style={{
                                width: `${(stats.denpasar.congested / stats.denpasar.total) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-zinc-900 w-8 text-right">
                            {stats.denpasar.available}/{stats.denpasar.total}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Kab. Badung</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden flex">
                            <div
                              className="h-full bg-emerald-500"
                              style={{
                                width: `${(stats.badung.available / stats.badung.total) * 100}%`,
                              }}
                            />
                            <div
                              className="h-full bg-rose-500"
                              style={{
                                width: `${(stats.badung.congested / stats.badung.total) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-zinc-900 w-8 text-right">
                            {stats.badung.available}/{stats.badung.total}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Kab. Gianyar</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden flex">
                            <div
                              className="h-full bg-emerald-500"
                              style={{
                                width: `${(stats.gianyar.available / stats.gianyar.total) * 100}%`,
                              }}
                            />
                            <div
                              className="h-full bg-rose-500"
                              style={{
                                width: `${(stats.gianyar.congested / stats.gianyar.total) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-zinc-900 w-8 text-right">
                            {stats.gianyar.available}/{stats.gianyar.total}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Kab. Tabanan</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden flex">
                            <div
                              className="h-full bg-emerald-500"
                              style={{
                                width: `${(stats.tabanan.available / stats.tabanan.total) * 100}%`,
                              }}
                            />
                            <div
                              className="h-full bg-rose-500"
                              style={{
                                width: `${(stats.tabanan.congested / stats.tabanan.total) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-zinc-900 w-8 text-right">
                            {stats.tabanan.available}/{stats.tabanan.total}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dark Card Footer (Consistent with Live SPBU Bali) */}
                  <div className="mt-2.5 p-3 bg-zinc-950 text-white text-center">
                    <span className="font-bold text-xs text-emerald-400 block tracking-wide">
                      livebali.my.id
                    </span>
                    <span className="text-[10px] text-zinc-300 block leading-tight mt-0.5">
                      Pantau antrean, stok BBM &amp; CCTV lalu lintas se-Bali sebelum jalan
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-zinc-600 mt-2.5 text-center font-medium">
                Format vertikal (9:16) untuk Instagram Story, WhatsApp Status, atau TikTok
              </p>

              {/* Action Button */}
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleShareStory}
                className="mt-3.5 w-full min-h-[46px] rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98 disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses Gambar Story...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>Bagikan ke Story / Status</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: POST PREVIEW */}
          {activeTab === 'post' && (
            <div className="w-full flex flex-col items-center">
              <div className="w-full max-w-[315px] bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3 flex flex-col items-center shadow-xs">
                {/* Simulated Square Feed Card */}
                <div className="w-full aspect-square bg-white rounded-2xl border border-zinc-200/90 p-3.5 flex flex-col justify-between shadow-xs text-left">
                  {/* Top Bar: Brand + livebali.my.id */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Logo size="sm" showText={false} />
                        <span className="font-extrabold text-xs text-zinc-950 tracking-tight">
                          Live SPBU <span className="text-emerald-700">Bali</span>
                        </span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        livebali.my.id
                      </span>
                    </div>

                    <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider mt-1.5">
                      PANTAUAN REALTIME BALI • {currentTime || '06:25'} WITA
                    </div>
                    <div className="pt-0.5">
                      <span className="text-emerald-700 font-extrabold text-base leading-tight">
                        {stats.available} dari {stats.total} SPBU{' '}
                      </span>
                      <span className="text-zinc-950 font-extrabold text-sm leading-tight block">
                        Lancar &amp; Tersedia BBM Se-Bali
                      </span>
                    </div>
                  </div>

                  {/* Dot Map */}
                  <div className="py-1">
                    <div className="bg-zinc-50/70 rounded-xl p-1 border border-zinc-100">
                      {renderDotMapSVG(280, 160, 10, 3)}
                    </div>
                  </div>

                  {/* Legend below map */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] text-zinc-700 pt-1 font-medium">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                      <span>Lancar: {stats.smooth}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                      <span>Ramai: {stats.crowded}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                      <span>Padat/Habis: {stats.congested}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                      <span>Perlu Update: {stats.stale}</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-zinc-600 mt-2.5 text-center font-medium">
                Format persegi (1:1) untuk postingan Instagram, Facebook, atau X
              </p>

              {/* Action Button */}
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleSharePost}
                className="mt-3.5 w-full min-h-[46px] rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98 disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses Gambar Feed...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>Bagikan ke Feed / Post</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 3: MESSAGE PREVIEW */}
          {activeTab === 'message' && (
            <div className="w-full flex flex-col items-center">
              <div className="w-full max-w-[315px] bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3 flex flex-col items-center shadow-xs">
                {/* Simulated Chat Bubble Card */}
                <div className="w-full bg-white rounded-2xl border border-zinc-200/90 overflow-hidden shadow-xs flex flex-col text-left">
                  {/* Banner Preview */}
                  <div className="p-3 bg-zinc-50 border-b border-zinc-100">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Logo size="sm" showText={false} />
                        <span className="font-extrabold text-xs text-zinc-950">
                          Live SPBU <span className="text-emerald-700">Bali</span>
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-600">
                        {currentTime || '06:25'} WITA
                      </span>
                    </div>
                    <div className="text-emerald-700 font-extrabold text-sm mt-0.5">
                      {stats.available} dari {stats.total} SPBU Tersedia BBM
                    </div>
                    <div className="mt-1 bg-white rounded-lg p-1 border border-zinc-100">
                      {renderDotMapSVG(280, 120, 8, 2.5)}
                    </div>
                  </div>

                  {/* Message Body (WhatsApp Link Preview Style) */}
                  <div className="p-3 bg-emerald-50/70 text-[11px] text-zinc-800 space-y-1.5 border-t border-emerald-100/60 leading-relaxed font-sans">
                    <span className="font-bold text-emerald-950 block text-xs">
                      livebali.my.id
                    </span>
                    <p className="text-zinc-700 text-[11px]">
                      ⛽ <strong>Pantauan Antrean SPBU Bali ({currentTime || '06:25'} WITA):</strong><br />
                      Dari 281 titik SPBU se-Bali: <strong>{stats.available} SPBU</strong> lancar &amp; tersedia BBM. Pantau CCTV ATCS live dan laporkan kondisi SPBU sebelum jalan:
                    </p>
                    <span className="text-emerald-800 font-semibold underline block pt-0.5">
                      https://livebali.my.id
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-zinc-600 mt-2.5 text-center font-medium">
                Teks ringkasan &amp; tautan untuk WhatsApp, Telegram, atau SMS
              </p>

              {/* Main Share Button */}
              <button
                type="button"
                onClick={handleShareMessage}
                className="mt-3.5 w-full min-h-[46px] rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98 focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
              >
                <Share2 className="w-4 h-4" />
                <span>Bagikan Pesan</span>
              </button>

              {/* Quick Channels: WhatsApp & Salin Teks */}
              <div className="grid grid-cols-2 gap-2 w-full mt-2">
                <button
                  type="button"
                  onClick={openWhatsApp}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Kirim WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyMessageText}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold flex items-center justify-center gap-1.5 border border-zinc-200 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
                >
                  {hasCopiedText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-700" />
                      <span>Salin Teks</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
