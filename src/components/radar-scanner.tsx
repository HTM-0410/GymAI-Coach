'use client';

import React from 'react';

interface RadarScannerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
  active?: boolean;
}

export function RadarScanner({
  size = 'md',
  className = '',
  label,
  active = true,
}: RadarScannerProps) {
  const sizeConfig = {
    sm: { box: 'h-11 w-11', rings: ['h-8 w-8', 'h-4 w-4'] },
    md: { box: 'h-14 w-14', rings: ['h-10 w-10', 'h-5 w-5'] },
    lg: { box: 'h-18 w-18', rings: ['h-13 w-13', 'h-7 w-7'] },
    xl: { box: 'h-24 w-24', rings: ['h-16 w-16', 'h-8 w-8'] },
  };

  const { box, rings } = sizeConfig[size] ?? sizeConfig.md;

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {/* Outer Housing Ring */}
      <div
        className={`relative ${box} rounded-full overflow-hidden bg-[#0a0e17] border border-accent/40 shadow-[0_0_16px_rgba(249,115,22,0.3),inset_0_0_10px_rgba(0,0,0,0.8)] flex items-center justify-center`}
      >
        {/* Radar Background Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#141e30_0%,#080c14_100%)]" />

        {/* Concentric Range Rings */}
        <div
          className={`absolute rounded-full border border-accent/20 pointer-events-none ${rings[0]}`}
        />
        <div
          className={`absolute rounded-full border border-accent/30 pointer-events-none ${rings[1]}`}
        />

        {/* Crosshair Axes */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-accent/25 pointer-events-none" />
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-accent/25 pointer-events-none" />

        {/* Rotating Circular Radar Sweep Beam */}
        {active && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none animate-[laser-spin_3s_linear_infinite]"
            style={{
              background:
                'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 270deg, rgba(249, 115, 22, 0.15) 315deg, rgba(249, 115, 22, 0.75) 360deg)',
            }}
          />
        )}

        {/* Tactical Blips (Detected Targets) */}
        <span className="absolute top-[28%] right-[32%] h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_#f97316] led-pulse" />
        <span className="absolute bottom-[30%] left-[26%] h-1 w-1 rounded-full bg-success shadow-[0_0_4px_#22c55e]" />

        {/* Center Bullseye Pivot */}
        <div className="relative z-10 h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_#f97316] border border-white/60" />

        {/* Glass Vignette & Reflection Overlay */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/40 via-transparent to-white/10 pointer-events-none" />
      </div>

      {label && (
        <span className="font-mono text-[9px] uppercase tracking-wider text-accent font-bold mt-1 block text-center">
          {label}
        </span>
      )}
    </div>
  );
}
