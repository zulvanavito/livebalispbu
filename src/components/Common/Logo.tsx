'use client';

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { box: 'w-7 h-7', text: 'text-sm', subtext: 'text-[9px]' },
    md: { box: 'w-9 h-9', text: 'text-base sm:text-lg', subtext: 'text-[11px]' },
    lg: { box: 'w-12 h-12', text: 'text-xl', subtext: 'text-xs' },
    xl: { box: 'w-16 h-16', text: 'text-2xl', subtext: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`${currentSize.box} rounded-xl bg-zinc-950 p-1.5 border border-zinc-800 shadow-xs flex items-center justify-center shrink-0 relative overflow-hidden group`}
      >
        <svg
          viewBox="0 0 32 32"
          className="w-full h-full transition-transform duration-300 group-hover:scale-105"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="navFuelPinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {/* Fuel Location Pin compound path: outer pin + inner droplet cutout */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M16 2.5C10.2 2.5 5.5 7.2 5.5 13C5.5 19.8 14.1 28.2 15.3 29.3C15.7 29.7 16.3 29.7 16.7 29.3C17.9 28.2 26.5 19.8 26.5 13C26.5 7.2 21.8 2.5 16 2.5ZM16 7.5C16 7.5 11 13 11 15.8C11 18.6 13.2 20.8 16 20.8C18.8 20.8 21 18.6 21 15.8C21 13 16 7.5 16 7.5Z"
            fill="url(#navFuelPinGrad)"
          />

          {/* Realtime Telemetry Beacon Core */}
          <circle cx="16" cy="16.2" r="2.2" fill="#34d399" />
        </svg>

        {/* Live indicator dot */}
        <span className="absolute top-1 right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className={`font-extrabold text-zinc-950 ${currentSize.text} tracking-tight leading-none`}>
              Live SPBU <span className="text-emerald-700 font-bold">Bali</span>
            </h1>
            <span className="hidden xs:inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              livebali.my.id
            </span>
          </div>
          <p className={`${currentSize.subtext} text-zinc-600 font-medium hidden sm:block mt-0.5`}>
            Pantau antrean BBM &amp; CCTV ATCS lalu lintas secara realtime
          </p>
        </div>
      )}
    </div>
  );
};
