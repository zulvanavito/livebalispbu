'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { ShieldCheck, Loader2 } from 'lucide-react';

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
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [isVerified, setIsVerified] = useState<boolean>(false);

  // Cloudflare test dummy key (always passes) as fallback
  const siteKey =
    process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

  useEffect(() => {
    // If window.turnstile is already available on mount
    if (typeof window !== 'undefined' && window.turnstile) {
      setScriptLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.turnstile) return;

    // Prevent duplicate rendering
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // ignore
      }
    }

    try {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'light',
        size: 'flexible',
        callback: (token: string) => {
          setIsVerifying(false);
          setIsVerified(true);
          onVerify(token);
        },
        'error-callback': () => {
          setIsVerifying(false);
          setIsVerified(false);
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
      // Fallback in case of domain mismatch or adblock: grant dev token if on test key
      if (siteKey.startsWith('1x00000000000000000000')) {
        setIsVerifying(false);
        setIsVerified(true);
        onVerify('test-token-pass');
      }
    }

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
  }, [scriptLoaded, siteKey, onVerify, onError, onExpire]);

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
        {isVerifying && !isVerified && (
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
    </div>
  );
};
