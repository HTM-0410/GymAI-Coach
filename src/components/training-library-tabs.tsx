'use client';

import Link from 'next/link';
import { Dumbbell, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TrainingLibraryTab = 'exercises' | 'programs';

interface TrainingLibraryTabsProps {
  activeTab: TrainingLibraryTab;
  className?: string;
}

export function TrainingLibraryTabs({
  activeTab,
  className,
}: TrainingLibraryTabsProps) {
  const isExercises = activeTab === 'exercises';
  const isPrograms = activeTab === 'programs';

  return (
    <div
      className={cn(
        'sm:hidden w-full p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-xl border border-black/[0.06] dark:border-white/[0.08] grid grid-cols-2 gap-1',
        className,
      )}
      role="tablist"
      aria-label="Thư viện tập luyện"
    >
      <Link
        href="/exercises"
        role="tab"
        aria-selected={isExercises}
        className={cn(
          'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all select-none',
          isExercises
            ? 'bg-accent text-white shadow-xs'
            : 'text-ink-secondary hover:text-ink hover:bg-black/[0.02] dark:hover:bg-white/[0.02]',
        )}
      >
        <Dumbbell className="h-3.5 w-3.5" strokeWidth={2} />
        <span>Kho bài tập</span>
      </Link>
      <Link
        href="/programs"
        role="tab"
        aria-selected={isPrograms}
        className={cn(
          'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all select-none',
          isPrograms
            ? 'bg-accent text-white shadow-xs'
            : 'text-ink-secondary hover:text-ink hover:bg-black/[0.02] dark:hover:bg-white/[0.02]',
        )}
      >
        <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} />
        <span>Giáo trình</span>
      </Link>
    </div>
  );
}

export default TrainingLibraryTabs;
