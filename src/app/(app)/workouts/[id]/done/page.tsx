import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  Activity,
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  HeartPulse,
  Layers,
  Repeat2,
  Sparkles,
  Target,
  Timer,
  Trophy,
  TrendingUp,
  Weight,
  Zap,
} from 'lucide-react';
import FeedbackForm from './feedback-form';

export default async function WorkoutDonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  let workout: any = null;

  const { data: fullWorkout, error: fullError } = await supabase
    .from('workouts')
    .select(`
      id,
      status,
      started_at,
      completed_at,
      planned_duration,
      training_program_days:training_program_day_id (
        id,
        name,
        name_vi,
        day_of_week,
        training_programs (
          id,
          name,
          name_vi
        )
      ),
      workout_exercises (
        id,
        target_sets,
        target_rep_min,
        target_rep_max,
        target_weight,
        rest_seconds,
        phase,
        prescription_mode,
        duration_seconds,
        hold_seconds,
        per_side,
        started_at,
        completed_at,
        exercises (
          id,
          slug,
          name,
          name_vi,
          gallery_json,
          exercise_muscles (
            role,
            muscles (
              id,
              name,
              name_vi,
              slug
            )
          )
        ),
        workout_sets (
          id,
          set_number,
          weight,
          reps,
          rir,
          set_type,
          note,
          completed,
          started_at,
          completed_at,
          actual_rest_seconds
        )
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (fullWorkout) {
    workout = fullWorkout;
  } else {
    // Fallback simpler query
    const { data: simpleWorkout } = await supabase
      .from('workouts')
      .select(`
        id,
        status,
        started_at,
        completed_at,
        planned_duration,
        workout_exercises (
          id,
          target_sets,
          target_rep_min,
          target_rep_max,
          target_weight,
          rest_seconds,
          phase,
          prescription_mode,
          duration_seconds,
          hold_seconds,
          per_side,
          started_at,
          completed_at,
          exercises (
            id,
            slug,
            name,
            name_vi,
            gallery_json
          ),
          workout_sets (
            id,
            set_number,
            weight,
            reps,
            rir,
            set_type,
            note,
            completed,
            started_at,
            completed_at,
            actual_rest_seconds
          )
        )
      `)
      .eq('id', id)
      .maybeSingle();

    workout = simpleWorkout;
  }

  if (!workout) notFound();

  const exercises = workout.workout_exercises ?? [];
  const mainExercises = exercises.filter((we: any) =>
    (we.phase ?? 'main') === 'main' && (we.prescription_mode ?? 'reps') === 'reps',
  );
  const allSets = mainExercises.flatMap((we: any) => we.workout_sets ?? []);
  const completedSets = allSets.filter((s: any) => s.completed && s.set_type !== 'warmup');
  const totalCompletedSets = completedSets.length;
  const totalPlannedSets = mainExercises.reduce((acc: number, we: any) => acc + (we.target_sets ?? 0), 0);
  const completionRate = totalPlannedSets > 0 ? Math.min(100, Math.round((totalCompletedSets / totalPlannedSets) * 100)) : 100;

  const totalVolume = completedSets
    .filter((s: any) => s.set_type !== 'warmup')
    .reduce((acc: number, s: any) => acc + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);

  const totalReps = completedSets.reduce((acc: number, s: any) => acc + (Number(s.reps) || 0), 0);

  const durationMin = workout.started_at && workout.completed_at
    ? Math.max(1, Math.round((new Date(workout.completed_at).getTime() - new Date(workout.started_at).getTime()) / 60000))
    : workout.planned_duration || null;

  // Muscle Volume Distribution calculation (Primary Target Muscles only)
  const primaryMusclesMap: Record<string, { name: string; sets: number; volume: number }> = {};

  for (const we of mainExercises) {
    const exMuscles = (we.exercises as any)?.exercise_muscles ?? [];
    const weCompleted = (we.workout_sets ?? []).filter((s: any) => s.completed && s.set_type !== 'warmup');
    if (weCompleted.length === 0) continue;
    const weVol = weCompleted.reduce((acc: number, s: any) => acc + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);

    const primaryEm = exMuscles.filter((em: any) => em.role === 'primary');
    // If no explicit primary role tagged, fallback to first/all
    const targets = primaryEm.length > 0 ? primaryEm : exMuscles;

    for (const em of targets) {
      const mName = em.muscles?.name_vi || em.muscles?.name;
      if (!mName) continue;
      if (!primaryMusclesMap[mName]) {
        primaryMusclesMap[mName] = { name: mName, sets: 0, volume: 0 };
      }
      primaryMusclesMap[mName].sets += weCompleted.length;
      primaryMusclesMap[mName].volume += weVol;
    }
  }

  const primaryBreakdown = Object.values(primaryMusclesMap).filter((m) => m.sets > 0).sort((a, b) => b.sets - a.sets);
  const primarySummary = primaryBreakdown.map((m) => `${m.name} (${m.sets} sets)`).join(', ');

  const phaseSummary = (['warmup', 'main', 'cooldown'] as const).map((phase) => {
    const phaseExercises = exercises.filter((we: any) => (we.phase ?? 'main') === phase);
    const completed = phaseExercises.filter((we: any) => {
      const mode = we.prescription_mode ?? 'reps';
      return mode === 'reps'
        ? (we.workout_sets ?? []).some((set: any) => set.completed)
        : Boolean(we.completed_at);
    }).length;
    const prescribedSeconds = phaseExercises.reduce((total: number, we: any) => {
      const mode = we.prescription_mode ?? 'reps';
      const seconds = mode === 'time' ? we.duration_seconds : mode === 'hold' ? we.hold_seconds : 0;
      return total + (Number(seconds) || 0) * (we.per_side ? 2 : 1);
    }, 0);
    return { phase, count: phaseExercises.length, completed, prescribedSeconds };
  }).filter((summary) => summary.count > 0);

  // Performance Score calculation (1-100)
  const baseScore = Math.min(100, Math.round(completionRate * 0.7 + Math.min(25, totalCompletedSets * 3) + (totalVolume > 500 ? 5 : 0)));
  const performanceGrade = baseScore >= 95 ? 'S · Xuất Sắc' : baseScore >= 88 ? 'A+ · Vượt Trội' : baseScore >= 75 ? 'A · Rất Tốt' : 'B · Hoàn Thành';

  const dayData = workout.training_program_days as any;
  const programData = dayData?.training_programs as any;
  const sessionTitle = dayData?.name_vi || dayData?.name || 'Buổi tập';
  const programTitle = programData?.name_vi || programData?.name || 'GymAI Training Program';

  return (
    <main className="min-h-screen bg-chassis blueprint-grid pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-5 space-y-4">

        {/* ── UNIFIED COMPACT EXECUTIVE HERO & STATS ── */}
        <div className="card shadow-neumorph rounded-2xl p-4 sm:p-5 border border-white/80 dark:border-white/10 bg-gradient-to-br from-chassis-hi via-chassis to-chassis-lo space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Compact Trophy Rank Icon */}
              <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white shadow-xs flex items-center justify-center shrink-0 border border-orange-400/40">
                <Trophy className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-sm" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_#f97316] led-pulse" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-accent font-extrabold">
                    Hoàn thành buổi tập · {performanceGrade}
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-black text-ink tracking-tight">
                  {sessionTitle}
                </h1>
                <p className="font-mono text-[10px] uppercase text-ink-muted font-bold tracking-wider">
                  {programTitle}
                </p>
              </div>
            </div>

            {/* Quick Completion Pill */}
            <div className="self-start sm:self-center flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06]">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <span className="font-mono text-xs font-extrabold text-ink">
                {totalCompletedSets}/{totalPlannedSets} sets ({completionRate}%)
              </span>
            </div>
          </div>

          {/* 4 Stat Badges in a compact strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-black/[0.04] dark:border-white/[0.06]">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
              <div className="h-7 w-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0 font-bold">
                <Clock className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-sm sm:text-base font-black text-ink leading-none">
                  {durationMin ? `${durationMin}'` : '—'}
                </div>
                <div className="font-mono text-[9px] uppercase font-bold text-ink-muted mt-0.5">
                  Thời gian
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
              <div className="h-7 w-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0 font-bold">
                <Weight className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-sm sm:text-base font-black text-accent leading-none">
                  {Math.round(totalVolume)} <span className="text-[10px] font-bold text-ink-muted">kg</span>
                </div>
                <div className="font-mono text-[9px] uppercase font-bold text-ink-muted mt-0.5">
                  Tải tích lũy
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 font-bold">
                <Repeat2 className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-sm sm:text-base font-black text-ink leading-none">
                  {totalCompletedSets} <span className="text-[10px] font-bold text-ink-muted">sets</span>
                </div>
                <div className="font-mono text-[9px] uppercase font-bold text-ink-muted mt-0.5">
                  Tổng hiệp
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 font-bold">
                <Zap className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-sm sm:text-base font-black text-ink leading-none">
                  {totalReps} <span className="text-[10px] font-bold text-ink-muted">reps</span>
                </div>
                <div className="font-mono text-[9px] uppercase font-bold text-ink-muted mt-0.5">
                  Tổng số rep
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="card shadow-neumorph-sm rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent" />
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Tiến độ theo giai đoạn
            </h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {phaseSummary.map((summary) => (
              <div key={summary.phase} className="rounded-xl bg-black/[0.025] p-3 dark:bg-white/[0.04]">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  {summary.phase === 'warmup' ? 'Khởi động' : summary.phase === 'main' ? 'Bài chính' : 'Hạ nhiệt'}
                </div>
                <div className="mt-1 font-mono text-sm font-black text-ink">
                  {summary.completed}/{summary.count} bài
                  {summary.prescribedSeconds > 0 && (
                    <span className="ml-2 text-[10px] text-ink-muted">
                      · {Math.ceil(summary.prescribedSeconds / 60)} phút dự kiến
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── AI COACH DEEP DIVE INSIGHTS ── */}
        <section className="card shadow-neumorph rounded-3xl p-5 sm:p-6 border border-accent/25 bg-gradient-to-br from-accent/[0.05] via-chassis to-chassis-lo/90 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/10 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-accent/15 text-accent border border-accent/30 flex items-center justify-center shadow-xs shrink-0 font-bold">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-ink">Phân tích chuyên sâu từ AI Coach</h2>
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Đánh giá tải cơ học & Hiệu suất sinh lý
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-xl bg-accent/15 border border-accent/30 text-accent font-mono text-xs font-black shadow-xs">
              {baseScore}/100 ĐIỂM
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-ink">
                <Activity className="h-4 w-4 text-accent" />
                <span>Cường độ & Tải cơ bắp (Overload)</span>
              </div>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Tập trung trực tiếp vào <strong>{primarySummary || 'nhóm cơ mục tiêu'}</strong> với tổng tải đạt <strong>{Math.round(totalVolume)} kg</strong> qua <strong>{totalCompletedSets} hiệp tập</strong>. Mức kích thích cơ bắp đạt chuẩn khoa học cho quá trình phì đại cơ (Hypertrophy).
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-ink">
                <Flame className="h-4 w-4 text-accent" />
                <span>Phân bổ nhóm cơ tập luyện</span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {primaryBreakdown.length > 0 ? (
                  primaryBreakdown.map((m) => (
                    <span
                      key={m.name}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/15 border border-accent/30 text-ink font-mono text-xs font-bold shadow-xs"
                    >
                      <span className="h-2 w-2 rounded-full bg-accent" />
                      <span>{m.name}</span>
                      <span className="text-accent font-black">({m.sets} sets)</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-ink-muted">Toàn bộ nhóm cơ mục tiêu</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── DETAILED EXERCISE PERFORMANCE BREAKDOWN ── */}
        <section className="card shadow-neumorph rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-accent" />
              <h2 className="font-extrabold text-base text-ink">Thành tích từng bài tập</h2>
            </div>
            <span className="font-mono text-xs font-bold text-ink-muted">
              {mainExercises.length} bài chính
            </span>
          </div>

          <div className="space-y-3">
            {mainExercises.map((we: any, idx: number) => {
              const ex = we.exercises;
              const sets = we.workout_sets ?? [];
              const cSets = sets.filter((s: any) => s.completed && s.set_type !== 'warmup');
              const exVol = cSets.reduce((sum: number, s: any) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
              const topSet = [...cSets].sort((a: any, b: any) => (Number(b.weight) || 0) - (Number(a.weight) || 0))[0];

              const gallery = ex?.gallery_json as any;
              const thumbUrl = gallery?.main || gallery?.views?.[0]?.src || null;

              return (
                <div
                  key={we.id}
                  className="rounded-2xl border border-black/[0.06] dark:border-white/10 bg-gradient-to-br from-chassis-hi/80 to-chassis-lo/80 p-3.5 sm:p-4 transition-all"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Exercise Thumbnail */}
                      <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden bg-white border border-black/[0.06] dark:border-white/10 shrink-0 flex items-center justify-center shadow-xs">
                        {thumbUrl ? (
                          <Image
                            src={thumbUrl}
                            alt={ex?.name_vi || ex?.name || 'Bài tập'}
                            fill
                            className="object-contain p-0.5"
                          />
                        ) : (
                          <Dumbbell className="h-5 w-5 text-ink-muted opacity-40" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/25">
                            #{idx + 1}
                          </span>
                          <h3 className="font-extrabold text-sm text-ink truncate">
                            {ex?.name_vi || ex?.name}
                          </h3>
                        </div>
                        <p className="font-mono text-[9px] uppercase text-ink-muted truncate mt-0.5">
                          {ex?.slug}
                        </p>
                      </div>
                    </div>

                    {/* Stats & Top Set Badges */}
                    <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-black/[0.04] dark:border-white/[0.06]">
                      {topSet && (
                        <div className="px-2.5 py-1 rounded-xl bg-orange-500/10 border border-orange-500/25 text-orange-600 dark:text-orange-400 font-mono text-xs font-extrabold">
                          🔥 Top: {topSet.weight ?? 0}kg × {topSet.reps ?? 0}
                        </div>
                      )}
                      <div className="px-2.5 py-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] font-mono text-xs font-bold text-ink">
                        {cSets.length}/{we.target_sets} sets ({Math.round(exVol)} kg)
                      </div>
                    </div>
                  </div>

                  {/* Individual Set Bubbles */}
                  {cSets.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-black/[0.04] dark:border-white/[0.06]">
                      {cSets.map((s: any) => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400"
                        >
                          S{s.set_number}: {s.weight ?? 0}kg × {s.reps ?? 0}r
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── AI RECOVERY & NUTRITION PROTOCOL ── */}
        <section className="card shadow-neumorph rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-black/[0.06] dark:border-white/10 pb-3">
            <HeartPulse className="h-5 w-5 text-emerald-500" />
            <div>
              <h2 className="font-extrabold text-base text-ink">Chiến lược phục hồi sau buổi tập</h2>
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                Tối ưu hóa tổng hợp Protein & Bù khoáng
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] space-y-1">
              <span className="font-mono text-[10px] uppercase font-bold text-accent block">
                🥩 Nạp Protein (2h tới)
              </span>
              <p className="font-mono text-base font-black text-ink">
                {totalVolume > 2000 ? '35g - 45g' : '25g - 35g'}
              </p>
              <p className="text-[11px] text-ink-secondary leading-snug">
                Whey hoặc thịt nạc + tinh bột hấp thụ nhanh để bù glycogen.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] space-y-1">
              <span className="font-mono text-[10px] uppercase font-bold text-blue-500 block">
                💧 Bù nước & Điện giải
              </span>
              <p className="font-mono text-base font-black text-ink">
                500ml - 750ml
              </p>
              <p className="text-[11px] text-ink-secondary leading-snug">
                Bổ sung nước lọc hoặc nước dừa / khoáng để chống chuột rút.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] space-y-1">
              <span className="font-mono text-[10px] uppercase font-bold text-emerald-500 block">
                ⏳ Thời gian hồi cơ
              </span>
              <p className="font-mono text-base font-black text-ink">
                36 - 48 Giờ
              </p>
              <p className="text-[11px] text-ink-secondary leading-snug">
                Nhóm cơ hôm nay cần 2 ngày nghỉ ngơi trước khi tập lại.
              </p>
            </div>
          </div>
        </section>

        {/* ── ENHANCED FEEDBACK FORM ── */}
        <FeedbackForm workoutId={workout.id} />

        {/* ── FOOTER NAVIGATION ACTIONS ── */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Link
            href="/progress"
            className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-chassis hover:bg-chassis-hi text-ink font-bold text-xs sm:text-sm shadow-neumorph-sm flex items-center justify-center gap-2 transition-all"
          >
            <TrendingUp className="h-4 w-4 text-accent" />
            <span>Xem Báo Cáo Tiến Độ & Kỷ Lục</span>
          </Link>

          <Link
            href="/dashboard"
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[#d95d12] hover:bg-[#ea580c] dark:bg-[#c24e0b] dark:hover:bg-[#d95d12] text-white font-extrabold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.005]"
          >
            <span>Về Trang Tổng Quan (Dashboard)</span>
            <ChevronRight className="h-4 w-4 stroke-[2.5]" />
          </Link>
        </div>

      </div>
    </main>
  );
}
