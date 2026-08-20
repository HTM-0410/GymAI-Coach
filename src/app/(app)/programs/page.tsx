import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { fetchProgramSummaries } from '@/lib/programs/data';
import { redirect } from 'next/navigation';
import {
  Calendar,
  Check,
  ChevronRight,
  Layers,
  Dumbbell,
  Clock,
  Sparkles,
  Flame,
  Zap,
  TrendingUp
} from 'lucide-react';

// Helper to tag program characteristics with unified, high-contrast English tags
function getProgramMeta(name: string): { level: string; focus: string } {
  const n = name.toLowerCase();
  if (n.includes('5x5') || n.includes('5×5')) {
    return { level: 'Beginner - Intermediate', focus: 'Foundational Strength' };
  }
  if (n.includes('phat')) {
    return { level: 'Intermediate - Advanced', focus: 'Power & Hypertrophy' };
  }
  if (n.includes('arnold')) {
    return { level: 'Advanced', focus: 'High Volume Bodybuilding' };
  }
  if (n.includes('bro split')) {
    return { level: 'Intermediate', focus: 'Targeted Isolation' };
  }
  if (n.includes('full body')) {
    return { level: 'All Levels', focus: 'Time-Efficient' };
  }
  if (n.includes('upper') || n.includes('lower')) {
    return { level: 'Intermediate', focus: 'Balance & Recovery' };
  }
  return { level: 'Popular', focus: 'Max Hypertrophy' };
}

export default async function ProgramsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { system, mine, activeId } = await fetchProgramSummaries(user.id);

  async function activate(programId: string) {
    'use server';
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_programs').update({ is_active: false }).eq('user_id', user.id);
    await supabase.from('user_programs').insert({
      user_id: user.id,
      program_id: programId,
      is_active: true,
    });
    redirect('/programs');
  }

  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-28">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-accent font-extrabold">
              Training Programs Suite
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            Chương trình tập
          </h1>
          <p className="text-sm text-ink-secondary mt-1.5 max-w-2xl font-medium">
            Chọn 1 chương trình làm lịch tập chính của bạn. Nhấn <strong className="text-ink">&quot;Xem chi tiết giáo án&quot;</strong> để xem cấu trúc từng buổi tập, bài tập chi tiết và hình giải phẫu nhóm cơ.
          </p>
        </div>

        {/* System programs */}
        <section>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent" strokeWidth={2} />
              <h2 className="font-mono text-xs uppercase tracking-widest text-ink-muted font-bold">
                Giáo án mẫu sẵn có ({system.length})
              </h2>
            </div>
            <span className="text-[10px] font-mono text-ink-muted">
              Chuẩn Volume khoa học
            </span>
          </div>

          {system.length === 0 ? (
            <div className="card shadow-neumorph-sm rounded-2xl p-8 text-center border border-white/80 dark:border-white/10">
              <p className="text-sm text-ink-muted">Chưa có chương trình mẫu.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {system.map((p) => {
                const isCurrentActive = activeId === p.id;
                const meta = getProgramMeta(p.name_vi ?? p.name);

                return (
                  <div
                    key={p.id}
                    className={`card shadow-neumorph-sm rounded-2xl p-5 sm:p-6 flex flex-col border transition-all duration-300 hover:-translate-y-1 relative overflow-hidden ${
                      isCurrentActive
                        ? 'border-accent shadow-[0_0_24px_rgba(249,115,22,0.2)] dark:border-accent'
                        : 'border-white/80 dark:border-white/10 hover:border-accent/40 hover:shadow-neumorph'
                    }`}
                  >
                    {/* Top status bar */}
                    <div className="flex items-start justify-between mb-3.5 gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[10px] uppercase tracking-wider font-bold bg-black/[0.04] dark:bg-white/[0.06] text-ink-secondary dark:text-slate-300 border border-black/[0.06] dark:border-white/10 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                        {meta.focus}
                      </span>

                      {isCurrentActive && (
                        <div className="flex items-center gap-1.5 shrink-0 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 led-pulse" />
                          <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-500 dark:text-emerald-400 font-extrabold">
                            Active
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Program Title */}
                    <h3 className="font-extrabold text-ink leading-tight text-base sm:text-lg tracking-tight mb-2">
                      {p.name || p.name_vi}
                    </h3>

                    {/* Description */}
                    {p.description && (
                      <p className="text-xs text-ink-secondary leading-relaxed mb-4 line-clamp-3 font-medium">
                        {p.description}
                      </p>
                    )}

                    {/* Meta stats badges */}
                    <div className="flex items-center gap-2 mb-5 text-[10px] font-mono text-ink-muted uppercase tracking-wider border-t border-black/[0.04] dark:border-white/10 pt-3.5 mt-auto">
                      <span className="inline-flex items-center gap-1.5 bg-black/[0.03] dark:bg-white/[0.05] px-2.5 py-1 rounded-lg border border-black/[0.04] dark:border-white/10 font-bold text-ink">
                        <Calendar className="h-3 w-3 text-accent" strokeWidth={2} />
                        <span>{p.days_count} buổi / tuần</span>
                      </span>
                      {p.duration_weeks && (
                        <span className="inline-flex items-center gap-1.5 bg-black/[0.03] dark:bg-white/[0.05] px-2.5 py-1 rounded-lg border border-black/[0.04] dark:border-white/10 font-bold text-ink">
                          <Clock className="h-3 w-3 text-accent" strokeWidth={2} />
                          <span>{p.duration_weeks} tuần</span>
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/programs/${p.id}`}
                        className="btn-ghost text-xs py-2.5 flex items-center justify-center gap-1.5 rounded-xl font-bold tracking-tight hover:text-accent border border-black/[0.04] dark:border-white/10"
                      >
                        <span>Xem chi tiết giáo án</span>
                        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                      </Link>

                      <form action={activate.bind(null, p.id)}>
                        <button
                          className={`w-full text-xs py-2.5 rounded-xl font-extrabold tracking-wider uppercase transition-all ${
                            isCurrentActive
                              ? 'bg-success/10 border border-success/30 text-success cursor-default'
                              : 'btn-primary shadow-accent hover:scale-[1.02]'
                          }`}
                          disabled={isCurrentActive}
                        >
                          {isCurrentActive ? '✓ Đang kích hoạt' : 'Kích hoạt ngay'}
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* My programs */}
        {mine.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-2 w-2 rounded-full bg-ink-muted" />
              <h2 className="font-mono text-xs uppercase tracking-widest text-ink-muted font-bold">
                Giáo án của tôi ({mine.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mine.map((p) => (
                <Link
                  key={p.id}
                  href={`/programs/${p.id}`}
                  className="card shadow-neumorph-sm rounded-2xl p-5 hover:shadow-neumorph transition-all group border border-white/80 dark:border-white/10 hover:border-accent/40"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-extrabold text-ink group-hover:text-accent transition-colors">
                      {p.name || p.name_vi}
                    </h3>
                    <ChevronRight
                      className="h-4 w-4 text-ink-muted group-hover:text-accent transition-colors"
                      strokeWidth={2}
                    />
                  </div>
                  {p.description && (
                    <p className="text-xs text-ink-secondary line-clamp-2">{p.description}</p>
                  )}
                  <div className="mt-3 pt-3 border-t border-black/[0.04] dark:border-white/10 flex items-center gap-3 text-[10px] font-mono text-ink-muted uppercase tracking-wider">
                    <span className="inline-flex items-center gap-1 font-bold text-ink">
                      <Calendar className="h-3 w-3 text-accent" strokeWidth={2} />
                      {p.days_count} buổi
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
