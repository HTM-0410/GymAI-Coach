'use client';

import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export function BrandLogo({ size = 'md', className = '', showText = false }: BrandLogoProps) {
  const sizeMap = {
    sm: { box: 'h-7 w-7', icon: 'h-4.5 w-4.5', text: 'text-xs' },
    md: { box: 'h-9 w-9', icon: 'h-6 w-6', text: 'text-sm' },
    lg: { box: 'h-11 w-11', icon: 'h-7.5 w-7.5', text: 'text-base' },
    xl: { box: 'h-14 w-14', icon: 'h-10 w-10', text: 'text-xl' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 shrink-0 select-none ${className}`}>
      {/* ── GYMAI CYBER CREST LOGO TILE ── */}
      <div
        className={`relative ${currentSize.box} rounded-xl bg-gradient-to-br from-[#141c2e] via-[#0c1220] to-[#070a12] text-white flex items-center justify-center shadow-[0_2px_10px_rgba(249,115,22,0.25),0_0_1px_rgba(255,255,255,0.2)] shrink-0 group-hover:scale-105 transition-transform duration-200 overflow-hidden border border-[#f97316]/40`}
      >
        {/* Ambient Backlight Glow inside tile */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.2)_0%,transparent_70%)] pointer-events-none" />

        {/* Subtle glass reflection */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/15 pointer-events-none" />

        {/* Cyber Crest Vector: Fusion of G + Barbell Plates + AI Neural Star */}
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${currentSize.icon} relative z-10 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]`}
        >
          <defs>
            <linearGradient id="cyberGoldOrange" x1="20" y1="15" x2="80" y2="85" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="30%" stopColor="#fb923c" />
              <stop offset="70%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>

            <linearGradient id="cyberStarGrad" x1="35" y1="35" x2="55" y2="65" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#fed7aa" />
              <stop offset="100%" stopColor="#fb923c" />
            </linearGradient>
          </defs>

          {/* Outer G Ribbon Arc */}
          <path
            d="
              M 68,24
              L 61.5,28.5
              C 58,24 53,21 47,21
              C 33.7,21 23,31.7 23,45
              C 23,58.3 33.7,69 47,69
              C 53.5,69 59.2,66.2 63.5,61.5
              L 63.5,66
              C 59,70.5 53.2,73.5 47,73.5
              C 31.2,73.5 18.5,60.8 18.5,45
              C 18.5,29.2 31.2,16.5 47,16.5
              C 55.2,16.5 62.5,20 68,24
              Z
            "
            fill="url(#cyberGoldOrange)"
          />

          {/* Inner Accent Line (Concentric Ring Detail) */}
          <path
            d="
              M 56,29
              C 53.5,26.8 50.4,25.5 47,25.5
              C 36.2,25.5 27.5,34.2 27.5,45
              C 27.5,55.8 36.2,64.5 47,64.5
              C 50.4,64.5 53.5,63.2 56,61
            "
            stroke="url(#cyberGoldOrange)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            strokeOpacity="0.9"
          />

          {/* Center Barbell Shaft */}
          <path d="M 45,43.5 L 67,43.5 L 67,46.5 L 45,46.5 Z" fill="url(#cyberGoldOrange)" />

          {/* AI 4-Point Primary Star Nucleus */}
          <path
            d="
              M 45,34
              C 45,40.5 39.5,45 33,45
              C 39.5,45 45,49.5 45,56
              C 45,49.5 50.5,45 57,45
              C 50.5,45 45,40.5 45,34
              Z
            "
            fill="url(#cyberStarGrad)"
          />

          {/* Secondary Diagonal Spark Points */}
          <path
            d="M 37.5,37.5 L 40,40 M 52.5,37.5 L 50,40 M 37.5,52.5 L 40,50 M 52.5,52.5 L 50,50"
            stroke="url(#cyberStarGrad)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Micro Orbital AI Data Particles */}
          <circle cx="45" cy="30" r="1.5" fill="#ffffff" />
          <circle cx="45" cy="60" r="1.5" fill="#ffffff" />
          <circle cx="30" cy="45" r="1.5" fill="#ffffff" />
          <circle cx="60" cy="45" r="1.5" fill="#ffffff" />

          {/* Triple Barbell Weight Plates Stack */}
          <rect x="67" y="33" width="3.5" height="24" rx="1.75" fill="url(#cyberGoldOrange)" />
          <rect x="72" y="36.5" width="2.8" height="17" rx="1.4" fill="url(#cyberGoldOrange)" />
          <rect x="76.3" y="40" width="2.2" height="10" rx="1.1" fill="url(#cyberGoldOrange)" />
          <rect x="79.5" y="43.5" width="2.2" height="3" rx="0.8" fill="url(#cyberGoldOrange)" />
        </svg>
      </div>

      {/* ── BRAND TYPOGRAPHY ── */}
      {showText && (
        <div className="flex flex-col">
          <div
            className={`font-extrabold ${currentSize.text} tracking-tight text-ink flex items-center gap-1.5 leading-none`}
          >
            <span>GymAI</span>
            <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/30 leading-none shadow-[0_0_8px_rgba(249,115,22,0.3)]">
              2.0
            </span>
          </div>
          <span className="font-mono text-[9px] text-ink-muted uppercase tracking-wider font-semibold mt-0.5">
            Coach System
          </span>
        </div>
      )}
    </div>
  );
}
