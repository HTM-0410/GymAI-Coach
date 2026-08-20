'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import type { EquipmentCategory } from '@/lib/equipment-categories';

type Props = {
  categories: EquipmentCategory[];
  /** Map category id → số bài tập khớp (đã loại bỏ filter equipment hiện tại). */
  counts: Map<string, number>;
  /** Category id đang được chọn (nếu có). */
  active: string | null;
};

/**
 * Sidebar lọc theo thiết bị, taxonomy 13 loại của ExerciseLibrary.app.
 * Mỗi item: ảnh PNG + label EN + count.
 *
 * Click vào 1 category sẽ set query `equipment` = category id.
 * Server-side mapping: page.tsx dùng classifyEquipments() để match equipment_vi.
 */
export default function EquipmentSidebar({ categories, counts, active }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  function pick(id: string | null) {
    const next = new URLSearchParams(params);
    if (id) next.set('equipment', id);
    else next.delete('equipment');
    next.delete('page');
    router.push(`/exercises?${next.toString()}`, { scroll: false });
  }

  // Sort: count desc (nhiều bài nhất lên đầu), "other" luôn cuối.
  const sorted = [...categories].sort((a, b) => {
    if (a.id === 'other') return 1;
    if (b.id === 'other') return -1;
    return (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0);
  });

  return (
    <aside className="card p-4 lg:sticky lg:top-6 lg:self-start flex flex-col space-y-3 lg:max-h-[calc(100vh-3rem)] border border-white/80 dark:border-white/10 shadow-neumorph">
      <header className="flex items-center justify-between gap-2 shrink-0 pb-1 border-b border-chassis-lo/50">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">
            Thiết bị · {categories.length}
          </h2>
        </div>
        {active && (
          <button
            onClick={() => pick(null)}
            className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-accent hover:underline font-bold"
            type="button"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
            Bỏ lọc
          </button>
        )}
      </header>

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-2 gap-2 overflow-y-auto pr-1 overscroll-contain flex-1 py-1">
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
              title={`${cat.label_vi} (${count} bài)`}
              className={`relative flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-br from-accent to-accent-dim text-white shadow-accent border-t border-white/40'
                  : isZero
                    ? 'text-ink-muted opacity-40 cursor-not-allowed bg-chassis-lo/30'
                    : 'bg-gradient-to-br from-chassis-hi to-chassis-lo text-ink hover:text-accent border border-white/80 dark:border-white/10 shadow-neumorph-sm hover:shadow-neumorph hover:-translate-y-0.5'
              }`}
            >
              {isActive && (
                <X
                  className="absolute top-1.5 right-1.5 h-3 w-3 text-white/90"
                  strokeWidth={2.5}
                />
              )}
              <div className="relative h-9 w-9 shrink-0 flex items-center justify-center">
                <Image
                  src={cat.iconPath}
                  alt={cat.label_vi}
                  fill
                  className={`object-contain transition-transform duration-200 ${
                    isActive ? 'brightness-0 invert scale-105' : 'dark:invert dark:brightness-95 group-hover:scale-105'
                  }`}
                  sizes="36px"
                />
              </div>
              <span className="text-[10px] font-bold leading-tight text-center line-clamp-1">
                {cat.label_vi}
              </span>
              <span
                className={`text-[9px] font-mono leading-none ${
                  isActive ? 'text-white/90 font-bold' : 'text-ink-muted font-medium'
                }`}
              >
                {count} bài
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[9px] font-mono uppercase tracking-widest text-ink-muted/70 text-center pt-1.5 shrink-0 border-t border-chassis-lo/50">
        Ảnh từ exerciselibrary.app
      </p>
    </aside>
  );
}