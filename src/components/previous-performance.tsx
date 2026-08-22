import { TrendingUp } from 'lucide-react';

export default function PreviousPerformance({ previous }: {
  previous: { date: string; sets: { weight: number; reps: number }[] } | null;
}) {
  if (!previous || previous.sets.length === 0) return null;

  const volume = previous.sets.reduce((sum, set) => sum + set.weight * set.reps, 0);

  return (
    <div className="card shadow-inset-sm rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
          Buổi trước · {new Date(previous.date).toLocaleDateString('vi-VN')}
        </span>
      </div>
      <div className="space-y-1.5">
        {previous.sets.map((s, i) => (
          <div key={i} className="flex items-center gap-3 font-mono text-sm">
            <span className="text-ink-muted w-4 text-center text-xs">{i + 1}</span>
            <span className="text-ink font-medium">{s.weight}kg × {s.reps}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-chassis-lo mt-3 pt-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Tải tích lũy</span>
        <span className="font-mono text-sm font-extrabold text-accent">
          {volume.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} kg
        </span>
      </div>
    </div>
  );
}
