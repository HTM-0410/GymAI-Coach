'use client';

import React, { useState, useTransition } from 'react';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { toggleSaveExerciseAction } from '@/lib/saved-exercises';

interface Props {
  exerciseSlug: string;
  initialSaved?: boolean;
  variant?: 'card' | 'button' | 'icon';
  className?: string;
  onToggle?: (saved: boolean) => void;
}

export default function SaveExerciseButton({
  exerciseSlug,
  initialSaved = false,
  variant = 'card',
  className = '',
  onToggle,
}: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic toggle
    const nextSaved = !saved;
    setSaved(nextSaved);
    onToggle?.(nextSaved);

    startTransition(async () => {
      const res = await toggleSaveExerciseAction(exerciseSlug);
      if (!res.success) {
        // Rollback if failed
        setSaved(!nextSaved);
        onToggle?.(!nextSaved);
      } else {
        setSaved(res.saved);
      }
    });
  };

  if (variant === 'card') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        title={saved ? 'Bỏ lưu bài tập' : 'Lưu bài tập'}
        aria-label={saved ? 'Bỏ lưu bài tập' : 'Lưu bài tập'}
        className={`absolute top-2 right-2 z-20 flex items-center justify-center p-1.5 rounded-lg backdrop-blur-md transition-all duration-200 ${
          saved
            ? 'bg-accent text-white shadow-[0_0_12px_rgba(249,115,22,0.6)] border border-accent hover:scale-110'
            : 'bg-black/40 dark:bg-black/60 text-white/80 hover:text-white hover:bg-black/70 border border-white/20 hover:scale-110'
        } ${className}`}
      >
        <Bookmark
          className={`h-4 w-4 transition-transform duration-200 ${
            saved ? 'fill-current scale-105' : 'hover:scale-105'
          }`}
          strokeWidth={saved ? 2.5 : 2}
        />
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`btn-ghost text-xs py-2 px-3.5 rounded-xl font-bold flex items-center gap-2 border transition-all duration-200 ${
          saved
            ? 'bg-accent/15 border-accent text-accent shadow-[0_0_12px_rgba(249,115,22,0.2)] hover:bg-accent/20'
            : 'border-black/10 dark:border-white/10 hover:border-accent/40 text-ink hover:text-accent'
        } ${className}`}
      >
        <Bookmark
          className={`h-4 w-4 transition-transform ${saved ? 'fill-current text-accent' : ''}`}
          strokeWidth={saved ? 2.5 : 2}
        />
        <span>{saved ? 'Đã lưu vào danh sách' : 'Lưu bài tập'}</span>
      </button>
    );
  }

  // Variant: icon
  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      title={saved ? 'Bỏ lưu bài tập' : 'Lưu bài tập'}
      aria-label={saved ? 'Bỏ lưu bài tập' : 'Lưu bài tập'}
      className={`p-2 rounded-xl transition-colors ${
        saved
          ? 'text-accent bg-accent/10 border border-accent/30'
          : 'text-ink-muted hover:text-accent hover:bg-black/5 dark:hover:bg-white/10'
      } ${className}`}
    >
      <Bookmark className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} strokeWidth={2} />
    </button>
  );
}
