'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clock3,
  Gauge,
  Plus,
  Sparkles,
  Timer,
  TrendingUp,
  Minus,
  Play,
  RotateCcw,
  ChevronRight,
  Trophy,
  Dumbbell,
  Hourglass,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { calculateTrainingVolume, suggestNextSet } from '@/lib/training/next-set';
import { RestTimerRing } from '@/components/rest-timer-ring';

export type TrackedSet = {
  id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rir: number | null;
  set_type: string;
  note?: string | null;
  completed: boolean;
  started_at: string | null;
  completed_at: string | null;
  actual_rest_seconds: number | null;
};

export type TrackingExercise = {
  id: string;
  target_sets: number;
  target_rep_min: number | null;
  target_rep_max: number | null;
  target_weight: number | null;
  rest_seconds: number | null;
  started_at: string | null;
  completed_at: string | null;
  workout_sets: TrackedSet[];
  previous_performance: { date: string; sets: { weight: number; reps: number }[] } | null;
};

type Props = {
  exercise: TrackingExercise;
  workoutStartedAt: string | null;
  onStartWorkout?: () => void;
  defaultRestSeconds: number | null;
  availableWeightsKg?: number[];
  onChange: (exercise: TrackingExercise) => void;
  onNextExercise?: () => void;
  nextExerciseName?: string | null;
  isLastExercise?: boolean;
};

const toNumber = (value: string) => (value === '' ? null : Number(value));

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function ObjectiveSetTracker({
  exercise,
  workoutStartedAt,
  onStartWorkout,
  defaultRestSeconds,
  availableWeightsKg,
  onChange,
  onNextExercise,
  nextExerciseName,
  isLastExercise = false,
}: Props) {
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [restDismissed, setRestDismissed] = useState(false);
  const [restAdjustment, setRestAdjustment] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const minReps = exercise.target_rep_min ?? 8;
  const maxReps = exercise.target_rep_max ?? 12;
  // Mặc định thời gian nghỉ giữa các hiệp là 2 phút (120s)
  const baseRest = 120;
  const completedSets = exercise.workout_sets.filter((set) => set.completed);
  const nextIncomplete = exercise.workout_sets.find((set) => !set.completed);
  const upcomingSets = exercise.workout_sets.filter(
    (set) => !set.completed && set.id !== nextIncomplete?.id,
  );
  const lastCompleted = [...completedSets]
    .filter((set) => set.completed_at)
    .sort((a, b) => Date.parse(b.completed_at!) - Date.parse(a.completed_at!))[0];

  const isAllSetsCompleted =
    exercise.workout_sets.length >= exercise.target_sets &&
    exercise.workout_sets.length > 0 &&
    exercise.workout_sets.every((set) => set.completed);

  const suggestion = useMemo(
    () =>
      suggestNextSet({
        targetRepMin: minReps,
        targetRepMax: maxReps,
        targetWeight: exercise.target_weight ?? nextIncomplete?.weight ?? null,
        baseRestSeconds: baseRest,
        currentSets: exercise.workout_sets,
        previousSets: exercise.previous_performance?.sets.map((set) => ({ ...set, completed: true })),
        availableWeightsKg,
      }),
    [
      availableWeightsKg,
      baseRest,
      exercise.previous_performance,
      exercise.target_weight,
      exercise.workout_sets,
      maxReps,
      minReps,
      nextIncomplete?.weight,
    ],
  );

  // Safeguard: Initialize target_sets in DB/state if exercise has 0 sets
  useEffect(() => {
    if (exercise.workout_sets.length === 0 && exercise.target_sets > 0) {
      async function initDefaultSets() {
        const supabase = createClient();
        const initial = [];
        for (let i = 1; i <= exercise.target_sets; i++) {
          initial.push({
            workout_exercise_id: exercise.id,
            set_number: i,
            set_type: 'working',
            weight: exercise.target_weight ?? suggestion.weight ?? null,
            reps: suggestion.reps ?? exercise.target_rep_min ?? 10,
            rir: null,
            completed: false,
          });
        }
        const { data, error: insertError } = await supabase.from('workout_sets').insert(initial).select();
        if (!insertError && data) {
          onChange({
            ...exercise,
            workout_sets: (data as TrackedSet[]).sort((a, b) => a.set_number - b.set_number),
          });
        }
      }
      initDefaultSets();
    }
  }, [exercise.id, exercise.workout_sets.length, exercise.target_sets]);

  const volume = calculateTrainingVolume(exercise.workout_sets);
  const workoutElapsed = workoutStartedAt ? Math.max(0, Math.floor((now - Date.parse(workoutStartedAt)) / 1000)) : 0;
  const exerciseEnd = exercise.completed_at ? Date.parse(exercise.completed_at) : now;
  const exerciseElapsed = exercise.started_at ? Math.max(0, Math.floor((exerciseEnd - Date.parse(exercise.started_at)) / 1000)) : 0;

  const restElapsed = lastCompleted?.completed_at
    ? Math.max(0, Math.floor((now - Date.parse(lastCompleted.completed_at)) / 1000))
    : 0;
  const recommendedRest = suggestion.restSeconds + restAdjustment;
  const restRemaining = Math.max(0, recommendedRest - restElapsed);
  const showRest =
    !!lastCompleted &&
    !restDismissed &&
    !exercise.completed_at &&
    (!nextIncomplete?.started_at || nextIncomplete.completed);

  function replaceSet(updatedSet: TrackedSet) {
    onChange({
      ...exercise,
      workout_sets: exercise.workout_sets.map((set) => (set.id === updatedSet.id ? updatedSet : set)),
    });
  }

  function patchSetLocally(id: string, patch: Partial<TrackedSet>) {
    onChange({
      ...exercise,
      workout_sets: exercise.workout_sets.map((set) => (set.id === id ? { ...set, ...patch } : set)),
    });
  }

  function adjustWeight(set: TrackedSet, delta: number) {
    const current = set.weight ?? suggestion.weight ?? 20;
    const updated = Math.max(0, current + delta);
    patchSetLocally(set.id, { weight: updated });
    persistSet({ ...set, weight: updated });
  }

  function adjustReps(set: TrackedSet, delta: number) {
    const current = set.reps ?? suggestion.reps ?? 10;
    const updated = Math.max(1, current + delta);
    patchSetLocally(set.id, { reps: updated });
    persistSet({ ...set, reps: updated });
  }

  async function persistSet(set: TrackedSet) {
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from('workout_sets')
      .update({ weight: set.weight, reps: set.reps })
      .eq('id', set.id)
      .select()
      .single();
    if (updateError) {
      setError('Không lưu được set. Hãy kiểm tra kết nối và thử lại.');
      return;
    }
    replaceSet(data as TrackedSet);
  }

  async function handleStartExercise() {
    if (!workoutStartedAt && onStartWorkout) {
      onStartWorkout();
    }
    setError(null);
    const supabase = createClient();
    const startedIso = new Date().toISOString();

    let updatedExercise = { ...exercise, started_at: startedIso };
    await supabase.from('workout_exercises').update({ started_at: startedIso }).eq('id', exercise.id);

    // If sets are empty, create default target_sets
    if (updatedExercise.workout_sets.length === 0) {
      const setsToInsert = [];
      for (let i = 1; i <= exercise.target_sets; i++) {
        setsToInsert.push({
          workout_exercise_id: exercise.id,
          set_number: i,
          set_type: 'working',
          weight: exercise.target_weight ?? suggestion.weight ?? null,
          reps: suggestion.reps ?? exercise.target_rep_min ?? 10,
          rir: null,
          completed: false,
          started_at: i === 1 ? startedIso : null,
        });
      }
      const { data } = await supabase.from('workout_sets').insert(setsToInsert).select();
      if (data) {
        updatedExercise.workout_sets = (data as TrackedSet[]).sort((a, b) => a.set_number - b.set_number);
      }
    } else {
      // Start set 1 (or first incomplete set)
      const firstIncomplete = updatedExercise.workout_sets.find((s) => !s.completed) ?? updatedExercise.workout_sets[0];
      if (firstIncomplete) {
        const { data } = await supabase
          .from('workout_sets')
          .update({ started_at: startedIso })
          .eq('id', firstIncomplete.id)
          .select()
          .single();
        if (data) {
          updatedExercise.workout_sets = updatedExercise.workout_sets.map((s) =>
            s.id === firstIncomplete.id ? (data as TrackedSet) : s,
          );
        }
      }
    }

    setRestDismissed(true);
    onChange(updatedExercise);
  }

  async function startSet(set: TrackedSet) {
    if (!workoutStartedAt && onStartWorkout) {
      onStartWorkout();
    }
    if (set.started_at) return;
    setError(null);
    const supabase = createClient();
    const startedAt = new Date().toISOString();

    let updatedExercise = exercise;
    if (!exercise.started_at) {
      const { error: exerciseError } = await supabase
        .from('workout_exercises')
        .update({ started_at: startedAt })
        .eq('id', exercise.id);
      if (exerciseError) {
        setError('Không thể bắt đầu bài tập. Vui lòng thử lại.');
        return;
      }
      updatedExercise = { ...updatedExercise, started_at: startedAt };
    }

    const previous = [...updatedExercise.workout_sets]
      .filter((candidate) => candidate.completed && candidate.completed_at && candidate.actual_rest_seconds == null)
      .sort((a, b) => Date.parse(b.completed_at!) - Date.parse(a.completed_at!))[0];
    if (previous) {
      const actualRest = Math.max(
        0,
        Math.min(86400, Math.round((Date.parse(startedAt) - Date.parse(previous.completed_at!)) / 1000)),
      );
      await supabase.from('workout_sets').update({ actual_rest_seconds: actualRest }).eq('id', previous.id);
      updatedExercise = {
        ...updatedExercise,
        workout_sets: updatedExercise.workout_sets.map((candidate) =>
          candidate.id === previous.id ? { ...candidate, actual_rest_seconds: actualRest } : candidate,
        ),
      };
    }

    const { data, error: setErrorResult } = await supabase
      .from('workout_sets')
      .update({ started_at: startedAt })
      .eq('id', set.id)
      .select()
      .single();
    if (setErrorResult) {
      setError('Không thể bắt đầu set. Vui lòng thử lại.');
      return;
    }
    setRestDismissed(true);
    setRestAdjustment(0);
    onChange({
      ...updatedExercise,
      workout_sets: updatedExercise.workout_sets.map((candidate) =>
        candidate.id === set.id ? (data as TrackedSet) : candidate,
      ),
    });
  }

  async function completeSet(set: TrackedSet) {
    if (!workoutStartedAt && onStartWorkout) {
      onStartWorkout();
    }
    const weightToSave = set.weight ?? suggestion.weight ?? (exercise.target_weight ?? 20);
    const repsToSave = set.reps ?? suggestion.reps ?? (exercise.target_rep_min ?? 10);

    if (weightToSave == null || weightToSave < 0 || repsToSave == null || repsToSave <= 0) {
      setError('Vui lòng chọn hoặc nhập mức tạ và số reps hợp lệ trước khi hoàn thành set.');
      return;
    }
    setError(null);
    const supabase = createClient();
    const completedAt = new Date().toISOString();
    const startedAt = set.started_at ?? completedAt;

    if (!exercise.started_at) {
      const { error: exerciseError } = await supabase
        .from('workout_exercises')
        .update({ started_at: startedAt })
        .eq('id', exercise.id);
      if (exerciseError) {
        setError('Không thể ghi thời điểm bắt đầu bài tập.');
        return;
      }
    }

    const { data, error: updateError } = await supabase
      .from('workout_sets')
      .update({
        weight: weightToSave,
        reps: repsToSave,
        started_at: startedAt,
        completed: true,
        completed_at: completedAt,
      })
      .eq('id', set.id)
      .select()
      .single();
    if (updateError) {
      setError('Không thể hoàn thành set. Dữ liệu nhập vẫn được giữ trên màn hình.');
      return;
    }
    setRestDismissed(false);
    setRestAdjustment(0);
    onChange({
      ...exercise,
      started_at: exercise.started_at ?? startedAt,
      workout_sets: exercise.workout_sets.map((candidate) => (candidate.id === set.id ? (data as TrackedSet) : candidate)),
    });
  }

  async function reopenSet(set: TrackedSet) {
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from('workout_sets')
      .update({ completed: false, completed_at: null, actual_rest_seconds: null })
      .eq('id', set.id)
      .select()
      .single();
    if (updateError) {
      setError('Không thể mở lại set để sửa.');
      return;
    }
    setRestDismissed(true);
    replaceSet(data as TrackedSet);
  }

  async function applySuggestion() {
    if (!nextIncomplete) return addSet();
    const patched = {
      ...nextIncomplete,
      weight: suggestion.weight ?? nextIncomplete.weight,
      reps: suggestion.reps,
    };
    replaceSet(patched);
    await persistSet(patched);
  }

  async function addSet() {
    setError(null);
    const supabase = createClient();
    const isBonus = isAllSetsCompleted || exercise.workout_sets.length >= exercise.target_sets;
    const newSet = {
      workout_exercise_id: exercise.id,
      set_number: exercise.workout_sets.length + 1,
      set_type: 'working' as const,
      note: isBonus ? 'bonus' : null,
      weight: suggestion.weight ?? (exercise.workout_sets.at(-1)?.weight ?? 20),
      reps: suggestion.reps ?? (exercise.workout_sets.at(-1)?.reps ?? 10),
      rir: null,
      completed: false,
    };
    const { data, error: insertError } = await supabase.from('workout_sets').insert(newSet).select().single();
    if (insertError) {
      console.error('Error inserting workout set:', insertError);
      setError(`Không thể thêm set mới: ${insertError.message}`);
      return;
    }
    setRestDismissed(true);
    onChange({ ...exercise, workout_sets: [...exercise.workout_sets, data as TrackedSet] });
  }

  return (
    <section className="mb-6 space-y-4">
      {/* ── TOP METRIC TILES ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          icon={Clock3}
          label="Buổi tập"
          value={workoutStartedAt ? formatDuration(workoutElapsed) : 'Chưa bắt đầu'}
          active={!!workoutStartedAt}
        />
        <Metric
          icon={Timer}
          label="Bài hiện tại"
          value={exercise.started_at ? formatDuration(exerciseElapsed) : 'Chưa bắt đầu'}
          active={!!exercise.started_at}
        />
        <Metric
          icon={Gauge}
          label="Tải tích lũy"
          value={`${volume.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} kg`}
          active={volume > 0}
        />
        <Metric
          icon={Check}
          label="Hoàn thành"
          value={`${completedSets.length}/${exercise.target_sets} sets`}
          active={completedSets.length > 0}
        />
      </div>

      {/* ── VIEW 1: PRE-EXERCISE SETUP (CHỈ HIỆN KHI BÀI TẬP CHƯA BẮT ĐẦU) ── */}
      {!exercise.started_at && !isAllSetsCompleted ? (
        <div className="rounded-2xl border-2 border-accent/40 bg-gradient-to-br from-accent/15 via-chassis-hi dark:via-[#0c121e] to-chassis p-5 sm:p-6 shadow-neumorph relative overflow-hidden animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-black/[0.05] dark:border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent text-white shadow-xs">
                <Dumbbell className="h-3.5 w-3.5" />
              </span>
              <span className="font-mono text-xs uppercase tracking-wider text-accent font-extrabold">
                Xác nhận bắt đầu bài tập
              </span>
            </div>
            <div className="font-mono text-xs font-semibold text-ink-muted">
              Kế hoạch: <strong className="text-ink font-extrabold">{exercise.target_sets} sets</strong>
            </div>
          </div>

          <h3 className="text-lg sm:text-xl font-extrabold text-ink tracking-tight">
            Mục tiêu & Gợi ý từ AI Coach
          </h3>

          {/* 3 Key Target Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 my-4">
            <div className="p-3 rounded-xl bg-chassis border border-black/5 dark:border-white/10 text-center shadow-neumorph-sm">
              <span className="block font-mono text-[9px] uppercase tracking-wider text-ink-muted font-bold">Số hiệp</span>
              <span className="mt-0.5 block font-mono text-base sm:text-lg font-extrabold text-accent">{exercise.target_sets} Sets</span>
            </div>
            <div className="p-3 rounded-xl bg-chassis border border-black/5 dark:border-white/10 text-center shadow-neumorph-sm">
              <span className="block font-mono text-[9px] uppercase tracking-wider text-ink-muted font-bold">Số Reps</span>
              <span className="mt-0.5 block font-mono text-base sm:text-lg font-extrabold text-ink">{minReps}-{maxReps}</span>
            </div>
            <div className="p-3 rounded-xl bg-chassis border border-black/5 dark:border-white/10 text-center shadow-neumorph-sm">
              <span className="block font-mono text-[9px] uppercase tracking-wider text-ink-muted font-bold">Mức tạ gợi ý</span>
              <span className="mt-0.5 block font-mono text-base sm:text-lg font-extrabold text-accent">
                {suggestion.weight != null ? `${suggestion.weight} kg` : 'Chọn mức tạ'}
              </span>
            </div>
          </div>

          {/* AI Strategy Note */}
          <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] mb-5">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-accent mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Chiến thuật thực hiện:</span>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed font-medium">
              {suggestion.reason || 'Khởi động kỹ khớp vai và khuỷu tay. Bắt đầu với mức tạ vừa sức để làm quen quỹ đạo động tác.'}
            </p>
          </div>

          {/* Main Call to Action Button */}
          <button
            type="button"
            onClick={handleStartExercise}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-[#d95d12] hover:bg-[#ea580c] dark:bg-[#c24e0b] dark:hover:bg-[#d95d12] text-white font-extrabold text-sm sm:text-base shadow-accent hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Bắt đầu bài tập (Vào hiệp 1)</span>
          </button>
        </div>
      ) : (
        /* ── VIEW 2: ACTIVE SEQUENTIAL SET LOGGING (KHI ĐÃ BẮT ĐẦU HOẶC HOÀN THÀNH) ── */
        <>
          {/* ── SMART AI COMPLETION BANNER (Khi đã hoàn thành tất cả các set) ── */}
          {isAllSetsCompleted ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-chassis-hi/80 dark:via-[#0c121e] to-chassis p-4 sm:p-5 shadow-neumorph relative overflow-hidden animate-in fade-in duration-200">
              {/* Header Status Bar */}
              <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-black/[0.05] dark:border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500 text-white shadow-xs">
                    <Trophy className="h-3 w-3" />
                  </span>
                  <span className="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-extrabold">
                    Hoàn thành chỉ tiêu ({completedSets.length}/{exercise.target_sets} sets)
                  </span>
                </div>
                <div className="font-mono text-xs font-semibold text-ink-muted">
                  Tổng tải: <span className="text-accent font-bold">{volume.toLocaleString('vi-VN')} kg</span>
                </div>
              </div>

              {/* AI Coach Detailed Insight */}
              <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] mb-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-accent">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Gợi ý từ AI Coach</span>
                </div>
                <p className="text-xs text-ink-secondary leading-relaxed font-medium">
                  {suggestion.reason || 'Bạn đã hoàn thành đủ số hiệp chính với mức tạ chuẩn khoa học.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px] text-ink-muted border-t border-black/[0.03] dark:border-white/[0.05]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent/70 shrink-0" />
                    <span><strong>Chuyển bài:</strong> Bảo toàn thể lực cho nhóm cơ kế tiếp.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent/70 shrink-0" />
                    <span><strong>Tập thêm:</strong> Thực hiện nếu còn sung sức để tối ưu pump cơ.</span>
                  </div>
                </div>
              </div>

              {/* 2 Compact Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* Action 1: Next Exercise / Complete Workout */}
                {onNextExercise && (
                  <button
                    type="button"
                    onClick={onNextExercise}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#d95d12] hover:bg-[#ea580c] dark:bg-[#c24e0b] dark:hover:bg-[#d95d12] text-white font-bold text-xs sm:text-sm shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <span>{isLastExercise ? 'Hoàn thành buổi tập' : `Sang bài tiếp: ${nextExerciseName ?? 'Bài tiếp theo'}`}</span>
                    <ChevronRight className="h-4 w-4 stroke-[2.5]" />
                  </button>
                )}

                {/* Action 2: Add 1 Bonus Set with AI */}
                <button
                  type="button"
                  onClick={addSet}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-chassis border border-black/10 dark:border-white/15 hover:border-accent/40 text-ink hover:text-accent font-bold text-xs sm:text-sm shadow-neumorph-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-accent" />
                  <span>Tập thêm 1 set ({suggestion.weight ?? (exercise.workout_sets.at(-1)?.weight ?? 10)}kg × {suggestion.reps ?? (exercise.workout_sets.at(-1)?.reps ?? 12)} reps)</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* ── CIRCULAR TACTICAL REST TIMER HUD ── */}
          {showRest && (
            <RestTimerRing
              totalSeconds={recommendedRest}
              remainingSeconds={restRemaining}
              elapsedSeconds={restElapsed}
              onAdjust={(delta) => setRestAdjustment((prev) => Math.max(-60, prev + delta))}
              onSkip={() => {
                if (nextIncomplete) {
                  startSet(nextIncomplete);
                } else {
                  setRestDismissed(true);
                }
              }}
              onDismiss={() => setRestDismissed(true)}
              lastSetNumber={lastCompleted?.set_number}
              lastWeight={lastCompleted?.weight}
              lastReps={lastCompleted?.reps}
              onUpdateLastSet={async (patch) => {
                if (!lastCompleted) return;
                const updated = { ...lastCompleted, ...patch };
                replaceSet(updated);
                await persistSet(updated);
              }}
              nextSetNumber={nextIncomplete?.set_number}
              nextWeight={suggestion.weight ?? nextIncomplete?.weight}
              nextReps={suggestion.reps ?? nextIncomplete?.reps}
              aiTip={suggestion.reason}
            />
          )}

          {error && (
            <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
              {error}
            </p>
          )}

          {/* ── SEQUENTIAL FOCUSED SET TRACKER ── */}
          <div className="card overflow-hidden rounded-2xl shadow-neumorph border border-black/[0.06] dark:border-white/10">
            <div className="flex items-center justify-between bg-chassis-lo dark:bg-black/20 px-4 py-3 border-b border-black/[0.04] dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_#f97316] led-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink font-bold">
                  Tiến độ Hiệp Tập ({completedSets.length}/{exercise.target_sets} Hoàn thành)
                </span>
              </div>
              <span className="font-mono text-[10px] font-bold text-accent">Mục tiêu {minReps}-{maxReps} reps</span>
            </div>

            <div className="p-3 sm:p-4 space-y-3">
              {/* 1. COMPLETED SETS (Gọn gàng, sạch sẽ) */}
              {completedSets.map((set) => (
                <div
                  key={set.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/[0.05] dark:bg-emerald-500/[0.03] border border-emerald-500/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white font-mono text-xs font-extrabold shadow-xs">
                      <Check className="h-4 w-4 stroke-[3]" />
                    </span>
                    <div>
                      <span className="font-mono text-xs font-bold text-ink">
                        Hiệp {set.set_number}: <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">{set.weight ?? 0} kg × {set.reps ?? 0} reps</strong>
                        {(set.note === 'bonus' || set.set_number > exercise.target_sets || set.set_type === 'bonus') && (
                          <span className="ml-1.5 text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold">
                            ★ Bonus
                          </span>
                        )}
                      </span>
                      {set.actual_rest_seconds != null && (
                        <span className="block font-mono text-[10px] text-ink-muted">
                          ⏱ Nghỉ sau set: {formatDuration(set.actual_rest_seconds)}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => reopenSet(set)}
                    className="btn-ghost text-xs px-2.5 py-1.5 rounded-lg text-ink-muted hover:text-ink border border-black/5 dark:border-white/10"
                    title="Chỉnh sửa lại số liệu hiệp này"
                  >
                    <RotateCcw className="h-3 w-3 inline mr-1" />
                    <span>Sửa</span>
                  </button>
                </div>
              ))}

              {/* 2. CURRENT ACTIVE WORKING SET (Chỉ duy nhất hiệp này hiển thị bộ công cụ nhập liệu) */}
              {nextIncomplete && (
                <div className="rounded-xl border-2 border-accent/40 bg-accent/[0.04] dark:bg-accent/[0.02] p-3.5 sm:p-4 shadow-sm">
                  {(() => {
                    const isBonus = nextIncomplete.note === 'bonus' || nextIncomplete.set_number > exercise.target_sets || nextIncomplete.set_type === 'bonus';
                    const isActive = nextIncomplete.started_at && !nextIncomplete.completed;
                    const activeElapsed = isActive
                      ? Math.max(0, Math.floor((now - Date.parse(nextIncomplete.started_at!)) / 1000))
                      : null;

                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        {/* Set Label & Live Stopwatch */}
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl font-mono text-sm font-extrabold bg-accent text-white shadow-accent shrink-0">
                            #{nextIncomplete.set_number}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs sm:text-sm font-bold text-ink">
                                {isBonus ? `Hiệp Bonus ${nextIncomplete.set_number}` : `Hiệp ${nextIncomplete.set_number}`}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-accent bg-accent/15 px-2 py-0.5 rounded-md led-pulse">
                                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                                {isActive ? 'ĐANG TẬP' : 'SẴN SÀNG'}
                              </span>
                            </div>

                            {activeElapsed != null ? (
                              <div className="flex items-center gap-1.5 font-mono text-xs font-extrabold text-accent mt-0.5">
                                <Timer className="h-3.5 w-3.5 animate-spin" />
                                <span>Thời gian set: {formatDuration(activeElapsed)}</span>
                              </div>
                            ) : (
                              <span className="font-mono text-[10px] text-ink-muted mt-0.5 block">
                                Gợi ý: {suggestion.weight ?? 20}kg × {suggestion.reps ?? 10} reps
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Weight & Reps Steppers */}
                        <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
                          {/* Weight Stepper */}
                          <div className="flex flex-col">
                            <span className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-widest text-ink-muted">
                              Mức tạ (Kg)
                            </span>
                            <div className="flex items-center rounded-xl bg-chassis border border-black/5 dark:border-white/10 shadow-inset-sm p-1">
                              <button
                                type="button"
                                onClick={() => adjustWeight(nextIncomplete, -2.5)}
                                className="h-7 w-7 rounded-lg bg-chassis-hi hover:bg-accent/15 hover:text-accent flex items-center justify-center font-bold text-ink-muted transition-colors cursor-pointer"
                                title="Giảm 2.5kg"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step={0.5}
                                value={nextIncomplete.weight ?? ''}
                                onChange={(event) =>
                                  patchSetLocally(nextIncomplete.id, { weight: toNumber(event.target.value) })
                                }
                                onBlur={() => persistSet(nextIncomplete)}
                                className="w-16 sm:w-20 bg-transparent text-center font-mono text-sm font-extrabold text-ink focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder={suggestion.weight ? String(suggestion.weight) : '20'}
                              />
                              <button
                                type="button"
                                onClick={() => adjustWeight(nextIncomplete, 2.5)}
                                className="h-7 w-7 rounded-lg bg-chassis-hi hover:bg-accent/15 hover:text-accent flex items-center justify-center font-bold text-ink-muted transition-colors cursor-pointer"
                                title="Tăng 2.5kg"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {/* Reps Stepper */}
                          <div className="flex flex-col">
                            <span className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-widest text-ink-muted">
                              Số Reps
                            </span>
                            <div className="flex items-center rounded-xl bg-chassis border border-black/5 dark:border-white/10 shadow-inset-sm p-1">
                              <button
                                type="button"
                                onClick={() => adjustReps(nextIncomplete, -1)}
                                className="h-7 w-7 rounded-lg bg-chassis-hi hover:bg-accent/15 hover:text-accent flex items-center justify-center font-bold text-ink-muted transition-colors cursor-pointer"
                                title="Giảm 1 rep"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                value={nextIncomplete.reps ?? ''}
                                onChange={(event) =>
                                  patchSetLocally(nextIncomplete.id, { reps: toNumber(event.target.value) })
                                }
                                onBlur={() => persistSet(nextIncomplete)}
                                className="w-14 sm:w-16 bg-transparent text-center font-mono text-sm font-extrabold text-ink focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder={suggestion.reps ? String(suggestion.reps) : '10'}
                              />
                              <button
                                type="button"
                                onClick={() => adjustReps(nextIncomplete, 1)}
                                className="h-7 w-7 rounded-lg bg-chassis-hi hover:bg-accent/15 hover:text-accent flex items-center justify-center font-bold text-ink-muted transition-colors cursor-pointer"
                                title="Tăng 1 rep"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {/* Action Button: Xong Set or Vào Set */}
                          <div className="flex items-end self-end sm:self-center pt-3 sm:pt-0">
                            {!nextIncomplete.started_at ? (
                              <button
                                type="button"
                                onClick={() => startSet(nextIncomplete)}
                                className="btn-primary text-xs px-4 py-2.5 rounded-xl font-extrabold flex items-center gap-1.5 shadow-accent hover:scale-105 transition-transform cursor-pointer"
                              >
                                <Play className="h-3.5 w-3.5 fill-current" />
                                <span>VÀO HIỆP {nextIncomplete.set_number}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => completeSet(nextIncomplete)}
                                className="btn-primary text-xs px-4 sm:px-5 py-2.5 rounded-xl font-extrabold flex items-center gap-1.5 shadow-accent hover:scale-105 transition-transform cursor-pointer"
                              >
                                <Check className="h-4 w-4 stroke-[2.5]" />
                                <span>XONG HIỆP {nextIncomplete.set_number}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 3. UPCOMING SETS (Hàng chờ các hiệp tiếp theo - Hiển thị nhẹ nhàng) */}
              {upcomingSets.map((set) => (
                <div
                  key={set.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-black/[0.015] dark:bg-white/[0.02] border border-dashed border-black/[0.06] dark:border-white/[0.08] opacity-70"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-chassis text-ink-muted font-mono text-xs font-bold border border-black/5 dark:border-white/10">
                      #{set.set_number}
                    </span>
                    <span className="font-mono text-xs text-ink-muted">
                      Hiệp {set.set_number}{' '}
                      <span className="text-[11px] text-ink-muted/80">
                        ({nextIncomplete ? `Chờ xong hiệp ${nextIncomplete.set_number}` : 'Chờ bắt đầu'})
                      </span>
                    </span>
                  </div>

                  <span className="font-mono text-[10px] text-ink-muted font-bold">
                    Mục tiêu {minReps}-{maxReps} reps
                  </span>
                </div>
              ))}
            </div>

            {/* Add Set Footer Button */}
            <button
              type="button"
              onClick={addSet}
              className="flex w-full items-center justify-center gap-2 border-t border-black/[0.06] dark:border-white/10 py-3.5 text-sm font-bold text-ink-secondary hover:text-accent hover:bg-accent/5 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm hiệp tập (Set mới)</span>
            </button>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-chassis-hi dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-secondary shadow-inset-sm">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>
              <strong>Tải tích lũy:</strong> Tổng kg × reps của các set đã hoàn thành. Hệ thống tự động ghi nhận thời gian tập của từng hiệp và kích hoạt đồng hồ nghỉ thông minh.
            </span>
          </div>
        </>
      )}
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  active = false,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div className="card rounded-2xl p-3.5 shadow-neumorph-sm border border-black/[0.04] dark:border-white/[0.08] transition-all">
      <div className="flex items-center gap-1.5 font-mono text-[8px] font-bold uppercase tracking-wider text-ink-muted">
        <Icon className={`h-3.5 w-3.5 ${active ? 'text-accent' : 'text-ink-muted'}`} />
        <span>{label}</span>
      </div>
      <p className="mt-1 truncate font-mono text-sm sm:text-base font-extrabold tabular-nums text-ink">
        {value}
      </p>
    </div>
  );
}
