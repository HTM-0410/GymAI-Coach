import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const MIGRATION_PATH = 'supabase/migrations/20260824190909_add_muscle_readiness_foundation.sql';
const INDEX_MIGRATION_PATH = 'supabase/migrations/20260824192635_add_muscle_readiness_fk_indexes.sql';

test('muscle readiness migration creates the additive persistence contract', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(sql, /ALTER TABLE public\.exercise_muscles\s+ADD COLUMN contribution NUMERIC\(4,3\)/i);
  assert.match(sql, /CHECK \(contribution IS NULL OR \(contribution > 0 AND contribution <= 1\)\)/i);
  assert.match(sql, /ADD COLUMN recovery_processed_at TIMESTAMPTZ/i);
  assert.match(sql, /ADD COLUMN recovery_model_version TEXT/i);
  assert.match(sql, /CREATE TABLE public\.muscle_training_loads/i);
  assert.match(sql, /CREATE TABLE public\.muscle_recovery_states/i);
  assert.match(sql, /UNIQUE \(workout_exercise_id, muscle_id, model_version\)/i);
  assert.match(sql, /PRIMARY KEY \(user_id, muscle_id\)/i);
  assert.match(sql, /FOREIGN KEY \(last_workout_id, user_id\)[\s\S]*ON DELETE SET NULL \(last_workout_id\)/i);
  assert.doesNotMatch(sql, /readiness_(?:score|now)/i);
});

test('new recovery tables are owner-readable and server-write-only', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  for (const table of ['muscle_training_loads', 'muscle_recovery_states']) {
    assert.match(sql, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i'));
    assert.match(sql, new RegExp(`ALTER TABLE public\\.${table} FORCE ROW LEVEL SECURITY`, 'i'));
    assert.match(
      sql,
      new RegExp(`ON public\\.${table}\\s+FOR SELECT\\s+TO authenticated\\s+USING \\(\\(SELECT auth\\.uid\\(\\)\\) = user_id\\)`, 'i'),
    );
    assert.match(sql, new RegExp(`REVOKE ALL ON TABLE public\\.${table} FROM anon, authenticated`, 'i'));
    assert.match(sql, new RegExp(`GRANT SELECT ON TABLE public\\.${table} TO authenticated`, 'i'));
    assert.match(sql, new RegExp(`GRANT ALL ON TABLE public\\.${table} TO service_role`, 'i'));
  }

  assert.doesNotMatch(sql, /GRANT (?:INSERT|UPDATE|DELETE|ALL).* TO authenticated/i);
});

test('exercise sync preserves curated contributions and dry-run avoids catalog writes', () => {
  const source = readFileSync('scripts/sync-exercises.ts', 'utf8');

  assert.match(source, /select\('exercise_id, muscle_id, role, contribution'\)/);
  assert.match(source, /existingContributions\.get\(key\) \?\? 1/);
  assert.match(source, /existingContributions\.get\(key\) \?\? 0\.5/);

  const missingMuscleBlock = source.indexOf('if (newMuscles.length > 0)');
  const dryRunGuard = source.indexOf('if (DRY_RUN)', missingMuscleBlock);
  const missingMuscleUpsert = source.indexOf(".upsert(newMuscles", missingMuscleBlock);
  assert.ok(missingMuscleBlock >= 0);
  assert.ok(dryRunGuard > missingMuscleBlock);
  assert.ok(missingMuscleUpsert > dryRunGuard);
});

test('follow-up migration covers every recovery foreign key reported by advisors', () => {
  const sql = readFileSync(INDEX_MIGRATION_PATH, 'utf8');

  assert.match(sql, /muscle_training_loads\(workout_id, user_id\)/i);
  assert.match(sql, /muscle_training_loads\(workout_exercise_id, workout_id\)/i);
  assert.match(sql, /muscle_training_loads\(muscle_id\)/i);
  assert.match(sql, /muscle_recovery_states\(last_workout_id, user_id\)/i);
  assert.match(sql, /muscle_recovery_states\(muscle_id\)/i);
});
