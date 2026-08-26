'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronUp,
  Play,
  ListChecks,
  Lightbulb,
  TriangleAlert,
  ExternalLink,
} from 'lucide-react';

type TechniqueAccordionProps = {
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
  returnTo?: string;
};

export default function TechniqueAccordion({
  exercise,
  returnTo,
}: TechniqueAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const mediaSrc = exercise.animation_url || exercise.thumbnail_url;

  return (
    <div className="rounded-2xl border border-black/[0.06] dark:border-white/10 bg-chassis overflow-hidden shadow-neumorph-sm">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left font-bold text-xs sm:text-sm text-ink hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Play className="h-3 w-3 fill-current" />
          </span>
          <span>Kỹ thuật & Minh họa động tác</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
          <span>{isOpen ? 'Thu gọn' : 'Xem chi tiết'}</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 pt-0 space-y-4 border-t border-black/[0.04] dark:border-white/[0.06] animate-in fade-in duration-200">
          {/* Animated GIF / Thumbnail */}
          {mediaSrc && (
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 mt-3">
              <Image
                src={mediaSrc}
                alt={exercise.name_vi ?? exercise.name}
                fill
                unoptimized
                className="object-contain"
              />
            </div>
          )}

          {/* Execution steps */}
          {exercise.instructions_list.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                <ListChecks className="h-3.5 w-3.5 text-accent" />
                <span>Cách thực hiện</span>
              </div>
              <ol className="space-y-1.5 pl-4 list-decimal text-xs text-ink-secondary leading-relaxed font-medium">
                {exercise.instructions_list.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Tips */}
          {exercise.tips_list.length > 0 && (
            <div className="space-y-1.5 p-3 rounded-xl bg-accent/[0.03] border border-accent/15">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
                <Lightbulb className="h-3.5 w-3.5" />
                <span>Mẹo kỹ thuật</span>
              </div>
              <ul className="space-y-1 text-xs text-ink-secondary leading-relaxed">
                {exercise.tips_list.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-accent mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Mistakes */}
          {exercise.common_mistakes_list.length > 0 && (
            <div className="space-y-1.5 p-3 rounded-xl bg-warn/[0.03] border border-warn/15">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-warn">
                <TriangleAlert className="h-3.5 w-3.5" />
                <span>Lỗi thường gặp cần tránh</span>
              </div>
              <ul className="space-y-1 text-xs text-ink-secondary leading-relaxed">
                {exercise.common_mistakes_list.map((mistake, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-warn mt-0.5">•</span>
                    <span>{mistake}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Link to Exercise Page */}
          <div className="pt-1">
            <Link
              href={`/exercises/${exercise.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-bold"
            >
              <span>Xem trang bài tập gốc trong thư viện</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
