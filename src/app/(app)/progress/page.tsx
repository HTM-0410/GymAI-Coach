import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { TrendingUp, Scale, Award, Activity, ChevronRight } from 'lucide-react';

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [weightRes, workoutsRes, prsRes, exerciseStatsRes] = await Promise.all([
    supabase.from('body_weight_logs').select('weight_kg, recorded_date').eq('user_id', user.id).order('recorded_date', { ascending: false }).limit(30),
    supabase.from('workouts').select('id, status, started_at, completed_at, date').eq('user_id', user.id).eq('status', 'completed').order('date', { ascending: false }).limit(30),
    supabase.from('personal_records').select('record_type, value, exercises(slug, name_vi), achieved_at').eq('user_id', user.id).order('achieved_at', { ascending: false }).limit(10),
    supabase.from('exercise_user_stats').select('total_sets, total_volume_kg, exercises(slug, name_vi)').eq('user_id', user.id).order('total_volume_kg', { ascending: false }).limit(5),
  ]);

  const weights = (weightRes.data ?? []).reverse();
  const last7 = workoutsRes.data?.filter((w: any) => Date.now() - new Date(w.date).getTime() < 7 * 86400_000).length ?? 0;
  const last30 = workoutsRes.data?.filter((w: any) => Date.now() - new Date(w.date).getTime() < 30 * 86400_000).length ?? 0;
  const recentWeight = weightRes.data?.[0];

  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-24 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Progress Analytics</span>
            </div>
            <h1 className="text-2xl font-extrabold text-ink tracking-tight">Tiến bộ</h1>
          </div>
          <Link href="/profile/weight" className="btn-ghost inline-flex items-center gap-2 text-sm shrink-0 mt-1">
            <Scale className="h-4 w-4" strokeWidth={1.5} />
            Ghi cân nặng
          </Link>
        </div>

        {/* Stats grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Stat icon={<Activity className="h-4 w-4 text-accent" strokeWidth={1.4} />} label="Buổi 7 ngày" value={last7.toString()} />
          <Stat icon={<Activity className="h-4 w-4 text-accent" strokeWidth={1.4} />} label="Buổi 30 ngày" value={last30.toString()} />
          <Stat icon={<Scale className="h-4 w-4 text-accent" strokeWidth={1.4} />} label="Cân nặng hiện tại" value={recentWeight ? `${recentWeight.weight_kg} kg` : '—'} />
          <Stat icon={<Award className="h-4 w-4 text-accent" strokeWidth={1.4} />} label="Personal Records" value={(prsRes.data?.length ?? 0).toString()} />
        </section>

        {/* Weight history table */}
        <section className="card shadow-neumorph rounded-xl p-5 border border-white/80 dark:border-white/10 hover:border-accent/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-accent" strokeWidth={1.5} />
              <h2 className="font-bold text-ink text-sm tracking-tight">Biến động Cân nặng Gần đây</h2>
            </div>
            <Link href="/profile/weight" className="text-xs font-mono text-accent hover:underline uppercase tracking-wider font-bold">
              + Ghi cân nặng
            </Link>
          </div>

          {weights.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/[0.04] dark:border-white/10">
                    <th className="text-left py-2 font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">Ngày</th>
                    <th className="text-right py-2 font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">Cân nặng</th>
                    <th className="text-right py-2 font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">Thay đổi</th>
                  </tr>
                </thead>
                <tbody>
                  {weights.slice(-7).reverse().map((w, i, arr) => {
                    const prev = arr[i + 1];
                    const delta = prev ? (Number(w.weight_kg) - Number(prev.weight_kg)).toFixed(1) : null;
                    const deltaNum = delta ? Number(delta) : 0;
                    return (
                      <tr key={w.recorded_date} className="border-t border-black/[0.03] dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 font-mono text-xs text-ink-secondary">
                          {new Date(w.recorded_date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}
                        </td>
                        <td className="py-2.5 text-right font-mono text-sm font-bold text-ink">{w.weight_kg} kg</td>
                        <td className={`py-2.5 text-right font-mono text-xs font-bold ${
                          deltaNum > 0 ? 'text-warn' : deltaNum < 0 ? 'text-success' : 'text-ink-muted'
                        }`}>
                          {delta ? `${deltaNum > 0 ? '+' : ''}${delta}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-ink-muted font-mono">Chưa có dữ liệu cân nặng.</p>
          )}
        </section>

        {/* Personal Records */}
        <section className="card shadow-neumorph rounded-xl p-5 border border-white/80 dark:border-white/10 hover:border-accent/30 transition-all">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-4 w-4 text-accent" strokeWidth={1.5} />
            <h2 className="font-bold text-ink text-sm tracking-tight">Kỷ Lục Cá Nhân (Personal Records)</h2>
          </div>
          {prsRes.data && prsRes.data.length > 0 ? (
            <ul className="space-y-2">
              {prsRes.data.map((pr: any, i: number) => (
                <li key={i} className="flex items-center justify-between p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/5 hover:border-accent/30 hover:-translate-y-0.5 transition-all group">
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-md bg-accent/15 text-accent font-mono text-xs font-bold flex items-center justify-center border border-accent/25">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-semibold text-ink group-hover:text-accent transition-colors">{pr.exercises?.name_vi ?? pr.exercises?.slug}</span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-ink-muted bg-black/[0.04] dark:bg-white/10 px-1.5 py-0.5 rounded font-bold">
                      {pr.record_type}
                    </span>
                  </div>
                  <span className="font-mono text-base font-extrabold text-accent">{pr.value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted font-mono">Chưa có PR nào được ghi nhận.</p>
          )}
        </section>

        {/* Top exercises by volume */}
        <section className="card shadow-neumorph rounded-xl p-5 border border-white/80 dark:border-white/10 hover:border-accent/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" strokeWidth={1.5} />
              <h2 className="font-bold text-ink text-sm tracking-tight">Top Bài Tập Theo Volume</h2>
            </div>
          </div>
          {exerciseStatsRes.data && exerciseStatsRes.data.length > 0 ? (
            <ol className="space-y-2">
              {exerciseStatsRes.data.map((es: any, i: number) => (
                <li key={i} className="flex items-center justify-between p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/5 hover:border-accent/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-ink-muted font-bold w-5">{String(i + 1)}.</span>
                    <span className="text-sm font-semibold text-ink group-hover:text-accent transition-colors">{es.exercises?.name_vi ?? es.exercises?.slug}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-ink-secondary bg-black/[0.04] dark:bg-white/10 px-2 py-0.5 rounded">{es.total_sets} sets</span>
                    <span className="font-mono text-sm font-bold text-accent">{Math.round(Number(es.total_volume_kg))} kg</span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink-muted font-mono">Chưa có dữ liệu.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card shadow-neumorph-sm rounded-xl p-3.5 border border-white/80 dark:border-white/10 hover:-translate-y-1 hover:border-accent/30 transition-all group animate-shimmer relative overflow-hidden">
      <div className="flex items-center justify-between mb-2.5">
        <div className="h-7.5 w-7.5 rounded-lg bg-gradient-to-br from-chassis-hi to-chassis-lo shadow-neumorph-sm flex items-center justify-center border border-white/70 dark:border-white/10 group-hover:scale-105 transition-transform">
          {icon}
        </div>
        <span className="h-1 w-1 rounded-full bg-accent/40 group-hover:bg-accent group-hover:scale-125 transition-all" />
      </div>
      <div className="font-mono text-xl font-extrabold text-ink leading-none mb-1 tracking-tight group-hover:text-accent transition-colors">{value}</div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-ink-muted leading-tight font-bold">{label}</div>
    </div>
  );
}
