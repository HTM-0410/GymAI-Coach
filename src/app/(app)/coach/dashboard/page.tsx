import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Users, ChevronRight, TrendingUp } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function CoachDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('is_trainer, display_name').eq('user_id', user.id).single();
  if (!profile?.is_trainer) {
    return (
      <main className="min-h-screen bg-chassis blueprint-grid">
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
          <div className="card shadow-neumorph-lg rounded-2xl p-8 text-center">
            <div className="h-16 w-16 rounded-2xl bg-chassis shadow-neumorph flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
            </div>
            <h1 className="text-xl font-bold text-ink mb-2">Chế độ Trainer chưa được bật</h1>
            <p className="text-sm text-ink-secondary mb-6 leading-relaxed">
              Trainer có thể quản lý nhiều clients và xem analytics của họ.
            </p>
            <form action={async () => {
              'use server';
              const supabase = await createClient();
              const { data: { user } } = await supabase.auth.getUser();
              if (user) await supabase.from('profiles').update({ is_trainer: true }).eq('user_id', user.id);
            }}>
              <button className="btn-primary">Bật chế độ Trainer</button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  const { data: clients } = await supabase
    .from('profiles')
    .select('user_id, display_name, current_weight_kg, goal, experience_level, updated_at')
    .eq('trainer_id', user.id)
    .order('updated_at', { ascending: false });

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
  const clientIds = (clients ?? []).map((c: any) => c.user_id);
  const { data: recentWorkouts } = clientIds.length > 0
    ? await supabase.from('workouts').select('user_id, status, date, workout_exercises(workout_sets(weight, reps, completed, set_type))').in('user_id', clientIds).gte('date', sevenDaysAgo).eq('status', 'completed')
    : { data: [] as any[] };

  const perClient = new Map<string, number>();
  (recentWorkouts ?? []).forEach((w: any) => {
    const count = (w.workout_exercises ?? []).reduce((s: number, we: any) =>
      s + (we.workout_sets ?? []).filter((ss: any) => ss.completed && ss.set_type !== 'warmup').length, 0);
    perClient.set(w.user_id, (perClient.get(w.user_id) ?? 0) + count);
  });

  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-24 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Trainer Dashboard</span>
          </div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Quản lý Clients</h1>
          <p className="text-sm text-ink-secondary mt-1">
            {clients?.length ?? 0} client{clients?.length === 1 ? '' : 's'} đang theo dõi
          </p>
        </div>

        {/* Client cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(clients ?? []).map((c: any) => {
            const weeklySets = perClient.get(c.user_id) ?? 0;
            return (
              <Link key={c.user_id} href={`/coach/client/${c.user_id}`}
                className="card group p-5 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-ink">{c.display_name ?? '—'}</h3>
                    <p className="font-mono text-[10px] text-ink-muted uppercase tracking-wider mt-0.5">
                      {c.goal} · {c.experience_level}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-muted group-hover:text-accent transition-colors" strokeWidth={1.5} />
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-mono text-xs text-ink-secondary">
                    <span className="text-ink-muted">Cân: </span>{c.current_weight_kg ?? '—'}kg
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-chassis-lo flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">7 ngày</span>
                  <span className="font-mono text-sm font-extrabold text-accent">{weeklySets} sets</span>
                </div>
              </Link>
            );
          })}
        </section>

        {(clients ?? []).length === 0 && (
          <div className="card shadow-neumorph-lg rounded-2xl p-10 text-center">
            <p className="font-mono text-sm text-ink-muted uppercase tracking-wider">
              Chưa có client nào. Chia sẻ link invite để họ đăng ký và chọn bạn làm trainer.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
