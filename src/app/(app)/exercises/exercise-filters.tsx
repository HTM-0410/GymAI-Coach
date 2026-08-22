'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Bookmark, Search, X, SlidersHorizontal, Check, Dumbbell, Sparkles } from 'lucide-react';
import type { EquipmentCategory } from '@/lib/equipment-categories';
import { DIFFICULTY_VI, EXERCISE_TYPE_VI } from '@/lib/exercises-i18n';

interface Props {
  savedCount?: number;
  equipmentCategories?: EquipmentCategory[];
  equipmentCounts?: Map<string, number>;
}

export default function ExerciseFilters({
  savedCount = 0,
  equipmentCategories = [],
  equipmentCounts = new Map(),
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  function update(key: string, val: string | null) {
    const next = new URLSearchParams(params);
    if (val) next.set(key, val);
    else next.delete(key);
    next.delete('page');
    router.push(`/exercises?${next.toString()}`, { scroll: false });
  }

  function submitQ(e: React.FormEvent) {
    e.preventDefault();
    update('q', q || null);
  }

  const activeDifficulty = params.get('difficulty');
  const activeType = params.get('exercise_type');
  const activeEquipment = params.get('equipment');
  const isSavedActive = params.get('saved') === 'true';

  // Count active secondary filters
  const activeFilterCount = [
    activeDifficulty,
    activeType,
    activeEquipment,
  ].filter(Boolean).length;

  const activeEquipmentCat = equipmentCategories.find((c) => c.id === activeEquipment);

  function clearAllSecondaryFilters() {
    const next = new URLSearchParams(params);
    next.delete('difficulty');
    next.delete('exercise_type');
    next.delete('equipment');
    next.delete('page');
    router.push(`/exercises?${next.toString()}`, { scroll: false });
    setIsFilterDrawerOpen(false);
  }

  return (
    <div className="card p-2.5 sm:p-3.5 space-y-2.5 sm:space-y-3 border border-white/80 dark:border-white/10 shadow-neumorph-sm">
      {/* Search Bar + Quick Actions */}
      <div className="flex items-center gap-2">
        {/* Search input */}
        <form onSubmit={submitQ} className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
          <input
            className="input pl-9 pr-8 text-xs sm:text-sm font-medium w-full h-9 sm:h-10"
            placeholder="Tìm bài tập, dụng cụ..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              type="button"
              aria-label="Xóa tìm kiếm"
              onClick={() => {
                setQ('');
                update('q', null);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-md text-ink-muted hover:text-accent flex items-center justify-center transition-colors"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
        </form>

        {/* Quick Filter: Saved Exercises */}
        <button
          type="button"
          onClick={() => update('saved', isSavedActive ? null : 'true')}
          aria-label="Bài tập đã lưu"
          className={`shrink-0 h-9 sm:h-10 flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 rounded-xl text-xs font-bold transition-all border ${
            isSavedActive
              ? 'bg-accent text-white border-accent shadow-accent'
              : 'bg-black/[0.03] dark:bg-white/[0.05] text-ink hover:text-accent border-black/[0.08] dark:border-white/10 shadow-neumorph-sm'
          }`}
        >
          <Bookmark
            className={`h-3.5 w-3.5 ${isSavedActive ? 'fill-white' : 'text-accent'}`}
            strokeWidth={isSavedActive ? 2.5 : 2}
          />
          <span className="hidden sm:inline">Đã lưu</span>
          {savedCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] ${
                isSavedActive ? 'bg-white/20 text-white' : 'bg-accent/15 text-accent'
              }`}
            >
              {savedCount}
            </span>
          )}
        </button>

        {/* Mobile Filter Button (lg:hidden) */}
        <button
          type="button"
          onClick={() => setIsFilterDrawerOpen(true)}
          className={`shrink-0 h-9 flex lg:hidden items-center justify-center gap-1.5 px-2.5 rounded-xl text-xs font-bold transition-all border ${
            activeFilterCount > 0
              ? 'bg-accent text-white border-accent shadow-accent'
              : 'bg-black/[0.03] dark:bg-white/[0.05] text-ink hover:text-accent border-black/[0.08] dark:border-white/10 shadow-neumorph-sm'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Lọc</span>
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full font-mono text-[10px] bg-white text-accent font-black">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Active Filter Tags (Shown when filters are active on mobile) */}
      {activeFilterCount > 0 && (
        <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar custom-scrollbar text-[11px]">
          <span className="text-ink-muted text-[10px] font-mono shrink-0">Đang lọc:</span>
          {activeEquipmentCat && (
            <button
              type="button"
              onClick={() => update('equipment', null)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-accent/15 border border-accent/30 text-accent font-bold shrink-0"
            >
              <span>{activeEquipmentCat.label_vi}</span>
              <X className="h-3 w-3" />
            </button>
          )}
          {activeDifficulty && (
            <button
              type="button"
              onClick={() => update('difficulty', null)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-accent/15 border border-accent/30 text-accent font-bold shrink-0"
            >
              <span>{DIFFICULTY_VI[activeDifficulty as keyof typeof DIFFICULTY_VI] ?? activeDifficulty}</span>
              <X className="h-3 w-3" />
            </button>
          )}
          {activeType && (
            <button
              type="button"
              onClick={() => update('exercise_type', null)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-accent/15 border border-accent/30 text-accent font-bold shrink-0"
            >
              <span>{EXERCISE_TYPE_VI[activeType as keyof typeof EXERCISE_TYPE_VI] ?? activeType}</span>
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onClick={clearAllSecondaryFilters}
            className="text-[10px] font-mono text-accent hover:underline font-bold shrink-0 ml-1"
          >
            Xóa hết
          </button>
        </div>
      )}

      {/* Secondary filter chips (Desktop only: hidden sm:flex) */}
      <div className="hidden sm:flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-chassis-lo/50 dark:border-white/10 text-xs">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted shrink-0 font-bold">
            Độ khó:
          </span>
          {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => update('difficulty', activeDifficulty === d ? null : d)}
              className={`chip text-xs py-1 px-2.5 ${activeDifficulty === d ? 'active' : ''}`}
            >
              {d === 'beginner' ? 'Sơ cấp' : d === 'intermediate' ? 'Trung cấp' : 'Nâng cao'}
              {activeDifficulty === d && <X className="h-3 w-3 ml-0.5" strokeWidth={2.5} />}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted shrink-0 font-bold">
            Loại:
          </span>
          {(['compound', 'isolation'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => update('exercise_type', activeType === t ? null : t)}
              className={`chip text-xs py-1 px-2.5 ${activeType === t ? 'active' : ''}`}
            >
              {t === 'compound' ? 'Đa khớp' : 'Đơn khớp'}
              {activeType === t && <X className="h-3 w-3 ml-0.5" strokeWidth={2.5} />}
            </button>
          ))}
        </div>
      </div>

      {/* Unified Mobile Filter Bottom Sheet Modal (lg:hidden) */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 lg:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsFilterDrawerOpen(false)}
          />

          <div className="relative w-full max-w-lg bg-chassis border-t border-black/10 dark:border-white/10 rounded-t-3xl shadow-neumorph-lg p-5 max-h-[85vh] flex flex-col space-y-4 z-10 animate-in slide-in-from-bottom duration-300">
            {/* Grab handle */}
            <div className="w-12 h-1.5 rounded-full bg-ink/20 mx-auto -mt-2 mb-1" />

            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/10">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-accent" />
                <h3 className="text-base font-extrabold text-ink">Bộ lọc bài tập</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="h-8 w-8 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] text-ink-muted hover:text-ink flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 custom-scrollbar flex-1 py-1">
              {/* 1. Thiết bị */}
              {equipmentCategories.length > 0 && (
                <div className="space-y-2">
                  <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted flex items-center gap-1.5">
                    <Dumbbell className="h-3.5 w-3.5 text-accent" />
                    <span>Thiết bị ({equipmentCategories.length})</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => update('equipment', null)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        !activeEquipment
                          ? 'bg-accent text-white border-accent shadow-accent'
                          : 'bg-chassis text-ink border-black/[0.08] dark:border-white/10 shadow-neumorph-sm'
                      }`}
                    >
                      <div className="h-6 w-6 rounded-lg bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center shrink-0">
                        <Dumbbell className="h-3.5 w-3.5" />
                      </div>
                      <span className="truncate">Tất cả</span>
                      {!activeEquipment && <Check className="h-3.5 w-3.5 ml-auto shrink-0" />}
                    </button>

                    {equipmentCategories.map((cat) => {
                      const isActive = activeEquipment === cat.id;
                      const count = equipmentCounts.get(cat.id) ?? 0;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => update('equipment', isActive ? null : cat.id)}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-gradient-to-br from-accent to-accent-dim text-white border-accent shadow-accent'
                              : 'bg-chassis text-ink border-black/[0.08] dark:border-white/10 shadow-neumorph-sm'
                          }`}
                        >
                          <div className="relative h-6 w-6 shrink-0 flex items-center justify-center">
                            <Image
                              src={cat.iconPath}
                              alt={cat.label_vi}
                              fill
                              className={`object-contain ${
                                isActive ? 'brightness-0 invert' : 'dark:invert dark:brightness-95'
                              }`}
                              sizes="24px"
                            />
                          </div>
                          <span className="truncate flex-1 text-left">{cat.label_vi}</span>
                          <span className={`text-[9px] font-mono px-1 rounded ${isActive ? 'bg-white/20' : 'bg-black/[0.04] dark:bg-white/10 text-ink-muted'}`}>
                            {count}
                          </span>
                          {isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Độ khó */}
              <div className="space-y-2">
                <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                  Độ khó
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((d) => {
                    const isActive = activeDifficulty === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => update('difficulty', isActive ? null : d)}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                          isActive
                            ? 'bg-accent text-white border-accent shadow-accent'
                            : 'bg-chassis text-ink border-black/[0.08] dark:border-white/10 shadow-neumorph-sm'
                        }`}
                      >
                        {d === 'beginner' ? 'Sơ cấp' : d === 'intermediate' ? 'Trung cấp' : 'Nâng cao'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Loại động tác */}
              <div className="space-y-2">
                <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                  Loại động tác
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['compound', 'isolation'] as const).map((t) => {
                    const isActive = activeType === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => update('exercise_type', isActive ? null : t)}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                          isActive
                            ? 'bg-accent text-white border-accent shadow-accent'
                            : 'bg-chassis text-ink border-black/[0.08] dark:border-white/10 shadow-neumorph-sm'
                        }`}
                      >
                        {t === 'compound' ? 'Đa khớp (Compound)' : 'Đơn khớp (Isolation)'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-black/[0.06] dark:border-white/10 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={clearAllSecondaryFilters}
                className="btn-ghost text-xs px-3 py-2 text-accent font-bold"
              >
                Xóa tất cả bộ lọc
              </button>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="btn-primary text-xs px-6 py-2.5"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
