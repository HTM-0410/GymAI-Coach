'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, Loader2, Minus, Plus, Scale, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { sortDumbbellInventory } from '@/lib/dumbbell-inventory';

export type DumbbellInventoryRow = {
  id: string;
  weight_kg: number;
  quantity: number;
};

export default function DumbbellInventoryCard({
  gymId,
  initialItems,
}: {
  gymId: string;
  initialItems: DumbbellInventoryRow[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(() => sortDumbbellInventory(initialItems));
  const [weight, setWeight] = useState('');
  const [quantity, setQuantity] = useState('2');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(sortDumbbellInventory(initialItems));
  }, [initialItems]);

  const totals = useMemo(() => {
    const units = items.reduce((sum, item) => sum + Number(item.quantity), 0);
    return { units, pairs: items.reduce((sum, item) => sum + Math.floor(Number(item.quantity) / 2), 0) };
  }, [items]);

  async function addOrReplaceLevel(e: React.FormEvent) {
    e.preventDefault();
    const weightKg = Number(weight);
    const count = Number(quantity);
    if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 200) {
      setError('Trọng lượng phải lớn hơn 0 và không quá 200 kg.');
      return;
    }
    if (!Number.isInteger(count) || count <= 0 || count > 1000) {
      setError('Số lượng phải là số nguyên dương.');
      return;
    }

    setIsAdding(true);
    setError(null);
    const supabase = createClient();
    const { data, error: saveError } = await supabase
      .from('gym_dumbbell_inventory')
      .upsert(
        { gym_id: gymId, weight_kg: weightKg, quantity: count },
        { onConflict: 'gym_id,weight_kg' },
      )
      .select('id, weight_kg, quantity')
      .single();

    if (saveError || !data) {
      setError(saveError?.message ?? 'Không thể lưu mức tạ.');
    } else {
      setItems((current) => sortDumbbellInventory([
        ...current.filter((item) => Number(item.weight_kg) !== Number(data.weight_kg)),
        { id: data.id, weight_kg: Number(data.weight_kg), quantity: Number(data.quantity) },
      ]));
      setWeight('');
      setQuantity('2');
      router.refresh();
    }
    setIsAdding(false);
  }

  async function changeQuantity(item: DumbbellInventoryRow, delta: number) {
    const nextQuantity = item.quantity + delta;
    if (nextQuantity < 1) return;

    setPendingId(item.id);
    setError(null);
    const supabase = createClient();
    const { error: saveError } = await supabase
      .from('gym_dumbbell_inventory')
      .update({ quantity: nextQuantity })
      .eq('id', item.id);

    if (saveError) {
      setError(saveError.message);
    } else {
      setItems((current) => current.map((row) => (
        row.id === item.id ? { ...row, quantity: nextQuantity } : row
      )));
      router.refresh();
    }
    setPendingId(null);
  }

  async function removeLevel(item: DumbbellInventoryRow) {
    setPendingId(item.id);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from('gym_dumbbell_inventory')
      .delete()
      .eq('id', item.id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setItems((current) => current.filter((row) => row.id !== item.id));
      router.refresh();
    }
    setPendingId(null);
  }

  return (
    <section className="card shadow-neumorph rounded-2xl p-6 border border-white/80 dark:border-white/10 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/[0.04] dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center border border-accent/30 shadow-xs">
            <Scale className="h-5 w-5" strokeWidth={1.6} />
          </div>
          <div>
            <h2 className="text-base font-bold text-ink tracking-tight">Kho Tạ Đơn</h2>
            <p className="text-xs text-ink-secondary mt-0.5 font-medium">
              Khai báo mức kg và số quả để AI chọn tải tập có thật tại phòng.
            </p>
          </div>
        </div>
        <div className="flex gap-2 font-mono text-[10px] font-bold uppercase tracking-wider">
          <span className="px-2 py-1 rounded-lg bg-accent/10 text-accent border border-accent/20">{items.length} mức</span>
          <span className="px-2 py-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] text-ink-secondary">{totals.units} quả · {totals.pairs} cặp</span>
        </div>
      </div>

      <form onSubmit={addOrReplaceLevel} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div>
          <label className="label">Trọng lượng mỗi quả</label>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              min="0.25"
              max="200"
              step="0.25"
              className="input pr-10"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="VD: 12.5"
              required
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-ink-muted">kg</span>
          </div>
        </div>
        <div>
          <label className="label">Số lượng (quả)</label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="1000"
            step="1"
            className="input"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={isAdding} className="btn-primary h-10 px-4 inline-flex items-center justify-center gap-1.5">
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Lưu Mức Tạ
        </button>
      </form>

      {error && (
        <p className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">{error}</p>
      )}

      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => {
            const isPending = pendingId === item.id;
            return (
              <div key={item.id} className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] p-3 flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-chassis shadow-neumorph-sm text-accent flex items-center justify-center">
                  <Dumbbell className="h-5 w-5" strokeWidth={1.6} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-base font-extrabold text-ink">{Number(item.weight_kg)} kg</div>
                  <div className="text-[10px] font-semibold text-ink-muted">{item.quantity} quả · {Math.floor(item.quantity / 2)} cặp</div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" disabled={isPending || item.quantity <= 1} onClick={() => changeQuantity(item, -1)} className="h-7 w-7 rounded-lg bg-chassis shadow-neumorph-sm text-ink-muted hover:text-accent disabled:opacity-40 flex items-center justify-center" aria-label={`Giảm số tạ ${item.weight_kg} kg`}>
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" disabled={isPending} onClick={() => changeQuantity(item, 1)} className="h-7 w-7 rounded-lg bg-chassis shadow-neumorph-sm text-ink-muted hover:text-accent disabled:opacity-40 flex items-center justify-center" aria-label={`Tăng số tạ ${item.weight_kg} kg`}>
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" disabled={isPending} onClick={() => removeLevel(item)} className="h-7 w-7 rounded-lg text-ink-muted hover:text-danger hover:bg-danger/10 disabled:opacity-40 flex items-center justify-center" aria-label={`Xóa mức tạ ${item.weight_kg} kg`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-accent/30 bg-accent/[0.04] px-4 py-8 text-center">
          <Dumbbell className="h-7 w-7 text-accent mx-auto mb-2" strokeWidth={1.4} />
          <p className="text-sm font-bold text-ink">Chưa khai báo mức tạ đơn</p>
          <p className="text-xs text-ink-secondary mt-1">Thêm từng mức kg; số lượng được tính theo từng quả.</p>
        </div>
      )}
    </section>
  );
}
