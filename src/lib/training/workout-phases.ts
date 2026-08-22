export type WorkoutPhaseValue = 'warmup' | 'main' | 'cooldown';
export type PrescriptionModeValue = 'reps' | 'time' | 'hold';

export function normalizeWorkoutPhase(value: string | null | undefined): WorkoutPhaseValue {
  return value === 'warmup' || value === 'cooldown' ? value : 'main';
}

export function normalizePrescriptionMode(value: string | null | undefined): PrescriptionModeValue {
  return value === 'time' || value === 'hold' ? value : 'reps';
}

export function isMainRepsExercise(exercise: {
  phase?: string | null;
  prescription_mode?: string | null;
}) {
  return normalizeWorkoutPhase(exercise.phase) === 'main'
    && normalizePrescriptionMode(exercise.prescription_mode) === 'reps';
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
