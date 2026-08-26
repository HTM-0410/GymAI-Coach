'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  Plus,
  Sparkles,
  Trophy,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { calculateTrainingVolume, suggestNextSet } from '@/lib/training/next-set';
import {
  stripLegacyPerceivedEffortNote,
  type PerceivedEffort,
} from '@/lib/workouts/perceived-effort';
import CurrentSetLogger from './components/current-set-logger';
import CompactRestTimer from './components/compact-rest-timer';
import CompletedSetsCompact from './components/completed-sets-compact';
import { normalizeTrackingMode, type TrackingMode, type UnitSystem } from '@/lib/workouts/metrics';

export type { PerceivedEffort } from '@/lib/workouts/perceived-effort';

export type TrackedSet = {
  id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  rir: number | null;
  perceived_effort?: PerceivedEffort | null;
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
  tracking_mode?: TrackingMode | null;
  prescription_mode?: string | null;
  target_rir?: number | null;
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
  unitSystem?: UnitSystem;
  onChange: (exercise: TrackingExercise) => void;
  onNextExercise?: () => void;
  nextExerciseName?: string | null;
  isLastExercise?: boolean;
};

export default function ObjectiveSetTracker({
  exercise,
  workoutStartedAt,
  onStartWorkout,
  defaultRestSeconds,
  availableWeightsKg,
  unitSystem = 'metric',
  onChange,
  onNextExercise,
  nextExerciseName,
  isLastExercise = false,
}: Props) {
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [restDismissed, setRestDismissed] = useState(false);
  const [restAdjustment, setRestAdjustment] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const minReps = exercise.target_rep_min ?? 8;
  const maxReps = exercise.target_rep_max ?? 12;
  const targetRir = exercise.target_rir ?? 2;
  const baseRest = exercise.rest_seconds ?? defaultRestSeconds ?? 120;
  const trackingMode = normalizeTrackingMode(exercise.tracking_mode ?? exercise.prescription_mode, {
    targetWeight: exercise.target_weight,
  });
  const usesWeight = trackingMode === 'weight_reps';

  const completedSets = useMemo(
    () => exercise.workout_sets.filter((s) => s.completed),
    [exercise.workout_sets]
  );
  const nextIncomplete = useMemo(
    () => exercise.workout_sets.find((s) => !s.completed),
    [exercise.workout_sets]
  );
  const upcomingSets = useMemo(
    () => exercise.workout_sets.filter((s) => !s.completed && s.id !== nextIncomplete?.id),
    [exercise.workout_sets, nextIncomplete?.id]
  );
  const lastCompleted = useMemo(
    () =>
      [...completedSets]
        .filter((s) => s.completed_at)
        .sort((a, b) => Date.parse(b.completed_at!) - Date.parse(a.completed_at!))[0],
    [completedSets]
  );

  const isAllSetsCompleted =
    exercise.workout_sets.length >= exercise.target_sets &&
    exercise.workout_sets.length > 0 &&
    exercise.workout_sets.every((s) => s.completed);

  // Intelligent Next Set Suggestion
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
    ]
  );

  // Initialize target_sets in DB/state if empty
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
            weight: usesWeight ? exercise.target_weight ?? suggestion.weight ?? null : null,
            reps: suggestion.reps ?? exercise.target_rep_min ?? 10,
            rir: targetRir,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id, exercise.workout_sets.length, exercise.target_sets]);

  const volume = useMemo(() => usesWeight ? calculateTrainingVolume(exercise.workout_sets) : 0, [exercise.workout_sets, usesWeight]);

  // Rest Timer calculations
  const restElapsed = lastCompleted?.completed_at
    ? Math.max(0, Math.floor((now - Date.parse(lastCompleted.completed_at)) / 1000))
    : 0;
  const recommendedRest = (suggestion.restSeconds || baseRest) + restAdjustment;
  const restRemaining = Math.max(0, recommendedRest - restElapsed);
  const showRest = Boolean(lastCompleted && !restDismissed && !exercise.completed_at);

  function replaceSet(updatedSet: TrackedSet) {
    onChange({
      ...exercise,
      workout_sets: exercise.workout_sets.map((s) => (s.id === updatedSet.id ? updatedSet : s)),
    });
  }

  // 1-Step Complete Set (Frictionless flow)
  async function handleCompleteWorkingSet(set: TrackedSet) {
    if (!workoutStartedAt && onStartWorkout) {
      onStartWorkout();
    }
    const weightToSave = usesWeight ? set.weight ?? suggestion.weight ?? exercise.target_weight : null;
    const repsToSave = set.reps ?? suggestion.reps ?? (exercise.target_rep_min ?? 10);
    const rirToSave = set.rir ?? targetRir ?? 2;

    if ((usesWeight && (weightToSave == null || weightToSave <= 0)) || repsToSave == null || repsToSave <= 0) {
      setError(usesWeight ? 'Vui lòng kiểm tra mức tạ và số reps trước khi hoàn thành hiệp.' : 'Vui lòng kiểm tra số lần trước khi hoàn thành hiệp.');
      return;
    }

    setError(null);
    setIsSaving(true);
    const supabase = createClient();
    const completedAt = new Date().toISOString();
    const startedAt = set.started_at ?? completedAt;

    // Record exercise start time if not recorded
    if (!exercise.started_at) {
      await supabase.from('workout_exercises').update({ started_at: startedAt }).eq('id', exercise.id);
    }

    // Record actual rest of previous set if available
    const previous = [...exercise.workout_sets]
      .filter((s) => s.completed && s.completed_at && s.actual_rest_seconds == null && s.id !== set.id)
      .sort((a, b) => Date.parse(b.completed_at!) - Date.parse(a.completed_at!))[0];

    if (previous) {
      const actualRest = Math.max(
        0,
        Math.min(86400, Math.round((Date.parse(completedAt) - Date.parse(previous.completed_at!)) / 1000))
      );
      await supabase.from('workout_sets').update({ actual_rest_seconds: actualRest }).eq('id', previous.id);
    }

    // Save completed set
    const { data, error: updateError } = await supabase
      .from('workout_sets')
      .update({
        weight: weightToSave,
        reps: repsToSave,
        rir: usesWeight ? rirToSave : null,
        perceived_effort: set.perceived_effort ?? null,
        note: stripLegacyPerceivedEffortNote(set.note),
        started_at: startedAt,
        completed: true,
        completed_at: completedAt,
      })
      .eq('id', set.id)
      .select()
      .single();

    setIsSaving(false);

    if (updateError) {
      setError('Không thể lưu set lên máy chủ. Đang giữ dữ liệu cục bộ.');
      return;
    }

    // Auto trigger rest timer
    setRestDismissed(false);
    setRestAdjustment(0);

    const savedSet: TrackedSet = {
      ...(data as TrackedSet),
      perceived_effort: set.perceived_effort,
    };
    const updatedSets = exercise.workout_sets.map((s) => (s.id === set.id ? savedSet : s));
    onChange({
      ...exercise,
      started_at: exercise.started_at ?? startedAt,
      workout_sets: updatedSets,
    });
  }

  // Inline update for completed sets (Edit mode)
  async function handleUpdateCompletedSet(set: TrackedSet) {
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from('workout_sets')
      .update({
        weight: set.weight,
        reps: set.reps,
        rir: set.rir,
        perceived_effort: set.perceived_effort ?? null,
        note: stripLegacyPerceivedEffortNote(set.note),
      })
      .eq('id', set.id)
      .select()
      .single();

    if (updateError) {
      setError('Không thể cập nhật hiệp tập.');
      return;
    }
    const savedSet: TrackedSet = {
      ...(data as TrackedSet),
      perceived_effort: set.perceived_effort,
    };
    replaceSet(savedSet);
  }

  // Add Bonus / Extra Set
  async function handleAddSet() {
    setError(null);
    const supabase = createClient();
    const isBonus = isAllSetsCompleted || exercise.workout_sets.length >= exercise.target_sets;
    const lastSet = exercise.workout_sets.at(-1);

    const newSet = {
      workout_exercise_id: exercise.id,
      set_number: exercise.workout_sets.length + 1,
      set_type: 'working' as const,
      note: isBonus ? 'bonus' : null,
      weight: usesWeight ? suggestion.weight ?? lastSet?.weight ?? exercise.target_weight : null,
      reps: suggestion.reps ?? lastSet?.reps ?? 10,
      rir: targetRir,
      completed: false,
    };

    const { data, error: insertError } = await supabase
      .from('workout_sets')
      .insert(newSet)
      .select()
      .single();

    if (insertError) {
      setError(`Không thể thêm set: ${insertError.message}`);
      return;
    }

    setRestDismissed(true);
    onChange({
      ...exercise,
      workout_sets: [...exercise.workout_sets, data as TrackedSet],
    });
  }

  return (
    <div className="space-y-4">
      {/* ── ERROR MESSAGE ALERT ── */}
      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/30 text-xs font-semibold text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 1. ACTIVE CURRENT SET LOGGER (FOCUSED CENTER) ── */}
      {nextIncomplete && (
        <CurrentSetLogger
          key={nextIncomplete.id}
          activeSet={nextIncomplete}
          totalTargetSets={exercise.target_sets}
          minReps={minReps}
          maxReps={maxReps}
          targetWeight={exercise.target_weight}
          targetRir={targetRir}
          suggestedWeight={suggestion.weight ?? lastCompleted?.weight ?? exercise.target_weight}
          suggestedReps={suggestion.reps ?? lastCompleted?.reps ?? minReps}
          availableWeightsKg={availableWeightsKg}
          showWeight={usesWeight}
          unitSystem={unitSystem}
          onCompleteSet={handleCompleteWorkingSet}
          isLoading={isSaving}
        />
      )}

      {/* ── 2. COMPACT REST TIMER (RUNS AFTER SET COMPLETION) ── */}
      {showRest && (
        <CompactRestTimer
          totalSeconds={recommendedRest}
          remainingSeconds={restRemaining}
          elapsedSeconds={restElapsed}
          onAdjust={(delta) => setRestAdjustment((prev) => Math.max(-60, prev + delta))}
          onSkip={() => setRestDismissed(true)}
          onDismiss={() => setRestDismissed(true)}
          nextSetNumber={nextIncomplete?.set_number}
          nextWeight={suggestion.weight ?? nextIncomplete?.weight ?? lastCompleted?.weight}
          nextReps={suggestion.reps ?? nextIncomplete?.reps ?? minReps}
          nextRir={targetRir}
          aiTip={suggestion.reason}
          unitSystem={unitSystem}
        />
      )}

      {/* ── 3. ALL SETS COMPLETED HERO BANNER ── */}
      {isAllSetsCompleted && (
        <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-chassis-hi to-chassis space-y-3 shadow-neumorph animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
                <Check className="h-4 w-4 stroke-[3]" />
              </span>
              <h3 className="font-extrabold text-sm text-ink leading-tight">
                Hoàn thành {completedSets.length}/{exercise.target_sets} hiệp!
              </h3>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md">
              Đạt mục tiêu
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            {onNextExercise && (
              <button
                type="button"
                onClick={onNextExercise}
                className="flex-1 py-3.5 px-4 rounded-xl bg-accent hover:brightness-110 active:scale-98 text-white font-extrabold text-xs sm:text-sm shadow-accent flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>{isLastExercise ? 'HOÀN THÀNH BUỔI TẬP ✓' : 'BÀI TIẾP THEO →'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAddSet}
              className="py-2.5 px-3.5 rounded-xl bg-chassis border border-black/10 dark:border-white/15 hover:border-accent/40 text-ink font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-accent" />
              <span>Thêm hiệp (Bonus)</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 4. COMPACT COMPLETED SETS LIST ── */}
      <CompletedSetsCompact
        completedSets={completedSets}
        upcomingSets={upcomingSets}
        targetSets={exercise.target_sets}
        minReps={minReps}
        maxReps={maxReps}
        showWeight={usesWeight}
        unitSystem={unitSystem}
        onUpdateSet={handleUpdateCompletedSet}
        onAddSet={handleAddSet}
      />

      {/* ── 5. SECONDARY NEXT EXERCISE LINK (WHEN NOT ALL SETS DONE YET) ── */}
      {!isAllSetsCompleted && onNextExercise && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onNextExercise}
            className="inline-flex items-center gap-1 text-xs font-mono font-bold text-ink-muted hover:text-accent transition-colors py-1 px-2 cursor-pointer"
          >
            <span>Bỏ qua bài này →</span>
          </button>
        </div>
      )}
    </div>
  );
}
