'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, ListChecks, Lightbulb, TriangleAlert, ExternalLink, Play } from 'lucide-react';

type ExerciseTechniqueSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  exercise: {
    slug: string;
    name: string;
    name_vi: string | null;
    animation_url: string | null;
    thumbnail_url: string | null;
    instructions_list: string[];
    tips_list: string[];
    common_mistakes_list: string[];
  };
};

export default function ExerciseTechniqueSheet({
  isOpen,
  onClose,
  exercise,
}: ExerciseTechniqueSheetProps) {
  if (!isOpen) return null;

  const mediaSrc = exercise.animation_url || exercise.thumbnail_url;
  const displayName = exercise.name_vi ?? exercise.name;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg max-h-[85vh] rounded-t-3xl bg-chassis-hi dark:bg-[#0e131d] border-t border-black/10 dark:border-white/15 shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-250 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle & Header */}
        <div className="p-4 pb-3 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0">
          <div className="w-12 h-1 rounded-full bg-black/20 dark:bg-white/20 mx-auto mb-3" />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
                KỸ THUẬT & CHI TIẾT
              </span>
              <h3 className="font-extrabold text-base sm:text-lg text-ink truncate">
                {displayName}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Media Player */}
          {mediaSrc && (
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-white border border-black/10 dark:border-white/15 flex items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaSrc}
                alt={displayName}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Execution steps */}
          {exercise.instructions_list.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-ink">
                <ListChecks className="h-4 w-4 text-accent" />
                <span>Cách thực hiện</span>
              </div>
              <ol className="space-y-2 pl-4 list-decimal text-xs sm:text-sm text-ink-secondary leading-relaxed font-medium">
                {exercise.instructions_list.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Tips */}
          {exercise.tips_list.length > 0 && (
            <div className="space-y-2 p-3.5 rounded-2xl bg-accent/[0.04] border border-accent/20">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-accent">
                <Lightbulb className="h-4 w-4" />
                <span>Mẹo kỹ thuật</span>
              </div>
              <ul className="space-y-1.5 text-xs sm:text-sm text-ink-secondary leading-relaxed">
                {exercise.tips_list.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-accent mt-0.5 font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Mistakes */}
          {exercise.common_mistakes_list.length > 0 && (
            <div className="space-y-2 p-3.5 rounded-2xl bg-warn/[0.04] border border-warn/20">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-warn">
                <TriangleAlert className="h-4 w-4" />
                <span>Lỗi thường gặp cần tránh</span>
              </div>
              <ul className="space-y-1.5 text-xs sm:text-sm text-ink-secondary leading-relaxed">
                {exercise.common_mistakes_list.map((mistake, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-warn mt-0.5 font-bold">•</span>
                    <span>{mistake}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Link to Exercise Page */}
          <div className="pt-2 pb-4">
            <Link
              href={`/exercises/${exercise.slug}`}
              target="_blank"
              className="w-full py-3 px-4 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-accent/15 hover:text-accent border border-black/5 dark:border-white/10 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all"
            >
              <span>Xem trang bài tập đầy đủ trong thư viện</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
