import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Calendar, ChevronRight, Check } from 'lucide-react';

export default async function WorkoutsListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: workouts } = await supabase
    .from('workouts')
    .select('id, date, status, planned_duration, workout_exercises(count)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(30);

  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Workout History</span>
          </div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Buổi tập của tôi</h1>
        </div>

        {/* Workout list */}
        <div className="space-y-3">
          {(workouts ?? []).map((w: any) => {
            const statusColor = w.status === 'completed' ? 'text-success' : w.status === 'in_progress' ? 'text-accent' : 'text-ink-muted';
            return (
              <Link key={w.id} href={`/workouts/${w.id}`}
                className="card group p-4 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between">
                <div>
                  <div className="font-bold text-ink text-sm">
                    {new Date(w.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}
                  </div>
                  <div className="font-mono text-[10px] text-ink-muted uppercase tracking-wider mt-0.5">
                    {w.workout_exercises?.[0]?.count ?? 0} bài · {w.planned_duration ?? '?'}p
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-[10px] uppercase tracking-widest font-bold ${statusColor}`}>
                    {w.status.replace('_', ' ')}
                  </span>
                  {w.status === 'completed' && <Check className="h-4 w-4 text-success" strokeWidth={2} />}
                  <ChevronRight className="h-4 w-4 text-ink-muted group-hover:text-accent transition-colors" strokeWidth={1.5} />
                </div>
              </Link>
            );
          })}
        </div>

        {(workouts ?? []).length === 0 && (
          <div className="card shadow-neumorph-lg rounded-2xl p-10 text-center">
            <p className="font-mono text-sm text-ink-muted uppercase tracking-wider mb-4">Chưa có buổi tập nào.</p>
            <Link href="/workouts/new" className="btn-primary">Tạo buổi tập đầu tiên</Link>
          </div>
        )}
      </div>
    </main>
  );
}
