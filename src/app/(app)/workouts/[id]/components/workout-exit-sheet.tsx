'use client';

import React from 'react';
import { Play, Home, CheckCircle2, X } from 'lucide-react';

type WorkoutExitSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  onMinimizeToDashboard: () => void;
  onFinishEarly: () => void;
  completedSets: number;
  totalSets: number;
  elapsedTime: string;
};

export default function WorkoutExitSheet({
  isOpen,
  onClose,
  onContinue,
  onMinimizeToDashboard,
  onFinishEarly,
  completedSets,
  totalSets,
  elapsedTime,
}: WorkoutExitSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-chassis-hi dark:bg-[#0f141d] border border-black/10 dark:border-white/15 shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom duration-250"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-ink tracking-tight">
            Buổi tập vẫn đang diễn ra
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] font-mono text-xs space-y-1">
          <div className="flex items-center justify-between text-ink-muted">
            <span>Thời gian đã tập:</span>
            <span suppressHydrationWarning className="font-extrabold text-ink">
              {elapsedTime}
            </span>
          </div>
          <div className="flex items-center justify-between text-ink-muted">
            <span>Tiến độ bài tập:</span>
            <span className="font-extrabold text-accent">
              {completedSets}/{totalSets} sets ({totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          {/* Option 1: Continue Workout (Primary) */}
          <button
            type="button"
            onClick={onContinue}
            className="w-full py-3.5 px-4 rounded-xl bg-accent hover:brightness-110 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-accent transition-all cursor-pointer"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Tiếp tục tập luyện</span>
          </button>

          {/* Option 2: Minimize to Dashboard (Keep workout active) */}
          <button
            type="button"
            onClick={onMinimizeToDashboard}
            className="w-full py-3 px-4 rounded-xl bg-chassis border border-black/10 dark:border-white/15 hover:border-accent/40 text-ink font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Home className="h-4 w-4 text-ink-muted" />
            <span>Thu nhỏ về Trang chủ (Vẫn lưu tiến độ)</span>
          </button>

          {/* Option 3: Finish Early */}
          <button
            type="button"
            onClick={onFinishEarly}
            className="w-full py-2.5 px-4 rounded-xl text-ink-muted hover:text-danger text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Kết thúc buổi tập</span>
          </button>
        </div>
      </div>
    </div>
  );
}
