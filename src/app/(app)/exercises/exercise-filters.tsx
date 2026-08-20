'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Bookmark, Search, X } from 'lucide-react';

interface Props {
  savedCount?: number;
}

export default function ExerciseFilters({ savedCount = 0 }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

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
  const isSavedActive = params.get('saved') === 'true';

  return (
    <div className="card p-3.5 space-y-3 border border-white/80 dark:border-white/10 shadow-neumorph-sm">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Search input */}
        <form onSubmit={submitQ} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
          <input
            className="input pl-10 pr-10 text-sm font-medium w-full"
            placeholder="Tìm bài tập theo tên, nhóm cơ, dụng cụ..."
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
              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg text-ink-muted hover:text-accent hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
        </form>

        {/* Quick Filter: Saved Exercises */}
        <button
          type="button"
          onClick={() => update('saved', isSavedActive ? null : 'true')}
          className={`shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
            isSavedActive
              ? 'bg-accent text-white border-accent shadow-accent'
              : 'bg-black/[0.03] dark:bg-white/[0.05] text-ink hover:text-accent border-black/[0.08] dark:border-white/10 hover:border-accent/40 shadow-neumorph-sm'
          }`}
        >
          <Bookmark
            className={`h-3.5 w-3.5 ${isSavedActive ? 'fill-white' : 'text-accent'}`}
            strokeWidth={isSavedActive ? 2.5 : 2}
          />
          <span>Đã lưu</span>
          {savedCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] ${
                isSavedActive ? 'bg-white/20 text-white' : 'bg-accent/15 text-accent'
              }`}
            >
              {savedCount}
            </span>
          )}
          {isSavedActive && <X className="h-3.5 w-3.5 ml-0.5" strokeWidth={2.5} />}
        </button>
      </div>

      {/* Secondary filter chips */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-chassis-lo/50 dark:border-white/10 text-xs">
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
    </div>
  );
}
