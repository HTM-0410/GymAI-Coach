'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Check, Plus, Timer, ChevronRight, ChevronLeft } from 'lucide-react';
import PreviousPerformance from '@/components/previous-performance';

type WSet = { id: string; set_number: number; weight: number | null; reps: number | null; rir: number | null; set_type: string; completed: boolean };
type WEx = {
  id: string; order_index: number; target_sets: number; target_rep_min: number | null; target_rep_max: number | null;
  target_weight: number | null; target_rir: number | null; rest_seconds: number | null; ai_reason: string | null;
  exercises: { slug: string; name: string; name_vi: string | null; default_rest_seconds: number | null; default_rir: number | null };
  workout_sets: WSet[];
  previous_performance: { date: string; sets: { weight: number; reps: number; rir: number | null }[] } | null;
};
type Workout = { id: string; date: string; status: string; planned_duration: number | null; workout_exercises: WEx[] };

export default function WorkoutLogger({ workout }: { workout: Workout }) {
  const router = useRouter();
  const [exIdx, setExIdx] = useState(0);
  const [exercises, setExercises] = useState(workout.workout_exercises);
  const ex = exercises[exIdx];
  const [restSec, setRestSec] = useState(0);
  const restRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => () => { if (restRef.current) clearInterval(restRef.current); }, []);

  async function addSet() {
    const supabase = createClient();
    const nextNum = (ex.workout_sets?.length ?? 0) + 1;
    const newSet = {
      workout_exercise_id: ex.id, set_number: nextNum, set_type: 'working',
      weight: ex.target_weight ?? null, reps: ex.target_rep_max ?? null,
      rir: ex.target_rir ?? null, completed: false,
    };
    const { data } = await supabase.from('workout_sets').insert(newSet).select().single();
    if (data) {
      setExercises((prev) => prev.map((e, i) =>
        i === exIdx ? { ...e, workout_sets: [...(e.workout_sets ?? []), data as any] } : e
      ));
    }
  }

  async function toggleSet(set: WSet) {
    const supabase = createClient();
    const completed = !set.completed;
    const { data } = await supabase.from('workout_sets')
      .update({ completed, completed_at: completed ? new Date().toISOString() : null })
      .eq('id', set.id).select().single();
    if (data) {
      setExercises((prev) => prev.map((e, i) =>
        i === exIdx ? { ...e, workout_sets: e.workout_sets.map((s) => s.id === set.id ? (data as any) : s) } : e
      ));
      if (completed) startRest(ex.rest_seconds ?? ex.exercises.default_rest_seconds ?? 120);
    }
  }

  async function updateSet(set: WSet, patch: Partial<WSet>) {
    const supabase = createClient();
    const { data } = await supabase.from('workout_sets').update(patch).eq('id', set.id).select().single();
    if (data) {
      setExercises((prev) => prev.map((e, i) =>
        i === exIdx ? { ...e, workout_sets: e.workout_sets.map((s) => s.id === set.id ? (data as any) : s) } : e
      ));
    }
  }

  function startRest(seconds: number) {
    if (restRef.current) clearInterval(restRef.current);
    setRestSec(seconds);
    restRef.current = setInterval(() => {
      setRestSec((s) => {
        if (s <= 1) { if (restRef.current) clearInterval(restRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  async function completeWorkout() {
    const supabase = createClient();
    await supabase.from('workouts').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', workout.id);
    router.push(`/workouts/${workout.id}/done`);
    router.refresh();
  }

  const completedSets = (ex.workout_sets ?? []).filter((s) => s.completed).length;
  const totalSets = ex.target_sets;

  return (
    <div className="min-h-screen bg-chassis blueprint-grid px-4 py-6 pb-24">
      {/* Rest timer overlay */}
      {restSec > 0 && (
        <div className="fixed inset-x-0 top-0 z-50
                        bg-chassis shadow-[0_4px_16px_rgba(0,0,0,0.1)]
                        border-b-2 border-accent
                        px-4 py-3 flex items-center gap-3">
          <Timer className="h-5 w-5 text-accent animate-pulse" strokeWidth={1.5} />
          <div className="font-mono text-3xl font-extrabold text-ink tabular-nums tracking-wider">
            {String(Math.floor(restSec / 60)).padStart(2,'0')}:{String(restSec % 60).padStart(2,'0')}
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setRestSec((s) => Math.max(0, s + 30))} className="btn-ghost text-xs py-1.5">+30s</button>
            <button onClick={() => setRestSec((s) => Math.max(0, s - 30))} className="btn-ghost text-xs py-1.5">-30s</button>
            <button onClick={() => { if (restRef.current) clearInterval(restRef.current); setRestSec(0); }} className="btn-ghost text-xs py-1.5">Bỏ qua</button>
          </div>
        </div>
      )}

      {/* Exercise header */}
      <div className="mb-5">
        {/* Label */}
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            Exercise {exIdx + 1} of {exercises.length}
          </span>
        </div>
        <h1 className="text-xl font-extrabold text-ink tracking-tight">{ex.exercises.name_vi ?? ex.exercises.name}</h1>
        <p className="text-sm text-ink-secondary mt-1 font-mono">
          Target: <span className="text-accent font-bold">{ex.target_sets} × {ex.target_rep_min ?? '?'}–{ex.target_rep_max ?? '?'} reps</span>
          {ex.target_rir != null && <span className="text-ink-muted"> · RIR {ex.target_rir}</span>}
        </p>
        {ex.ai_reason && (
          <p className="text-xs text-ink-secondary mt-2 italic bg-chassis-hi rounded-lg px-3 py-2 shadow-neumorph-sm">
            {ex.ai_reason}
          </p>
        )}
      </div>

      {/* Previous performance */}
      <div className="mb-5">
        <PreviousPerformance previous={ex.previous_performance} />
      </div>

      {/* Set table card */}
      <div className="card shadow-neumorph rounded-xl overflow-hidden mb-5">
        {/* Progress bar */}
        <div className="bg-chassis-lo px-4 py-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            Sets {completedSets}/{totalSets} Complete
          </span>
          <div className="flex gap-1">
            {Array.from({ length: totalSets }).map((_, i) => (
              <div key={i} className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                i < completedSets ? 'bg-success shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-chassis shadow-inset-sm'
              }`} />
            ))}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-chassis shadow-inset-sm">
              <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold w-10">#</th>
              <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">Kg</th>
              <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">Reps</th>
              <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">RIR</th>
              <th className="px-3 py-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {(ex.workout_sets ?? []).map((s) => (
              <tr key={s.id}
                className={`border-t border-chassis-lo transition-all duration-200 ${
                  s.completed ? 'bg-success/5' : ''
                }`}>
                <td className="px-3 py-2.5">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                    s.completed ? 'bg-success text-white shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-chassis shadow-neumorph-sm text-ink-muted'
                  }`}>
                    {s.set_number}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <input type="number" inputMode="decimal" step={0.5}
                    value={s.weight ?? ''}
                    onChange={(e) => updateSet(s, { weight: e.target.value ? Number(e.target.value) : null })}
                    className="w-full bg-chassis shadow-inset-sm rounded-md px-3 py-1.5 font-mono text-sm text-ink text-center
                                focus-visible:outline-none focus-visible:shadow-[inset_4px_4px_8px_#babecc,inset_-4px_-4px_8px_#ffffff,0_0_0_2px_#f97316]
                                transition-shadow"
                    placeholder="0"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <input type="number" inputMode="numeric"
                    value={s.reps ?? ''}
                    onChange={(e) => updateSet(s, { reps: e.target.value ? Number(e.target.value) : null })}
                    className="w-full bg-chassis shadow-inset-sm rounded-md px-3 py-1.5 font-mono text-sm text-ink text-center
                                focus-visible:outline-none focus-visible:shadow-[inset_4px_4px_8px_#babecc,inset_-4px_-4px_8px_#ffffff,0_0_0_2px_#f97316]
                                transition-shadow"
                    placeholder="0"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <input type="number" inputMode="numeric" min={0} max={10}
                    value={s.rir ?? ''}
                    onChange={(e) => updateSet(s, { rir: e.target.value ? Number(e.target.value) : null })}
                    className="w-full bg-chassis shadow-inset-sm rounded-md px-3 py-1.5 font-mono text-sm text-ink text-center
                                focus-visible:outline-none focus-visible:shadow-[inset_4px_4px_8px_#babecc,inset_-4px_-4px_8px_#ffffff,0_0_0_2px_#f97316]
                                transition-shadow"
                    placeholder="—"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => toggleSet(s)}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-150
                      ${s.completed
                        ? 'bg-success text-white shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                        : 'bg-chassis shadow-neumorph-sm text-ink-muted hover:text-success'
                      }`}
                  >
                    <Check className="h-4 w-4" strokeWidth={2} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button onClick={addSet}
          className="w-full py-3 border-t border-chassis-lo
                     flex items-center justify-center gap-2 text-sm font-medium text-ink-secondary
                     hover:text-accent hover:bg-chassis-hi transition-all duration-150">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Thêm set
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex justify-between gap-3">
        <button
          disabled={exIdx === 0}
          onClick={() => setExIdx(exIdx - 1)}
          className="btn-ghost inline-flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          Bài trước
        </button>

        {exIdx < exercises.length - 1 ? (
          <button onClick={() => setExIdx(exIdx + 1)} className="btn-primary inline-flex items-center gap-1">
            Bài tiếp
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
        ) : (
          <button onClick={completeWorkout} className="btn-primary inline-flex items-center gap-1">
            <Check className="h-4 w-4" strokeWidth={2} />
            Hoàn thành buổi tập
          </button>
        )}
      </nav>
    </div>
  );
}
