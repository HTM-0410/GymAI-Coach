'use client';

import React from 'react';
import { AlertTriangle, Play, CheckCircle2, X } from 'lucide-react';

type WorkoutIncompleteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  onConfirmFinish: () => void;
  incompleteExercisesCount: number;
  incompleteSetsCount: number;
};

export default function WorkoutIncompleteModal({
  isOpen,
  onClose,
  onContinue,
  onConfirmFinish,
  incompleteExercisesCount,
  incompleteSetsCount,
}: WorkoutIncompleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm rounded-2xl bg-chassis-hi dark:bg-[#0f141d] border border-black/10 dark:border-white/15 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-warn/15 text-warn flex items-center justify-center shrink-0 border border-warn/25">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-ink tracking-tight">
              Chưa hoàn thành toàn bộ
            </h3>
            <p className="text-xs text-ink-muted mt-0.5 font-mono">
              Còn {incompleteExercisesCount} bài và {incompleteSetsCount} sets
            </p>
          </div>
        </div>

        <p className="text-xs text-ink-secondary leading-relaxed">
          Bạn vẫn còn một số bài tập và hiệp tập trong kế hoạch chưa hoàn tất. Bạn có muốn tiếp tục tập cho đủ không?
        </p>

        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={onContinue}
            className="w-full py-3 px-4 rounded-xl bg-accent hover:brightness-110 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-accent transition-all cursor-pointer"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Tiếp tục tập cho xong</span>
          </button>

          <button
            type="button"
            onClick={onConfirmFinish}
            className="w-full py-2.5 px-4 rounded-xl bg-chassis border border-black/10 dark:border-white/15 hover:border-danger/40 text-ink-muted hover:text-danger font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Kết thúc buổi tập ngay bây giờ</span>
          </button>
        </div>
      </div>
    </div>
  );
}
