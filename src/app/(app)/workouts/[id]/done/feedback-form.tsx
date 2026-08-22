'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Check } from 'lucide-react';

export default function FeedbackForm({ workoutId }: { workoutId: string }) {
  const [difficulty, setDifficulty] = useState<number | null>(3);
  const [energy, setEnergy] = useState<number | null>(4);
  const [quality, setQuality] = useState<number | null>(4);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from('workout_feedback').upsert({
      workout_id: workoutId,
      difficulty,
      energy,
      quality,
      note: note.trim() || null,
    });
    setLoading(false);
    setSaved(true);
  }

  const difficultyLabels = ['', 'Rất nhẹ', 'Vừa sức', 'Chuẩn sức', 'Khá nặng', 'Cực đại'];
  const energyLabels = ['', 'Kiệt sức', 'Hơi mệt', 'Ổn định', 'Sung mãn', 'Tràn trề'];
  const qualityLabels = ['', 'Chưa tốt', 'Tạm ổn', 'Chuẩn Form', 'Rất tốt', 'Hoàn hảo'];

  return (
    <div className="card shadow-neumorph rounded-2xl p-5 sm:p-6 border border-black/[0.06] dark:border-white/10 space-y-4">
      <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)] led-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">
            Post-Workout Feedback
          </span>
        </div>
        <h2 className="font-bold text-ink text-sm">Đánh giá buổi tập</h2>
      </div>

      <RatingRow
        label="Độ khó"
        value={difficulty}
        labels={difficultyLabels}
        onChange={setDifficulty}
      />

      <RatingRow
        label="Năng lượng"
        value={energy}
        labels={energyLabels}
        onChange={setEnergy}
      />

      <RatingRow
        label="Chất lượng Form"
        value={quality}
        labels={qualityLabels}
        onChange={setQuality}
      />

      <div className="pt-1">
        <label className="label text-xs mb-1.5 block">Ghi chú (tuỳ chọn)</label>
        <textarea
          className="input resize-none min-h-20 text-xs"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Cảm giác tốt, tăng được 2 rep ở bài ngực…"
        />
      </div>

      <button
        type="button"
        onClick={save}
        disabled={loading || saved}
        className="btn-primary w-full mt-2"
      >
        {saved ? (
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-4 w-4 stroke-[2.5]" />
            <span>Đã lưu đánh giá</span>
          </span>
        ) : loading ? (
          'Đang lưu...'
        ) : (
          'Lưu đánh giá'
        )}
      </button>
    </div>
  );
}

function RatingRow({
  label,
  value,
  labels,
  onChange,
}: {
  label: string;
  value: number | null;
  labels: string[];
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-medium text-ink-secondary">
        <span>{label}</span>
        {value && (
          <span className="font-mono text-xs font-bold text-accent">
            {value}/5 · {labels[value]}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const isSelected = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`flex-1 h-10 rounded-xl font-mono text-sm font-bold transition-all flex items-center justify-center cursor-pointer ${
                isSelected
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-chassis shadow-neumorph-sm text-ink-secondary hover:text-ink hover:bg-chassis-hi border border-black/5 dark:border-white/10'
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
