'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { MuscleCategory, MuscleCategoryId } from '@/lib/muscle-categories';

type Props = {
  categories: Array<{ category: MuscleCategory; count: number }>;
};

export default function BodyMapStrip({ categories }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get('muscle_cat');

  function select(id: MuscleCategoryId) {
    const next = new URLSearchParams(params);
    if (active === id) next.delete('muscle_cat');
    else next.set('muscle_cat', id);
    next.delete('page');
    router.push(`/exercises?${next.toString()}`, { scroll: false });
  }

  return (
    <section className="space-y-2">
      <div className="hidden sm:flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">
            Nhóm cơ mục tiêu
          </span>
        </div>
        {active && (
          <Link
            href="/exercises"
            scroll={false}
            className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-accent hover:underline font-bold"
          >
            ✕ Bỏ lọc
          </Link>
        )}
      </div>

      {/* MOBILE: Ultra-Compact Chip Strip (sm:hidden) */}
      <div className="flex sm:hidden items-center gap-2 overflow-x-auto py-1 w-full no-scrollbar custom-scrollbar">
        <button
          type="button"
          onClick={() => {
            const next = new URLSearchParams(params);
            next.delete('muscle_cat');
            next.delete('page');
            router.push(`/exercises?${next.toString()}`, { scroll: false });
          }}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
            !active
              ? 'bg-accent text-white border-accent shadow-accent'
              : 'bg-chassis text-ink border-black/[0.08] dark:border-white/10 shadow-neumorph-sm'
          }`}
        >
          <span>Tất cả cơ</span>
        </button>

        {categories.map(({ category, count }) => {
          const isActive = active === category.id;
          const isZero = count === 0;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => select(category.id)}
              disabled={isZero && !isActive}
              aria-pressed={isActive}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                isActive
                  ? 'bg-gradient-to-br from-accent to-accent-dim text-white border-accent shadow-accent'
                  : isZero
                    ? 'opacity-40 cursor-not-allowed bg-black/[0.02] dark:bg-white/[0.02] text-ink-muted border-transparent'
                    : 'bg-chassis text-ink border-black/[0.08] dark:border-white/10 hover:border-accent/40 shadow-neumorph-sm'
              }`}
            >
              <div className="relative h-4 w-4 shrink-0 flex items-center justify-center">
                <Image
                  src={category.imagePath}
                  alt={category.name_vi}
                  fill
                  className={`object-contain ${
                    isActive ? 'brightness-0 invert' : 'dark:brightness-110 dark:contrast-125'
                  }`}
                  sizes="16px"
                />
              </div>
              <span>{category.name_vi}</span>
              <span
                className={`font-mono text-[10px] px-1 py-0.2 rounded-md ${
                  isActive ? 'bg-white/20 text-white' : 'bg-black/[0.04] dark:bg-white/10 text-ink-muted'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* DESKTOP: Rich Cards with LED Intensity (hidden sm:block) */}
      <div className="hidden sm:block card p-2.5 overflow-x-auto border border-white/80 dark:border-white/10">
        <div className="flex gap-2.5 min-w-min py-0.5">
          {categories.map(({ category, count }) => {
            const isActive = active === category.id;
            const isZero = count === 0;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => select(category.id)}
                disabled={isZero && !isActive}
                aria-pressed={isActive}
                className={`shrink-0 w-20 flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-br from-accent to-accent-dim text-white shadow-accent border-t border-white/40'
                    : isZero
                      ? 'text-ink-muted opacity-40 cursor-not-allowed bg-chassis-lo/30'
                      : 'bg-gradient-to-br from-chassis-hi to-chassis-lo text-ink hover:text-accent border border-white/80 dark:border-white/10 shadow-neumorph-sm hover:shadow-neumorph hover:-translate-y-0.5'
                }`}
              >
                <div className="relative h-10 w-8 shrink-0 flex items-center justify-center">
                  <Image
                    src={category.imagePath}
                    alt={category.name_vi}
                    fill
                    className={`object-contain transition-transform duration-200 ${
                      isActive ? 'brightness-0 invert scale-105' : 'dark:brightness-110 dark:contrast-125 dark:drop-shadow-[0_0_6px_rgba(255,255,255,0.25)] group-hover:scale-105'
                    }`}
                    sizes="32px"
                  />
                </div>
                <span className="text-[11px] font-bold leading-tight tracking-tight">
                  {category.name_vi}
                </span>
                <span
                  className={`text-[9px] font-mono leading-none ${
                    isActive ? 'text-white/90 font-bold' : 'text-ink-muted font-medium'
                  }`}
                >
                  {count} bài
                </span>
                {/* Intensity LED bar */}
                <div className="flex items-center gap-1 mt-0.5" aria-hidden>
                  {[1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`h-1 w-2 rounded-full transition-all ${
                        i <= category.intensity
                          ? isActive
                            ? 'bg-white shadow-[0_0_4px_white]'
                            : 'bg-accent shadow-[0_0_4px_rgba(249,115,22,0.6)]'
                          : isActive
                            ? 'bg-white/20'
                            : 'bg-chassis-lo'
                      }`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}