import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WorkoutDraftExerciseSchema } from '../src/lib/ai/workout-contract';
import {
  aggregateMetricSets,
  buildCompletedMetricSet,
  derivePaceSecondsPerKm,
  distanceFromCanonical,
  distanceToCanonical,
  formatDurationDistanceActual,
  formatLoad,
  isSingleSetTimedMode,
  kgToLb,
  lbToKg,
  metersToMiles,
  milesToMeters,
  normalizeDurationStyle,
  normalizeTrackingMode,
  roundCanonical,
  validateMetricValues,
} from '../src/lib/workouts/metrics';
import { projectWorkoutActualsV1 } from '../src/lib/workouts/actuals';
import { isMainWeightRepsExercise } from '../src/lib/training/workout-phases';
import { buildWorkoutLoads, type RecoveryWorkout } from '../src/lib/recovery/process-workout.server';
import { REVIEWED_WORKOUT_METRICS } from '../src/lib/exercises/workout-metrics-taxonomy';

const baseDraft = {
  exerciseId: '11111111-1111-4111-8111-111111111111',
  exerciseSlug: 'test-exercise',
  name: 'Test',
  nameVi: 'Kiểm thử',
  phase: 'main' as const,
  targetSets: 1,
  targetRepMin: null,
  targetRepMax: null,
  targetWeight: null,
  targetRir: null,
  restSeconds: 0,
  durationSeconds: null,
  holdSeconds: null,
  targetDurationSeconds: null,
  targetDistanceMeters: null,
  perSide: false,
  aiReason: '',
};

test('AC-01 validates four modes and normalizes legacy modes', () => {
  const drafts = [
    { ...baseDraft, prescriptionMode: 'weight_reps', targetRepMin: 8, targetRepMax: 12, targetRir: 2, restSeconds: 90 },
    { ...baseDraft, prescriptionMode: 'reps', targetRepMin: 10, targetRepMax: 15, restSeconds: 60 },
    { ...baseDraft, prescriptionMode: 'duration', targetDurationSeconds: 60 },
    { ...baseDraft, prescriptionMode: 'duration_distance', targetDurationSeconds: 600, targetDistanceMeters: 2000 },
  ];
  drafts.forEach((draft) => assert.equal(WorkoutDraftExerciseSchema.safeParse(draft).success, true));
  assert.equal(normalizeTrackingMode('time'), 'duration');
  assert.equal(normalizeTrackingMode('hold'), 'duration');
  assert.equal(normalizeDurationStyle('hold'), 'hold');
  assert.equal(normalizeTrackingMode('reps', { targetWeight: 20 }), 'weight_reps');
  assert.ok(validateMetricValues('reps', { reps: 10, weight: 20 }).length > 0);
  assert.ok(validateMetricValues('duration_distance', {}).length > 0);
});

test('single timed set preview omits redundant set and rest metadata', () => {
  assert.equal(isSingleSetTimedMode('duration', 1), true);
  assert.equal(isSingleSetTimedMode('duration_distance', 1), true);
  assert.equal(isSingleSetTimedMode('duration', 2), false);
  assert.equal(isSingleSetTimedMode('reps', 1), false);

  const previewSource = readFileSync('src/app/(app)/workouts/new/new-workout-form.tsx', 'utf8');
  const helperUsages = previewSource.match(/isSingleSetTimedMode/g) ?? [];
  assert.ok(helperUsages.length >= 3, 'preview must use the single timed set rule for both its label and rest badge');
});

test('AC-02 to AC-05 build mode-specific set writes and aggregates', () => {
  const at = { startedAt: '2026-08-26T00:00:00.000Z', completedAt: '2026-08-26T00:01:00.000Z' };
  const loaded = buildCompletedMetricSet('weight_reps', { weight: 40, reps: 10 }, at);
  const reps = buildCompletedMetricSet('reps', { reps: 15 }, at);
  const duration = buildCompletedMetricSet('duration', { durationSeconds: 45 }, at);
  const distance = buildCompletedMetricSet('duration_distance', { durationSeconds: 600, distanceMeters: 2000 }, at);
  assert.deepEqual([loaded.weight, loaded.reps, loaded.duration_seconds], [40, 10, null]);
  assert.deepEqual([reps.weight, reps.reps], [null, 15]);
  assert.deepEqual([duration.duration_seconds, duration.reps], [45, null]);
  assert.deepEqual([distance.duration_seconds, distance.distance_meters], [600, 2000]);
  assert.equal(aggregateMetricSets('weight_reps', [{ completed: true, weight: 40, reps: 10 }]).volumeKg, 400);
  assert.equal(aggregateMetricSets('reps', [{ completed: true, reps: 15 }]).volumeKg, 0);
  assert.equal(derivePaceSecondsPerKm(600, 2000), 300);
});

test('AC-06 reviewed taxonomy preserves phase-independent modes', () => {
  assert.equal(Object.keys(REVIEWED_WORKOUT_METRICS).length, 30);
  assert.equal(REVIEWED_WORKOUT_METRICS['dead-bug'].defaultTrackingMode, 'reps');
  assert.equal(REVIEWED_WORKOUT_METRICS['stationary-bike-run-v-3'].defaultTrackingMode, 'duration_distance');
  assert.equal(REVIEWED_WORKOUT_METRICS['barbell-bench-press'].defaultTrackingMode, 'weight_reps');
  assert.equal(REVIEWED_WORKOUT_METRICS['hamstring-stretch'].durationStyle, 'hold');
});

test('AC-07 AI draft contract preserves every mode-specific target', () => {
  const cases: any[] = [
    { ...baseDraft, prescriptionMode: 'weight_reps', targetRepMin: 6, targetRepMax: 8, targetWeight: 50, targetRir: 2, restSeconds: 120 },
    { ...baseDraft, prescriptionMode: 'reps', targetRepMin: 12, targetRepMax: 20, restSeconds: 60 },
    { ...baseDraft, prescriptionMode: 'duration', durationStyle: 'hold', targetDurationSeconds: 45 },
    { ...baseDraft, prescriptionMode: 'duration_distance', targetDurationSeconds: 900, targetDistanceMeters: 3000 },
  ];
  for (const value of cases) {
    const parsed = WorkoutDraftExerciseSchema.parse(value);
    assert.equal(parsed.prescriptionMode, value.prescriptionMode);
    assert.equal(parsed.targetDurationSeconds, value.targetDurationSeconds ?? null);
    assert.equal(parsed.targetDistanceMeters, value.targetDistanceMeters ?? null);
  }
});

test('AC-08 actual projector supports legacy and all-mode summaries', () => {
  const actuals = projectWorkoutActualsV1({
    id: 'workout', status: 'completed', workout_exercises: [
      { id: 'a', phase: 'main', prescription_mode: 'reps', target_weight: 20, exercises: { slug: 'loaded' }, workout_sets: [{ completed: true, set_type: 'working', weight: 20, reps: 10 }] },
      { id: 'b', phase: 'warmup', tracking_mode: 'reps', exercises: { slug: 'activation' }, workout_sets: [{ completed: true, set_type: 'working', weight: null, reps: 12 }] },
      { id: 'c', phase: 'main', prescription_mode: 'time', exercises: { slug: 'plank' }, workout_sets: [{ completed: true, set_type: 'working', duration_seconds: 45 }] },
      { id: 'd', phase: 'main', tracking_mode: 'duration_distance', exercises: { slug: 'run' }, workout_sets: [{ completed: true, set_type: 'working', duration_seconds: 600, distance_meters: 2000 }] },
    ],
  });
  assert.equal(actuals.totalVolumeKg, 200);
  assert.equal(actuals.totalReps, 10);
  assert.equal(actuals.totalActiveDurationSeconds, 645);
  assert.equal(actuals.totalDistanceMeters, 2000);
  assert.equal(actuals.exercises.find((item) => item.exerciseSlug === 'plank')?.repRangeDisplay, '45 giây');
});

test('AC-09 progression identifies weight mode only', () => {
  assert.equal(isMainWeightRepsExercise({ phase: 'main', tracking_mode: 'weight_reps' }), true);
  assert.equal(isMainWeightRepsExercise({ phase: 'main', tracking_mode: 'reps' }), false);
  assert.equal(isMainWeightRepsExercise({ phase: 'main', tracking_mode: 'duration' }), false);
  assert.equal(isMainWeightRepsExercise({ phase: 'main', prescription_mode: 'reps', actual_weight: 25 }), true);
});

function recoveryExercise(id: string, phase: string, trackingMode: string, set: Record<string, unknown>) {
  return {
    id,
    exercise_id: id,
    phase,
    tracking_mode: trackingMode,
    workout_sets: [{ completed: true, reps: null, rir: 2, perceived_effort: 'appropriate', note: null, set_type: 'working', ...set }],
    exercises: { exercise_muscles: [{ muscle_id: 'muscle', role: 'primary', contribution: 1, muscles: { slug: 'chest' } }] },
  };
}

test('AC-10 recovery counts every valid main mode and excludes accessory phases', () => {
  const workout = {
    id: 'workout', user_id: 'user', date: '2026-08-26', status: 'completed', completed_at: null,
    recovery_processed_at: null, recovery_model_version: null,
    workout_exercises: [
      recoveryExercise('loaded', 'main', 'weight_reps', { weight: 20, reps: 10 }),
      recoveryExercise('bodyweight', 'main', 'reps', { reps: 12 }),
      recoveryExercise('plank', 'main', 'duration', { duration_seconds: 45 }),
      recoveryExercise('run', 'main', 'duration_distance', { duration_seconds: 600, distance_meters: 2000 }),
      recoveryExercise('warmup', 'warmup', 'duration', { duration_seconds: 60 }),
      recoveryExercise('cooldown', 'cooldown', 'duration', { duration_seconds: 60 }),
    ],
  } as RecoveryWorkout;
  const loads = buildWorkoutLoads(workout, '2026-08-26T00:00:00.000Z');
  assert.deepEqual(loads.map((load) => load.workout_exercise_id), ['loaded', 'bodyweight', 'plank', 'run']);
});

test('AC-11 canonical unit conversions round-trip', () => {
  assert.ok(Math.abs(lbToKg(kgToLb(42.5)) - 42.5) < 1e-9);
  assert.ok(Math.abs(milesToMeters(metersToMiles(5000)) - 5000) < 1e-9);
});

test('AC-11 profile units round-trip through UI values while storage stays canonical', () => {
  const canonicalKg = 42.5;
  const displayedLb = kgToLb(canonicalKg);
  assert.ok(Math.abs(lbToKg(displayedLb) - canonicalKg) < 1e-9);
  assert.equal(formatLoad(canonicalKg, 'imperial'), '93.7 lb');

  const canonicalMeters = 5000;
  const displayedMiles = distanceFromCanonical(canonicalMeters, 'imperial');
  assert.ok(Math.abs(distanceToCanonical(displayedMiles, 'imperial') - canonicalMeters) < 1e-9);
  assert.equal(roundCanonical(distanceToCanonical(displayedMiles, 'imperial')), 5000);

  const createPage = readFileSync('src/app/(app)/workouts/new/page.tsx', 'utf8');
  const activePage = readFileSync('src/app/(app)/workouts/[id]/page.tsx', 'utf8');
  const donePage = readFileSync('src/app/(app)/workouts/[id]/done/page.tsx', 'utf8');
  for (const source of [createPage, activePage, donePage]) {
    assert.match(source, /unit_system/);
    assert.match(source, /unitSystem=/);
  }
});

test('AC-05 completed duration-distance requires measured time and positive distance', () => {
  const at = { startedAt: '2026-08-26T00:00:00.000Z', completedAt: '2026-08-26T00:10:00.000Z' };
  assert.throws(
    () => buildCompletedMetricSet('duration_distance', { durationSeconds: 600 }, at),
    /positive duration and distance/,
  );
  assert.throws(
    () => buildCompletedMetricSet('duration_distance', { distanceMeters: 2000 }, at),
    /positive duration and distance/,
  );
});

test('AC-05 distance-only logger counts up and summaries omit missing metrics', () => {
  const loggerSource = readFileSync('src/app/(app)/workouts/[id]/components/timed-exercise-logger.tsx', 'utf8');
  assert.match(loggerSource, /const isDistanceOnly/);
  assert.doesNotMatch(loggerSource, /exercise\.duration_seconds \?\? 45/);
  assert.match(loggerSource, /distanceMeters <= 0/);
  const validationIndex = loggerSource.indexOf("mode === 'duration_distance' && distanceMeters <= 0");
  const sendGuardIndex = loggerSource.indexOf('completionSent.current = true', validationIndex);
  assert.ok(validationIndex >= 0 && sendGuardIndex > validationIndex, 'validation must run before the duplicate-send guard is committed');
  assert.match(loggerSource, /\[distanceMeters,[^\]]*timerState\.remainingSeconds/);
  assert.equal(formatDurationDistanceActual(600, null, 'metric'), '10:00');
  assert.equal(formatDurationDistanceActual(null, 1609.344, 'imperial'), '1.00 mi');
  assert.equal(formatDurationDistanceActual(null, null, 'metric'), '');
});
