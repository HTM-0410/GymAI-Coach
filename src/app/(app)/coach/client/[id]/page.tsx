import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChevronLeft, TrendingUp, Award, Calendar } from 'lucide-react';

export default async function CoachClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: client } = await supabase
    .from('profiles')
    .select('user_id, display_name, current_weight_kg, height_cm, goal, experience_level, preferred_training_days, preferred_session_duration, created_at')
    .eq('user_id', id)
    .eq('trainer_id', user.id)
    .maybeSingle();
  if (!client) notFound();

  const [workoutsRes, weightRes, prsRes] = await Promise.all([
    supabase.from('workouts').select('id, date, status, workout_exercises(workout_sets(weight, reps, completed, set_type), exercises(name_vi))').eq('user_id', id).eq('status', 'completed').order('date', { ascending: false }).limit(15),
    supabase.from('body_weight_logs').select('weight_kg, recorded_date').eq('user_id', id).order('recorded_date', { ascending: false }).limit(10),
    supabase.from('personal_records').select('id, record_type, value, exercises(name_vi), achieved_at').eq('user_id', id).order('achieved_at', { ascending: false }).limit(10),
  ]);

  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-24 space-y-6">
        {/* Back */}
        <Link href="/coach/dashboard" className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-accent font-medium transition-colors">
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          Quay lại dashboard
        </Link>

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Client Profile</span>
          </div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">{client.display_name ?? '—'}</h1>
          <p className="text-sm text-ink-secondary mt-1 font-mono">
            {client.goal} · {client.experience_level} · {client.preferred_training_days} ngày/tuần · {client.preferred_session_duration} phút/buổi
          </p>
        </div>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-4">
          <StatTile icon={<TrendingUp className="h-5 w-5 text-accent" strokeWidth={1.5} />} label="Cân nặng" value={`${client.current_weight_kg ?? '—'} kg`} />
          <StatTile icon={<TrendingUp className="h-5 w-5 text-accent" strokeWidth={1.5} />} label="Chiều cao" value={`${client.height_cm ?? '—'} cm`} />
          <StatTile icon={<Award className="h-5 w-5 text-accent" strokeWidth={1.5} />} label="PRs" value={(prsRes.data?.length ?? 0).toString()} />
        </section>

        {/* Recent workouts */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-accent" strokeWidth={1.5} />
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">Buổi tập gần đây</h2>
          </div>
          <div className="space-y-3">
            {(workoutsRes.data ?? []).map((w: any) => {
              const sets = (w.workout_exercises ?? []).reduce((s: number, we: any) =>
                s + (we.workout_sets ?? []).filter((ss: any) => ss.completed && ss.set_type !== 'warmup').length, 0);
              return (
                <div key={w.id} className="card shadow-neumorph-sm rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-ink text-sm">{new Date(w.date).toLocaleDateString('vi-VN')}</div>
                    <div className="font-mono text-[10px] text-ink-muted uppercase tracking-wider mt-0.5">
                      {w.workout_exercises?.length ?? 0} bài · {sets} working sets
                    </div>
                  </div>
                  <Link href={`/workouts/${w.id}`} className="text-xs text-accent hover:underline font-medium shrink-0 ml-4">
                    Mở →
                  </Link>
                </div>
              );
            })}
            {(workoutsRes.data ?? []).length === 0 && (
              <div className="card shadow-neumorph rounded-xl p-8 text-center">
                <p className="font-mono text-sm text-ink-muted uppercase tracking-wider">Chưa có buổi tập.</p>
              </div>
            )}
          </div>
        </section>

        {/* Weight history */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-accent" strokeWidth={1.5} />
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">Cân nặng gần đây</h2>
          </div>
          <div className="card shadow-neumorph rounded-xl p-5 space-y-2">
            {(weightRes.data ?? []).map((w: any) => (
              <div key={w.recorded_date} className="flex items-center justify-between py-2 border-b border-chassis-lo last:border-0">
                <span className="font-mono text-xs text-ink-secondary">
                  {new Date(w.recorded_date).toLocaleDateString('vi-VN')}
                </span>
                <span className="font-mono text-sm font-bold text-ink">{w.weight_kg} kg</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card shadow-neumorph-sm rounded-xl p-4">
      <div className="mb-2">{icon}</div>
      <div className="font-mono text-xl font-extrabold text-ink leading-none mb-1">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">{label}</div>
    </div>
  );
}
