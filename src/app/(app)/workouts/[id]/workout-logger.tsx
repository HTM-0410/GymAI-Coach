'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  resolveRequestedExerciseIndex,
  resolveOptimalResumeExerciseIndex,
} from '@/lib/training/workout-phases';
import WorkoutHeader from './components/workout-header';
import WorkoutNavigatorSheet, { type NavigatorExercise } from './components/workout-navigator-sheet';
import ExerciseIdentityHeader from './components/exercise-identity-header';
import ObjectiveSetTracker, {
  type TrackedSet,
  type TrackingExercise,
} from './objective-set-tracker';
import TimedExerciseLogger from './components/timed-exercise-logger';
import ExerciseTechniqueSheet from './components/exercise-technique-sheet';
import WorkoutAICoachSheet from './components/workout-ai-coach-sheet';
import WorkoutExitSheet from './components/workout-exit-sheet';
import WorkoutIncompleteModal from './components/workout-incomplete-modal';
import type { LiveWorkoutContext } from '@/lib/ai/coach';
import { buildCompletedMetricSet, normalizeTrackingMode, type TrackingMode, type UnitSystem } from '@/lib/workouts/metrics';

type WEx = TrackingExercise & {
  order_index: number;
  phase: 'warmup' | 'main' | 'cooldown' | null;
  prescription_mode: string | null;
  tracking_mode: TrackingMode | null;
  duration_style: 'active' | 'hold' | null;
  duration_seconds: number | null;
  hold_seconds: number | null;
  target_duration_seconds: number | null;
  target_distance_meters: number | null;
  per_side: boolean | null;
  target_weight: number | null;
  target_rir: number | null;
  rest_seconds: number | null;
  ai_reason: string | null;
  exercises: {
    slug: string;
    name: string;
    name_vi: string | null;
    default_rest_seconds: number | null;
    default_rir: number | null;
    animation_url: string | null;
    thumbnail_url: string | null;
    instructions_list: string[];
    tips_list: string[];
    common_mistakes_list: string[];
    exercise_equipment?: { equipment: { slug: string } | null }[];
  };
  workout_sets: TrackedSet[];
};

type WorkoutPhase = 'warmup' | 'main' | 'cooldown';

const phaseOf = (exercise: WEx): WorkoutPhase => exercise.phase ?? 'main';
const modeOf = (exercise: WEx): TrackingMode => normalizeTrackingMode(
  exercise.tracking_mode ?? exercise.prescription_mode,
  { targetWeight: exercise.target_weight },
);
const phaseLabel: Record<WorkoutPhase, string> = {
  warmup: 'Khởi động',
  main: 'Bài chính',
  cooldown: 'Hạ nhiệt',
};

type Workout = {
  id: string;
  date: string;
  status: string;
  planned_duration: number | null;
  started_at: string | null;
  completed_at: string | null;
  workout_exercises: WEx[];
};

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function WorkoutLogger({
  workout,
  availableDumbbellWeights = [],
  unitSystem = 'metric',
}: {
  workout: Workout;
  availableDumbbellWeights?: number[];
  unitSystem?: UnitSystem;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Smart resume: if URL has ?exercise=X use it; else resolve optimal resume position
  const initialExerciseIndex = useMemo(() => {
    const rawParam = searchParams.get('exercise');
    if (rawParam != null && rawParam.trim() !== '') {
      return resolveRequestedExerciseIndex(rawParam, workout.workout_exercises.length);
    }
    return resolveOptimalResumeExerciseIndex(workout.workout_exercises);
  }, [searchParams, workout.workout_exercises]);

  const [exIdx, setExIdx] = useState(initialExerciseIndex);
  const [exercises, setExercises] = useState<WEx[]>(workout.workout_exercises);
  const [startedAt, setStartedAt] = useState<string | null>(workout.started_at);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedSeconds, setPausedSeconds] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Sheet / Modal states
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [exitSheetOpen, setExitSheetOpen] = useState(false);
  const [incompleteModalOpen, setIncompleteModalOpen] = useState(false);
  const [techniqueSheetOpen, setTechniqueSheetOpen] = useState(false);

  const ex = exercises[exIdx] || exercises[0];

  // Global elapsed timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isPaused) {
        setNow(Date.now());
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused]);

  // Workout duration calculation
  const totalSeconds = startedAt && !isPaused
    ? Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000) - pausedSeconds)
    : 0;

  const totalCompletedUnits = exercises.reduce(
    (acc, curr) =>
      acc +
      curr.workout_sets.filter((s) => s.completed).length,
    0
  );

  const totalPlannedUnits = exercises.reduce(
    (acc, curr) => acc + curr.target_sets,
    0
  );

  // Auto start workout if not started
  async function handleStartWorkout() {
    if (startedAt) return;
    const startedIso = new Date().toISOString();
    setStartedAt(startedIso);
    const supabase = createClient();
    await supabase
      .from('workouts')
      .update({ status: 'in_progress', started_at: startedIso })
      .eq('id', workout.id);
  }

  function handleTogglePause() {
    setIsPaused((prev) => !prev);
  }

  function updateExercise(updated: TrackingExercise) {
    if (!startedAt) {
      handleStartWorkout();
    }
    setExercises((current) =>
      current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
    );
  }

  async function finishExercise(exercise: WEx) {
    if (exercise.workout_sets.filter((set) => set.completed).length < exercise.target_sets) return;
    if (!exercise.started_at || exercise.completed_at) return;
    const completedAt = new Date().toISOString();
    const supabase = createClient();
    const { error } = await supabase
      .from('workout_exercises')
      .update({ completed_at: completedAt })
      .eq('id', exercise.id);
    if (!error) {
      setExercises((current) =>
        current.map((item) =>
          item.id === exercise.id ? { ...item, completed_at: completedAt } : item
        )
      );
    }
  }

  async function beginTimedExercise(exercise: WEx) {
    if (!startedAt) await handleStartWorkout();
    if (exercise.started_at) return;
    const exerciseStartedAt = new Date().toISOString();
    const supabase = createClient();
    const { error } = await supabase
      .from('workout_exercises')
      .update({ started_at: exerciseStartedAt })
      .eq('id', exercise.id);
    if (!error) {
      setExercises((current) =>
        current.map((item) =>
          item.id === exercise.id ? { ...item, started_at: exerciseStartedAt } : item
        )
      );
    }
  }

  async function completeTimedExercise(exercise: WEx, actual: { durationSeconds: number; distanceMeters: number | null }) {
    if (exercise.completed_at) return;
    const timestamp = new Date().toISOString();
    const supabase = createClient();
    let targetSet = exercise.workout_sets.find((set) => !set.completed) ?? exercise.workout_sets[0];
    if (!targetSet) {
      const { data } = await supabase.from('workout_sets').insert({
        workout_exercise_id: exercise.id,
        set_number: 1,
        set_type: 'working',
        completed: false,
      }).select().single();
      targetSet = data as TrackedSet;
    }
    if (!targetSet) return;
    const setWrite = buildCompletedMetricSet(modeOf(exercise), {
      durationSeconds: actual.durationSeconds,
      distanceMeters: actual.distanceMeters,
    }, { startedAt: exercise.started_at ?? timestamp, completedAt: timestamp });
    const { data: savedSet, error: setError } = await supabase.from('workout_sets').update(setWrite).eq('id', targetSet.id).select().single();
    if (setError) return;
    const allSets = exercise.workout_sets.map((set) => set.id === targetSet!.id ? savedSet as TrackedSet : set);
    const isExerciseComplete = allSets.filter((set) => set.completed).length >= exercise.target_sets;
    const { error } = await supabase
      .from('workout_exercises')
      .update({ started_at: exercise.started_at ?? timestamp, completed_at: isExerciseComplete ? timestamp : null })
      .eq('id', exercise.id);
    if (!error) {
      setExercises((current) =>
        current.map((item) =>
          item.id === exercise.id
            ? { ...item, started_at: item.started_at ?? timestamp, completed_at: isExerciseComplete ? timestamp : null, workout_sets: allSets }
            : item
        )
      );
    }
  }

  async function goToExercise(index: number) {
    if (index > exIdx) await finishExercise(ex);
    setExIdx(index);
    router.replace(`/workouts/${workout.id}?exercise=${index}`, { scroll: false });
  }

  // Check if workout has incomplete sets
  function checkIncompleteWorkout() {
    const incompleteExercises = exercises.filter((e) => {
      return e.workout_sets.length < e.target_sets || e.workout_sets.some((s) => !s.completed);
    });

    const incompleteSetsCount = exercises.reduce((acc, e) => {
      return acc + Math.max(0, e.target_sets - e.workout_sets.filter((s) => s.completed).length);
    }, 0);

    return {
      isIncomplete: incompleteExercises.length > 0,
      incompleteExercisesCount: incompleteExercises.length,
      incompleteSetsCount,
    };
  }

  function handleRequestCompleteWorkout() {
    const { isIncomplete } = checkIncompleteWorkout();
    if (isIncomplete) {
      setIncompleteModalOpen(true);
    } else {
      executeCompleteWorkout();
    }
  }

  async function executeCompleteWorkout() {
    if (isCompleting) return;
    setIsCompleting(true);
    setCompletionError(null);
    try {
      await finishExercise(ex);
      const response = await fetch(`/api/workouts/${workout.id}/complete`, { method: 'POST' });
      if (!response.ok) throw new Error('completion_failed');
      router.push(`/workouts/${workout.id}/done`);
      router.refresh();
    } catch {
      setCompletionError('Không thể hoàn thành buổi tập. Vui lòng thử lại.');
    } finally {
      setIsCompleting(false);
    }
  }

  const nextExercise = exercises[exIdx + 1];
  const nextExerciseName = nextExercise
    ? nextExercise.exercises.name_vi ?? nextExercise.exercises.name
    : null;
  const isLastExercise = exIdx === exercises.length - 1;

  function handleNextExercise() {
    if (isLastExercise) {
      handleRequestCompleteWorkout();
    } else {
      goToExercise(exIdx + 1);
    }
  }

  function skipCurrentPhase() {
    const currentPhase = phaseOf(ex);
    const nextPhaseIndex = exercises.findIndex(
      (item, index) => index > exIdx && phaseOf(item) !== currentPhase
    );
    if (nextPhaseIndex >= 0) {
      goToExercise(nextPhaseIndex);
    } else {
      handleRequestCompleteWorkout();
    }
  }

  // Prepared data for Navigator Sheet
  const navigatorExercises: NavigatorExercise[] = useMemo(() => {
    return exercises.map((item, idx) => {
      const isDone =
        item.workout_sets.length >= item.target_sets && item.workout_sets.every((s) => s.completed);
      const completedSets = item.workout_sets.filter((s) => s.completed).length;

      return {
        id: item.id,
        orderIndex: idx,
        name: item.exercises.name_vi ?? item.exercises.name,
        phase: phaseOf(item),
        mode: modeOf(item),
        completedSets,
        targetSets: item.target_sets,
        isCompleted: isDone,
        isCurrent: idx === exIdx,
      };
    });
  }, [exercises, exIdx]);

  // Live Workout Context for AI Coach
  const liveCoachContext: LiveWorkoutContext = useMemo(() => {
    const activeIncompleteSet = ex.workout_sets.find((s) => !s.completed);
    return {
      exerciseName: ex.exercises.name_vi ?? ex.exercises.name,
      exerciseSlug: ex.exercises.slug,
      setNumber: activeIncompleteSet?.set_number ?? ex.workout_sets.length,
      targetSets: ex.target_sets,
      targetReps: `${ex.target_rep_min ?? 8}-${ex.target_rep_max ?? 12}`,
      targetRir: ex.target_rir ?? 2,
      completedSets: ex.workout_sets
        .filter((s) => s.completed)
        .map((s) => ({
          setNumber: s.set_number,
          weight: s.weight,
          reps: s.reps,
          rir: s.rir,
          perceivedEffort: s.perceived_effort,
        })),
      currentWeight: activeIncompleteSet?.weight ?? ex.target_weight,
      currentReps: activeIncompleteSet?.reps ?? ex.target_rep_min,
    };
  }, [ex]);

  // AI Coach Action handlers
  function handleApplyWeightFromCoach(weightKg: number) {
    const nextIncomplete = ex.workout_sets.find((s) => !s.completed);
    if (!nextIncomplete) return;
    const updated = {
      ...ex,
      workout_sets: ex.workout_sets.map((s) =>
        s.id === nextIncomplete.id ? { ...s, weight: weightKg } : s
      ),
    };
    updateExercise(updated);
  }

  function handleApplyRepsFromCoach(reps: number) {
    const nextIncomplete = ex.workout_sets.find((s) => !s.completed);
    if (!nextIncomplete) return;
    const updated = {
      ...ex,
      workout_sets: ex.workout_sets.map((s) =>
        s.id === nextIncomplete.id ? { ...s, reps } : s
      ),
    };
    updateExercise(updated);
  }

  const currentPhase = phaseOf(ex);
  const currentMode = modeOf(ex);

  return (
    <div className="min-h-screen bg-chassis blueprint-grid">
      {/* ── 1. IMMERSIVE WORKOUT HUD HEADER ── */}
      <WorkoutHeader
        workoutName="Buổi tập GymAI"
        phaseLabel={phaseLabel[currentPhase]}
        totalSeconds={totalSeconds}
        isPaused={isPaused}
        onTogglePause={handleTogglePause}
        currentExerciseIndex={exIdx}
        totalExercises={exercises.length}
        completedUnits={totalCompletedUnits}
        totalUnits={totalPlannedUnits}
        onOpenNavigator={() => setNavigatorOpen(true)}
        onOpenExitSheet={() => setExitSheetOpen(true)}
      />

      {/* ── 2. MAIN WORKOUT CONTAINER (MOBILE-FIRST) ── */}
      <div className="max-w-xl mx-auto px-3.5 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-5 pb-32">
        {completionError && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100"
          >
            {completionError}
          </div>
        )}
        {isCompleting && (
          <div role="status" aria-live="polite" className="sr-only">
            Đang hoàn thành buổi tập
          </div>
        )}
        {/* Exercise Identity Header */}
        <ExerciseIdentityHeader
          name={ex.exercises.name_vi ?? ex.exercises.name}
          phaseLabel={phaseLabel[currentPhase]}
          currentExerciseIndex={exIdx}
          totalExercises={exercises.length}
          mode={currentMode}
          targetSets={ex.target_sets}
          targetRepMin={ex.target_rep_min}
          targetRepMax={ex.target_rep_max}
          targetRir={ex.target_rir}
          durationSeconds={ex.target_duration_seconds ?? ex.duration_seconds ?? ex.hold_seconds}
          holdSeconds={ex.duration_style === 'hold' ? ex.target_duration_seconds ?? ex.hold_seconds : null}
          targetDistanceMeters={ex.target_distance_meters}
          unitSystem={unitSystem}
          perSide={ex.per_side}
          aiReason={ex.ai_reason}
          previousPerformance={ex.previous_performance}
          animationUrl={ex.exercises.animation_url}
          thumbnailUrl={ex.exercises.thumbnail_url}
          onOpenTechniqueSheet={() => setTechniqueSheetOpen(true)}
          onSkipPhase={skipCurrentPhase}
          isNonMainPhase={currentPhase !== 'main'}
        />

        {/* Current Set / Timed Tracker */}
        {currentMode === 'reps' || currentMode === 'weight_reps' ? (
          <ObjectiveSetTracker
            key={ex.id}
            exercise={ex}
            workoutStartedAt={startedAt}
            onStartWorkout={handleStartWorkout}
            defaultRestSeconds={ex.exercises.default_rest_seconds}
            availableWeightsKg={
              ex.exercises.exercise_equipment?.some(
                (item) => item.equipment?.slug === 'dumbbell' || item.equipment?.slug === 'ta-don'
              )
                ? availableDumbbellWeights
                : undefined
            }
            unitSystem={unitSystem}
            onChange={updateExercise}
            onNextExercise={handleNextExercise}
            nextExerciseName={nextExerciseName}
            isLastExercise={isLastExercise}
          />
        ) : (
          <TimedExerciseLogger
            key={`${ex.id}:${ex.workout_sets.filter((set) => set.completed).length}`}
            exercise={ex}
            mode={currentMode}
            unitSystem={unitSystem}
            onBegin={() => beginTimedExercise(ex)}
            onComplete={(actual) => completeTimedExercise(ex, actual)}
            onNext={handleNextExercise}
            isLastExercise={isLastExercise}
          />
        )}
      </div>

      {/* ── 3. EXERCISE TECHNIQUE BOTTOM SHEET ── */}
      <ExerciseTechniqueSheet
        isOpen={techniqueSheetOpen}
        onClose={() => setTechniqueSheetOpen(false)}
        exercise={ex.exercises}
      />

      {/* ── 3. WORKOUT NAVIGATOR SHEET ── */}
      <WorkoutNavigatorSheet
        isOpen={navigatorOpen}
        onClose={() => setNavigatorOpen(false)}
        exercises={navigatorExercises}
        onSelectExercise={goToExercise}
        onCompleteWorkout={handleRequestCompleteWorkout}
      />

      {/* ── 4. WORKOUT EXIT CONFIRMATION SHEET ── */}
      <WorkoutExitSheet
        isOpen={exitSheetOpen}
        onClose={() => setExitSheetOpen(false)}
        onContinue={() => setExitSheetOpen(false)}
        onMinimizeToDashboard={() => router.push('/dashboard')}
        onFinishEarly={handleRequestCompleteWorkout}
        completedSets={totalCompletedUnits}
        totalSets={totalPlannedUnits}
        elapsedTime={formatDuration(totalSeconds)}
      />

      {/* ── 5. INCOMPLETE WORKOUT MODAL ── */}
      <WorkoutIncompleteModal
        isOpen={incompleteModalOpen}
        onClose={() => setIncompleteModalOpen(false)}
        onContinue={() => setIncompleteModalOpen(false)}
        onConfirmFinish={executeCompleteWorkout}
        incompleteExercisesCount={checkIncompleteWorkout().incompleteExercisesCount}
        incompleteSetsCount={checkIncompleteWorkout().incompleteSetsCount}
      />

      {/* ── 6. LIVE CONTEXTUAL AI GYM COACH SHEET ── */}
      <WorkoutAICoachSheet
        workoutContext={liveCoachContext}
        onApplyWeight={handleApplyWeightFromCoach}
        onApplyReps={handleApplyRepsFromCoach}
      />
    </div>
  );
}
