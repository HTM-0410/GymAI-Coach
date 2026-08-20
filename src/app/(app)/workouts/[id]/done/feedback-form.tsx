'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function FeedbackForm({ workoutId }: { workoutId: string }) {
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [quality, setQuality] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  async function save() {
    const supabase = createClient();
    await supabase.from('workout_feedback').upsert({
      workout_id: workoutId, difficulty, energy, quality, note: note || null,
    });
    setSaved(true);
  }

  return (
    <div className="card shadow-neumorph rounded-xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Post-Workout Feedback</span>
      </div>
      <h2 className="font-bold text-ink text-base mb-5">Đánh giá buổi tập</h2>

      <RatingRow label="Độ khó" value={difficulty} onChange={setDifficulty} />
      <RatingRow label="Năng lượng" value={energy} onChange={setEnergy} />
      <RatingRow label="Chất lượng" value={quality} onChange={setQuality} />

      <div className="mt-4">
        <label className="label">Ghi chú (tuỳ chọn)</label>
        <textarea
          className="input resize-none min-h-16"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Cảm giác tốt, tăng được 2 rep…"
        />
      </div>

      <button onClick={save} disabled={saved} className="btn-primary mt-4 w-full">
        {saved ? 'Đã lưu' : 'Lưu đánh giá'}
      </button>
    </div>
  );
}

function RatingRow({ label, value, onChange }: { label: string; value: number | null; onChange: (n: number) => void }) {
  return (
    <div className="mb-4">
      <div className="text-sm text-ink-secondary mb-2 font-medium">{label}</div>
      <div className="flex gap-2">
        {[1,2,3,4,5].map((n) => (
          <button key={n} onClick={() => onChange(n)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold font-mono transition-all duration-150
              ${value === n
                ? 'bg-accent text-white shadow-accent'
                : 'bg-chassis shadow-neumorph-sm text-ink-secondary hover:text-ink hover:-translate-y-0.5'
              }`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
