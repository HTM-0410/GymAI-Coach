'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Brain, Dumbbell } from 'lucide-react';

type Day = { id: string; name: string; day_of_week: number; training_day_targets: any[] };

export default function NewWorkoutForm({
  program, gyms, defaultDuration,
}: {
  program: { id: string; name: string; training_program_days: Day[] } | null;
  gyms: {
    id: string;
    name: string;
    gym_dumbbell_inventory: { weight_kg: number; quantity: number }[];
  }[];
  defaultDuration: number;
}) {
  const router = useRouter();
  const [dayId, setDayId] = useState(program?.training_program_days?.[0]?.id ?? '');
  const [gymId, setGymId] = useState<string>(gyms[0]?.id ?? '');
  const [duration, setDuration] = useState(defaultDuration);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedGym = gyms.find((gym) => gym.id === gymId);
  const dumbbellInventory = [...(selectedGym?.gym_dumbbell_inventory ?? [])]
    .sort((a, b) => Number(a.weight_kg) - Number(b.weight_kg));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await fetch('/api/workout/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ programDayId: dayId, gymId: gymId || null, durationMinutes: duration }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.detail ?? data.error ?? 'Lỗi'); return; }
    router.push(`/workouts/${data.workoutId}`);
  }

  if (!program) {
    return (
      <div className="card shadow-neumorph-lg rounded-2xl p-8 text-center">
        <p className="font-mono text-sm text-ink-muted uppercase tracking-wider mb-4">
          Bạn chưa có program đang hoạt động.
        </p>
        <a href="/programs" className="btn-primary">Chọn program</a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card shadow-neumorph-lg rounded-2xl p-6 space-y-6">
      <div>
        <label className="label">Ngày tập hôm nay</label>
        <select className="input" value={dayId} onChange={(e) => setDayId(e.target.value)} required>
          {program.training_program_days.map((d) => (
            <option key={d.id} value={d.id}>
              {['CN','T2','T3','T4','T5','T6','T7'][d.day_of_week]} — {d.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Phòng gym</label>
        <select className="input" value={gymId} onChange={(e) => setGymId(e.target.value)}>
          <option value="">Không ràng buộc equipment</option>
          {gyms.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        {gymId && (
          <div className="mt-2 rounded-xl border border-accent/20 bg-accent/[0.05] px-3 py-2.5 flex items-start gap-2.5">
            <Dumbbell className="h-4 w-4 text-accent mt-0.5 shrink-0" strokeWidth={1.6} />
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink">Kho Tạ Đơn Của Phòng</p>
              <p className="text-[11px] text-ink-secondary mt-0.5 leading-relaxed">
                {dumbbellInventory.length > 0
                  ? dumbbellInventory.map((item) => `${Number(item.weight_kg)}kg × ${item.quantity}`).join(' · ')
                  : 'Chưa khai báo chi tiết. AI chỉ ràng buộc theo danh mục thiết bị chung.'}
              </p>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="label">Thời lượng: <span className="text-accent font-bold font-mono">{duration} phút</span></label>
        <input type="range" min={15} max={240} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full accent-[#f97316]" />
        <div className="flex justify-between mt-1">
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          <span className="font-mono text-[10px] text-ink-muted">15'</span>
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          <span className="font-mono text-[10px] text-ink-muted">120'</span>
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          <span className="font-mono text-[10px] text-ink-muted">240'</span>
        </div>
      </div>

      {error && (
        <div className="bg-chassis shadow-inset-sm rounded-md px-4 py-3">
          <p className="font-mono text-xs text-danger font-bold uppercase tracking-wider">ERR: {error}</p>
        </div>
      )}

      <button disabled={loading || !dayId} className="btn-primary w-full inline-flex items-center justify-center gap-2">
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" />AI đang tạo buổi tập…</>
          : <><Brain className="h-4 w-4" />Tạo buổi tập với AI</>}
      </button>
    </form>
  );
}
