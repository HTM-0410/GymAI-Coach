'use client';

import React from 'react';
import { Clock, FastForward, Plus, Minus, Sparkles, X } from 'lucide-react';
import { formatLoad, type UnitSystem } from '@/lib/workouts/metrics';

type CompactRestTimerProps = {
  totalSeconds: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
  onDismiss?: () => void;
  nextSetNumber?: number;
  nextWeight?: number | null;
  nextReps?: number | null;
  nextRir?: number | null;
  aiTip?: string | null;
  unitSystem?: UnitSystem;
};

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function CompactRestTimer({
  totalSeconds,
  remainingSeconds,
  elapsedSeconds,
  onAdjust,
  onSkip,
  onDismiss,
  nextSetNumber,
  nextWeight,
  nextReps,
  nextRir,
  aiTip,
  unitSystem = 'metric',
}: CompactRestTimerProps) {
  const progressPercent = totalSeconds > 0 ? Math.min(100, Math.max(0, (remainingSeconds / totalSeconds) * 100)) : 0;
  const isFinished = remainingSeconds <= 0;

  return (
    <div className="rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/[0.08] via-chassis-hi dark:via-[#0f141e] to-chassis p-4 shadow-neumorph relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Top Header: Title + Countdown */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white shadow-xs">
            <Clock className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
              Thời gian nghỉ giữa hiệp
            </span>
            <span
              suppressHydrationWarning
              className="font-mono text-xs text-ink-muted"
            >
              Đã nghỉ: {formatDuration(elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* Big Countdown */}
        <div className="flex items-baseline gap-1 font-mono text-2xl sm:text-3xl font-black tabular-nums text-ink">
          <span
            suppressHydrationWarning
            className={isFinished ? 'text-emerald-500' : 'text-accent'}
          >
            {formatDuration(remainingSeconds)}
          </span>
        </div>
      </div>

      {/* Linear Progress Bar */}
      <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            isFinished ? 'bg-emerald-500' : 'bg-accent'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Next Set Preview Info */}
      {nextSetNumber && (
        <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] mb-3 font-mono">
          <span className="text-ink-muted font-bold">Mục tiêu Set {nextSetNumber}:</span>
          <span className="font-extrabold text-ink">
            {nextWeight != null ? `${formatLoad(nextWeight, unitSystem)} × ` : ''}
            {nextReps ?? 10} reps
            {nextRir != null ? ` · RIR ${nextRir}` : ''}
          </span>
        </div>
      )}

      {/* Adjust & Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onAdjust(-30)}
          className="flex-1 py-2 px-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-ink font-mono text-xs font-bold transition-colors flex items-center justify-center gap-1"
        >
          <Minus className="h-3 w-3" />
          <span>30s</span>
        </button>

        <button
          type="button"
          onClick={() => onAdjust(30)}
          className="flex-1 py-2 px-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-ink font-mono text-xs font-bold transition-colors flex items-center justify-center gap-1"
        >
          <Plus className="h-3 w-3" />
          <span>30s</span>
        </button>

        <button
          type="button"
          onClick={onSkip}
          className="flex-1 py-2 px-3 rounded-xl bg-accent text-white font-mono text-xs font-extrabold shadow-accent hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1"
        >
          <FastForward className="h-3.5 w-3.5" />
          <span>Tập ngay</span>
        </button>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="Đóng đồng hồ nghỉ"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
