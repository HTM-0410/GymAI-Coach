import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { BODY_MUSCLE_GROUPS } from '../src/lib/recovery/muscle-groups';
import {
  buildRecoverySummary,
  readinessStatus,
  type RecoveryStateReadRow,
} from '../src/lib/recovery/read-model';
import {
  buildLatestActivityByGroup,
  dedupeRecoveryActivities,
  type RecoveryActivityReadRow,
} from '../src/lib/recovery/activity';
import {
  daysSinceCompletedWorkout,
  selectFreshRecoveryGroups,
  selectWorkoutEligibleRecoveryGroups,
  sortRecoveryGroupsByStatus,
} from '../src/lib/recovery/ui-selectors';

const AT = '2026-08-25T00:00:00.000Z';

function state(overrides: Partial<RecoveryStateReadRow> = {}): RecoveryStateReadRow {
  return {
    user_id: 'owner-1',
    muscle_id: 'muscle-chest',
    fatigue_score: 80,
    fatigue_at: AT,
    half_life_hours: 20,
    confidence: 'high',
    last_workout_id: 'workout-1',
    model_version: 'muscle_readiness_v1',
    muscles: { id: 'muscle-chest', slug: 'chest', name: 'Chest', name_vi: 'Ngực' },
    ...overrides,
  };
}

test('summary returns every cold-start group as disclosed default ready', () => {
  const groups = buildRecoverySummary([], AT);
  assert.deepEqual(groups.map((item) => item.group), BODY_MUSCLE_GROUPS);
  assert.ok(groups.every((item) => (
    item.readiness === 100
    && item.status === 'ready'
    && item.readinessSource === 'default'
    && item.stale === false
    && item.projectedAt.r60 === AT
    && item.projectedAt.r80 === AT
    && item.projectedAt.r90 === AT
    && !item.explanation.includes('Chưa đủ dữ liệu')
  )));
});

test('summary derives readiness and exact projections at read time', () => {
  const chest = buildRecoverySummary([state()], AT).find((item) => item.group === 'CHEST')!;
  assert.equal(chest.readiness, 20);
  assert.equal(chest.status, 'recovering');
  assert.equal(chest.readinessSource, 'model');
  assert.equal(chest.projectedAt.r60, '2026-08-25T20:00:00.000Z');
  assert.equal(chest.projectedAt.r80, '2026-08-26T16:00:00.000Z');
  assert.equal(chest.projectedAt.r90, '2026-08-27T12:00:00.000Z');
  assert.match(chest.explanation, /ước tính từ nhật ký tập/);
});

test('group uses the lowest current child muscle', () => {
  const rows = [
    state(),
    state({
      muscle_id: 'upper-chest-id',
      fatigue_score: 40,
      muscles: { id: 'upper-chest-id', slug: 'upper_chest', name: 'Upper Chest', name_vi: 'Ngực trên' },
    }),
  ];
  const chest = buildRecoverySummary(rows, AT).find((item) => item.group === 'CHEST')!;
  assert.equal(chest.readiness, 20);
  assert.equal(chest.limitingMuscle?.slug, 'chest');
});

test('old-model-only state falls back to the disclosed default baseline', () => {
  const chest = buildRecoverySummary([
    state({ model_version: 'muscle_readiness_v0' }),
  ], AT).find((item) => item.group === 'CHEST')!;
  assert.equal(chest.readiness, 100);
  assert.equal(chest.status, 'ready');
  assert.equal(chest.readinessSource, 'default');
  assert.equal(chest.stale, false);
  assert.match(chest.explanation, /mức mặc định/);
});

test('status boundaries follow the approved 60 80 90 thresholds', () => {
  assert.equal(readinessStatus(null), 'unknown');
  assert.equal(readinessStatus(59), 'recovering');
  assert.equal(readinessStatus(60), 'light_only');
  assert.equal(readinessStatus(80), 'trainable');
  assert.equal(readinessStatus(90), 'ready');
});

function group(readiness: number | null, groupName: (typeof BODY_MUSCLE_GROUPS)[number], stale = false) {
  return {
    ...buildRecoverySummary([], AT).find((item) => item.group === groupName)!,
    readiness,
    readinessSource: readiness === null ? 'default' as const : 'model' as const,
    status: readinessStatus(readiness),
    stale,
  };
}

test('UI selectors keep fresh and workout-eligible thresholds distinct', () => {
  const groups = [
    group(79, 'CHEST'),
    group(80, 'SHOULDERS'),
    group(89, 'BACK'),
    group(90, 'TRICEPS'),
    group(null, 'BICEPS'),
    group(100, 'FOREARMS', true),
  ];
  assert.deepEqual(selectFreshRecoveryGroups(groups).map((item) => item.readiness), [90]);
  assert.deepEqual(
    selectWorkoutEligibleRecoveryGroups(groups).map((item) => item.readiness),
    [80, 89, 90],
  );
});

test('days since latest completion handles null, timezone offsets, invalid input and clock skew', () => {
  assert.equal(daysSinceCompletedWorkout(null, AT), null);
  assert.equal(daysSinceCompletedWorkout('invalid', AT), null);
  assert.equal(daysSinceCompletedWorkout('2026-08-23T07:00:00+07:00', AT), 2);
  assert.equal(daysSinceCompletedWorkout('2026-08-25T01:00:00.000Z', AT), 0);
});

test('status sorting is stable within canonical order and treats stale as unknown', () => {
  const sorted = sortRecoveryGroupsByStatus([
    group(null, 'CALVES'),
    group(89, 'BICEPS'),
    group(90, 'TRICEPS'),
    group(90, 'CHEST'),
    group(20, 'SHOULDERS'),
    group(100, 'BACK', true),
  ]);
  assert.deepEqual(sorted.map((item) => item.group), [
    'CHEST', 'TRICEPS', 'BICEPS', 'SHOULDERS', 'BACK', 'CALVES',
  ]);
});

function activity(overrides: Partial<RecoveryActivityReadRow> = {}): RecoveryActivityReadRow {
  return {
    id: 'load-1',
    workout_id: 'workout-1',
    workout_exercise_id: 'workout-exercise-1',
    muscle_id: 'chest',
    completed_set_count: 4,
    occurred_at: '2026-08-24T00:00:00.000Z',
    muscles: { slug: 'chest' },
    workout_exercises: { exercises: { name: 'Bench Press', name_vi: 'Đẩy ngực', slug: 'bench-press' } },
    ...overrides,
  };
}

test('activity reducer dedupes child muscles and keeps completed set count safely', () => {
  const rows = [
    activity(),
    activity({ id: 'load-2', muscle_id: 'upper-chest', muscles: { slug: 'upper_chest' }, completed_set_count: 4 }),
  ];
  const deduped = dedupeRecoveryActivities(rows);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].completed_set_count, 4);
  assert.deepEqual(buildLatestActivityByGroup(rows).CHEST, {
    occurredAt: '2026-08-24T00:00:00.000Z',
    exerciseName: 'Đẩy ngực',
    completedSetCount: 4,
  });
});

test('latest activity keeps one shared exercise visible in every affected presentation group', () => {
  const latest = buildLatestActivityByGroup([
    activity(),
    activity({ id: 'load-2', muscle_id: 'triceps', muscles: { slug: 'triceps' } }),
  ]);
  assert.equal(latest.CHEST?.exerciseName, 'Đẩy ngực');
  assert.equal(latest.TRICEPS?.exerciseName, 'Đẩy ngực');
});

test('read routes authenticate, stay owner scoped, and bound detail history', () => {
  const summaryRoute = readFileSync('src/app/api/recovery/route.ts', 'utf8');
  const detailRoute = readFileSync('src/app/api/recovery/[group]/route.ts', 'utf8');
  assert.doesNotMatch(summaryRoute, /createServiceClient/);
  assert.doesNotMatch(detailRoute, /createServiceClient/);
  assert.match(summaryRoute, /auth\.getUser\(\)/);
  assert.match(detailRoute, /auth\.getUser\(\)/);
  assert.match(summaryRoute, /\.eq\('user_id', user\.id\)/);
  assert.match(detailRoute, /\.eq\('user_id', user\.id\)/);
  assert.match(detailRoute, /const HISTORY_DAYS = 14/);
  assert.match(detailRoute, /const HISTORY_LIMIT = 20/);
  assert.match(detailRoute, /\.in\('muscle_id', muscleIds\)/);
  assert.equal((summaryRoute.match(/\.from\('muscle_recovery_states'\)/g) ?? []).length, 1);
  assert.equal((summaryRoute.match(/\.from\('muscle_training_loads'\)/g) ?? []).length, 1);
  assert.match(summaryRoute, /\.from\('workouts'\)/);
  assert.match(summaryRoute, /\.eq\('status', 'completed'\)/);
  assert.equal((summaryRoute.match(/\.eq\('user_id', user\.id\)/g) ?? []).length, 3);
  assert.match(summaryRoute, /const ACTIVITY_DAYS = 14/);
  assert.match(summaryRoute, /\.gte\('occurred_at', activityStart\)/);
  assert.doesNotMatch(summaryRoute, /ACTIVITY_LIMIT/);
  assert.match(detailRoute, /dedupeRecoveryActivities/);
});
