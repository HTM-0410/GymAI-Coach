import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { isMuscleReadinessEnabled } from '../src/lib/recovery/feature-flags';

test('kill switch defaults on and can disable the recovery surface', () => {
  const previous = process.env.MUSCLE_READINESS_ENABLED;
  delete process.env.MUSCLE_READINESS_ENABLED;
  assert.equal(isMuscleReadinessEnabled(), true);
  process.env.MUSCLE_READINESS_ENABLED = 'false';
  assert.equal(isMuscleReadinessEnabled(), false);
  if (previous === undefined) delete process.env.MUSCLE_READINESS_ENABLED;
  else process.env.MUSCLE_READINESS_ENABLED = previous;
});

test('backfill defaults to dry-run and write requires two independent gates', () => {
  const source = readFileSync('scripts/backfill-muscle-readiness.ts', 'utf8');
  assert.match(source, /const writeMode = args\.has\('--write'\)/);
  assert.match(source, /MUSCLE_READINESS_BACKFILL_APPROVAL/);
  assert.match(source, /APPROVED APPLY MUSCLE READINESS BACKFILL TO LIVE/);
  assert.match(source, /baseQuery\.gt\('id', lastId\)/);
  assert.match(source, /workouts\.length !== expected \|\| finalCount !== expected/);
  assert.doesNotMatch(source, /\.range\(/);
  assert.ok(source.indexOf("if (!writeMode)") < source.indexOf('processCompletedWorkout({'));
  assert.doesNotMatch(source, /\.delete\(/);
});

test('write mode reuses the idempotent completion processor', () => {
  const source = readFileSync('scripts/backfill-muscle-readiness.ts', 'utf8');
  const processor = readFileSync('src/lib/recovery/process-workout.server.ts', 'utf8');
  assert.match(source, /processCompletedWorkout/);
  assert.match(processor, /alreadyProcessed: true/);
  assert.match(processor, /onConflict: 'workout_exercise_id,muscle_id,model_version'/);
});

test('flag hides UI and API recommendation while preserving completion processing', () => {
  const page = readFileSync('src/app/(app)/recovery/page.tsx', 'utf8');
  const summaryApi = readFileSync('src/app/api/recovery/route.ts', 'utf8');
  const generator = readFileSync('src/app/api/workout/generate/route.ts', 'utf8');
  const completion = readFileSync('src/app/api/workouts/[id]/complete/route.ts', 'utf8');
  assert.match(page, /isMuscleReadinessEnabled/);
  assert.match(summaryApi, /recovery_disabled/);
  assert.match(generator, /isMuscleReadinessEnabled\(\).*requestedRecoveryGroups/);
  assert.doesNotMatch(completion, /recovery_disabled/);
});
