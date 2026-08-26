import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  processCompletedWorkout,
  recoveryStateAdvanceFilter,
  type MuscleLoadWrite,
  type MuscleRecoveryStateWrite,
  type PersistedMuscleLoad,
  type RecoveryProcessingRepository,
  type RecoveryWorkout,
} from '../src/lib/recovery/process-workout.server';

const NOW = '2026-08-25T10:00:00.000Z';

function fixtureWorkout(): RecoveryWorkout {
  return {
    id: 'workout-1',
    user_id: 'owner-1',
    date: '2026-08-25',
    status: 'in_progress',
    completed_at: null,
    recovery_processed_at: null,
    recovery_model_version: null,
    workout_exercises: [{
      id: 'workout-exercise-1',
      exercise_id: 'exercise-1',
      workout_sets: [
        { completed: true, reps: 8, rir: 1, perceived_effort: 'hard', note: null, set_type: 'working' },
        { completed: true, reps: 6, rir: 0, perceived_effort: 'too_hard', note: null, set_type: 'failure' },
        { completed: false, reps: 8, rir: 2, perceived_effort: 'appropriate', note: null, set_type: 'working' },
      ],
      exercises: {
        exercise_muscles: [{
          muscle_id: 'muscle-chest',
          role: 'primary',
          contribution: 1,
          muscles: { slug: 'chest' },
        }],
      },
    }],
  };
}

class MemoryRepository implements RecoveryProcessingRepository {
  workout = fixtureWorkout();
  loads = new Map<string, PersistedMuscleLoad>();
  states = new Map<string, MuscleRecoveryStateWrite>();
  failUpsertStates = false;

  async loadOwnedWorkout(userId: string, workoutId: string) {
    return this.workout.user_id === userId && this.workout.id === workoutId
      ? structuredClone(this.workout)
      : null;
  }

  async reserveCompletedAt(userId: string, workoutId: string, completedAt: string) {
    assert.equal(userId, this.workout.user_id);
    assert.equal(workoutId, this.workout.id);
    this.workout.completed_at ??= completedAt;
    await Promise.resolve();
    return this.workout.completed_at;
  }

  async upsertLoads(loads: readonly MuscleLoadWrite[]) {
    await Promise.resolve();
    for (const load of loads) {
      const key = `${load.workout_exercise_id}:${load.muscle_id}:${load.model_version}`;
      this.loads.set(key, { ...load, muscles: { slug: 'chest' } });
    }
  }

  async listLoads(userId: string, modelVersion: string) {
    return [...this.loads.values()].filter((load) => (
      load.user_id === userId && load.model_version === modelVersion
    ));
  }

  async upsertStates(states: readonly MuscleRecoveryStateWrite[]) {
    if (this.failUpsertStates) throw new Error('state_write_failed');
    await Promise.resolve();
    for (const state of states) this.states.set(state.muscle_id, { ...state });
  }

  async markProcessed(input: {
    userId: string;
    workoutId: string;
    completedAt: string;
    processedAt: string;
    modelVersion: string;
  }) {
    assert.equal(input.userId, this.workout.user_id);
    this.workout.status = 'completed';
    this.workout.completed_at = input.completedAt;
    this.workout.recovery_processed_at = input.processedAt;
    this.workout.recovery_model_version = input.modelVersion;
  }
}

test('owned completion writes one deterministic ledger event and state', async () => {
  const repository = new MemoryRepository();
  const result = await processCompletedWorkout({ repository, userId: 'owner-1', workoutId: 'workout-1', now: NOW });
  assert.equal(result?.alreadyProcessed, false);
  assert.equal(repository.loads.size, 1);
  assert.equal(repository.states.size, 1);
  assert.equal(repository.workout.status, 'completed');
  assert.equal(repository.workout.recovery_model_version, 'muscle_readiness_v1');
});

test('retry does not add ledger events or fatigue', async () => {
  const repository = new MemoryRepository();
  await processCompletedWorkout({ repository, userId: 'owner-1', workoutId: 'workout-1', now: NOW });
  const firstState = structuredClone(repository.states.get('muscle-chest'));
  const retry = await processCompletedWorkout({ repository, userId: 'owner-1', workoutId: 'workout-1', now: '2026-08-25T10:05:00.000Z' });
  assert.equal(retry?.alreadyProcessed, true);
  assert.equal(repository.loads.size, 1);
  assert.deepEqual(repository.states.get('muscle-chest'), firstState);
});

test('concurrent completion converges without duplicate ledger or fatigue', async () => {
  const repository = new MemoryRepository();
  await Promise.all([
    processCompletedWorkout({ repository, userId: 'owner-1', workoutId: 'workout-1', now: NOW }),
    processCompletedWorkout({ repository, userId: 'owner-1', workoutId: 'workout-1', now: '2026-08-25T10:00:01.000Z' }),
  ]);
  assert.equal(repository.loads.size, 1);
  assert.equal(repository.states.size, 1);
  assert.equal(repository.workout.completed_at, NOW);
});

test('non-owner receives no workout and causes no writes', async () => {
  const repository = new MemoryRepository();
  const result = await processCompletedWorkout({ repository, userId: 'other-user', workoutId: 'workout-1', now: NOW });
  assert.equal(result, null);
  assert.equal(repository.loads.size, 0);
  assert.equal(repository.states.size, 0);
});

test('partial processing failure stays retryable and converges', async () => {
  const repository = new MemoryRepository();
  repository.failUpsertStates = true;
  await assert.rejects(
    processCompletedWorkout({ repository, userId: 'owner-1', workoutId: 'workout-1', now: NOW }),
    /state_write_failed/,
  );
  assert.equal(repository.workout.status, 'in_progress');
  assert.equal(repository.workout.recovery_processed_at, null);
  assert.equal(repository.loads.size, 1);

  repository.failUpsertStates = false;
  await processCompletedWorkout({ repository, userId: 'owner-1', workoutId: 'workout-1', now: '2026-08-25T10:10:00.000Z' });
  assert.equal(repository.loads.size, 1);
  assert.equal(repository.states.size, 1);
  assert.equal(repository.workout.completed_at, NOW);
});

test('recovery state advance filter rejects older snapshots and prefers higher same-time fatigue', () => {
  const state: MuscleRecoveryStateWrite = {
    user_id: 'owner-1',
    muscle_id: 'muscle-chest',
    fatigue_score: 73.5,
    fatigue_at: NOW,
    half_life_hours: 48,
    confidence: 'high',
    last_workout_id: 'workout-1',
    model_version: 'muscle_readiness_v1',
  };

  assert.equal(
    recoveryStateAdvanceFilter(state),
    `fatigue_at.lt.${NOW},and(fatigue_at.eq.${NOW},fatigue_score.lte.73.5)`,
  );
});

test('Supabase adapter uses conditional state advance and retries insert conflicts', () => {
  const source = readFileSync('src/lib/recovery/process-workout.server.ts', 'utf8');
  assert.match(source, /baseQuery\.gt\('id', lastId\)/);
  assert.doesNotMatch(source, /\.range\(from, from \+ pageSize - 1\)/);
  assert.match(source, /\.order\('id', \{ ascending: true \}\)/);
  assert.match(source, /\.or\(recoveryStateAdvanceFilter\(state\)\)/);
  assert.match(source, /insertResult\.error\.code !== '23505'/);
  assert.match(source, /Retry recovery state advance/);
});

test('route authenticates before service processing and logger redirects only after ok response', () => {
  const route = readFileSync('src/app/api/workouts/[id]/complete/route.ts', 'utf8');
  const logger = readFileSync('src/app/(app)/workouts/[id]/workout-logger.tsx', 'utf8');
  assert.ok(route.indexOf('supabase.auth.getUser()') < route.indexOf('createServiceClient()'));
  assert.match(route, /status: 401/);
  assert.match(route, /status: 404/);
  assert.match(logger, /if \(!response\.ok\) throw new Error/);
  assert.ok(logger.indexOf('if (!response.ok)') < logger.indexOf('router.push(`/workouts/${workout.id}/done`)'));
  assert.match(logger, /role="alert"/);
});
