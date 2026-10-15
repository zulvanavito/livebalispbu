'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SPBUItem, QueueLevel, FuelStatus, UserReportSubmission } from '@/types/spbu';
import { SPBUService } from '@/lib/spbu-service';
import { X, Send, Fuel, CheckCircle2, AlertCircle, Clock, Camera, Trash2, Loader2 } from 'lucide-react';
import { TurnstileWidget } from '@/components/Common/TurnstileWidget';
import { useToast } from '@/components/Common/Toast';
import { compressQueuePhoto } from '@/lib/image-compression';

interface QuickReportModalProps {
  spbu: SPBUItem | null;
  onClose: () => void;
  onReportSuccess: (updated: SPBUItem) => void;
}

export const QuickReportModal: React.FC<QuickReportModalProps> = ({
  spbu,
  onClose,
  onReportSuccess,
}) => {
  const { showToast } = useToast();
  const [queueLevel, setQueueLevel] = useState<QueueLevel>(spbu?.queueLevel || 'moderate');
  const [pertalite, setPertalite] = useState<FuelStatus>(spbu?.fuelStock.pertalite || 'available');
  const [pertamax, setPertamax] = useState<FuelStatus>(spbu?.fuelStock.pertamax || 'available');
  const [solar, setSolar] = useState<FuelStatus>(spbu?.fuelStock.solar || 'available');
  const [note, setNote] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
    setFormError(null);
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken('');
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken('');
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED_MIME_TYPES = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ];
    const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];

    const lowerName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    const hasValidMime =
      ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) ||
      file.type === '';

    if (!hasValidExt || (!hasValidMime && file.type)) {
      showToast('error', 'Hanya format foto (JPG, PNG, WebP) yang diizinkan.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Ukuran foto terlalu besar (maks 10 MB). Silakan pilih foto lain.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemovePhoto = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Aksesibilitas Keyboard: Tutup modal dengan Escape (R-32)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!spbu) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!turnstileToken) {
      setFormError('Verifikasi anti-bot belum selesai. Silakan centang atau selesaikan verifikasi di bawah terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedPhotoUrl: string | undefined = undefined;

      if (selectedFile) {
        setIsUploadingPhoto(true);
        try {
          const compressed = await compressQueuePhoto(selectedFile);
          const uploadFormData = new FormData();
          uploadFormData.append('file', compressed);
          uploadFormData.append('spbuId', spbu.id);

          const uploadRes = await fetch('/api/upload-queue-photo', {
            method: 'POST',
            body: uploadFormData,
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.photoUrl) {
              uploadedPhotoUrl = uploadData.photoUrl;
            }
          } else {
            const errData = await uploadRes.json().catch(() => ({}));
            const errMsg = errData.error || 'Upload foto tidak berhasil. Format tidak valid.';
            showToast('error', errMsg);
            console.warn('Upload foto gagal:', errMsg);
          }
        } catch (uploadErr) {
          const errMsg = uploadErr instanceof Error ? uploadErr.message : 'Gagal memproses foto.';
          showToast('error', errMsg);
          console.warn('Gagal memproses foto:', uploadErr);
        } finally {
          setIsUploadingPhoto(false);
        }
      }

      const payload: UserReportSubmission = {
        spbuId: spbu.id,
        queueLevel,
        pertalite,
        pertamax,
        solar,
        note: note.trim() || undefined,
        photoUrl: uploadedPhotoUrl,
        turnstileToken,
      };

      const updated = await SPBUService.submitReport(payload);
      setSubmittedSuccess(true);
      showToast('success', 'Laporan berhasil dikirim! Terima kasih atas partisipasi Anda.');
      setTimeout(() => {
        onReportSuccess(updated);
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Gagal mengirim laporan. Silakan coba lagi.';
      setFormError(message);
      console.error('Report submission error:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="bg-white border-t sm:border border-zinc-200 rounded-t-3xl sm:rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-zinc-50 border-b border-zinc-200">
          <div>
            <h3 id="report-modal-title" className="font-bold text-zinc-900 text-base">Lapor Kondisi SPBU</h3>
            <p className="text-xs text-zinc-500 truncate max-w-[280px] sm:max-w-sm">
              {spbu.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form laporan"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-black transition-colors focus-visible:ring-2 focus-visible:ring-black"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedSuccess ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto animate-bounce" />
            <h4 className="text-lg font-bold text-zinc-900">Laporan Terkirim!</h4>
            <p className="text-sm text-zinc-600">
              Matur suksma! Info dari kamu sangat membantu sesama pengendara di Bali terhindar dari antrean panjang.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Queue Condition Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                1. Panjang Antrean Saat Ini:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setQueueLevel('smooth')}
                  className={`min-h-[56px] p-3 rounded-xl border text-left flex flex-col justify-between transition-all focus-visible:ring-2 focus-visible:ring-black ${
                    queueLevel === 'smooth'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/40'
                      : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50'
                  }`}
                >
                  <span className="font-bold text-sm">Lancar</span>
                  <span className="text-[11px] text-zinc-500 mt-1">&lt; 5-10 Menit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setQueueLevel('moderate')}
                  className={`min-h-[56px] p-3 rounded-xl border text-left flex flex-col justify-between transition-all focus-visible:ring-2 focus-visible:ring-black ${
                    queueLevel === 'moderate'
                      ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/40'
                      : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50'
                  }`}
                >
                  <span className="font-bold text-sm">Ramai / Sedang</span>
                  <span className="text-[11px] text-zinc-500 mt-1">15 - 25 Menit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setQueueLevel('congested')}
                  className={`min-h-[56px] p-3 rounded-xl border text-left flex flex-col justify-between transition-all focus-visible:ring-2 focus-visible:ring-black ${
                    queueLevel === 'congested'
                      ? 'bg-rose-50 border-rose-500 text-rose-950 ring-2 ring-rose-500/40'
                      : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50'
                  }`}
                >
                  <span className="font-bold text-sm">Macet Mengular</span>
                  <span className="text-[11px] text-zinc-500 mt-1">&gt; 30 - 60 Menit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setQueueLevel('empty')}
                  className={`min-h-[56px] p-3 rounded-xl border text-left flex flex-col justify-between transition-all focus-visible:ring-2 focus-visible:ring-black ${
                    queueLevel === 'empty'
                      ? 'bg-zinc-900 border-black text-white ring-2 ring-black'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <span className="font-bold text-sm">Tutup / Habis</span>
                  <span className={`text-[11px] mt-1 ${queueLevel === 'empty' ? 'text-zinc-300' : 'text-zinc-500'}`}>Stok BBM kosong</span>
                </button>
              </div>
            </div>

            {/* Fuel Stock Checklist */}
            <div className="pt-2 border-t border-zinc-200">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-2 flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-zinc-500" />
                2. Ketersediaan BBM:
              </label>

              <div className="space-y-2">
                {/* Pertalite */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="text-sm font-semibold text-zinc-900">Pertalite</span>
                  </div>
                  <div className="flex gap-1.5">
                    {(['available', 'low', 'out_of_stock'] as FuelStatus[]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setPertalite(status)}
                        className={`min-h-[40px] px-3 py-1.5 text-xs rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-black ${
                          pertalite === status
                            ? status === 'available'
                              ? 'bg-emerald-600 text-white font-bold shadow-xs'
                              : status === 'low'
                              ? 'bg-amber-600 text-white font-bold shadow-xs'
                              : 'bg-rose-600 text-white font-bold shadow-xs'
                            : 'bg-white border border-zinc-200 text-zinc-600 hover:text-black hover:bg-zinc-100'
                        }`}
                      >
                        {status === 'available' ? 'Ada' : status === 'low' ? 'Menipis' : 'Habis'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pertamax */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <span className="text-sm font-semibold text-zinc-900">Pertamax</span>
                  </div>
                  <div className="flex gap-1.5">
                    {(['available', 'low', 'out_of_stock'] as FuelStatus[]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setPertamax(status)}
                        className={`min-h-[40px] px-3 py-1.5 text-xs rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-black ${
                          pertamax === status
                            ? status === 'available'
                              ? 'bg-blue-600 text-white font-bold shadow-xs'
                              : status === 'low'
                              ? 'bg-amber-600 text-white font-bold shadow-xs'
                              : 'bg-rose-600 text-white font-bold shadow-xs'
                            : 'bg-white border border-zinc-200 text-zinc-600 hover:text-black hover:bg-zinc-100'
                        }`}
                      >
                        {status === 'available' ? 'Ada' : status === 'low' ? 'Menipis' : 'Habis'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Solar */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <span className="text-sm font-semibold text-zinc-900">Bio Solar</span>
                  </div>
                  <div className="flex gap-1.5">
                    {(['available', 'low', 'out_of_stock'] as FuelStatus[]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setSolar(status)}
                        className={`min-h-[40px] px-3 py-1.5 text-xs rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-black ${
                          solar === status
                            ? status === 'available'
                              ? 'bg-emerald-600 text-white font-bold shadow-xs'
                              : status === 'low'
                              ? 'bg-amber-600 text-white font-bold shadow-xs'
                              : 'bg-rose-600 text-white font-bold shadow-xs'
                            : 'bg-white border border-zinc-200 text-zinc-600 hover:text-black hover:bg-zinc-100'
                        }`}
                      >
                        {status === 'available' ? 'Ada' : status === 'low' ? 'Menipis' : 'Habis'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Short Note */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
                Catatan Tambahan (Opsional):
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="cth: Jalur motor cepat, antrean mobil memanjang ke jalan"
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-white border border-zinc-300 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                maxLength={80}
              />
            </div>

            {/* Lampiran Foto Antrean (Opsional) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-zinc-500" />
                  Foto Kondisi Antrean (Opsional):
                </span>
                <span className="text-[10px] font-normal text-zinc-400 lowercase">
                  kompresi otomatis webp
                </span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
                id="queue-photo-upload"
              />

              {!previewUrl ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full min-h-[52px] px-4 py-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-400 text-zinc-600 flex items-center justify-center gap-2.5 text-xs font-medium transition-colors cursor-pointer group focus-visible:ring-2 focus-visible:ring-black"
                >
                  <div className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 group-hover:text-black group-hover:border-zinc-300 transition-colors">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-zinc-800">Unggah Foto Antrean</p>
                    <p className="text-[10px] text-zinc-400">Kamera HP atau Galeri (Otomatis kompresi WebP ~100 KB)</p>
                  </div>
                </button>
              ) : (
                <div className="relative rounded-xl border border-zinc-200 overflow-hidden bg-zinc-900 group">
                  <img
                    src={previewUrl}
                    alt="Pratinjau antrean"
                    className="w-full h-36 object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-between p-3">
                    <div className="text-white">
                      <p className="text-xs font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Foto Siap Diunggah
                      </p>
                      <p className="text-[10px] text-zinc-300">
                        {selectedFile?.name} ({selectedFile?.size ? (selectedFile.size / 1024).toFixed(0) : 0} KB)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="min-h-[44px] min-w-[44px] p-2 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                      title="Hapus foto"
                      aria-label="Hapus foto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Turnstile Anti-Bot Verification */}
            <div className="pt-2">
              <TurnstileWidget
                onVerify={handleTurnstileVerify}
                onError={handleTurnstileError}
                onExpire={handleTurnstileExpire}
                className="mb-3"
              />

              {formError && (
                <div
                  role="alert"
                  className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in zoom-in-95 duration-150"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-rose-950">Perhatian:</p>
                    <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">{formError}</p>
                  </div>
                </div>
              )}

              <div className="text-[11px] text-zinc-500 mb-3 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                Laporan Anda langsung memperbarui informasi bagi pengendara lain secara realtime.
              </div>

              <button
                type="submit"
                disabled={!turnstileToken || isSubmitting}
                className={`w-full min-h-[48px] py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all focus-visible:ring-2 focus-visible:ring-black ${
                  !turnstileToken || isSubmitting
                    ? 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed shadow-none'
                    : 'bg-black hover:bg-zinc-800 text-white shadow-sm cursor-pointer'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isUploadingPhoto ? 'Mengunggah Foto Antrean...' : 'Mengirim Laporan...'}
                  </>
                ) : !turnstileToken ? (
                  'Selesaikan Verifikasi di Atas'
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Kirim Laporan Sekarang
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
