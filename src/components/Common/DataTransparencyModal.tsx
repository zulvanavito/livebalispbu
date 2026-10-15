'use client';

import React, { useEffect } from 'react';
import { X, ShieldCheck, MapPin, Video, Users, AlertCircle, Building2, Eye } from 'lucide-react';

interface DataTransparencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalSPBU: number;
  cctvCount: number;
}

export const DataTransparencyModal: React.FC<DataTransparencyModalProps> = ({
  isOpen,
  onClose,
  totalSPBU,
  cctvCount,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transparency-modal-title"
        className="bg-white border border-zinc-200 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-50 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 id="transparency-modal-title" className="text-sm font-bold text-zinc-950 leading-tight">
                Transparansi Data &amp; Verifikasi Wilayah
              </h3>
              <p className="text-[11px] text-zinc-500 font-medium">
                Metodologi pemetaan, status verifikasi, dan cakupan wilayah LiveSPBU
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup jendela informasi"
            className="min-w-[44px] min-h-[44px] rounded-xl text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60 flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs leading-relaxed text-zinc-700">
          {/* Section 1: Cakupan Wilayah & Sarbagita */}
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2">
            <div className="flex items-center gap-2 text-zinc-950 font-bold text-xs">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Cakupan 281 Titik SPBU Se-Bali</span>
            </div>
            <p className="text-[11px] text-zinc-700">
              LiveSPBU mencatat koordinat fisik <strong>{totalSPBU} titik SPBU resmi</strong> di seluruh 9 Kabupaten/Kota di Bali.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className="p-2 rounded-lg bg-white border border-zinc-200">
                <span className="text-zinc-600 block">Kawasan Sarbagita</span>
                <strong className="text-zinc-900 text-xs">163 SPBU</strong>
                <span className="text-[10px] text-zinc-600 font-medium block">Denpasar, Badung, Gianyar, Tabanan</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-zinc-200">
                <span className="text-zinc-600 block">Bali Utara (Buleleng)</span>
                <strong className="text-zinc-900 text-xs">43 SPBU</strong>
                <span className="text-[10px] text-zinc-600 font-medium block">Singaraja hingga Seririt</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-zinc-200">
                <span className="text-zinc-600 block">Bali Timur</span>
                <strong className="text-zinc-900 text-xs">45 SPBU</strong>
                <span className="text-[10px] text-zinc-600 font-medium block">Karangasem &amp; Klungkung</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-zinc-200">
                <span className="text-zinc-600 block">Bali Barat &amp; Tengah</span>
                <strong className="text-zinc-900 text-xs">30 SPBU</strong>
                <span className="text-[10px] text-zinc-600 font-medium block">Jembrana &amp; Bangli</span>
              </div>
            </div>
          </div>

          {/* Section 2: Tingkat Verifikasi (Truth in Data) */}
          <div className="space-y-2">
            <h4 className="font-bold text-zinc-950 text-xs flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-blue-600" />
              <span>Tingkat Verifikasi Lapangan</span>
            </h4>
            <p className="text-[11px] text-zinc-600">
              Kami tidak mengklaim sepihak bahwa seluruh titik telah terverifikasi secara resmi. Data diperbarui melalui 3 pilar:
            </p>
            <div className="space-y-2 pt-1">
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-zinc-200 bg-white">
                <div className="w-5 h-5 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Video className="w-3 h-3" />
                </div>
                <div>
                  <strong className="text-zinc-900 block text-[11px]">1. Verifikasi Visual CCTV ATCS ({cctvCount}+ Titik)</strong>
                  <span className="text-[11px] text-zinc-600">
                    Memiliki siaran langsung video dan snapshot berkala dari kamera Dinas Perhubungan di simpang jalan depan SPBU.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-zinc-200 bg-white">
                <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="w-3 h-3" />
                </div>
                <div>
                  <strong className="text-zinc-900 block text-[11px]">2. Laporan Urun Daya Warga (Crowdsourced)</strong>
                  <span className="text-[11px] text-zinc-600">
                    Pengendara yang sedang berada di lokasi melaporkan waktu tunggu nyata, stok BBM, dan melampirkan foto antrean langsung.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-zinc-200 bg-white">
                <div className="w-5 h-5 rounded-md bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-3 h-3" />
                </div>
                <div>
                  <strong className="text-zinc-900 block text-[11px]">3. Titik Menunggu Verifikasi Terkini</strong>
                  <span className="text-[11px] text-zinc-600">
                    Jika sebuah SPBU belum memiliki laporan baru dalam 1 jam terakhir, sistem menandainya dengan badge <em>&quot;Perlu Update&quot;</em> atau <em>&quot;Belum Ada Data&quot;</em> agar warga tidak salah berasumsi.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Disclaimer & Civic Mission */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
            <strong className="font-semibold block mb-0.5">Komitmen Komunitas Terbuka:</strong>
            Platform ini dibangun secara independen sebagai inisiatif publik untuk saling membantu sesama pengendara di Bali menghadapi antrean BBM. Kami sangat menghargai kontribusi laporan dan foto antrean Anda dari lokasi.
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-zinc-50 border-t border-zinc-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
          >
            Mengerti &amp; Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
