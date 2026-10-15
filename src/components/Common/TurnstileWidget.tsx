'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import { ShieldCheck, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: (errorCode?: string) => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  onVerify,
  onError,
  onExpire,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLocalhost, setIsLocalhost] = useState<boolean>(false);

  // Cloudflare site key
  const siteKey =
    process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        setIsLocalhost(true);
      }
      if (window.turnstile) {
        setScriptLoaded(true);
      }
    }
  }, []);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return;

    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // ignore
      }
    }

    try {
      setIsVerifying(true);
      setHasError(false);

      const id = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'light',
        size: 'flexible',
        callback: (token: string) => {
          setIsVerifying(false);
          setIsVerified(true);
          setHasError(false);
          onVerify(token);
        },
        'error-callback': () => {
          setIsVerifying(false);
          setIsVerified(false);
          setHasError(true);
          if (onError) onError();
        },
        'expired-callback': () => {
          setIsVerified(false);
          if (onExpire) onExpire();
        },
      });
      widgetIdRef.current = id;
    } catch (e) {
      console.warn('Turnstile render warning:', e);
      setIsVerifying(false);
      setHasError(true);
    }
  }, [siteKey, onVerify, onError, onExpire]);

  useEffect(() => {
    if (!scriptLoaded) return;
    renderWidget();

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch {
          // ignore
        }
      }
    };
  }, [scriptLoaded, renderWidget]);

  const handleDevBypass = () => {
    setIsVerifying(false);
    setIsVerified(true);
    setHasError(false);
    onVerify('dev-bypass-token');
  };

  return (
    <div className={`p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs ${className}`}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="lazyOnload"
        onLoad={() => setScriptLoaded(true)}
      />

      <div className="flex items-center justify-between mb-2 text-zinc-600">
        <span className="flex items-center gap-1.5 font-semibold text-[11px] text-zinc-800">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          Verifikasi Keamanan Turnstile
        </span>
        {isVerifying && !isVerified && !hasError && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-400">
            <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
            Memeriksa...
          </span>
        )}
        {isVerified && (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            ✓ Terverifikasi
          </span>
        )}
      </div>

      {/* Cloudflare Turnstile target container */}
      <div ref={containerRef} className="w-full flex justify-center min-h-[42px]" />

      {/* Error state & Dev Bypass fallback */}
      {hasError && (
        <div className="mt-2 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 flex flex-col gap-1.5">
          <div className="flex items-start gap-1.5 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>
              {isLocalhost
                ? 'Domain "localhost" belum didaftarkan di widget Cloudflare Turnstile.'
                : 'Verifikasi anti-bot gagal dimuat. Silakan periksa koneksi internet.'}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={renderWidget}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 font-semibold text-[10px] cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Coba Lagi
            </button>

            {isLocalhost && (
              <button
                type="button"
                onClick={handleDevBypass}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-900 text-white hover:bg-black font-bold text-[10px] cursor-pointer transition-colors shadow-xs"
              >
                Bypass untuk Testing Lokal
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
