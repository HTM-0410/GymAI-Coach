export type WorkoutPhaseValue = 'warmup' | 'main' | 'cooldown';
import { normalizeTrackingMode, type CompatibleTrackingMode, type TrackingMode } from '@/lib/workouts/metrics';

export type PrescriptionModeValue = CompatibleTrackingMode;

export function normalizeWorkoutPhase(value: string | null | undefined): WorkoutPhaseValue {
  return value === 'warmup' || value === 'cooldown' ? value : 'main';
}

export function normalizePrescriptionMode(value: string | null | undefined): TrackingMode {
  return normalizeTrackingMode(value);
}

export function isMainRepsExercise(exercise: {
  phase?: string | null;
  prescription_mode?: string | null;
}) {
  return normalizeWorkoutPhase(exercise.phase) === 'main'
    && ['weight_reps', 'reps'].includes(normalizePrescriptionMode(exercise.prescription_mode));
}

export function isMainWeightRepsExercise(exercise: {
  phase?: string | null;
  prescription_mode?: string | null;
  tracking_mode?: string | null;
  target_weight?: number | null;
  actual_weight?: number | null;
}) {
  return normalizeWorkoutPhase(exercise.phase) === 'main'
    && normalizeTrackingMode(exercise.tracking_mode ?? exercise.prescription_mode, {
      targetWeight: exercise.target_weight,
      actualWeight: exercise.actual_weight,
    }) === 'weight_reps';
}

export function sortWorkoutExercises<T extends {
  phase?: string | null;
  order_index?: number | null;
}>(exercises: readonly T[]): T[] {
  const rank: Record<WorkoutPhaseValue, number> = { warmup: 0, main: 1, cooldown: 2 };
  return exercises
    .map((exercise, originalIndex) => ({ exercise, originalIndex }))
    .sort((a, b) => {
      const phaseDifference = rank[normalizeWorkoutPhase(a.exercise.phase)]
        - rank[normalizeWorkoutPhase(b.exercise.phase)];
      if (phaseDifference !== 0) return phaseDifference;
      const aOrder = Number.isFinite(a.exercise.order_index) ? Number(a.exercise.order_index) : Number.MAX_SAFE_INTEGER;
      const bOrder = Number.isFinite(b.exercise.order_index) ? Number(b.exercise.order_index) : Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder || a.originalIndex - b.originalIndex;
    })
    .map(({ exercise }) => exercise);
}

export function resolveRequestedExerciseIndex(raw: string | null, exerciseCount: number) {
  if (raw == null || raw.trim() === '') return 0;
  const requested = Number(raw);
  return Number.isInteger(requested) && requested >= 0 && requested < exerciseCount ? requested : 0;
}

export function resolveOptimalResumeExerciseIndex<T extends {
  started_at?: string | null;
  completed_at?: string | null;
  workout_sets?: Array<{ completed?: boolean }>;
}>(exercises: readonly T[]): number {
  if (!exercises || exercises.length === 0) return 0;
  // 1. Exercise active gần nhất (started but not completed)
  const activeIdx = exercises.findIndex((e) => Boolean(e.started_at && !e.completed_at));
  if (activeIdx >= 0) return activeIdx;

  // 2. Exercise đầu tiên chưa hoàn thành
  const incompleteIdx = exercises.findIndex((e) => {
    if (e.completed_at) return false;
    if (Array.isArray(e.workout_sets) && e.workout_sets.length > 0) {
      return e.workout_sets.some((s) => !s.completed);
    }
    return true;
  });
  if (incompleteIdx >= 0) return incompleteIdx;

  return 0;
}
