import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CheckCircle2, Clock, Dumbbell, Repeat2, Weight } from 'lucide-react';
import FeedbackForm from './feedback-form';

export default async function WorkoutDonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: workout } = await supabase
    .from('workouts')
    .select('id, status, started_at, completed_at, planned_duration, workout_exercises(workout_sets(weight, reps, completed, set_type))')
    .eq('id', id).maybeSingle();
  if (!workout) notFound();

  const sets = (workout.workout_exercises ?? []).flatMap((we: any) => we.workout_sets ?? []);
  const totalSets = sets.filter((s: any) => s.completed).length;
  const volume = sets.filter((s: any) => s.completed && s.set_type !== 'warmup').reduce((acc: number, s: any) => acc + (s.weight ?? 0) * (s.reps ?? 0), 0);
  const durationMin = workout.started_at && workout.completed_at
    ? Math.round((new Date(workout.completed_at).getTime() - new Date(workout.started_at).getTime()) / 60000)
    : null;

  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        {/* Success header */}
        <div className="text-center mb-8">
          <div className="h-20 w-20 rounded-2xl bg-chassis shadow-neumorph-lg flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10 text-success" strokeWidth={1.5} />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_6px_rgba(34,197,94,0.8)] led-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-success">Workout Complete</span>
          </div>
          <h1 className="text-3xl font-extrabold text-ink tracking-tight">Buổi tập hoàn thành!</h1>
        </div>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Stat icon={<Clock className="h-5 w-5 text-accent" strokeWidth={1.5} />} label="Thời gian" value={durationMin ? `${durationMin} phút` : '—'} />
          <Stat icon={<Dumbbell className="h-5 w-5 text-accent" strokeWidth={1.5} />} label="Bài tập" value={`${workout.workout_exercises?.length ?? 0}`} />
          <Stat icon={<Repeat2 className="h-5 w-5 text-accent" strokeWidth={1.5} />} label="Tổng set" value={`${totalSets}`} />
          <Stat icon={<Weight className="h-5 w-5 text-accent" strokeWidth={1.5} />} label="Volume" value={`${Math.round(volume)} kg`} />
        </section>

        {/* Feedback */}
        <FeedbackForm workoutId={workout.id} />

        {/* Back to dashboard */}
        <div className="mt-6 text-center">
          <Link href="/dashboard" className="btn-primary">Về dashboard</Link>
        </div>
      </div>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card shadow-neumorph-sm rounded-xl p-4 text-center">
      <div className="mx-auto mb-2">{icon}</div>
      <div className="font-mono text-xl font-extrabold text-ink leading-none mb-1">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">{label}</div>
    </div>
  );
}
