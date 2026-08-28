import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { WorkoutGenerateRequestSchema } from '../src/lib/ai/workout-contract';
import { excludeCandidatesBySlug, repairGeneratedPlanPhases } from '../src/lib/ai/planner';
import { isCandidateBanned, resolveWorkoutConstraints, workoutConstraintsForPhase } from '../src/lib/ai/workout-constraints';
import { rankSimilarExercises } from '../src/lib/training/exercise-similarity';
import { workoutRegenerationExclusions } from '../src/lib/training/workout-regeneration';

test('regeneration request accepts a bounded server-enforced exclusion list', () => {
  const parsed = WorkoutGenerateRequestSchema.parse({
    programDayId: '11111111-1111-4111-8111-111111111111',
    gymId: 'bodyweight',
    durationMinutes: 75,
    excludedExerciseSlugs: ['push-up', 'plank'],
  });
  assert.deepEqual(parsed.excludedExerciseSlugs, ['push-up', 'plank']);
  assert.equal(WorkoutGenerateRequestSchema.safeParse({
    programDayId: '11111111-1111-4111-8111-111111111111',
    gymId: 'bodyweight',
    excludedExerciseSlugs: Array.from({ length: 16 }, (_, index) => `exercise-${index}`),
  }).success, false);
});

test('regeneration removes old slugs before AI and deterministic fallback selection', () => {
  const candidates = [
    { slug: 'push-up' },
    { slug: 'incline-press' },
    { slug: 'cable-fly' },
  ];
  assert.deepEqual(
    excludeCandidatesBySlug(candidates, ['push-up', 'cable-fly']).map((item) => item.slug),
    ['incline-press'],
  );
});

test('known Gemini phase mistakes are dropped and missing phases use a valid fallback', () => {
  const refs = new Map([
    ['W_001', { ref: 'W_001', phase: 'warmup' as const, candidate: { id: 'warmup' } }],
    ['M_001', { ref: 'M_001', phase: 'main' as const, candidate: { id: 'main' } }],
  ]);
  const fallback = [
    { exercise_slug: 'W_001', phase: 'warmup' },
    { exercise_slug: 'M_001', phase: 'main' },
  ] as any;
  const repaired = repairGeneratedPlanPhases([
    { exercise_slug: 'M_001', phase: 'warmup' },
    { exercise_slug: 'M_001', phase: 'main' },
  ] as any, refs, fallback, ['warmup', 'main']);

  assert.equal(repaired.repaired, true);
  assert.deepEqual(repaired.exercises.map((exercise) => [exercise.exercise_slug, exercise.phase]), [
    ['W_001', 'warmup'],
    ['M_001', 'main'],
  ]);
});

test('machine-first prompt without free weights becomes an enforceable candidate constraint', () => {
  const constraints = resolveWorkoutConstraints(
    undefined,
    'Ưu tiên dùng máy (Machine), bỏ tạ tự do',
    75,
  );
  assert.ok(constraints.allowedEquipment.includes('machine'));
  assert.ok(constraints.deniedEquipment.includes('barbell'));
  assert.ok(constraints.deniedEquipment.includes('dumbbell'));
  assert.equal(isCandidateBanned(
    { slug: 'push-up', equipment_slugs: ['bodyweight'] },
    workoutConstraintsForPhase(constraints, 'main'),
  ).banned, true);
  assert.equal(isCandidateBanned(
    { slug: 'arm-circles', equipment_slugs: ['bodyweight'] },
    workoutConstraintsForPhase(constraints, 'warmup'),
  ).banned, false);
});

test('client reroll excludes the full draft or only the selected phase', () => {
  const draft = [
    { exerciseSlug: 'warmup-old', phase: 'warmup' as const },
    { exerciseSlug: 'main-old', phase: 'main' as const },
    { exerciseSlug: 'cooldown-old', phase: 'cooldown' as const },
  ];
  assert.deepEqual(workoutRegenerationExclusions(draft, { fullReset: true }), [
    'warmup-old', 'main-old', 'cooldown-old',
  ]);
  assert.deepEqual(workoutRegenerationExclusions(draft, { fullReset: false, phase: 'main' }), ['main-old']);
});

test('similar exercise ranking keeps the same primary muscle and excludes draft duplicates', () => {
  const source = {
    slug: 'incline-press',
    primaryMuscleVi: 'Ngực trên',
    exerciseType: 'compound',
    equipmentVi: ['Tạ đơn'],
  };
  const ranked = rankSimilarExercises(source, [
    { slug: 'incline-machine-press', primaryMuscleVi: 'Ngực trên', exerciseType: 'compound', equipmentVi: ['Máy'] },
    { slug: 'incline-dumbbell-press', primaryMuscleVi: 'Ngực trên', exerciseType: 'compound', equipmentVi: ['Tạ đơn'] },
    { slug: 'lat-pulldown', primaryMuscleVi: 'Lưng xô', exerciseType: 'compound', equipmentVi: ['Máy'] },
    { slug: 'cable-fly', primaryMuscleVi: 'Ngực', exerciseType: 'isolation', equipmentVi: ['Cáp'] },
  ], ['cable-fly']);

  assert.deepEqual(ranked.map((item) => item.slug), [
    'incline-dumbbell-press',
    'incline-machine-press',
  ]);
});

test('workout draft UI wires the similar swap control to replacement mode', () => {
  const form = readFileSync('src/app/(app)/workouts/new/new-workout-form.tsx', 'utf8');
  const picker = readFileSync('src/components/exercise-picker-modal.tsx', 'utf8');
  assert.match(form, /Đổi nhanh sang bài tương tự/);
  assert.match(form, /replacementConfig=\{draft\.exercises\.find/);
  assert.match(form, /workoutRegenerationExclusions/);
  assert.match(form, /Nguồn: Gemini tạo trực tiếp/);
  assert.match(form, /generateDraft\(undefined, undefined, true\)/);
  assert.match(picker, /Đổi sang bài tương tự/);
  assert.match(picker, /rankSimilarExercises/);
  assert.match(picker, /Đổi sang bài này/);
});
