'use client';

import React, { useState } from 'react';
import { ChevronRight, History, Play, RefreshCw } from 'lucide-react';
import ExerciseMediaCard from './exercise-media-card';
import FullscreenMediaModal from './fullscreen-media-modal';
import { formatDistance, formatLoad, type TrackingMode, type UnitSystem } from '@/lib/workouts/metrics';

type ExerciseIdentityHeaderProps = {
  name: string;
  phaseLabel: string;
  currentExerciseIndex: number;
  totalExercises: number;
  mode: TrackingMode;
  targetSets: number;
  targetRepMin?: number | null;
  targetRepMax?: number | null;
  targetRir?: number | null;
  durationSeconds?: number | null;
  holdSeconds?: number | null;
  targetDistanceMeters?: number | null;
  unitSystem?: UnitSystem;
  perSide?: boolean | null;
  aiReason?: string | null;
  previousPerformance?: { date: string; sets: { weight: number; reps: number }[] } | null;
  animationUrl: string | null;
  thumbnailUrl: string | null;
  onOpenTechniqueSheet: () => void;
  onSkipPhase?: () => void;
  isNonMainPhase?: boolean;
  onRequestSubstitute?: () => void;
  canSubstitute?: boolean;
};

export default function ExerciseIdentityHeader({
  name,
  phaseLabel,
  currentExerciseIndex,
  totalExercises,
  mode,
  targetSets,
  targetRepMin,
  targetRepMax,
  targetRir,
  durationSeconds,
  holdSeconds,
  targetDistanceMeters,
  unitSystem = 'metric',
  perSide,
  previousPerformance,
  animationUrl,
  thumbnailUrl,
  onOpenTechniqueSheet,
  onSkipPhase,
  isNonMainPhase = false,
  onRequestSubstitute,
  canSubstitute = false,
}: ExerciseIdentityHeaderProps) {
  const [showFullscreenMedia, setShowFullscreenMedia] = useState(false);

  const targetText =
    mode === 'reps' || mode === 'weight_reps'
      ? `${targetSets} hiệp × ${targetRepMin ?? 8}-${targetRepMax ?? 12} reps`
      : mode === 'duration_distance'
        ? [durationSeconds ? `${durationSeconds}s` : null, targetDistanceMeters ? formatDistance(targetDistanceMeters, unitSystem) : null].filter(Boolean).join(' · ')
        : `${holdSeconds ? 'Giữ tĩnh' : 'Thực hiện'} ${durationSeconds ?? holdSeconds ?? 45}s${perSide ? ' mỗi bên' : ''}`;

  return (
    <div className="space-y-2.5">
      {/* Skip non-main phase button if applicable */}
      {isNonMainPhase && onSkipPhase && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSkipPhase}
            className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted hover:text-accent transition-colors"
          >
            Bỏ qua phần này →
          </button>
        </div>
      )}

      {/* Exercise Main Title */}
      <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight leading-tight">
        {name}
      </h1>

      {/* 3. Target & Previous Performance Row */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {/* Target Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-accent/10 border border-accent/25 text-accent font-mono font-bold">
          <span>🎯 {targetText}</span>
        </div>

        {/* Previous Best / Last Performance */}
        {previousPerformance && previousPerformance.sets.length > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/10 text-ink font-mono text-xs">
            <History className="h-3 w-3 text-ink-muted shrink-0" />
            <span className="text-ink-muted">Lần trước:</span>
            <span className="font-extrabold text-ink">
              {previousPerformance.sets.map((s) => `${formatLoad(s.weight, unitSystem)}×${s.reps}`).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* 4. ALWAYS-VISIBLE COMPACT GIF / MEDIA CARD */}
      <ExerciseMediaCard
        name={name}
        animationUrl={animationUrl}
        thumbnailUrl={thumbnailUrl}
        onOpenFullscreen={() => setShowFullscreenMedia(true)}
      />

      {/* 5. COMPACT ACTION ROW */}
      <div className="grid gap-2 sm:grid-cols-2">
        {/* Technique & Details Trigger */}
        <button
          type="button"
          onClick={onOpenTechniqueSheet}
          className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-xs font-bold text-ink transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Play className="h-2.5 w-2.5 fill-current" />
            </span>
            <span>Kỹ thuật & chi tiết</span>
          </div>
          <ChevronRight className="h-4 w-4 text-ink-muted" />
        </button>
        {onRequestSubstitute && (
          <button
            type="button"
            onClick={onRequestSubstitute}
            disabled={!canSubstitute}
            title={canSubstitute ? 'Đổi sang bài cùng cơ chính phù hợp với gym' : 'Chỉ đổi được trước khi hoàn thành hiệp'}
            className="flex w-full items-center justify-between rounded-xl border border-accent/20 bg-accent/[0.04] px-3 py-2 text-xs font-bold text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-accent/15">
                <RefreshCw className="h-3 w-3" />
              </span>
              Máy bận? Đổi bài
            </span>
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      <FullscreenMediaModal
        isOpen={showFullscreenMedia}
        onClose={() => setShowFullscreenMedia(false)}
        name={name}
        mediaUrl={animationUrl || thumbnailUrl}
      />
    </div>
  );
}
