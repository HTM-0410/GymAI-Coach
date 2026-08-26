import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { RECOVERY_MODEL_VERSION } from '../src/lib/recovery/constants';
import {
  buildWorkoutLoads,
  createSupabaseRecoveryRepository,
  processCompletedWorkout,
  type RecoveryWorkout,
} from '../src/lib/recovery/process-workout.server';

loadEnvConfig(process.cwd());

const args = new Set(process.argv.slice(2));
const writeMode = args.has('--write');
const daysArgument = process.argv.find((value) => value.startsWith('--days='));
const days = Number(daysArgument?.split('=')[1] ?? 14);
const APPROVAL_TOKEN = 'APPROVED APPLY MUSCLE READINESS BACKFILL TO LIVE';

if (!Number.isInteger(days) || days < 1 || days > 30) {
  throw new Error('Days must be an integer from 1 to 30.');
}
if (writeMode && process.env.MUSCLE_READINESS_BACKFILL_APPROVAL !== APPROVAL_TOKEN) {
  throw new Error('Write mode is locked. Set the separate backfill approval token after explicit authorization.');
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Supabase server environment is not configured.');
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function exactCount(table: 'muscle_training_loads' | 'muscle_recovery_states') {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) throw new Error(`Count ${table}: ${error.message}`);
  return count ?? 0;
}

const BACKFILL_PAGE_SIZE = 500;
const WORKOUT_SELECT = `
  id, user_id, date, status, completed_at, recovery_processed_at, recovery_model_version,
  workout_exercises(
    id, exercise_id,
    workout_sets(completed, reps, rir, perceived_effort, note, set_type),
    exercises(exercise_muscles(muscle_id, role, contribution, muscles(slug)))
  )
`;

async function loadCompletedWorkouts(cutoffDate: string): Promise<RecoveryWorkout[]> {
  const { count, error: countError } = await supabase
    .from('workouts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')
    .gte('date', cutoffDate);
  if (countError) throw new Error(`Count completed workouts: ${countError.message}`);

  const expected = count ?? 0;
  const workouts: RecoveryWorkout[] = [];
  let lastId: string | null = null;
  for (;;) {
    const baseQuery = supabase
      .from('workouts')
      .select(WORKOUT_SELECT)
      .eq('status', 'completed')
      .gte('date', cutoffDate)
      .order('id', { ascending: true })
      .limit(BACKFILL_PAGE_SIZE);
    const { data, error } = await (lastId ? baseQuery.gt('id', lastId) : baseQuery);
    if (error) throw new Error(`Load completed workouts page: ${error.message}`);
    const page = (data ?? []) as unknown as RecoveryWorkout[];
    workouts.push(...page);
    if (page.length < BACKFILL_PAGE_SIZE) break;
    lastId = page[page.length - 1]?.id ?? null;
    if (!lastId) throw new Error('Workout keyset pagination requires an id.');
  }

  const { count: finalCount, error: finalCountError } = await supabase
    .from('workouts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')
    .gte('date', cutoffDate);
  if (finalCountError) throw new Error(`Recount completed workouts: ${finalCountError.message}`);
  if (workouts.length !== expected || finalCount !== expected) {
    throw new Error(`Completed workout source changed during pagination: expected ${expected}, loaded ${workouts.length}, final ${finalCount ?? 0}.`);
  }
  return workouts;
}

async function main() {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  const [workouts, beforeLoads, beforeStates] = await Promise.all([
    loadCompletedWorkouts(cutoffDate),
    exactCount('muscle_training_loads'),
    exactCount('muscle_recovery_states'),
  ]);
  let totalSets = 0;
  let usableSets = 0;
  let mappedExercises = 0;
  let totalExercises = 0;
  let projectedLedgerEvents = 0;
  let eligibleWorkouts = 0;
  let skippedNoUsableLoad = 0;
  let alreadyCurrent = 0;

  for (const workout of workouts) {
    for (const exercise of workout.workout_exercises ?? []) {
      totalExercises += 1;
      const exerciseRecord = Array.isArray(exercise.exercises) ? exercise.exercises[0] : exercise.exercises;
      if ((exerciseRecord?.exercise_muscles ?? []).length > 0) mappedExercises += 1;
      for (const set of exercise.workout_sets ?? []) {
        totalSets += 1;
        if (set.completed && set.reps !== null && set.reps > 0) usableSets += 1;
      }
    }
    if (workout.recovery_processed_at && workout.recovery_model_version === RECOVERY_MODEL_VERSION) {
      alreadyCurrent += 1;
      continue;
    }
    const occurredAt = workout.completed_at ?? `${workout.date}T12:00:00.000Z`;
    const loads = buildWorkoutLoads(workout, occurredAt);
    projectedLedgerEvents += loads.length;
    if (loads.length > 0) eligibleWorkouts += 1;
    else skippedNoUsableLoad += 1;
  }

  const report = {
    mode: writeMode ? 'write' : 'dry-run',
    modelVersion: RECOVERY_MODEL_VERSION,
    windowDays: days,
    cutoffDate,
    before: { muscleTrainingLoads: beforeLoads, muscleRecoveryStates: beforeStates },
    source: {
      completedWorkouts: workouts.length,
      alreadyCurrent,
      eligibleWorkouts,
      skippedNoUsableLoad,
      totalExercises,
      mappedExercises,
      mappingCoveragePercent: totalExercises ? Number((mappedExercises / totalExercises * 100).toFixed(2)) : 0,
      totalSets,
      usableCompletedSets: usableSets,
      skippedSets: totalSets - usableSets,
    },
    projected: { ledgerEvents: projectedLedgerEvents, workoutsToProcess: workouts.length - alreadyCurrent },
  };

  if (!writeMode) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const repository = createSupabaseRecoveryRepository(supabase);
  let processed = 0;
  let retriesSafe = 0;
  for (const workout of workouts) {
    const result = await processCompletedWorkout({
      repository,
      userId: workout.user_id,
      workoutId: workout.id,
      now: workout.completed_at ?? `${workout.date}T12:00:00.000Z`,
    });
    if (result?.alreadyProcessed) retriesSafe += 1;
    else if (result) processed += 1;
  }

  console.log(JSON.stringify({
    ...report,
    write: { processed, retriesSafe },
    after: {
      muscleTrainingLoads: await exactCount('muscle_training_loads'),
      muscleRecoveryStates: await exactCount('muscle_recovery_states'),
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
