import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateMuscleReadiness,
  getBodyMuscleGroup,
  listUnmappedMuscleSlugs,
} from '../src/lib/recovery/muscle-groups';
import {
  calculateFatiguePoints,
  calculateReadinessAt,
  combineFatigue,
  decayFatigue,
  fatigueFromPoints,
  foldFatigueEvents,
  projectReadinessAt,
  resolveHalfLifeHours,
  resolveMuscleContribution,
} from '../src/lib/recovery/model';
import {
  lowestRecoveryInputQuality,
  resolveRecoveryInputQuality,
} from '../src/lib/recovery/confidence';

function closeTo(actual: number, expected: number, tolerance = 0.0001) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} was not within ${tolerance} of ${expected}`);
}

test('role fallback and curated contribution are deterministic', () => {
  assert.deepEqual(resolveMuscleContribution(null, 'primary'), { value: 1, source: 'role_fallback' });
  assert.deepEqual(resolveMuscleContribution(undefined, 'secondary'), { value: 0.5, source: 'role_fallback' });
  assert.deepEqual(resolveMuscleContribution(0.65, 'secondary'), { value: 0.65, source: 'curated' });
  assert.throws(() => resolveMuscleContribution(0, 'primary'), RangeError);
  assert.throws(() => resolveMuscleContribution(1.01, 'primary'), RangeError);
});

test('fatigue points count only completed sets with positive reps', () => {
  const result = calculateFatiguePoints({
    contribution: 1,
    sets: [
      { completed: true, reps: 10, perceivedEffort: 'appropriate', setType: 'working' },
      { completed: true, reps: 8, perceivedEffort: 'hard', setType: 'warmup' },
      { completed: true, reps: 5, perceivedEffort: 'too_hard', setType: 'failure' },
      { completed: false, reps: 10, perceivedEffort: 'hard', setType: 'working' },
      { completed: true, reps: 0, perceivedEffort: 'hard', setType: 'working' },
    ],
  });

  assert.equal(result.completedSetCount, 3);
  closeTo(result.fatiguePoints, 3.1);
});

test('fatigue saturation uses K 6 and never reaches 100', () => {
  assert.equal(fatigueFromPoints(0), 0);
  closeTo(fatigueFromPoints(6), 63.2120558829);
  assert.ok(fatigueFromPoints(100) < 100);
  assert.throws(() => fatigueFromPoints(-1), RangeError);
});

test('fatigue halves at each half-life and future clock skew adds no decay', () => {
  closeTo(decayFatigue(80, 20, 20), 40);
  closeTo(decayFatigue(80, 40, 20), 20);
  closeTo(decayFatigue(80, -2, 20), 80);
});

test('fatigue events combine without exceeding 100', () => {
  closeTo(combineFatigue(40, 50), 70);
  closeTo(combineFatigue(100, 80), 100);
});

test('readiness and 60 80 90 projections follow the half-life curve', () => {
  const state = {
    fatigueScore: 80,
    fatigueAt: '2026-08-25T00:00:00.000Z',
    halfLifeHours: 20,
  };

  closeTo(calculateReadinessAt(state, '2026-08-25T20:00:00.000Z'), 60);
  assert.equal(projectReadinessAt(state, 60, state.fatigueAt), '2026-08-25T20:00:00.000Z');
  assert.equal(projectReadinessAt(state, 80, state.fatigueAt), '2026-08-26T16:00:00.000Z');
  assert.equal(projectReadinessAt(state, 90, state.fatigueAt), '2026-08-27T12:00:00.000Z');
  assert.equal(projectReadinessAt(state, 100, state.fatigueAt), null);
});

test('event folding sorts chronologically, decays old fatigue, and keeps lowest confidence', () => {
  const state = foldFatigueEvents([
    { newFatigue: 50, occurredAt: '2026-08-25T20:00:00.000Z', halfLifeHours: 20, confidence: 'medium' },
    { newFatigue: 60, occurredAt: '2026-08-25T00:00:00.000Z', halfLifeHours: 20, confidence: 'high' },
  ]);

  assert.ok(state);
  closeTo(state.fatigueScore, 65);
  assert.equal(state.fatigueAt, '2026-08-25T20:00:00.000Z');
  assert.equal(state.confidence, 'medium');
  assert.equal(foldFatigueEvents([]), null);
});

test('configured half-life is explicit and unknown muscles use a low-confidence fallback', () => {
  assert.deepEqual(resolveHalfLifeHours('quads'), { value: 22, source: 'configured' });
  assert.deepEqual(resolveHalfLifeHours('unknown-muscle'), { value: 18, source: 'default' });
});

test('confidence reflects source quality and combines conservatively', () => {
  assert.equal(resolveRecoveryInputQuality({
    contributionSource: 'curated', effortSource: 'column', halfLifeSource: 'configured',
  }), 'high');
  assert.equal(resolveRecoveryInputQuality({
    contributionSource: 'role_fallback', effortSource: 'rir', halfLifeSource: 'configured',
  }), 'medium');
  assert.equal(resolveRecoveryInputQuality({
    contributionSource: 'curated', effortSource: 'fallback', halfLifeSource: 'configured',
  }), 'low');
  assert.equal(lowestRecoveryInputQuality(['high', 'low', 'medium']), 'low');
});

test('presentation mapping covers aliases and reports intentional gaps', () => {
  assert.equal(getBodyMuscleGroup('upper-back'), 'BACK');
  assert.equal(getBodyMuscleGroup('serratus'), 'CHEST');
  assert.equal(getBodyMuscleGroup('calves'), 'CALVES');
  assert.deepEqual(
    listUnmappedMuscleSlugs(['cardiovascular-system', 'chest', 'sternocleidomastoid', 'cardiovascular-system']),
    ['cardiovascular-system', 'sternocleidomastoid'],
  );
});

test('group readiness uses the lowest measured muscle and preserves unknown cold start', () => {
  const groups = aggregateMuscleReadiness([
    { id: '1', slug: 'front_delts', nameVi: 'Vai trước', readiness: 82, confidence: 'high' },
    { id: '2', slug: 'rear_delts', nameVi: 'Vai sau', readiness: 54, confidence: 'medium' },
    { id: '3', slug: 'calves', nameVi: 'Bắp chân', readiness: null, confidence: 'unknown' },
  ]);
  const shoulders = groups.find((group) => group.group === 'SHOULDERS');
  const calves = groups.find((group) => group.group === 'CALVES');

  assert.equal(shoulders?.readiness, 54);
  assert.equal(shoulders?.limitingMuscle?.slug, 'rear_delts');
  assert.equal(shoulders?.confidence, 'medium');
  assert.equal(calves?.readiness, null);
  assert.equal(calves?.confidence, 'unknown');
});
