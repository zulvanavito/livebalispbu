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
          'error-callback'?: () => void;
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

  // Store callbacks in refs to guarantee parent re-renders NEVER recreate or destroy the widget!
  const onVerifyRef = useRef(onVerify);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onErrorRef.current = onError;
    onExpireRef.current = onExpire;
  });

  // Cloudflare test dummy key (always passes) as fallback
  const siteKey =
    process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

  useEffect(() => {
    if (typeof window !== 'undefined' && window.turnstile) {
      setScriptLoaded(true);
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
          setIsVerifying(false);
          setIsVerified(false);
          setErrorMessage('Verifikasi anti-bot gagal. Silakan klik Coba Lagi.');
          onErrorRef.current?.();
        },
        'expired-callback': () => {
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
  }, [siteKey]);

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
    hasRenderedRef.current = false;
    renderWidget();
  };

  return (
    <div className={`p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs ${className}`}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="lazyOnload"
        onLoad={() => setScriptLoaded(true)}
      />

      <div className="flex items-center justify-between mb-1.5 text-zinc-600">
        <span className="flex items-center gap-1.5 font-medium text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          Proteksi Anti-Bot Cloudflare Turnstile
        </span>
        {isVerifying && !isVerified && !errorMessage && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-400">
            <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
            Memverifikasi...
          </span>
        )}
        {isVerified && (
          <span className="text-[10px] font-semibold text-emerald-600">
            ✓ Terverifikasi Manusia
          </span>
        )}
      </div>

      {/* Cloudflare Turnstile target container */}
      <div ref={containerRef} className="w-full flex justify-center min-h-[42px]" />

      {errorMessage && (
        <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="px-2 py-0.5 rounded bg-white border border-rose-300 text-rose-700 font-semibold hover:bg-rose-50 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Coba Lagi
          </button>
        </div>
      )}
    </div>
  );
};
