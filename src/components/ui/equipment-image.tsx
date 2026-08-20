'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Dumbbell, Cog, GitBranch, Box, Activity, User, CircleDot, Zap, TrendingUp, HelpCircle } from 'lucide-react';

export type EquipmentImageProps = {
  src?: string | null;
  slug: string;
  nameVi?: string | null;
  nameEn?: string | null;
  category?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  aspectRatio?: '4/3' | '1/1' | '16/9' | 'auto';
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  showFallbackLabel?: boolean;
};

// Canonical normalization for dual slugs / variants
export function getCanonicalEquipmentSlug(slug: string): string {
  if (!slug) return '';
  const normalized = slug.trim().toLowerCase().replace(/_/g, '-');
  if (normalized === 'air-bike') return 'stationary-bike';
  if (normalized === 'arc-trainer') return 'elliptical';
  
  if (normalized === 'dung-cu-tap-grip') return 'grip-trainer';
  if (normalized === 'chest-press') return 'chest-press';
  if (normalized === 'shoulder-press') return 'shoulder-press-machine';
  if (normalized === 'calf-machine' || normalized === 'calf-raise') return 'calf-raise-machine';
  if (normalized === 'preacher-curl-bench') return 'preacher-bench';
  if (normalized === 'glute-ham-raise') return 'ghd';
  if (normalized === 'assisted-chin-up-machine' || normalized === 'assisted-dip-machine') {
    return 'assisted-pull-up-machine';
  }

  const leverImageAliases: Record<string, string> = {
    'lever-bent-over-row': 'lever-bent-over-row-machine',
    'lever-bicep-curl': 'lever-biceps-curl-machine',
    'lever-chest-press': 'lever-chest-press-machine',
    'lever-decline-chest-press': 'lever-decline-chest-press-machine',
    'lever-high-row': 'lever-high-row-machine',
    'lever-hip-abduction': 'lever-hip-abduction-machine',
    'lever-hip-adduction': 'lever-hip-adduction-machine',
    'lever-hip-extension': 'lever-hip-extension-machine',
    'lever-incline-chest-press': 'lever-incline-chest-press-machine',
    'lever-pulldown': 'lever-lat-pulldown-machine',
    'lever-lateral-raise': 'lever-lateral-raise-machine',
    'lever-preacher-curl': 'lever-preacher-curl-machine',
    'lever-pullover': 'lever-pullover-machine',
    'lever-reverse-fly': 'lever-reverse-fly-machine',
    'lever-seated-crunch': 'lever-seated-ab-crunch-machine',
    'lever-seated-dip': 'lever-seated-dip-machine',
    'lever-seated-good-morning': 'lever-seated-good-morning-machine',
    'lever-seated-row': 'lever-seated-row-machine',
    'lever-shoulder-press': 'lever-shoulder-press-machine',
    'lever-shrug': 'lever-shrug-machine',
    'lever-t-bar-row': 'lever-t-bar-row-machine',
    'lever-triceps-extension': 'lever-triceps-extension-machine',
  };
  if (leverImageAliases[normalized]) return leverImageAliases[normalized];
  
  return normalized;
}

// Fallback icon based on category/slug
function getFallbackIcon(category?: string | null, slug?: string) {
  const cat = (category || '').toLowerCase();
  const s = (slug || '').toLowerCase();

  if (s.includes('cable') || cat === 'cables') return GitBranch;
  if (s.includes('bench') || cat === 'bench') return Box;
  if (s.includes('pull-up') || s.includes('dip') || cat === 'bodyweight' || cat === 'pull-up-dip') return TrendingUp;
  if (s.includes('bike') || s.includes('treadmill') || s.includes('row') || cat === 'cardio' || cat === 'cardio-machines') return Zap;
  if (s.includes('ball') || cat === 'balls') return CircleDot;
  if (s.includes('band') || cat === 'bands') return Activity;
  if (s.includes('dumbbell') || s.includes('barbell') || s.includes('kettlebell') || cat === 'free_weight' || cat === 'weights') return Dumbbell;
  if (cat === 'no-equipment' || s === 'bodyweight') return User;
  if (cat === 'machine' || s.includes('machine') || s.includes('lever')) return Cog;

  return HelpCircle;
}

const SIZE_CLASSES = {
  xs: 'w-12 h-9',
  sm: 'w-16 h-12',
  md: 'w-24 h-18 sm:w-28 sm:h-21',
  lg: 'w-32 h-24 sm:w-36 sm:h-27',
  xl: 'w-48 h-36',
  full: 'w-full h-full',
};

const ASPECT_CLASSES = {
  '4/3': 'aspect-[4/3]',
  '1/1': 'aspect-square',
  '16/9': 'aspect-[16/9]',
  'auto': '',
};

export const EquipmentImage = React.memo(function EquipmentImage({
  src,
  slug,
  nameVi,
  nameEn,
  category,
  size,
  aspectRatio = '4/3',
  priority = false,
  className = '',
  imageClassName = '',
  sizes = '(max-width: 640px) 96px, (max-width: 1024px) 144px, 200px',
  showFallbackLabel = false,
}: EquipmentImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const canonicalSlug = getCanonicalEquipmentSlug(slug);
  const displayName = nameVi || nameEn || slug;
  const altText = `Ảnh ${displayName}`;

  // Canonical image source determination
  const resolvedSrc = src?.trim()
    ? src.trim()
    : canonicalSlug
    ? `/equipment/${canonicalSlug}.webp`
    : null;

  const FallbackIcon = getFallbackIcon(category, slug);

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-white border border-black/[0.08] dark:border-white/[0.12] shadow-2xs flex items-center justify-center select-none shrink-0 ${
        size ? SIZE_CLASSES[size] : ''
      } ${ASPECT_CLASSES[aspectRatio]} ${className}`}
    >
      {/* Loading Shimmer Skeleton */}
      {!isLoaded && !hasError && resolvedSrc && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/[0.04] to-transparent animate-shimmer" />
      )}

      {/* Actual Product Image */}
      {resolvedSrc && !hasError ? (
        <Image
          src={resolvedSrc}
          alt={altText}
          fill
          sizes={sizes}
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          className={`object-contain p-1 sm:p-1.5 transition-all duration-200 ${
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          } ${imageClassName}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          unoptimized={resolvedSrc.startsWith('/')}
        />
      ) : (
        /* Fallback Placeholder (when image is missing or failed to load) */
        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-slate-400 bg-white">
          <FallbackIcon className="h-6 w-6 stroke-[1.25] text-slate-400" />
          {showFallbackLabel && (
            <span className="font-mono text-[9px] uppercase tracking-wider mt-1 text-slate-500 truncate max-w-[90%]">
              {displayName}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

EquipmentImage.displayName = 'EquipmentImage';
export default EquipmentImage;
