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
      {/* Balinese Candi Bentar + Fuel Droplet Icon */}
      <div
        className={`${currentSize.box} rounded-xl bg-zinc-950 p-1 border border-zinc-800 shadow-xs flex items-center justify-center shrink-0 relative overflow-hidden group`}
      >
        <svg
          viewBox="0 0 512 512"
          className="w-full h-full transition-transform duration-300 group-hover:scale-105"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="navBaliGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="navFuelEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {/* Radar circle */}
          <circle cx="256" cy="112" r="54" stroke="#10b981" strokeWidth="6" strokeOpacity="0.4" strokeDasharray="14 10" />

          {/* Left Candi Bentar */}
          <g fill="url(#navBaliGold)">
            <path d="M 80 348 L 210 348 L 210 334 L 92 334 Z" />
            <path d="M 96 334 L 206 334 L 206 320 L 108 320 Z" />
            <path d="M 112 320 L 202 320 L 202 264 L 118 264 Z" />
            <path d="M 122 264 L 202 264 L 202 212 L 132 212 Z" />
            <path d="M 136 212 L 202 212 L 202 168 L 146 168 Z" />
            <path d="M 150 168 L 202 168 L 202 124 L 176 124 L 202 96 L 202 82 L 168 124 Z" />
          </g>

          {/* Right Candi Bentar */}
          <g fill="url(#navBaliGold)">
            <path d="M 432 348 L 302 348 L 302 334 L 420 334 Z" />
            <path d="M 416 334 L 306 334 L 306 320 L 404 320 Z" />
            <path d="M 400 320 L 310 320 L 310 264 L 394 264 Z" />
            <path d="M 390 264 L 310 264 L 310 212 L 380 212 Z" />
            <path d="M 376 212 L 310 212 L 310 168 L 366 168 Z" />
            <path d="M 362 168 L 310 168 L 310 124 L 336 124 L 310 96 L 310 82 L 344 124 Z" />
          </g>

          {/* Center Nozzle & Glowing Droplet */}
          <path d="M 240 254 L 274 218 L 288 232 L 254 268 Z" fill="url(#navFuelEmerald)" />
          <path d="M 282 208 L 274 164 L 260 148" stroke="#f4f4f5" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Droplet */}
          <path
            d="M 256 94 C 242 116, 238 128, 238 136 C 238 148, 246 156, 256 156 C 266 156, 274 148, 274 136 C 274 128, 270 116, 256 94 Z"
            fill="url(#navFuelEmerald)"
          />
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
          <p className={`${currentSize.subtext} text-zinc-500 font-medium hidden sm:block mt-0.5`}>
            Pantau antrean BBM &amp; CCTV ATCS lalu lintas secara realtime
          </p>
        </div>
      )}
    </div>
  );
};
