'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, SlidersHorizontal, Check, Dumbbell } from 'lucide-react';
import type { EquipmentCategory } from '@/lib/equipment-categories';

type Props = {
  categories: EquipmentCategory[];
  counts: Map<string, number>;
  active: string | null;
};

/**
 * Mobile-First Quick Strip & Drawer for Equipment Filtering.
 * Renders on screens < 1024px (lg:hidden).
 */
export default function EquipmentMobileFilter({ categories, counts, active }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  function pick(id: string | null) {
    const next = new URLSearchParams(params);
    if (id) next.set('equipment', id);
    else next.delete('equipment');
    next.delete('page');
    router.push(`/exercises?${next.toString()}`, { scroll: false });
    setIsDrawerOpen(false);
  }

  // Sort by count desc, 'other' last
  const sorted = [...categories].sort((a, b) => {
    if (a.id === 'other') return 1;
    if (b.id === 'other') return -1;
    return (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0);
  });

  const activeCategory = categories.find((c) => c.id === active);

  return (
    <div className="lg:hidden space-y-2.5">
      {/* Top bar: Header & Drawer Trigger */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
          <h3 className="font-mono text-[11px] uppercase tracking-widest text-ink-muted font-bold">
            Lọc thiết bị ({categories.length})
          </h3>
          {activeCategory && (
            <span className="px-2 py-0.5 rounded-md bg-accent/15 border border-accent/30 text-accent font-mono text-[10px] font-bold">
              {activeCategory.label_vi}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 text-[11px] font-bold text-ink hover:text-accent shadow-neumorph-sm transition-all"
        >
          <SlidersHorizontal className="h-3 w-3 text-accent" />
          <span>Tất cả thiết bị</span>
        </button>
      </div>

      {/* Horizontal Scrollable Quick Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-0.5 px-0.5 no-scrollbar custom-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {/* 'All' button */}
        <button
          type="button"
          onClick={() => pick(null)}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
            !active
              ? 'bg-accent text-white border-accent shadow-accent'
              : 'bg-chassis text-ink border-black/[0.08] dark:border-white/10 hover:border-accent/40 shadow-neumorph-sm'
          }`}
        >
          <Dumbbell className="h-3.5 w-3.5" />
          <span>Tất cả</span>
        </button>

        {sorted.map((cat) => {
          const isActive = active === cat.id;
          const count = counts.get(cat.id) ?? 0;
          const isZero = count === 0;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => pick(isActive ? null : cat.id)}
              disabled={isZero && !isActive}
              aria-pressed={isActive}
              className={`shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-all border ${
                isActive
                  ? 'bg-gradient-to-br from-accent to-accent-dim text-white border-accent shadow-accent'
                  : isZero
                    ? 'opacity-40 cursor-not-allowed bg-black/[0.02] dark:bg-white/[0.02] text-ink-muted border-transparent'
                    : 'bg-chassis text-ink hover:text-accent border-black/[0.08] dark:border-white/10 hover:border-accent/40 shadow-neumorph-sm'
              }`}
            >
              <div className="relative h-5 w-5 shrink-0 flex items-center justify-center">
                <Image
                  src={cat.iconPath}
                  alt={cat.label_vi}
                  fill
                  className={`object-contain ${
                    isActive ? 'brightness-0 invert' : 'dark:invert dark:brightness-95'
                  }`}
                  sizes="20px"
                />
              </div>
              <span className="font-bold whitespace-nowrap">{cat.label_vi}</span>
              <span
                className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md ${
                  isActive
                    ? 'bg-white/20 text-white font-bold'
                    : 'bg-black/[0.04] dark:bg-white/10 text-ink-muted'
                }`}
              >
                {count}
              </span>
              {isActive && <X className="h-3 w-3 ml-0.5 text-white/90" strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>

      {/* Bottom Sheet Drawer Modal on Mobile */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-full max-w-lg bg-chassis border border-black/10 dark:border-white/10 rounded-t-3xl sm:rounded-3xl shadow-neumorph-lg p-5 max-h-[85vh] flex flex-col space-y-4 z-10 animate-in slide-in-from-bottom duration-300">
            {/* Grab handle on mobile */}
            <div className="w-12 h-1.5 rounded-full bg-ink/20 mx-auto -mt-2 mb-1 sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                <h3 className="text-base font-extrabold text-ink tracking-tight">
                  Chọn thiết bị tập luyện
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="h-8 w-8 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] text-ink-muted hover:text-ink flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Grid of all 13 categories */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto pr-1 custom-scrollbar py-1 flex-1">
              {/* All option */}
              <button
                type="button"
                onClick={() => pick(null)}
                className={`relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all border ${
                  !active
                    ? 'bg-gradient-to-br from-accent to-accent-dim text-white shadow-accent border-accent'
                    : 'bg-gradient-to-br from-chassis-hi to-chassis-lo text-ink hover:text-accent border-black/[0.08] dark:border-white/10 shadow-neumorph-sm'
                }`}
              >
                <div className="h-10 w-10 rounded-xl bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center">
                  <Dumbbell className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold">Tất cả thiết bị</p>
                  <p className="text-[10px] font-mono opacity-80 mt-0.5">Toàn bộ kho bài</p>
                </div>
                {!active && (
                  <Check className="absolute top-2 right-2 h-4 w-4 text-white" strokeWidth={3} />
                )}
              </button>

              {sorted.map((cat) => {
                const isActive = active === cat.id;
                const count = counts.get(cat.id) ?? 0;
                const isZero = count === 0;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => pick(isActive ? null : cat.id)}
                    disabled={isZero && !isActive}
                    aria-pressed={isActive}
                    className={`relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all border ${
                      isActive
                        ? 'bg-gradient-to-br from-accent to-accent-dim text-white shadow-accent border-accent'
                        : isZero
                          ? 'text-ink-muted opacity-40 cursor-not-allowed bg-chassis-lo/30 border-transparent'
                          : 'bg-gradient-to-br from-chassis-hi to-chassis-lo text-ink hover:text-accent border-black/[0.08] dark:border-white/10 shadow-neumorph-sm'
                    }`}
                  >
                    {isActive && (
                      <Check
                        className="absolute top-2 right-2 h-4 w-4 text-white"
                        strokeWidth={3}
                      />
                    )}
                    <div className="relative h-10 w-10 shrink-0 flex items-center justify-center">
                      <Image
                        src={cat.iconPath}
                        alt={cat.label_vi}
                        fill
                        className={`object-contain ${
                          isActive
                            ? 'brightness-0 invert scale-105'
                            : 'dark:invert dark:brightness-95'
                        }`}
                        sizes="40px"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold leading-tight line-clamp-1">{cat.label_vi}</p>
                      <p
                        className={`text-[10px] font-mono mt-0.5 ${
                          isActive ? 'text-white/90 font-bold' : 'text-ink-muted'
                        }`}
                      >
                        {count} bài tập
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom action bar */}
            <div className="pt-2 border-t border-black/[0.06] dark:border-white/10 flex items-center justify-between gap-3">
              {active ? (
                <button
                  type="button"
                  onClick={() => pick(null)}
                  className="btn-ghost text-xs px-4 py-2 text-accent font-bold"
                >
                  Xóa bộ lọc
                </button>
              ) : (
                <span className="text-[11px] font-mono text-ink-muted">
                  Đang hiển thị toàn bộ
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="btn-primary text-xs px-5 py-2"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
