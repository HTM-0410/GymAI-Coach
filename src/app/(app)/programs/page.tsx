import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { fetchProgramSummaries } from '@/lib/programs/data';
import type { ProgramSummary } from '@/lib/programs/types';
import { redirect } from 'next/navigation';
import { TrainingLibraryTabs } from '@/components/training-library-tabs';
import {
  Calendar,
  Check,
  ChevronRight,
  Layers,
  Clock,
  Sparkles,
  Flame,
  Zap,
  Target,
  ArrowRight,
} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

function selectAIRecommendedProgram(
  programs: ProgramSummary[],
  profile?: {
    preferred_training_days?: number | null;
    preferred_session_duration?: number | null;
    goal?: string | null;
    experience_level?: string | null;
  } | null,
): { program: ProgramSummary; reason: string } | null {
  if (!programs || programs.length === 0) return null;

  const targetDays = profile?.preferred_training_days ?? 3;
  const duration = profile?.preferred_session_duration ?? 60;
  const goal = profile?.goal ?? 'muscle_gain';

  let selected: ProgramSummary | undefined;
  let reason = '';

  // 1. Exact days match
  const exactMatches = programs.filter((p) => p.days_count === targetDays);

  if (exactMatches.length > 0) {
    if (goal === 'strength_gain') {
      selected =
        exactMatches.find(
          (p) => p.name.toLowerCase().includes('strength') || p.name.toLowerCase().includes('5x5'),
        ) || exactMatches[0];
    } else {
      selected = exactMatches.find((p) => !p.name.toLowerCase().includes('5x5')) || exactMatches[0];
    }
    reason = `Khớp chuẩn ${targetDays} buổi/tuần theo lịch tập của bạn. Thiết kế tối ưu cho các buổi tập ${duration} phút với mục tiêu ${
      goal === 'strength_gain' ? 'tăng sức mạnh' : 'phát triển cơ bắp'
    }.`;
  } else {
    // Handling 2 days or fewer
    if (targetDays <= 2) {
      selected = programs.find((p) => p.name.toLowerCase().includes('full body')) || programs[0];
      reason = `Hồ sơ của bạn chọn ${targetDays} buổi/tuần. AI đề xuất giáo án Full Body tinh gọn này (thực hiện 2 buổi/tuần cách nhau 3-4 ngày), kích thích toàn diện các nhóm cơ trong thời gian ngắn nhất.`;
    } else if (targetDays >= 6) {
      selected =
        programs.find((p) => p.name.toLowerCase().includes('ppl') && p.days_count === 6) ||
        programs.find((p) => p.days_count === 6) ||
        programs[0];
      reason = `Tần suất cao ${targetDays} buổi/tuần. AI đề xuất phân chia Push/Pull/Legs (PPL) để đảm bảo từng nhóm cơ được xoay vòng kích thích và phục hồi tối ưu.`;
    } else {
      const sortedByDiff = [...programs].sort(
        (a, b) => Math.abs(a.days_count - targetDays) - Math.abs(b.days_count - targetDays),
      );
      selected = sortedByDiff[0];
      reason = `Giáo án phù hợp nhất với tần suất ${targetDays} buổi/tuần và thời lượng ${duration} phút/buổi trong hồ sơ của bạn.`;
    }
  }

  return selected ? { program: selected, reason } : null;
}

export default async function ProgramsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ system, mine, activeId }, profileRes] = await Promise.all([
    fetchProgramSummaries(user.id),
    supabase
      .from('profiles')
      .select('preferred_training_days, preferred_session_duration, goal, experience_level, display_name')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const profile = profileRes.data;
  const recommendation = selectAIRecommendedProgram(system, profile);

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
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-5 sm:pt-6 pb-24 sm:pb-28">
        {/* Header */}
        <div className="mb-5 sm:mb-7">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-accent font-extrabold">
              Training Programs Suite
            </span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-ink tracking-tight">
            Chương trình tập
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1 max-w-2xl font-medium leading-relaxed">
            Chọn 1 giáo án làm lịch tập chính. Nhấn <strong className="text-ink">&quot;Chi tiết&quot;</strong> để xem từng buổi tập và hình giải phẫu nhóm cơ.
          </p>
        </div>

        {/* Mobile Training Library Switcher */}
        <TrainingLibraryTabs activeTab="programs" className="mb-5" />

        {/* AI Recommendation Banner if no active program */}
        {!activeId && recommendation && (
          <section className="mb-6 sm:mb-8 rounded-2xl sm:rounded-3xl border border-accent/40 bg-gradient-to-br from-accent/[0.14] via-accent/[0.04] to-transparent p-4 sm:p-7 shadow-neumorph-lg relative overflow-hidden">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
              <div className="space-y-2.5 sm:space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/20 px-3 py-1 font-mono text-[10px] font-extrabold uppercase tracking-widest text-accent shadow-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Coach Đề Xuất Dành Cho Bạn</span>
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-black text-ink tracking-tight flex items-center gap-2">
                    {recommendation.program.name_vi || recommendation.program.name}
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-sm text-ink-secondary leading-relaxed font-medium">
                    {recommendation.reason}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px] uppercase font-bold text-ink-muted">
                  <span className="inline-flex items-center gap-1.5 bg-black/[0.05] dark:bg-white/[0.08] px-2.5 py-1 rounded-lg border border-black/[0.05] dark:border-white/10 text-ink">
                    <Calendar className="h-3.5 w-3.5 text-accent" />
                    <span>{recommendation.program.days_count} buổi / tuần</span>
                  </span>
                  {recommendation.program.duration_weeks && (
                    <span className="inline-flex items-center gap-1.5 bg-black/[0.05] dark:bg-white/[0.08] px-2.5 py-1 rounded-lg border border-black/[0.05] dark:border-white/10 text-ink">
                      <Clock className="h-3.5 w-3.5 text-accent" />
                      <span>{recommendation.program.duration_weeks} tuần</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 bg-accent/10 px-2.5 py-1 rounded-lg border border-accent/20 text-accent">
                    <Flame className="h-3.5 w-3.5" />
                    <span>{getProgramMeta(recommendation.program.name_vi ?? recommendation.program.name).focus}</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-2.5 shrink-0 pt-1 lg:pt-0">
                <form action={activate.bind(null, recommendation.program.id)} className="w-full">
                  <button className="btn-primary w-full py-3 px-5 text-sm font-extrabold shadow-accent-lg flex items-center justify-center gap-2 hover:brightness-105 active:scale-95 cursor-pointer">
                    <Sparkles className="h-4 w-4" />
                    <span>Kích hoạt giáo án này</span>
                  </button>
                </form>
                <Link
                  href={`/programs/${recommendation.program.id}`}
                  className="btn-ghost w-full py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-1.5 rounded-xl border border-black/[0.08] dark:border-white/10 hover:text-accent transition-colors"
                >
                  <span>Xem chi tiết giáo án</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* System programs */}
        <section>
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent" strokeWidth={2} />
              <h2 className="font-mono text-xs uppercase tracking-widest text-ink-muted font-bold">
                Giáo án mẫu sẵn có ({system.length})
              </h2>
            </div>
            <span className="text-[10px] font-mono text-ink-muted hidden sm:inline">
              Chuẩn Volume khoa học
            </span>
          </div>

          {system.length === 0 ? (
            <div className="card shadow-neumorph-sm rounded-2xl p-8 text-center border border-white/80 dark:border-white/10">
              <p className="text-sm text-ink-muted">Chưa có chương trình mẫu.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {system.map((p) => {
                const isCurrentActive = activeId === p.id;
                const isRecommended = !activeId && recommendation?.program.id === p.id;
                const meta = getProgramMeta(p.name_vi ?? p.name);

                return (
                  <div
                    key={p.id}
                    className={`card shadow-neumorph-sm rounded-xl p-3.5 sm:p-4 flex flex-col justify-between border transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden ${
                      isCurrentActive
                        ? 'border-accent shadow-[0_0_20px_rgba(249,115,22,0.18)] dark:border-accent bg-accent/[0.02]'
                        : isRecommended
                        ? 'border-accent/60 shadow-[0_0_16px_rgba(249,115,22,0.15)] ring-1 ring-accent/40 bg-accent/[0.02]'
                        : 'border-white/80 dark:border-white/10 hover:border-accent/40'
                    }`}
                  >
                    <div>
                      {/* Top meta & status */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[9px] uppercase tracking-wider font-bold bg-black/[0.04] dark:bg-white/[0.06] text-ink-secondary dark:text-slate-300 border border-black/[0.04] dark:border-white/10">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                          {meta.focus}
                        </span>

                        {isCurrentActive ? (
                          <div className="flex items-center gap-1 shrink-0 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 led-pulse" />
                            <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-500 dark:text-emerald-400 font-extrabold">
                              Active
                            </span>
                          </div>
                        ) : isRecommended ? (
                          <div className="flex items-center gap-1 shrink-0 bg-accent/15 border border-accent/30 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.2)]">
                            <Sparkles className="h-3 w-3 text-accent" />
                            <span className="font-mono text-[9px] uppercase tracking-wider text-accent font-extrabold">
                              AI Đề Xuất
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {/* Program Title */}
                      <Link href={`/programs/${p.id}`} className="group block">
                        <h3 className="font-extrabold text-ink leading-snug text-sm sm:text-base tracking-tight group-hover:text-accent transition-colors">
                          {p.name || p.name_vi}
                        </h3>
                      </Link>

                      {/* Description */}
                      {p.description && (
                        <p className="text-[11.5px] sm:text-xs text-ink-secondary leading-snug mt-1 mb-2 line-clamp-2 font-medium">
                          {p.description}
                        </p>
                      )}
                    </div>

                    <div>
                      {/* Meta stats badges & Action buttons row */}
                      <div className="flex items-center justify-between gap-2 border-t border-black/[0.04] dark:border-white/10 pt-2.5 mt-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-ink-muted uppercase tracking-wider">
                          <span className="inline-flex items-center gap-1 bg-black/[0.03] dark:bg-white/[0.05] px-2 py-0.5 rounded-md border border-black/[0.04] dark:border-white/10 font-bold text-ink">
                            <Calendar className="h-3 w-3 text-accent" strokeWidth={2} />
                            <span>{p.days_count} buổi</span>
                          </span>
                          {p.duration_weeks && (
                            <span className="inline-flex items-center gap-1 bg-black/[0.03] dark:bg-white/[0.05] px-2 py-0.5 rounded-md border border-black/[0.04] dark:border-white/10 font-bold text-ink">
                              <Clock className="h-3 w-3 text-accent" strokeWidth={2} />
                              <span>{p.duration_weeks} tuần</span>
                            </span>
                          )}
                        </div>

                        {/* Inline Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Link
                            href={`/programs/${p.id}`}
                            className="btn-ghost text-[11px] px-2.5 py-1.5 flex items-center gap-1 rounded-lg font-bold hover:text-accent border border-black/[0.04] dark:border-white/10 transition-colors"
                            title="Xem chi tiết giáo án"
                          >
                            <span>Chi tiết</span>
                            <ChevronRight className="h-3 w-3" strokeWidth={2} />
                          </Link>

                          <form action={activate.bind(null, p.id)}>
                            <button
                              className={`text-[11px] px-3 py-1.5 rounded-lg font-extrabold tracking-tight transition-all cursor-pointer ${
                                isCurrentActive
                                  ? 'bg-success/10 border border-success/30 text-success cursor-default'
                                  : isRecommended
                                  ? 'btn-primary shadow-accent hover:brightness-105 active:scale-95 ring-2 ring-accent/40'
                                  : 'btn-primary shadow-accent hover:brightness-105 active:scale-95'
                              }`}
                              disabled={isCurrentActive}
                            >
                              {isCurrentActive ? '✓ Đang dùng' : 'Kích hoạt'}
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* My programs */}
        {mine.length > 0 && (
          <section className="mt-8 sm:mt-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-ink-muted" />
              <h2 className="font-mono text-xs uppercase tracking-widest text-ink-muted font-bold">
                Giáo án của tôi ({mine.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {mine.map((p) => (
                <Link
                  key={p.id}
                  href={`/programs/${p.id}`}
                  className="card shadow-neumorph-sm rounded-xl p-3.5 hover:shadow-neumorph transition-all group border border-white/80 dark:border-white/10 hover:border-accent/40 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-1 gap-2">
                      <h3 className="font-extrabold text-ink text-sm sm:text-base group-hover:text-accent transition-colors leading-snug">
                        {p.name || p.name_vi}
                      </h3>
                      <ChevronRight
                        className="h-4 w-4 text-ink-muted group-hover:text-accent transition-colors shrink-0"
                        strokeWidth={2}
                      />
                    </div>
                    {p.description && (
                      <p className="text-[11.5px] text-ink-secondary line-clamp-2 leading-snug">{p.description}</p>
                    )}
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-black/[0.04] dark:border-white/10 flex items-center gap-3 text-[10px] font-mono text-ink-muted uppercase tracking-wider">
                    <span className="inline-flex items-center gap-1 font-bold text-ink">
                      <Calendar className="h-3 w-3 text-accent" strokeWidth={2} />
                      {p.days_count} buổi / tuần
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
