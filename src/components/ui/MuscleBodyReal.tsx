'use client';

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { MuscleName } from './MuscleBody';

export interface MuscleBodyRealProps {
  type?: 'front' | 'back' | 'both';
  highlighted?: MuscleName[];
  secondaryMuscles?: MuscleName[];
  accentColor?: string;
  className?: string;
  showToggle?: boolean;
  interactive?: boolean;
  hoveredMuscle?: MuscleName | null;
  onHoverMuscle?: (muscle: MuscleName | null) => void;
}

export default function MuscleBodyReal({
  type = 'both',
  highlighted = [],
  secondaryMuscles = [],
  accentColor = '#ea580c',
  className = '',
  showToggle = false,
  interactive = true,
  hoveredMuscle = null,
  onHoverMuscle,
}: MuscleBodyRealProps) {
  const [currentView, setCurrentView] = useState<'front' | 'back'>(
    type === 'back' ? 'back' : 'front',
  );

  const isBoth = type === 'both';

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* View Switcher Tabs (if not both) */}
      {!isBoth && showToggle && (
        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/15 mb-3 shadow-neumorph-sm z-20">
          <button
            type="button"
            onClick={() => setCurrentView('front')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              currentView === 'front'
                ? 'bg-accent text-white shadow-xs'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Mặt trước
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('back')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              currentView === 'back'
                ? 'bg-accent text-white shadow-xs'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Mặt sau
          </button>
        </div>
      )}

      {/* Main Mannequin Container */}
      <div className="flex items-center justify-center gap-3 sm:gap-5">
        {isBoth ? (
          <>
            <EcorcheView
              view="front"
              highlighted={highlighted}
              secondaryMuscles={secondaryMuscles}
              accentColor={accentColor}
              interactive={interactive}
              hoveredMuscle={hoveredMuscle}
              onHoverMuscle={onHoverMuscle}
            />
            <EcorcheView
              view="back"
              highlighted={highlighted}
              secondaryMuscles={secondaryMuscles}
              accentColor={accentColor}
              interactive={interactive}
              hoveredMuscle={hoveredMuscle}
              onHoverMuscle={onHoverMuscle}
            />
          </>
        ) : (
          <EcorcheView
            view={currentView}
            highlighted={highlighted}
            secondaryMuscles={secondaryMuscles}
            accentColor={accentColor}
            interactive={interactive}
            hoveredMuscle={hoveredMuscle}
            onHoverMuscle={onHoverMuscle}
          />
        )}
      </div>
    </div>
  );
}

interface EcorcheViewProps {
  view: 'front' | 'back';
  highlighted: MuscleName[];
  secondaryMuscles: MuscleName[];
  accentColor: string;
  interactive?: boolean;
  hoveredMuscle?: MuscleName | null;
  onHoverMuscle?: (muscle: MuscleName | null) => void;
}

function EcorcheView({
  view,
  highlighted,
  secondaryMuscles,
  accentColor,
  interactive,
  hoveredMuscle,
  onHoverMuscle,
}: EcorcheViewProps) {
  const isFront = view === 'front';
  const bgImage = isFront ? '/anatomy-real/front.jpg' : '/anatomy-real/back.jpg';

  const isHighlighted = (name: MuscleName) => highlighted.includes(name) || hoveredMuscle === name;
  const isSecondary = (name: MuscleName) => secondaryMuscles.includes(name) && hoveredMuscle !== name;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[130px] sm:w-[155px] h-[260px] sm:h-[310px] rounded-2xl overflow-hidden shadow-2xl bg-[#090d16] border border-white/15 group">
        {/* Real Anatomical Écorché Base Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bgImage}
          alt={`Medical Anatomy ${isFront ? 'Front' : 'Back'} View`}
          className="w-full h-full object-cover object-center filter contrast-110 brightness-100 transition-all duration-300"
        />

        {/* Dynamic Glowing Muscle Highlights Layer */}
        <svg
          viewBox="0 0 300 400"
          className="absolute inset-0 w-full h-full pointer-events-auto"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Primary Flaming Red/Orange Glowing Aura */}
            <radialGradient id={`glow_pri_${view}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffedd5" stopOpacity="0.95" />
              <stop offset="35%" stopColor="#ff4500" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#ea580c" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#c2410c" stopOpacity="0" />
            </radialGradient>

            {/* Secondary Golden Amber Glowing Aura */}
            <radialGradient id={`glow_sec_${view}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.7" />
              <stop offset="80%" stopColor="#d97706" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
            </radialGradient>

            {/* High-Luminance Neon Bloom Filter */}
            <filter id={`neon_${view}`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {isFront ? (
            /* ── FRONT MUSCLES HIGHLIGHT OVERLAYS ── */
            <g>
              {/* CHEST */}
              {(isHighlighted('CHEST') || isSecondary('CHEST')) && (
                <g
                  filter={`url(#neon_${view})`}
                  className="cursor-pointer transition-all duration-300"
                  onMouseEnter={() => interactive && onHoverMuscle?.('CHEST')}
                  onMouseLeave={() => interactive && onHoverMuscle?.(null)}
                >
                  <path
                    d="M 118,80 Q 138,76 150,90 Q 150,135 125,142 Q 106,134 104,106 Z"
                    fill={isHighlighted('CHEST') ? `url(#glow_pri_${view})` : `url(#glow_sec_${view})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                  <path
                    d="M 182,80 Q 162,76 150,90 Q 150,135 175,142 Q 194,134 196,106 Z"
                    fill={isHighlighted('CHEST') ? `url(#glow_pri_${view})` : `url(#glow_sec_${view})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                </g>
              )}

              {/* SHOULDERS */}
              {(isHighlighted('SHOULDERS') || isSecondary('SHOULDERS')) && (
                <g
                  filter={`url(#neon_${view})`}
                  className="cursor-pointer transition-all duration-300"
                  onMouseEnter={() => interactive && onHoverMuscle?.('SHOULDERS')}
                  onMouseLeave={() => interactive && onHoverMuscle?.(null)}
                >
                  <path
                    d="M 88,72 Q 116,62 124,85 Q 118,132 94,136 Q 72,110 88,72 Z"
                    fill={isHighlighted('SHOULDERS') ? `url(#glow_pri_${view})` : `url(#glow_sec_${view})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                  <path
                    d="M 212,72 Q 184,62 176,85 Q 182,132 206,136 Q 228,110 212,72 Z"
                    fill={isHighlighted('SHOULDERS') ? `url(#glow_pri_${view})` : `url(#glow_sec_${view})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                </g>
              )}

              {/* ABS */}
              {(isHighlighted('ABS') || isSecondary('ABS')) && (
                <g
                  filter={`url(#neon_${view})`}
                  className="cursor-pointer transition-all duration-300"
                  onMouseEnter={() => interactive && onHoverMuscle?.('ABS')}
                  onMouseLeave={() => interactive && onHoverMuscle?.(null)}
                >
                  <path
                    d="M 126,138 Q 150,135 174,138 Q 170,230 150,248 Q 130,230 126,138 Z"
                    fill={isHighlighted('ABS') ? `url(#glow_pri_${view})` : `url(#glow_sec_${view})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                </g>
              )}

              {/* BICEPS */}
              {(isHighlighted('BICEPS') || isSecondary('BICEPS')) && (
                <g
                  filter={`url(#neon_${view})`}
                  className="cursor-pointer transition-all duration-300"
                  onMouseEnter={() => interactive && onHoverMuscle?.('BICEPS')}
                  onMouseLeave={() => interactive && onHoverMuscle?.(null)}
                >
                  <path
                    d="M 76,112 Q 94,116 94,162 Q 78,175 70,148 Q 68,126 76,112 Z"
                    fill={isHighlighted('BICEPS') ? `url(#glow_pri_${view})` : `url(#glow_sec_${view})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                  <path
                    d="M 224,112 Q 206,116 206,162 Q 222,175 230,148 Q 232,126 224,112 Z"
                    fill={isHighlighted('BICEPS') ? `url(#glow_pri_${view})` : `url(#glow_sec_${view})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                </g>
              )}

              {/* FOREARMS */}
              {(isHighlighted('FOREARMS') || isSecondary('FOREARMS')) && (
                <g
                  filter={`url(#neon_${view})`}
                  className="cursor-pointer transition-all duration-300"
                  onMouseEnter={() => interactive && onHoverMuscle?.('FOREARMS')}
                  onMouseLeave={() => interactive && onHoverMuscle?.(null)}
                >
                  <path
                    d="M 64,170 Q 84,172 78,242 Q 62,254 54,236 Q 52,198 64,170 Z"
                    fill={isHighlighted('FOREARMS') ? `url(#glow_pri_${view})` : `url(#glow_sec_${view})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                  <path
                    d="M 236,170 Q 216,172 222,242 Q 238,254 246,236 Q 248,198 236,170 Z"
                    fill={isHighlighted('FOREARMS') ? `url(#glow_pri_${view})` : `url(#glow_sec_${view})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                </g>
              )}

              {/* LEGS / QUADS */}
              {(isHighlighted('LEGS') || isSecondary('LEGS')) && (
                <g
                  filter={`url(#neon_${view})`}
                  className="cursor-pointer transition-all duration-300"
                  onMouseEnter={() => interactive && onHoverMuscle?.('LEGS')}
                  onMouseLeave={() => interactive && onHoverMuscle?.(null)}
                >
                  <path
                    d="M 112,238 Q 146,240 148,310 Q 140,365 120,366 Q 98,335 112,238 Z"
                    fill={isHighlighted('LEGS') ? `url(#glow_pri_${view})` : `url(#glow_sec_${view})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                  <path
                    d="M 188,238 Q 154,240 152,310 Q 160,365 180,366 Q 202,335 188,238 Z"
                    fill={isHighlighted('LEGS') ? `url(#glow_pri_${view})` : `url(#glow_sec_${view})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                </g>
              )}
            </g>
          ) : (
            /* ── BACK MUSCLES HIGHLIGHT OVERLAYS ── */
            <g>
              {/* TRAPEZIUS / BACK */}
              {(isHighlighted('BACK') || isHighlighted('SHOULDERS') || isSecondary('BACK')) && (
                <g
                  filter={`url(#neon_${view})`}
                  className="cursor-pointer transition-all duration-300"
                  onMouseEnter={() => interactive && onHoverMuscle?.('BACK')}
                  onMouseLeave={() => interactive && onHoverMuscle?.(null)}
                >
                  <path
                    d="M 150,45 Q 185,62 205,74 Q 170,126 150,150 Q 130,126 95,74 Q 115,62 150,45 Z"
                    fill={isHighlighted('BACK') ? `url(#glow_pri_${view})` : `url(#glow_sec_${view})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                  <path
                    d="M 104,85 Q 138,125 146,182 Q 120,205 100,155 Q 92,118 104,85 Z"
                    fill={isHighlighted('BACK') ? `url(#glow_pri_${view})` : `url(#glow_sec_${view})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                  <path
                    d="M 196,85 Q 162,125 154,182 Q 180,205 200,155 Q 208,118 196,85 Z"
                    fill={isHighlighted('BACK') ? `url(#glow_pri_${view})` : `url(#glow_sec_${view})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                </g>
              )}

              {/* TRICEPS */}
              {(isHighlighted('TRICEPS') || isSecondary('TRICEPS')) && (
                <g
                  filter={`url(#neon_${view})`}
                  className="cursor-pointer transition-all duration-300"
                  onMouseEnter={() => interactive && onHoverMuscle?.('TRICEPS')}
                  onMouseLeave={() => interactive && onHoverMuscle?.(null)}
                >
                  <path
                    d="M 76,105 Q 94,108 94,165 Q 76,180 66,155 Q 66,128 76,105 Z"
                    fill={isHighlighted('TRICEPS') ? `url(#glow_pri_${view})` : `url(#glow_sec_${view})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                  <path
                    d="M 224,105 Q 206,108 206,165 Q 224,180 234,155 Q 234,128 224,105 Z"
                    fill={isHighlighted('TRICEPS') ? `url(#glow_pri_${view})` : `url(#glow_sec_${view})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                </g>
              )}

              {/* GLUTES */}
              {(isHighlighted('GLUTES') || isSecondary('GLUTES')) && (
                <g
                  filter={`url(#neon_${view})`}
                  className="cursor-pointer transition-all duration-300"
                  onMouseEnter={() => interactive && onHoverMuscle?.('GLUTES')}
                  onMouseLeave={() => interactive && onHoverMuscle?.(null)}
                >
                  <path
                    d="M 112,198 Q 148,196 150,245 Q 130,265 108,250 Q 102,218 112,198 Z"
                    fill={isHighlighted('GLUTES') ? `url(#glow_pri_${view})` : `url(#glow_sec_${view})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                  <path
                    d="M 188,198 Q 152,196 150,245 Q 170,265 192,250 Q 198,218 188,198 Z"
                    fill={isHighlighted('GLUTES') ? `url(#glow_pri_${view})` : `url(#glow_sec_${view})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                </g>
              )}

              {/* LEGS / HAMSTRINGS & CALVES */}
              {(isHighlighted('LEGS') || isSecondary('LEGS')) && (
                <g
                  filter={`url(#neon_${view})`}
                  className="cursor-pointer transition-all duration-300"
                  onMouseEnter={() => interactive && onHoverMuscle?.('LEGS')}
                  onMouseLeave={() => interactive && onHoverMuscle?.(null)}
                >
                  <path
                    d="M 110,248 Q 146,248 146,325 Q 124,340 112,328 Q 104,288 110,248 Z"
                    fill={isHighlighted('LEGS') ? `url(#glow_pri_${view})` : `url(#glow_sec_${view})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                  <path
                    d="M 190,248 Q 154,248 154,325 Q 176,340 188,328 Q 196,288 190,248 Z"
                    fill={isHighlighted('LEGS') ? `url(#glow_pri_${view})` : `url(#glow_sec_${view})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                </g>
              )}
            </g>
          )}
        </svg>

        {/* Ambient Dark Bottom Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090d16]/80 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* View Title Badge */}
      <span className="mt-2 font-mono text-[10px] font-extrabold uppercase tracking-widest text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-md border border-white/10 shadow-xs">
        {isFront ? 'Mặt Trước' : 'Mặt Sau'}
      </span>
    </div>
  );
}
