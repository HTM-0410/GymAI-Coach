'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronRight, ImageOff } from 'lucide-react';
import clsx from 'clsx';
import { EquipmentImage } from '@/components/ui/equipment-image';

export type EquipmentItem = {
  id: string;
  slug: string;
  name: string;
  name_vi: string | null;
  category: string | null;
  image_url: string | null;
};

type Props = {
  equipment: EquipmentItem[];
  selected: string[];          // list of equipment.id
  onChange: (next: string[]) => void;
};

const CATEGORY_LABELS: Record<string, string> = {
  free_weight: 'Tạ tự do',
  machine:     'Máy tập',
  bodyweight:  'Tự trọng',
  cardio:      'Cardio',
  furniture:   'Nội thất',
  accessory:   'Phụ kiện',
};

// Display order
const CATEGORY_ORDER = ['free_weight', 'machine', 'bodyweight', 'cardio', 'furniture', 'accessory'];

export default function EquipmentStep({ equipment, selected, onChange }: Props) {
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const map = new Map<string, EquipmentItem[]>();
    for (const e of equipment) {
      const key = e.category ?? 'other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return CATEGORY_ORDER
      .filter((k) => map.has(k))
      .map((k) => ({ key: k, label: CATEGORY_LABELS[k] ?? k, items: map.get(k)! }));
  }, [equipment]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggle(id: string) {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange([...next]);
  }

  function clear() {
    onChange([]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)] led-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Step 04</span>
          </div>
          <h2 className="text-xl font-bold text-ink">Thiết bị bạn có</h2>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Đã chọn</p>
          <p className="font-mono text-base font-bold text-accent">{selectedSet.size}</p>
        </div>
      </div>

      <p className="text-xs text-ink-secondary leading-relaxed -mt-2">
        Chọn thiết bị bạn có để AI đề xuất bài tập phù hợp. Có thể bỏ qua nếu chưa biết.
      </p>

      <div className="space-y-6 max-h-[420px] overflow-y-auto pr-1 -mr-1">
        {grouped.map((g) => (
          <div key={g.key}>
            <p className="label mb-3">{g.label}</p>
            <div className="flex flex-wrap gap-3">
              {g.items.map((e) => {
                const isSelected = selectedSet.has(e.id);
                const hasError = imgErrors[e.id];
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => toggle(e.id)}
                    aria-pressed={isSelected}
                    className={clsx(
                      'group flex flex-col items-center w-[calc(50%-0.375rem)] md:w-[calc(25%-0.5625rem)]',
                      'rounded-2xl overflow-hidden border-2 transition-all duration-150',
                      'bg-chassis text-left',
                      isSelected
                        ? 'border-accent ring-2 ring-accent/30 shadow-accent -translate-y-0.5'
                        : 'border-transparent shadow-neumorph-sm hover:-translate-y-0.5 hover:shadow-neumorph'
                    )}
                  >
                    <div className="relative w-full aspect-square overflow-hidden bg-chassis-lo">
                      <EquipmentImage
                        src={e.image_url}
                        slug={e.slug}
                        nameVi={e.name_vi}
                        nameEn={e.name}
                        category={e.category}
                        aspectRatio="1/1"
                        className="w-full h-full rounded-none border-0"
                      />
                      {isSelected && (
                        <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-accent shadow-accent flex items-center justify-center z-10">
                          <Check className="h-4 w-4 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div className="w-full px-2 py-2 text-center">
                      <p className={clsx(
                        'text-xs font-medium leading-snug line-clamp-2',
                        isSelected ? 'text-accent font-bold' : 'text-ink'
                      )}>
                        {e.name_vi ?? e.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <p className="text-center text-sm text-ink-muted py-12">
            Chưa có thiết bị nào trong hệ thống. Bạn có thể bỏ qua bước này.
          </p>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={clear} className="btn-ghost text-xs">
          Xoá hết
        </button>
        <p className="text-[10px] text-ink-muted font-mono uppercase tracking-widest self-center flex items-center gap-1">
          <ChevronRight className="h-3 w-3" /> Tiếp tục sau
        </p>
      </div>
    </div>
  );
}
