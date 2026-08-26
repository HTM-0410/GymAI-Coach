import type { LoadBasis, TrackingMode } from '@/lib/workouts/metrics';

export type ReviewedWorkoutMetric = {
  defaultTrackingMode: TrackingMode;
  allowedTrackingModes: TrackingMode[];
  durationStyle: 'active' | 'hold';
  loadBasis: LoadBasis;
  source: string;
};

const reviewed = (
  defaultTrackingMode: TrackingMode,
  allowedTrackingModes: TrackingMode[],
  loadBasis: LoadBasis = 'none',
  durationStyle: 'active' | 'hold' = 'active',
): ReviewedWorkoutMetric => ({
  defaultTrackingMode,
  allowedTrackingModes,
  durationStyle,
  loadBasis,
  source: 'manual_review:workout_metrics:2026-08-26',
});

export const REVIEWED_WORKOUT_METRICS: Readonly<Record<string, ReviewedWorkoutMetric>> = {
  'jump-rope': reviewed('duration', ['duration', 'reps']),
  'stationary-bike-run-v-3': reviewed('duration_distance', ['duration_distance', 'duration']),
  'hands-bike': reviewed('duration_distance', ['duration_distance', 'duration']),
  'dynamic-chest-stretch-male': reviewed('duration', ['duration', 'reps']),
  inchworm: reviewed('reps', ['reps', 'duration']),
  'world-greatest-stretch': reviewed('reps', ['reps', 'duration']),
  'walking-high-knees-lunge': reviewed('reps', ['reps', 'duration']),
  'dead-bug': reviewed('reps', ['reps']),
  'glute-bridge-march': reviewed('reps', ['reps']),
  'scapula-push-up': reviewed('reps', ['reps']),
  'scapular-pull-up': reviewed('reps', ['reps']),
  'high-knee-against-wall': reviewed('reps', ['reps', 'duration']),
  'barbell-bench-press': reviewed('weight_reps', ['weight_reps'], 'external_total'),
  'dumbbell-standing-overhead-press': reviewed('weight_reps', ['weight_reps'], 'per_implement'),
  'push-up': reviewed('reps', ['reps', 'weight_reps'], 'external_total'),
  'barbell-bent-over-row': reviewed('weight_reps', ['weight_reps'], 'external_total'),
  'pull-up': reviewed('reps', ['reps', 'weight_reps'], 'external_total'),
  'cable-lat-pulldown-full-range-of-motion': reviewed('weight_reps', ['weight_reps'], 'external_total'),
  'barbell-full-squat': reviewed('weight_reps', ['weight_reps'], 'external_total'),
  'barbell-deadlift': reviewed('weight_reps', ['weight_reps'], 'external_total'),
  'dumbbell-goblet-squat': reviewed('weight_reps', ['weight_reps'], 'external_total'),
  'sled-45-leg-press': reviewed('weight_reps', ['weight_reps'], 'external_total'),
  'stationary-bike-walk': reviewed('duration_distance', ['duration_distance', 'duration']),
  'walk-elliptical-cross-trainer': reviewed('duration_distance', ['duration_distance', 'duration']),
  'walking-on-incline-treadmill': reviewed('duration_distance', ['duration_distance', 'duration']),
  'hamstring-stretch': reviewed('duration', ['duration'], 'none', 'hold'),
  'calf-stretch-with-hands-against-wall': reviewed('duration', ['duration'], 'none', 'hold'),
  'overhead-triceps-stretch': reviewed('duration', ['duration'], 'none', 'hold'),
  'kneeling-lat-stretch': reviewed('duration', ['duration'], 'none', 'hold'),
  'assisted-seated-pectoralis-major-stretch-with-stability-ball': reviewed('duration', ['duration'], 'none', 'hold'),
};

export function reviewedWorkoutMetric(slug: string) {
  return REVIEWED_WORKOUT_METRICS[slug] ?? null;
}
