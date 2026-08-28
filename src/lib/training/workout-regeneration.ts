import type { WorkoutPhase } from '@/lib/ai/workout-contract';

export function workoutRegenerationExclusions(
  exercises: readonly { exerciseSlug: string; phase: WorkoutPhase }[],
  options: { fullReset: boolean; phase?: WorkoutPhase },
) {
  return exercises
    .filter((exercise) => options.fullReset || exercise.phase === options.phase)
    .map((exercise) => exercise.exerciseSlug);
}
