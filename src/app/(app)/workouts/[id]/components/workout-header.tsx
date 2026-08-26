'use client';

import React from 'react';
import { ArrowLeft, Clock, Layers, Pause, Play, Check } from 'lucide-react';
import { cleanDashes } from '@/lib/utils';

type WorkoutHeaderProps = {
  workoutName?: string;
  phaseLabel: string;
  totalSeconds: number;
  isPaused: boolean;
  onTogglePause: () => void;
  currentExerciseIndex: number;
  totalExercises: number;
  completedUnits: number;
  totalUnits: number;
  onOpenNavigator: () => void;
  onOpenExitSheet: () => void;
};

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function WorkoutHeader({
  workoutName,
  phaseLabel,
  totalSeconds,
  isPaused,
  onTogglePause,
  currentExerciseIndex,
  totalExercises,
  completedUnits,
  totalUnits,
  onOpenNavigator,
  onOpenExitSheet,
}: WorkoutHeaderProps) {
  const progressPercent = totalUnits > 0 ? Math.min(100, Math.round((completedUnits / totalUnits) * 100)) : 0;
  const safeWorkoutName = cleanDashes(workoutName);

  return (
    <header className="sticky top-0 z-30 bg-chassis-hi/95 dark:bg-[#0c1017]/95 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08] shadow-sm">
      <div className="max-w-3xl mx-auto px-3.5 py-2.5 flex items-center justify-between gap-2.5">
        {/* Left: Exit/Minimize button + Workout Info */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpenExitSheet}
            className="h-9 w-9 rounded-xl flex items-center justify-center bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-ink transition-colors shrink-0"
            title="Thoát hoặc thu nhỏ buổi tập"
            aria-label="Thoát buổi tập"
          >
            <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
          </button>

          <div className="min-w-0 flex-1">
            <span className="font-extrabold text-xs sm:text-sm text-ink truncate leading-none block">
              {safeWorkoutName || 'Buổi tập GymAI'}
            </span>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="h-1.5 w-16 sm:w-24 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-ink-muted font-bold">
                {completedUnits}/{totalUnits} hiệp
              </span>
            </div>
          </div>
        </div>

        {/* Right: Elapsed Timer + Navigator Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Elapsed Timer with Pause */}
          <div className="flex items-center gap-1.5 bg-black/[0.04] dark:bg-white/[0.06] px-2.5 py-1.5 rounded-xl border border-black/[0.06] dark:border-white/10">
            <Clock className={`h-3.5 w-3.5 ${isPaused ? 'text-warn' : 'text-accent animate-pulse'}`} />
            <span
              suppressHydrationWarning
              className="font-mono text-xs sm:text-sm font-extrabold tabular-nums text-ink"
            >
              {formatDuration(totalSeconds)}
            </span>
            <button
              type="button"
              onClick={onTogglePause}
              className="p-1 rounded text-ink-muted hover:text-ink transition-colors ml-0.5"
              title={isPaused ? 'Tiếp tục' : 'Tạm dừng'}
              aria-label={isPaused ? 'Tiếp tục' : 'Tạm dừng'}
            >
              {isPaused ? (
                <Play className="h-3 w-3 fill-current text-success" />
              ) : (
                <Pause className="h-3 w-3 fill-current" />
              )}
            </button>
          </div>

          {/* Navigator Button: Bài X / Y */}
          <button
            type="button"
            onClick={onOpenNavigator}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white font-mono text-xs font-extrabold shadow-accent hover:brightness-110 active:scale-95 transition-all"
            title="Mở danh sách bài tập"
          >
            <Layers className="h-3.5 w-3.5" strokeWidth={2.2} />
            <span>Bài {currentExerciseIndex + 1}/{totalExercises}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
