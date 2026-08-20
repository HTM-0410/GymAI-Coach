'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function WeightForm() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from('body_weight_logs').upsert({ recorded_date: date, weight_kg: Number(weight), note: note || null });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card shadow-neumorph-lg rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Weight Log</span>
        </div>
        <form onSubmit={save} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Ngày</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">Cân nặng (kg)</label>
              <input className="input" type="number" step={0.1} value={weight} onChange={(e) => setWeight(e.target.value)} required min={20} max={300} placeholder="70.0" />
            </div>
          </div>
          <div>
            <label className="label">Ghi chú (tuỳ chọn)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Sau bữa trưa…" />
          </div>
          <button className="btn-primary w-full" disabled={loading || !weight}>
            {loading ? 'Đang lưu…' : 'Lưu cân nặng'}
          </button>
        </form>
      </div>
    </div>
  );
}
