import type { TrackingMode } from './metrics';

export type WorkoutEquipmentScope = 'unrestricted' | 'bodyweight' | 'gym';

export function resolveWorkoutEquipmentScope(workout: {
  gym_id?: string | null;
  equipment_scope?: string | null;
}): WorkoutEquipmentScope {
  if (workout.equipment_scope === 'unrestricted' || workout.equipment_scope === 'bodyweight' || workout.equipment_scope === 'gym') {
    return workout.equipment_scope;
  }
  return workout.gym_id ? 'gym' : 'bodyweight';
}

export function canSwapWorkoutExercise(input: {
  workoutStatus: string;
  completedSets: number;
  exerciseCompletedAt?: string | null;
}) {
  if (!['planned', 'in_progress'].includes(input.workoutStatus)) {
    return { allowed: false, reason: 'Buổi tập không còn ở trạng thái có thể đổi bài.' };
  }
  if (input.completedSets > 0 || input.exerciseCompletedAt) {
    return { allowed: false, reason: 'Không thể đổi bài sau khi đã hoàn thành hiệp.' };
  }
  return { allowed: true, reason: null };
}

export function isTrackingModeCompatible(
  mode: TrackingMode,
  candidate: { default_tracking_mode?: TrackingMode | null; allowed_tracking_modes?: TrackingMode[] | null },
) {
  const allowed = candidate.allowed_tracking_modes?.length
    ? candidate.allowed_tracking_modes
    : [candidate.default_tracking_mode ?? 'reps'];
  return allowed.includes(mode);
}
