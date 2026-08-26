import {
  BODY_MUSCLE_GROUPS,
  getBodyMuscleGroup,
  type BodyMuscleGroup,
} from '@/lib/recovery/muscle-groups';

type RelationOne<T> = T | T[] | null;

type ActivityMuscle = { slug?: string | null };
type ActivityExercise = { name?: string | null; name_vi?: string | null; slug?: string | null };

export type RecoveryActivityReadRow = {
  id: string;
  workout_id: string;
  workout_exercise_id: string;
  muscle_id: string;
  completed_set_count: number;
  occurred_at: string;
  muscles: RelationOne<ActivityMuscle>;
  workout_exercises: RelationOne<{ exercises: RelationOne<ActivityExercise> }>;
  [key: string]: unknown;
};

export type RecoveryLatestActivity = {
  occurredAt: string;
  exerciseName: string;
  completedSetCount: number;
};

function one<T>(value: RelationOne<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function recoveryActivityExerciseName(row: RecoveryActivityReadRow): string {
  const exercise = one(one(row.workout_exercises)?.exercises ?? null);
  return exercise?.name_vi ?? exercise?.name ?? exercise?.slug ?? 'Bài tập';
}

export function dedupeRecoveryActivities<T extends RecoveryActivityReadRow>(
  rows: readonly T[],
): T[] {
  const byWorkoutExercise = new Map<string, T>();
  for (const row of rows) {
    const existing = byWorkoutExercise.get(row.workout_exercise_id);
    if (!existing) {
      byWorkoutExercise.set(row.workout_exercise_id, { ...row });
      continue;
    }
    const rowIsNewer = Date.parse(row.occurred_at) > Date.parse(existing.occurred_at);
    const base = rowIsNewer ? row : existing;
    byWorkoutExercise.set(row.workout_exercise_id, {
      ...base,
      completed_set_count: Math.max(existing.completed_set_count, row.completed_set_count),
    });
  }
  return [...byWorkoutExercise.values()].sort((left, right) => (
    Date.parse(right.occurred_at) - Date.parse(left.occurred_at)
  ));
}

export function buildLatestActivityByGroup(
  rows: readonly RecoveryActivityReadRow[],
): Readonly<Partial<Record<BodyMuscleGroup, RecoveryLatestActivity>>> {
  const latest: Partial<Record<BodyMuscleGroup, RecoveryLatestActivity>> = {};
  const byGroupAndExercise = new Map<string, RecoveryActivityReadRow>();
  for (const row of rows) {
    const slug = one(row.muscles)?.slug;
    const group = slug ? getBodyMuscleGroup(slug) : null;
    if (!group) continue;
    const key = `${group}:${row.workout_exercise_id}`;
    const existing = byGroupAndExercise.get(key);
    if (!existing) {
      byGroupAndExercise.set(key, { ...row });
      continue;
    }
    const rowIsNewer = Date.parse(row.occurred_at) > Date.parse(existing.occurred_at);
    const base = rowIsNewer ? row : existing;
    byGroupAndExercise.set(key, {
      ...base,
      completed_set_count: Math.max(existing.completed_set_count, row.completed_set_count),
    });
  }
  const groupedRows = [...byGroupAndExercise.values()].sort((left, right) => (
    Date.parse(right.occurred_at) - Date.parse(left.occurred_at)
  ));
  for (const row of groupedRows) {
    const slug = one(row.muscles)?.slug;
    const group = slug ? getBodyMuscleGroup(slug) : null;
    if (!group || latest[group]) continue;
    latest[group] = {
      occurredAt: row.occurred_at,
      exerciseName: recoveryActivityExerciseName(row),
      completedSetCount: row.completed_set_count,
    };
  }
  return Object.fromEntries(
    BODY_MUSCLE_GROUPS.flatMap((group) => latest[group] ? [[group, latest[group]]] : []),
  );
}
