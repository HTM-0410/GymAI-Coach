import { aggregateMetricSets, derivePaceSecondsPerKm, normalizeTrackingMode, type TrackingMode } from './metrics';

export type ExerciseActualStatsV1 = {
  exerciseId: string;
  exerciseSlug: string;
  nameVi: string;
  setCount: number;
  repMin: number | null;
  repMax: number | null;
  repRangeDisplay: string;
  avgActualRir: number | null;
  volumeKg: number;
  trackingMode: TrackingMode;
  durationSeconds: number;
  distanceMeters: number;
  paceSecondsPerKm: number | null;
};

export type WorkoutActualsV1 = {
  workoutId: string;
  status: 'completed' | 'in_progress' | 'planned';
  plannedDurationMinutes: number | null;
  actualDurationSeconds: number | null;
  actualDurationMinutes: number | null;
  completedMainWorkingSets: number;
  totalReps: number;
  totalVolumeKg: number;
  totalActiveDurationSeconds: number;
  totalDistanceMeters: number;
  exercises: ExerciseActualStatsV1[];
  feedback: {
    difficulty: number;
    energy: number;
    quality: number;
    note: string | null;
  } | null;
};

/**
 * Pure canonical projector for workout actuals.
 * Ensures consistent computation across all routes: dashboard, history, done, progress, weekly report.
 */
export function projectWorkoutActualsV1(workout: any): WorkoutActualsV1 {
  const workoutId = workout.id;
  const status = workout.status ?? 'planned';
  const plannedDurationMinutes = workout.planned_duration ?? null;

  // Actual duration: ONLY computed from started_at and completed_at.
  // Never fallback to planned duration!
  let actualDurationSeconds: number | null = null;
  let actualDurationMinutes: number | null = null;

  if (workout.started_at && workout.completed_at) {
    const startMs = new Date(workout.started_at).getTime();
    const endMs = new Date(workout.completed_at).getTime();
    if (endMs >= startMs) {
      actualDurationSeconds = Math.max(0, Math.round((endMs - startMs) / 1000));
      actualDurationMinutes = Math.max(1, Math.round(actualDurationSeconds / 60));
    }
  }

  const rawExercises = workout.workout_exercises ?? [];
  const exerciseStatsList: ExerciseActualStatsV1[] = [];

  let completedMainWorkingSets = 0;
  let totalReps = 0;
  let totalVolumeKg = 0;
  let totalActiveDurationSeconds = 0;
  let totalDistanceMeters = 0;

  for (const we of rawExercises) {
    const phase = we.phase ?? 'main';
    const mode = normalizeTrackingMode(we.tracking_mode ?? we.prescription_mode, {
      targetWeight: we.target_weight,
      actualWeight: (we.workout_sets ?? []).find((set: any) => Number(set.weight) > 0)?.weight,
      defaultTrackingMode: we.exercises?.default_tracking_mode,
      allowedTrackingModes: we.exercises?.allowed_tracking_modes,
    });
    const exInfo = we.exercises ?? {};
    const exSlug = exInfo.slug ?? we.exercise_id ?? '';
    const exNameVi = exInfo.name_vi ?? exInfo.name ?? exSlug;

    const rawSets = we.workout_sets ?? [];
    const completedSets = rawSets.filter((s: any) => s.completed);
    const completedWorkingSets = completedSets.filter((s: any) => s.set_type !== 'warmup');

    if (phase === 'main') {
      completedMainWorkingSets += completedWorkingSets.length;
    }

    const repsList: number[] = [];
    const rirList: number[] = [];
    let exerciseVolume = 0;

    for (const set of completedWorkingSets) {
      const w = Number(set.weight) || 0;
      const r = Number(set.reps) || 0;
      repsList.push(r);
      if (mode === 'weight_reps') exerciseVolume += w * r;

      if (typeof set.rir === 'number' && Number.isFinite(set.rir)) {
        rirList.push(set.rir);
      }
    }

    const metricTotals = aggregateMetricSets(mode, completedWorkingSets.map((set: any) => ({
      completed: set.completed,
      setType: set.set_type,
      weight: set.weight,
      reps: set.reps,
      durationSeconds: set.duration_seconds,
      distanceMeters: set.distance_meters,
    })));
    if (phase === 'main') {
      totalReps += metricTotals.reps;
      totalVolumeKg += metricTotals.volumeKg;
      totalActiveDurationSeconds += metricTotals.durationSeconds;
      totalDistanceMeters += metricTotals.distanceMeters;
    }

    const repMin = repsList.length > 0 ? Math.min(...repsList) : null;
    const repMax = repsList.length > 0 ? Math.max(...repsList) : null;

    let repRangeDisplay = 'Chưa có dữ liệu';
    if ((mode === 'weight_reps' || mode === 'reps') && repMin !== null && repMax !== null) {
      repRangeDisplay = repMin === repMax ? `${repMin} reps` : `${repMin}-${repMax} reps`;
    } else if (mode === 'duration' && metricTotals.durationSeconds > 0) {
      repRangeDisplay = `${metricTotals.durationSeconds} giây`;
    } else if (mode === 'duration_distance' && metricTotals.distanceMeters > 0) {
      repRangeDisplay = `${Math.round(metricTotals.distanceMeters)} m`;
    }

    const avgActualRir = rirList.length > 0
      ? Number((rirList.reduce((a, b) => a + b, 0) / rirList.length).toFixed(1))
      : null;

    exerciseStatsList.push({
      exerciseId: we.exercise_id ?? we.id,
      exerciseSlug: exSlug,
      nameVi: exNameVi,
      setCount: completedWorkingSets.length,
      repMin,
      repMax,
      repRangeDisplay,
      avgActualRir,
      volumeKg: exerciseVolume,
      trackingMode: mode,
      durationSeconds: metricTotals.durationSeconds,
      distanceMeters: metricTotals.distanceMeters,
      paceSecondsPerKm: derivePaceSecondsPerKm(metricTotals.durationSeconds, metricTotals.distanceMeters),
    });
  }

  // Feedback hydration
  const rawFeedback = workout.workout_feedback;
  const feedbackObj = Array.isArray(rawFeedback) ? rawFeedback[0] : rawFeedback;
  const feedback = feedbackObj && typeof feedbackObj === 'object'
    ? {
        difficulty: Number(feedbackObj.difficulty) || 3,
        energy: Number(feedbackObj.energy) || 3,
        quality: Number(feedbackObj.quality) || 3,
        note: feedbackObj.note ?? null,
      }
    : workout.feedback && typeof workout.feedback === 'object'
      ? workout.feedback
      : null;

  return {
    workoutId,
    status,
    plannedDurationMinutes,
    actualDurationSeconds,
    actualDurationMinutes,
    completedMainWorkingSets,
    totalReps,
    totalVolumeKg,
    totalActiveDurationSeconds,
    totalDistanceMeters,
    exercises: exerciseStatsList,
    feedback,
  };
}
