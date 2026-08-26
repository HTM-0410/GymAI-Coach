import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildRecoveryWorkoutSelection,
  capProgressionByMuscleReadiness,
  filterCandidatesForRecovery,
  recoveryPromptContext,
} from '../src/lib/recovery/recommendation-policy';
import { BODY_MUSCLE_GROUP_LABELS, type BodyMuscleGroup } from '../src/lib/recovery/muscle-groups';
import type { MuscleReadinessGroup } from '../src/lib/recovery/read-model';
import { dumbbellWeightAtOrBelow } from '../src/lib/dumbbell-inventory';

function group(groupId: BodyMuscleGroup, readiness: number | null, stale = false): MuscleReadinessGroup {
  return {
    group: groupId,
    label: BODY_MUSCLE_GROUP_LABELS[groupId],
    readiness,
    readinessSource: readiness === null ? 'default' : 'model',
    status: readiness === null ? 'unknown' : readiness < 60 ? 'recovering' : readiness < 80 ? 'light_only' : readiness < 90 ? 'trainable' : 'ready',
    confidence: readiness === null ? 'unknown' : 'high',
    stale,
    limitingMuscle: null,
    projectedAt: { r60: null, r80: null, r90: null },
    lastTrainedAt: null,
    explanation: '',
  };
}

test('selection accepts 80+ and records deterministic skip reasons', () => {
  const result = buildRecoveryWorkoutSelection([
    group('CHEST', 90), group('SHOULDERS', 72), group('BACK', 45), group('CALVES', null),
  ], ['CHEST', 'SHOULDERS', 'BACK', 'CALVES']);

  assert.deepEqual(result.selectedGroups, ['CHEST']);
  assert.deepEqual(result.weakGroups, [
    { group: 'SHOULDERS', readiness: 72 },
    { group: 'BACK', readiness: 45 },
  ]);
  assert.deepEqual(result.skippedGroups.map((item) => item.reason), [
    'muscle_readiness.skipped_light_only',
    'muscle_readiness.skipped_recovering',
    'muscle_readiness.unknown_neutral',
  ]);
});

test('explicit user override keeps weak groups and exposes scores to the AI context', () => {
  const result = buildRecoveryWorkoutSelection([
    group('CHEST', 90), group('SHOULDERS', 72), group('BACK', 45),
  ], ['CHEST', 'SHOULDERS', 'BACK'], 'include_weak');

  assert.deepEqual(result.selectedGroups, ['CHEST', 'SHOULDERS', 'BACK']);
  assert.equal(result.skippedGroups.length, 0);
  assert.ok(result.reasonCodes.includes('muscle_readiness.user_override'));
  assert.match(recoveryPromptContext(result) ?? '', /Vai:72%/);
  assert.match(recoveryPromptContext(result) ?? '', /Lưng:45%/);
  assert.match(recoveryPromptContext(result) ?? '', /giảm cường độ/);
});

test('default-ready groups may enter generation while safety overrides remain higher priority', () => {
  const coldStart = group('CHEST', 100);
  coldStart.readinessSource = 'default';
  assert.deepEqual(
    buildRecoveryWorkoutSelection([coldStart], ['CHEST']).selectedGroups,
    ['CHEST'],
  );
  const safe = capProgressionByMuscleReadiness({
    outcome: 'progress', weight_delta: 2.5, rep_shift: 1, rest_delta: 0, reason_vi: 'Đạt mục tiêu.', confidence: 0.9,
  }, coldStart.readiness, { painOrContraindication: true });
  assert.equal(safe.outcome, 'deload');
});

test('candidate filter removes low-readiness groups while Unknown stays neutral', () => {
  const selection = buildRecoveryWorkoutSelection([
    group('CHEST', 90), group('SHOULDERS', 40), group('BACK', null),
  ], ['CHEST', 'SHOULDERS', 'BACK']);
  const result = filterCandidatesForRecovery([
    { id: 'chest', primary_muscle_slug: 'chest' },
    { id: 'shoulder', primary_muscle_slug: 'shoulders' },
    { id: 'back', primary_muscle_slug: 'back' },
  ], selection);

  assert.deepEqual(result.map((item) => item.id), ['chest', 'back']);
});

test('candidate filter blocks secondary recovering muscles and unmapped candidates', () => {
  const selection = buildRecoveryWorkoutSelection([
    group('CHEST', 90), group('TRICEPS', 40),
  ], ['CHEST', 'TRICEPS']);
  const result = filterCandidatesForRecovery([
    { id: 'press', primary_muscle_slug: 'chest', muscle_slugs: ['chest', 'triceps'] },
    { id: 'fly', primary_muscle_slug: 'chest', muscle_slugs: ['chest'] },
    { id: 'unmapped', primary_muscle_slug: null, muscle_slugs: [] },
  ], selection);

  assert.deepEqual(result.map((item) => item.id), ['fly']);
});

test('readiness weight normalization never exceeds the safe ceiling', () => {
  assert.equal(dumbbellWeightAtOrBelow(8, [12, 14]), null);
  assert.equal(dumbbellWeightAtOrBelow(10, [6, 8, 12]), 8);
});

test('readiness never upgrades a verdict and caps progression below 80', () => {
  const progress = { outcome: 'progress' as const, weight_delta: 2.5, rep_shift: 1, rest_delta: 0, reason_vi: 'Đạt mục tiêu.', confidence: 0.9 };
  assert.equal(capProgressionByMuscleReadiness(progress, 90).outcome, 'progress');
  const held = capProgressionByMuscleReadiness(progress, 70);
  assert.equal(held.outcome, 'maintain');
  assert.ok(held.weight_delta <= 0 && held.rep_shift <= 0);
  assert.equal(capProgressionByMuscleReadiness({ ...progress, outcome: 'maintain', weight_delta: 0 }, 95).outcome, 'maintain');
});

test('pain or contraindication wins over both performance and readiness', () => {
  const result = capProgressionByMuscleReadiness({
    outcome: 'progress', weight_delta: 2.5, rep_shift: 1, rest_delta: 0, reason_vi: 'Đạt mục tiêu.', confidence: 0.9,
  }, 100, { painOrContraindication: true });
  assert.equal(result.outcome, 'deload');
  assert.ok(result.weight_delta <= 0);
  assert.match(result.reason_vi, /ưu tiên/);
});

test('generation route reloads owner state and planner applies readiness after hard constraints', () => {
  const route = readFileSync('src/app/api/workout/generate/route.ts', 'utf8');
  const planner = readFileSync('src/lib/ai/planner.ts', 'utf8');
  assert.match(route, /muscle_recovery_states/);
  assert.match(route, /\.eq\('user_id', user\.id\)/);
  assert.match(route, /json\.recoveryDecision/);
  assert.ok(planner.indexOf('filterCandidateExercises') < planner.indexOf('filterCandidatesForRecovery'));
  assert.match(planner, /Math\.min\(previous, proposed\)/);
  assert.match(planner, /dumbbellWeightAtOrBelow\(desired, dumbbellWeights\)/);
  assert.match(planner, /Đau và chống chỉ định.*ưu tiên/i);
  assert.match(planner, /targetMuscleGroups: args\.recoverySelection\.selectedGroups/);
});
