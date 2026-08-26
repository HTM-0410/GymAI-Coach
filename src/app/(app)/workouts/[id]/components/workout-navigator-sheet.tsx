'use client';

import React from 'react';
import { X, Check, ArrowRight, Circle, Dumbbell, Sparkles } from 'lucide-react';
import type { TrackingMode } from '@/lib/workouts/metrics';

export type NavigatorExercise = {
  id: string;
  orderIndex: number;
  name: string;
  phase: 'warmup' | 'main' | 'cooldown';
  mode: TrackingMode;
  completedSets: number;
  targetSets: number;
  isCompleted: boolean;
  isCurrent: boolean;
};

type WorkoutNavigatorSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  exercises: NavigatorExercise[];
  onSelectExercise: (index: number) => void;
  onCompleteWorkout: () => void;
};

const phaseLabels: Record<string, string> = {
  warmup: 'Khởi động',
  main: 'Bài chính',
  cooldown: 'Hạ nhiệt',
};

export default function WorkoutNavigatorSheet({
  isOpen,
  onClose,
  exercises,
  onSelectExercise,
  onCompleteWorkout,
}: WorkoutNavigatorSheetProps) {
  if (!isOpen) return null;

  const totalExercises = exercises.length;
  const completedExercises = exercises.filter((e) => e.isCompleted).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-chassis-hi dark:bg-[#0f141d] border border-black/10 dark:border-white/15 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div>
            <h3 className="text-base font-extrabold text-ink tracking-tight flex items-center gap-2">
              <span>Danh sách bài tập</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent font-bold">
                {completedExercises}/{totalExercises} bài xong
              </span>
            </h3>
            <p className="text-xs text-ink-secondary mt-0.5">
              Chạm vào bất kỳ bài nào để chuyển trực tiếp
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Exercise List */}
        <div className="p-4 space-y-2 overflow-y-auto flex-1 overscroll-contain">
          {exercises.map((ex, index) => {
            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => {
                  onSelectExercise(index);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                  ex.isCurrent
                    ? 'border-accent bg-accent/[0.08] dark:bg-accent/[0.06] shadow-sm'
                    : ex.isCompleted
                      ? 'border-emerald-500/30 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.02]'
                      : 'border-black/[0.05] dark:border-white/[0.07] bg-chassis hover:border-black/15 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Status Icon */}
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 font-mono text-xs font-extrabold ${
                      ex.isCurrent
                        ? 'bg-accent text-white shadow-accent'
                        : ex.isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-black/[0.04] dark:bg-white/[0.08] text-ink-muted'
                    }`}
                  >
                    {ex.isCompleted ? (
                      <Check className="h-4 w-4 stroke-[3]" />
                    ) : ex.isCurrent ? (
                      <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                    ) : (
                      <span>#{index + 1}</span>
                    )}
                  </div>

                  {/* Exercise Title + Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-sm font-extrabold truncate ${
                          ex.isCurrent
                            ? 'text-accent'
                            : ex.isCompleted
                              ? 'text-ink'
                              : 'text-ink-secondary'
                        }`}
                      >
                        {ex.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-ink-muted">
                      <span>{phaseLabels[ex.phase] ?? 'Bài chính'}</span>
                      <span>·</span>
                      <span className={ex.isCompleted ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}>
                        {ex.mode === 'reps' || ex.mode === 'weight_reps'
                          ? `${ex.completedSets}/${ex.targetSets} sets`
                          : ex.isCompleted
                            ? 'Đã hoàn thành'
                            : 'Chưa thực hiện'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right indicator */}
                <div className="shrink-0 pl-2">
                  {ex.isCurrent ? (
                    <span className="text-[10px] font-mono font-extrabold text-accent bg-accent/15 px-2 py-0.5 rounded-md">
                      ĐANG TẬP
                    </span>
                  ) : ex.isCompleted ? (
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Xong
                    </span>
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-ink-muted/40" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-black/[0.06] dark:border-white/[0.08] bg-chassis flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-black/10 dark:border-white/15 text-xs font-bold text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onCompleteWorkout();
            }}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-colors shadow-xs"
          >
            Kết thúc buổi tập
          </button>
        </div>
      </div>
    </div>
  );
}
