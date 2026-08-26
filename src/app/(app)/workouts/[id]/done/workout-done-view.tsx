'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Trophy,
  Sparkles,
  Dumbbell,
  Check,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  HeartPulse,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import FeedbackForm from './feedback-form';
import type { WorkoutActualsV1 } from '@/lib/workouts/actuals';
import { formatDurationDistanceActual, formatLoad, formatMetricDuration, normalizeTrackingMode, type UnitSystem } from '@/lib/workouts/metrics';
import {
  buildWorkoutSummaryInsight,
  type PreviousExercisePerformance,
  type SummaryExerciseInput,
  type SummarySetInput,
  type WorkoutFeedbackValue,
} from '@/lib/workouts/summary-insights';
import { cleanDashes } from '@/lib/utils';

type WorkoutDoneViewProps = {
  workout: any;
  actuals: WorkoutActualsV1;
  sessionTitle: string;
  programTitle: string;
  durationMin: number;
  totalPlannedSets: number;
  completionRate: number;
  phaseSummary: Array<{ phase: string; count: number; completed: number; prescribedSeconds: number }>;
  completedExercises: any[];
  skippedExercises: any[];
  recentPrs: any[];
  previousByExercise: Record<string, PreviousExercisePerformance>;
  recoveryEstimate: { minHours: number; maxHours: number; label: string };
  unitSystem: UnitSystem;
};

export default function WorkoutDoneView({
  workout,
  actuals,
  sessionTitle: rawSessionTitle,
  programTitle: rawProgramTitle,
  durationMin,
  totalPlannedSets,
  completionRate,
  phaseSummary,
  completedExercises,
  skippedExercises,
  recentPrs,
  previousByExercise,
  recoveryEstimate,
  unitSystem,
}: WorkoutDoneViewProps) {
  const sessionTitle = cleanDashes(rawSessionTitle);
  const programTitle = cleanDashes(rawProgramTitle);
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [showSkippedSheet, setShowSkippedSheet] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<WorkoutFeedbackValue | null>(actuals.feedback);

  // Exercises to display (default top 3, or all when expanded)
  const displayedCompleted = showAllExercises
    ? completedExercises
    : completedExercises.slice(0, 3);

  const summaryExercises = React.useMemo<SummaryExerciseInput[]>(() => completedExercises
    .filter((exercise: any) => (
      (exercise.phase ?? 'main') === 'main'
      && normalizeTrackingMode(exercise.tracking_mode ?? exercise.prescription_mode, {
        targetWeight: exercise.target_weight,
        actualWeight: (exercise.workout_sets ?? []).find((set: any) => Number(set.weight) > 0)?.weight,
      }) === 'weight_reps'
    ))
    .map((exercise: any) => ({
      exerciseId: exercise.exercise_id,
      exerciseSlug: exercise.exercises?.slug ?? exercise.exercise_id,
      exerciseName: exercise.exercises?.name_vi || exercise.exercises?.name || 'Bài tập',
      targetRepMin: exercise.target_rep_min ?? null,
      targetRepMax: exercise.target_rep_max ?? null,
      sets: (exercise.workout_sets ?? []).map((set: any): SummarySetInput => ({
        setNumber: set.set_number ?? 0,
        weight: set.weight ?? null,
        reps: set.reps ?? null,
        rir: set.rir ?? null,
        perceivedEffort: set.perceived_effort ?? null,
        completed: Boolean(set.completed),
        setType: (set.set_type ?? 'working') as SummarySetInput['setType'],
      })),
    })), [completedExercises]);

  const workoutSummary = React.useMemo(() => buildWorkoutSummaryInsight({
    completionRate,
    completedSets: actuals.completedMainWorkingSets,
    totalPlannedSets,
    durationMinutes: durationMin,
    totalVolumeKg: actuals.totalVolumeKg,
    totalReps: actuals.totalReps,
    exercises: summaryExercises,
    previousByExercise,
    feedback: currentFeedback,
    recoveryEstimate,
  }), [
    completionRate,
    actuals.completedMainWorkingSets,
    actuals.totalVolumeKg,
    actuals.totalReps,
    totalPlannedSets,
    durationMin,
    summaryExercises,
    previousByExercise,
    currentFeedback,
    recoveryEstimate,
  ]);

  const actionByExercise = React.useMemo(
    () => new Map(workoutSummary.exerciseActions.map((action) => [action.exerciseId, action])),
    [workoutSummary.exerciseActions],
  );

  // Meaningful Highlight (PR or Top Achievement)
  const topHighlight = React.useMemo(() => {
    if (recentPrs && recentPrs.length > 0) {
      const pr = recentPrs[0];
      return {
        title: pr.exercises?.name_vi || pr.exercises?.name || 'Kỷ lục mới',
        value: formatLoad(Number(pr.value), unitSystem),
        subtitle: 'Kỷ lục mức tạ mới được thiết lập!',
      };
    }

    return null;
  }, [recentPrs, unitSystem]);

  return (
    <main className="min-h-screen bg-chassis blueprint-grid pb-24">
      {/* ── 1. COMPACT TOP HEADER ── */}
      <header className="sticky top-0 z-30 bg-chassis-hi/95 dark:bg-[#0c1017]/95 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08] shadow-xs">
        <div className="max-w-xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Tổng kết buổi tập</span>
          </Link>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-3.5 sm:px-4 pt-3.5 sm:pt-4 space-y-3.5">
        {/* ── 2. HERO: HOÀN THÀNH BUỔI TẬP (COMPACT REWARD) ── */}
        <section className="rounded-2xl border border-black/[0.08] dark:border-white/10 bg-gradient-to-br from-chassis-hi via-chassis to-chassis-lo p-3.5 sm:p-4 shadow-neumorph space-y-3">
          {/* Top Title Row: Completion status & percentage */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-extrabold uppercase tracking-wider text-accent">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              <span>HOÀN THÀNH BUỔI TẬP</span>
            </div>
            <span className="font-mono text-xs font-black text-accent bg-accent/10 px-2 py-0.5 rounded-lg border border-accent/20">
              {completionRate}%
            </span>
          </div>

          {/* Workout & Program Heading */}
          <div>
            <h1 className="text-lg sm:text-xl font-black text-ink tracking-tight leading-snug truncate">
              {sessionTitle}
            </h1>
            <p className="font-mono text-[11px] text-ink-muted font-bold truncate">
              {programTitle}
            </p>
          </div>

          {/* 4 Compact Metric Columns (Single Row on 390px+) */}
          <div className="grid grid-cols-4 gap-1 sm:gap-2 py-2 px-1 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] text-center">
            {/* Metric 1: Thời gian */}
            <div className="px-1 border-r border-black/[0.04] dark:border-white/[0.06]">
              <div className="font-mono text-base sm:text-lg font-black text-ink leading-tight">
                {durationMin}&apos;
              </div>
              <div className="font-mono text-[9px] sm:text-[10px] uppercase font-bold text-ink-muted mt-0.5">
                Thời gian
              </div>
            </div>

            {/* Metric 2: Số hiệp */}
            <div className="px-1 border-r border-black/[0.04] dark:border-white/[0.06]">
              <div className="font-mono text-base sm:text-lg font-black text-ink leading-tight">
                {actuals.completedMainWorkingSets}
              </div>
              <div className="font-mono text-[9px] sm:text-[10px] uppercase font-bold text-ink-muted mt-0.5">
                Hiệp
              </div>
            </div>

            {/* Metric 3: Tổng tải */}
            <div className="px-1 border-r border-black/[0.04] dark:border-white/[0.06]">
              <div className="font-mono text-base sm:text-lg font-black text-accent leading-tight">
                {formatLoad(actuals.totalVolumeKg, unitSystem)}
              </div>
              <div className="font-mono text-[9px] sm:text-[10px] uppercase font-bold text-ink-muted mt-0.5">
                Tổng tải
              </div>
            </div>

            {/* Metric 4: Tổng reps */}
            <div className="px-1">
              <div className="font-mono text-base sm:text-lg font-black text-ink leading-tight">
                {actuals.totalReps}
              </div>
              <div className="font-mono text-[9px] sm:text-[10px] uppercase font-bold text-ink-muted mt-0.5">
                Reps
              </div>
            </div>
          </div>

          {/* Progress Bar with minimal label */}
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-ink-muted px-0.5">
              <span>{actuals.completedMainWorkingSets} / {totalPlannedSets} hiệp</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </section>

        {/* ── 3. HIGHLIGHT / PR (CONDITIONAL - ONLY IF REAL DATA EXISTS) ── */}
        {topHighlight && (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-amber-500 font-extrabold block">
                  🏆 Điểm nhấn thành tích
                </span>
                <h3 className="font-extrabold text-sm text-ink">{topHighlight.title}</h3>
                <p className="text-[11px] text-ink-secondary">{topHighlight.subtitle}</p>
              </div>
            </div>
            <div className="font-mono text-sm font-black text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20 shrink-0">
              {topHighlight.value}
            </div>
          </section>
        )}

        <FeedbackForm
          workoutId={workout.id}
          initialFeedback={actuals.feedback}
          onFeedbackChange={setCurrentFeedback}
        />

        {/* ── 4. NEXT SESSION DECISION ── */}
        <section className="rounded-2xl border border-black/[0.08] dark:border-white/10 bg-chassis-hi dark:bg-[#0c121e] p-4 sm:p-5 shadow-neumorph space-y-3">
          <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.06] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/15 text-accent font-bold">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <h2 className="font-extrabold text-sm text-ink uppercase tracking-wide">
                Kết luận cho buổi sau
              </h2>
            </div>
            <span className="text-[10px] font-mono font-bold text-ink-muted rounded-lg border border-black/[0.06] dark:border-white/10 px-2 py-1">
              {workoutSummary.dataStatusLabel}
            </span>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-black text-ink leading-snug">
              {workoutSummary.headline}
            </h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              {workoutSummary.recap}
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] p-2.5">
            <TrendingUp className="h-4 w-4 text-accent mt-0.5 shrink-0" />
            <div>
              <div className="font-mono text-[10px] uppercase font-bold text-ink-muted mb-0.5">
                So với lần gần nhất
              </div>
              <p className="text-xs text-ink-secondary leading-relaxed">
                {workoutSummary.comparison}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-accent/[0.06] border border-accent/20 space-y-1">
            <span className="font-mono text-[10px] uppercase font-extrabold text-accent block">
              Việc cần làm ở buổi tới
            </span>
            <p className="text-xs text-ink leading-relaxed font-medium">
              {workoutSummary.nextSessionAction}
            </p>
          </div>
        </section>

        {/* ── 5. PHASE BREAKDOWN (CONDITIONALLY RENDER ONLY IF >= 2 PHASES) ── */}
        {phaseSummary.length >= 2 && (
          <section className="card shadow-neumorph rounded-2xl border border-black/[0.06] dark:border-white/10 bg-gradient-to-br from-chassis-hi via-chassis to-chassis-lo p-3.5 space-y-2">
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-accent" />
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Tiến độ theo giai đoạn
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {phaseSummary.map((summary) => (
                <div
                  key={summary.phase}
                  className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]"
                >
                  <div className="font-mono text-[9px] uppercase font-bold text-ink-muted">
                    {summary.phase === 'warmup' ? 'Khởi động' : summary.phase === 'main' ? 'Bài chính' : 'Giãn cơ'}
                  </div>
                  <div className="font-mono text-xs font-black text-ink mt-0.5">
                    {summary.completed}/{summary.count} bài
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 6. RECOVERY GUIDANCE ── */}
        <section className="card shadow-neumorph rounded-2xl border border-black/[0.06] dark:border-white/10 bg-gradient-to-br from-chassis-hi via-chassis to-chassis-lo p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-black/[0.04] dark:border-white/[0.06] pb-2.5">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-emerald-500" />
              <h2 className="font-extrabold text-sm text-ink uppercase tracking-wide">
                Phục hồi trước buổi sau
              </h2>
            </div>
            <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              Tải phục hồi: {recoveryEstimate.label}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20">
            <p className="text-xs text-ink-secondary leading-relaxed font-medium">
              {workoutSummary.recoveryNote}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] space-y-1">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
                <span>🥩</span>
                <span>Bữa ăn sau tập</span>
              </div>
              <p className="text-xs text-ink-secondary leading-snug font-medium">
                Ưu tiên bữa ăn quen thuộc có nguồn protein, tinh bột và rau phù hợp với khẩu phần hằng ngày.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] space-y-1">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-blue-500">
                <span>💧</span>
                <span>Nước và điện giải</span>
              </div>
              <p className="text-xs text-ink-secondary leading-snug font-medium">
                Uống theo cảm giác khát và tăng lượng bù nếu buổi tập nóng, dài hoặc ra nhiều mồ hôi.
              </p>
            </div>
          </div>
        </section>

        {/* ── 7. EXERCISE PERFORMANCE (TOP 3 + EXPANDABLE) ── */}
        <section className="card shadow-neumorph rounded-2xl border border-black/[0.06] dark:border-white/10 bg-gradient-to-br from-chassis-hi via-chassis to-chassis-lo p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.06] pb-2.5">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-accent" />
              <h2 className="font-extrabold text-sm text-ink uppercase tracking-wide">
                Hiệu suất bài tập
              </h2>
            </div>
            {completedExercises.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllExercises((prev) => !prev)}
                className="font-mono text-xs font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{showAllExercises ? 'Thu gọn' : `Xem tất cả (${completedExercises.length})`}</span>
                {showAllExercises ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
          </div>

          {/* List of completed exercises */}
          <div className="space-y-2">
            {displayedCompleted.map((we: any, idx: number) => {
              const ex = we.exercises;
              const sets = we.workout_sets ?? [];
              const trackingMode = normalizeTrackingMode(we.tracking_mode ?? we.prescription_mode, {
                targetWeight: we.target_weight,
                actualWeight: sets.find((set: any) => Number(set.weight) > 0)?.weight,
              });
              const cSets = sets.filter((s: any) => s.completed && s.set_type !== 'warmup');
              const exVol = cSets.reduce(
                (sum: number, s: any) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0),
                0
              );
              const topSet = [...cSets].sort(
                (a: any, b: any) => {
                  const weightDelta = (Number(b.weight) || 0) - (Number(a.weight) || 0);
                  return weightDelta !== 0 ? weightDelta : (Number(b.reps) || 0) - (Number(a.reps) || 0);
                }
              )[0];

              const gallery = ex?.gallery_json as any;
              const thumbUrl = gallery?.main || gallery?.views?.[0]?.src || null;
              const isLoaded = trackingMode === 'weight_reps';
              const exerciseAction = actionByExercise.get(we.exercise_id);
              const confidenceLabel = !exerciseAction || exerciseAction.confidence === 0
                ? 'Cần thêm dữ liệu'
                : exerciseAction.confidence >= 0.8
                  ? 'Tin cậy cao'
                  : exerciseAction.confidence >= 0.6
                    ? 'Tin cậy vừa'
                    : 'Tin cậy thấp';

              return (
                <div
                  key={we.id}
                  className="rounded-xl border border-black/[0.04] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] p-3 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-white border border-black/[0.06] dark:border-white/10 shrink-0 flex items-center justify-center">
                        {thumbUrl ? (
                          <Image
                            src={thumbUrl}
                            alt={ex?.name_vi || ex?.name || 'Bài tập'}
                            fill
                            sizes="40px"
                            className="object-contain p-0.5"
                          />
                        ) : (
                          <Dumbbell className="h-4 w-4 text-ink-muted opacity-40" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-extrabold text-xs text-ink truncate">
                          #{idx + 1} {ex?.name_vi || ex?.name}
                        </h3>
                        <p className="font-mono text-[10px] text-ink-muted">
                          {cSets.length}/{we.target_sets} hiệp
                          {isLoaded && exVol > 0 ? ` · ${formatLoad(exVol, unitSystem)}` : ''}
                        </p>
                      </div>
                    </div>

                    {topSet && isLoaded && Number(topSet.weight) > 0 && (
                      <div className="px-2 py-0.5 rounded-lg bg-accent/10 border border-accent/25 text-accent font-mono text-[11px] font-extrabold shrink-0">
                        Top: {formatLoad(Number(topSet.weight), unitSystem)} × {topSet.reps}
                      </div>
                    )}
                  </div>

                  {/* Sets chips */}
                  {cSets.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-black/[0.03] dark:border-white/[0.04]">
                      {cSets.map((s: any) => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
                        >
                          {trackingMode === 'weight_reps'
                            ? `${formatLoad(Number(s.weight), unitSystem)} × ${s.reps ?? 0}`
                            : trackingMode === 'reps'
                              ? `${s.reps ?? 0} lần`
                              : trackingMode === 'duration'
                                ? formatMetricDuration(Number(s.duration_seconds) || 0)
                                : formatDurationDistanceActual(s.duration_seconds, s.distance_meters, unitSystem)}
                        </span>
                      ))}
                    </div>
                  )}

                  {exerciseAction && (
                    <div className="rounded-lg border border-accent/15 bg-accent/[0.05] px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-mono text-[9px] uppercase font-extrabold text-accent">
                          Buổi tới
                        </span>
                        <span className="font-mono text-[9px] font-bold text-ink-muted">
                          {confidenceLabel}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-ink-secondary font-medium">
                        {exerciseAction.action}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Collapsed Skipped Exercises Row */}
          {skippedExercises.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowSkippedSheet((prev) => !prev)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] border border-dashed border-black/10 dark:border-white/15 text-xs font-bold text-ink-muted transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span>{skippedExercises.length} bài chưa thực hiện</span>
                </div>
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${showSkippedSheet ? 'rotate-90' : ''}`}
                />
              </button>

              {showSkippedSheet && (
                <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] mt-1.5 space-y-1.5 animate-in fade-in duration-150">
                  {skippedExercises.map((we: any) => (
                    <div
                      key={we.id}
                      className="flex items-center justify-between text-xs text-ink-muted font-mono"
                    >
                      <span>• {we.exercises?.name_vi || we.exercises?.name}</span>
                      <span>{we.target_sets} hiệp bỏ qua</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── 9. FINAL NAVIGATION CTAS (PROGRESS IS PRIMARY) ── */}
        <div className="space-y-2 pt-2">
          {/* Primary CTA */}
          <Link
            href="/progress"
            className="w-full h-12 rounded-2xl bg-accent hover:brightness-110 active:scale-[0.98] text-white font-extrabold text-sm shadow-accent-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <TrendingUp className="h-4 w-4 stroke-[2.5]" />
            <span>XEM TIẾN ĐỘ & KỶ LỤC →</span>
          </Link>

          {/* Secondary CTA */}
          <Link
            href="/dashboard"
            className="w-full h-10 rounded-xl bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-ink-muted hover:text-ink font-mono text-xs font-bold flex items-center justify-center transition-colors"
          >
            Về Trang Tổng Quan (Dashboard)
          </Link>
        </div>
      </div>
    </main>
  );
}
