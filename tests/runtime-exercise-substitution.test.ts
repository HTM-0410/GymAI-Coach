import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  canSwapWorkoutExercise,
  isTrackingModeCompatible,
  resolveWorkoutEquipmentScope,
} from '../src/lib/workouts/substitution';

test('equipment scope preserves selected custom gym and fails safe for legacy null gym workouts', () => {
  assert.equal(resolveWorkoutEquipmentScope({ gym_id: 'gym-1', equipment_scope: 'gym' }), 'gym');
  assert.equal(resolveWorkoutEquipmentScope({ gym_id: null, equipment_scope: 'unrestricted' }), 'unrestricted');
  assert.equal(resolveWorkoutEquipmentScope({ gym_id: null, equipment_scope: 'bodyweight' }), 'bodyweight');
  assert.equal(resolveWorkoutEquipmentScope({ gym_id: null }), 'bodyweight');
});

test('runtime swap is blocked after a completed set or workout completion', () => {
  assert.equal(canSwapWorkoutExercise({ workoutStatus: 'in_progress', completedSets: 0 }).allowed, true);
  assert.equal(canSwapWorkoutExercise({ workoutStatus: 'in_progress', completedSets: 1 }).allowed, false);
  assert.equal(canSwapWorkoutExercise({ workoutStatus: 'completed', completedSets: 0 }).allowed, false);
});

test('substitute must support the active tracking mode', () => {
  assert.equal(isTrackingModeCompatible('weight_reps', {
    default_tracking_mode: 'weight_reps',
    allowed_tracking_modes: ['weight_reps'],
  }), true);
  assert.equal(isTrackingModeCompatible('duration', {
    default_tracking_mode: 'reps',
    allowed_tracking_modes: ['reps', 'weight_reps'],
  }), false);
});

test('workout-scoped substitute API derives gym from workout and uses the atomic service RPC', () => {
  const route = readFileSync('src/app/api/workouts/[id]/exercises/[exerciseId]/substitutes/route.ts', 'utf8');
  assert.match(route, /\.eq\('user_id', userId\)/);
  assert.match(route, /gymId: context\.workout\.gym_id/);
  assert.match(route, /equipmentScope: resolveWorkoutEquipmentScope\(context\.workout\)/);
  assert.match(route, /useLlmRanking: false/);
  assert.match(route, /service\.rpc\('swap_active_workout_exercise'/);
  assert.match(route, /substitute_not_eligible/);
});

test('runtime substitute resolver keeps strict main role and beginner difficulty gates', () => {
  const resolver = readFileSync('src/lib/ai/substitute.ts', 'utf8');
  assert.match(resolver, /args\.phase === 'main'[\s\S]*candidate\.workout_role !== 'main_strength'/);
  assert.match(resolver, /experienceLevel === 'beginner'[\s\S]*candidate\.difficulty === 'advanced'/);
  assert.match(resolver, /candidate\.movement_pattern === sourcePattern/);
  assert.match(resolver, /\.from\('exercises'\)[\s\S]*exercise_muscles!inner/);
  assert.doesNotMatch(resolver, /\.from\('exercise_muscles'\)[\s\S]*exercises!inner/);
  assert.doesNotMatch(resolver, /workout_role === 'main_strength' \|\| candidate\.owner_user_id/);
});

test('swap migration is atomic private and clears stale load only before completed sets', () => {
  const migration = readFileSync('supabase/migrations/20260828120000_add_runtime_exercise_substitution.sql', 'utf8');
  assert.match(migration, /status IN \('planned', 'in_progress'\)/);
  assert.match(migration, /gym_id IS NULL THEN 'bodyweight'/);
  assert.ok(migration.indexOf('FROM public.workout_sets ws') < migration.indexOf('FROM public.workout_exercises we'));
  assert.ok(migration.indexOf('FROM public.workout_exercises we') < migration.indexOf('FROM public.workouts w'));
  assert.match(migration, /ORDER BY ws\.id[\s\S]*FOR UPDATE/);
  assert.match(migration, /ORDER BY we\.id[\s\S]*FOR UPDATE/);
  assert.match(migration, /completed = TRUE/);
  assert.match(migration, /target_weight = NULL/);
  assert.match(migration, /SET weight = NULL/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.swap_active_workout_exercise/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.swap_active_workout_exercise[\s\S]*TO service_role/);
});

test('active workout UI exposes gym-aware replacement and refreshes server state after swap', () => {
  const logger = readFileSync('src/app/(app)/workouts/[id]/workout-logger.tsx', 'utf8');
  const header = readFileSync('src/app/(app)/workouts/[id]/components/exercise-identity-header.tsx', 'utf8');
  const sheet = readFileSync('src/app/(app)/workouts/[id]/components/exercise-substitute-sheet.tsx', 'utf8');
  assert.match(logger, /<ExerciseSubstituteSheet/);
  assert.match(logger, /router\.refresh\(\)/);
  assert.match(header, /Máy bận\? Đổi bài/);
  assert.match(sheet, /phù hợp thiết bị tại gym đã chọn/);
  assert.match(sheet, /method: 'POST'/);
});
