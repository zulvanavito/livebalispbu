'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import { ShieldCheck, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

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
  const hasRenderedRef = useRef<boolean>(false);
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLocalhost, setIsLocalhost] = useState<boolean>(false);
  const isBypassedRef = useRef<boolean>(false);

  // Store callbacks in refs to guarantee parent re-renders NEVER recreate or destroy the widget!
  const onVerifyRef = useRef(onVerify);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onErrorRef.current = onError;
    onExpireRef.current = onExpire;
  });

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

    // Clean up any existing widget before re-rendering (e.g. on manual retry)
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // ignore
      }
      widgetIdRef.current = null;
    }

    try {
      setIsVerifying(true);
      setErrorMessage(null);

      const id = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'light',
        size: 'flexible',
        callback: (token: string) => {
          setIsVerifying(false);
          setIsVerified(true);
          setErrorMessage(null);
          onVerifyRef.current?.(token);
        },
        'error-callback': () => {
          if (isBypassedRef.current) return;
          setIsVerifying(false);
          setIsVerified(false);
          setErrorMessage(
            isLocalhost
              ? 'Domain "localhost" belum didaftarkan di widget Turnstile.'
              : 'Verifikasi anti-bot gagal. Silakan klik Coba Lagi.'
          );
          onErrorRef.current?.();
        },
        'expired-callback': () => {
          if (isBypassedRef.current) return;
          setIsVerified(false);
          setErrorMessage('Verifikasi kedaluwarsa. Silakan verifikasi ulang.');
          onExpireRef.current?.();
        },
      });

      widgetIdRef.current = id;
      hasRenderedRef.current = true;
    } catch (e) {
      console.warn('Turnstile render warning:', e);
      setIsVerifying(false);
      setErrorMessage('Gagal memuat widget keamanan.');
      onErrorRef.current?.();
    }
  }, [siteKey, isLocalhost]);

  useEffect(() => {
    if (!scriptLoaded) return;
    // Guard: Only render ONCE when script and container are ready!
    if (hasRenderedRef.current) return;

    renderWidget();

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
        hasRenderedRef.current = false;
      }
    };
  }, [scriptLoaded, renderWidget]);

  const handleRetry = () => {
    isBypassedRef.current = false;
    hasRenderedRef.current = false;
    renderWidget();
  };

  const handleDevBypass = () => {
    isBypassedRef.current = true;
    setIsVerifying(false);
    setIsVerified(true);
    setErrorMessage(null);
    onVerifyRef.current?.('dev-bypass-token');
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
        {isVerifying && !isVerified && !errorMessage && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-600 font-medium">
            <Loader2 className="w-3 h-3 animate-spin text-zinc-600" />
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
      {errorMessage && (
        <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="px-2 py-0.5 rounded bg-white border border-rose-300 text-rose-700 font-semibold hover:bg-rose-50 flex items-center gap-1 cursor-pointer transition-colors shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              Coba Lagi
            </button>
          </div>

          {isLocalhost && (
            <div className="pt-1.5 border-t border-rose-200/60 flex items-center justify-between">
              <span className="text-[10px] text-rose-700">Testing di localhost?</span>
              <button
                type="button"
                onClick={handleDevBypass}
                className="px-2 py-0.5 rounded bg-zinc-900 text-white font-bold hover:bg-black text-[10px] cursor-pointer transition-colors shadow-xs"
              >
                Bypass untuk Testing Lokal
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
