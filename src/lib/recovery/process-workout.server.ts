import type { SupabaseClient } from '@supabase/supabase-js';
import {
  RECOVERY_MODEL_VERSION,
  type RecoverySetType,
} from '@/lib/recovery/constants';
import {
  resolveRecoveryInputQuality,
  lowestRecoveryInputQuality,
  type RecoveryInputQuality,
} from '@/lib/recovery/confidence';
import {
  calculateFatiguePoints,
  fatigueFromPoints,
  foldFatigueEvents,
  resolveHalfLifeHours,
  resolveMuscleContribution,
  type MuscleRole,
} from '@/lib/recovery/model';
import { resolvePerceivedEffort } from '@/lib/workouts/perceived-effort';
import { normalizeTrackingMode } from '@/lib/workouts/metrics';

type WorkoutSetRow = {
  completed: boolean;
  reps: number | null;
  weight?: number | null;
  duration_seconds?: number | null;
  distance_meters?: number | null;
  rir: number | null;
  perceived_effort: unknown;
  note: string | null;
  set_type: RecoverySetType;
};

type MuscleMappingRow = {
  muscle_id: string;
  role: MuscleRole;
  contribution: number | null;
  muscles: { slug: string } | { slug: string }[] | null;
};

export type RecoveryWorkoutExercise = {
  id: string;
  exercise_id: string;
  phase?: string | null;
  prescription_mode?: string | null;
  tracking_mode?: string | null;
  workout_sets: WorkoutSetRow[];
  exercises: {
    exercise_muscles: MuscleMappingRow[];
  } | {
    exercise_muscles: MuscleMappingRow[];
  }[] | null;
};

export type RecoveryWorkout = {
  id: string;
  user_id: string;
  date: string;
  status: string;
  completed_at: string | null;
  recovery_processed_at: string | null;
  recovery_model_version: string | null;
  workout_exercises: RecoveryWorkoutExercise[];
};

export type MuscleLoadWrite = {
  user_id: string;
  workout_id: string;
  workout_exercise_id: string;
  muscle_id: string;
  completed_set_count: number;
  fatigue_points: number;
  new_fatigue: number;
  input_quality: RecoveryInputQuality;
  occurred_at: string;
  model_version: string;
};

export type PersistedMuscleLoad = MuscleLoadWrite & {
  id?: string;
  muscles?: { slug: string } | { slug: string }[] | null;
};

export type MuscleRecoveryStateWrite = {
  user_id: string;
  muscle_id: string;
  fatigue_score: number;
  fatigue_at: string;
  half_life_hours: number;
  confidence: RecoveryInputQuality;
  last_workout_id: string;
  model_version: string;
};

export interface RecoveryProcessingRepository {
  loadOwnedWorkout(userId: string, workoutId: string): Promise<RecoveryWorkout | null>;
  reserveCompletedAt(userId: string, workoutId: string, completedAt: string): Promise<string>;
  upsertLoads(loads: readonly MuscleLoadWrite[]): Promise<void>;
  listLoads(userId: string, modelVersion: string): Promise<PersistedMuscleLoad[]>;
  upsertStates(states: readonly MuscleRecoveryStateWrite[]): Promise<void>;
  markProcessed(input: {
    userId: string;
    workoutId: string;
    completedAt: string;
    processedAt: string;
    modelVersion: string;
  }): Promise<void>;
}

export type ProcessWorkoutResult = {
  workoutId: string;
  alreadyProcessed: boolean;
  ledgerEvents: number;
  recoveryStates: number;
  completedAt: string;
  modelVersion: string;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function buildWorkoutLoads(workout: RecoveryWorkout, occurredAt: string): MuscleLoadWrite[] {
  const rows: MuscleLoadWrite[] = [];

  for (const workoutExercise of workout.workout_exercises) {
    if ((workoutExercise.phase ?? 'main') !== 'main') continue;
    const trackingMode = normalizeTrackingMode(
      workoutExercise.tracking_mode ?? workoutExercise.prescription_mode,
      { actualWeight: workoutExercise.workout_sets.find((set) => Number(set.weight) > 0)?.weight },
    );
    const exercise = one(workoutExercise.exercises);
    if (!exercise) continue;

    const mappingsByMuscle = new Map<string, MuscleMappingRow>();
    for (const mapping of exercise.exercise_muscles ?? []) {
      const current = mappingsByMuscle.get(mapping.muscle_id);
      const candidate = resolveMuscleContribution(mapping.contribution, mapping.role).value;
      const currentValue = current
        ? resolveMuscleContribution(current.contribution, current.role).value
        : -1;
      if (!current || candidate > currentValue) mappingsByMuscle.set(mapping.muscle_id, mapping);
    }

    for (const mapping of mappingsByMuscle.values()) {
      const muscle = one(mapping.muscles);
      if (!muscle) continue;
      const contribution = resolveMuscleContribution(mapping.contribution, mapping.role);
      const halfLife = resolveHalfLifeHours(muscle.slug);
      const validCompletedSets = workoutExercise.workout_sets.filter((set) => {
        if (!set.completed || set.set_type === 'warmup') return false;
        if (trackingMode === 'weight_reps' || trackingMode === 'reps') return Number(set.reps) > 0;
        if (trackingMode === 'duration') return Number(set.duration_seconds) > 0;
        return Number(set.duration_seconds) > 0 || Number(set.distance_meters) > 0;
      });
      const effortSources = validCompletedSets
        .map((set) => resolvePerceivedEffort({
          perceivedEffort: set.perceived_effort,
          note: set.note,
          rir: set.rir,
        }).source);
      const resolvedSets = validCompletedSets.map((set) => ({
        completed: set.completed,
        reps: trackingMode === 'weight_reps' || trackingMode === 'reps' ? set.reps : 1,
        perceivedEffort: resolvePerceivedEffort({
          perceivedEffort: set.perceived_effort,
          note: set.note,
          rir: set.rir,
        }).value,
        setType: set.set_type,
      }));
      const calculated = calculateFatiguePoints({ contribution: contribution.value, sets: resolvedSets });
      if (calculated.completedSetCount === 0) continue;
      const qualities = effortSources.map((effortSource) => resolveRecoveryInputQuality({
        contributionSource: contribution.source,
        effortSource,
        halfLifeSource: halfLife.source,
      }));

      rows.push({
        user_id: workout.user_id,
        workout_id: workout.id,
        workout_exercise_id: workoutExercise.id,
        muscle_id: mapping.muscle_id,
        completed_set_count: calculated.completedSetCount,
        fatigue_points: calculated.fatiguePoints,
        new_fatigue: fatigueFromPoints(calculated.fatiguePoints),
        input_quality: lowestRecoveryInputQuality(qualities),
        occurred_at: occurredAt,
        model_version: RECOVERY_MODEL_VERSION,
      });
    }
  }

  return rows;
}

export async function processCompletedWorkout(input: {
  repository: RecoveryProcessingRepository;
  userId: string;
  workoutId: string;
  now?: string;
}): Promise<ProcessWorkoutResult | null> {
  const now = new Date(input.now ?? Date.now()).toISOString();
  const workout = await input.repository.loadOwnedWorkout(input.userId, input.workoutId);
  if (!workout) return null;

  if (workout.recovery_processed_at && workout.recovery_model_version === RECOVERY_MODEL_VERSION) {
    return {
      workoutId: workout.id,
      alreadyProcessed: true,
      ledgerEvents: 0,
      recoveryStates: 0,
      completedAt: workout.completed_at ?? workout.recovery_processed_at,
      modelVersion: RECOVERY_MODEL_VERSION,
    };
  }

  const completedAt = await input.repository.reserveCompletedAt(
    input.userId,
    input.workoutId,
    workout.completed_at ?? now,
  );
  const loads = buildWorkoutLoads(workout, completedAt);
  if (loads.length > 0) await input.repository.upsertLoads(loads);

  const persistedLoads = await input.repository.listLoads(input.userId, RECOVERY_MODEL_VERSION);
  const loadsByMuscle = new Map<string, PersistedMuscleLoad[]>();
  for (const load of persistedLoads) {
    const existing = loadsByMuscle.get(load.muscle_id) ?? [];
    existing.push(load);
    loadsByMuscle.set(load.muscle_id, existing);
  }

  const states: MuscleRecoveryStateWrite[] = [];
  for (const [muscleId, muscleLoads] of loadsByMuscle) {
    const latestLoad = [...muscleLoads].sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))[0];
    const latestSlug = one(latestLoad.muscles ?? null)?.slug ?? null;
    const halfLife = resolveHalfLifeHours(latestSlug ?? '');
    const folded = foldFatigueEvents(muscleLoads.map((load) => ({
      newFatigue: load.new_fatigue,
      occurredAt: load.occurred_at,
      halfLifeHours: halfLife.value,
      confidence: load.input_quality,
    })));
    if (!folded) continue;
    states.push({
      user_id: input.userId,
      muscle_id: muscleId,
      fatigue_score: folded.fatigueScore,
      fatigue_at: folded.fatigueAt,
      half_life_hours: folded.halfLifeHours,
      confidence: folded.confidence,
      last_workout_id: latestLoad.workout_id,
      model_version: RECOVERY_MODEL_VERSION,
    });
  }

  if (states.length > 0) await input.repository.upsertStates(states);
  await input.repository.markProcessed({
    userId: input.userId,
    workoutId: input.workoutId,
    completedAt,
    processedAt: now,
    modelVersion: RECOVERY_MODEL_VERSION,
  });

  return {
    workoutId: workout.id,
    alreadyProcessed: false,
    ledgerEvents: loads.length,
    recoveryStates: states.length,
    completedAt,
    modelVersion: RECOVERY_MODEL_VERSION,
  };
}

function throwOnError(error: { message: string } | null, operation: string): void {
  if (error) throw new Error(`${operation}: ${error.message}`);
}

export function recoveryStateAdvanceFilter(state: MuscleRecoveryStateWrite): string {
  const timestamp = state.fatigue_at;
  return `fatigue_at.lt.${timestamp},and(fatigue_at.eq.${timestamp},fatigue_score.lte.${state.fatigue_score})`;
}

export function createSupabaseRecoveryRepository(
  client: SupabaseClient,
): RecoveryProcessingRepository {
  return {
    async loadOwnedWorkout(userId, workoutId) {
      const { data, error } = await client
        .from('workouts')
        .select(`
          id, user_id, date, status, completed_at, recovery_processed_at, recovery_model_version,
          workout_exercises(
            id, exercise_id, phase, prescription_mode, tracking_mode,
            workout_sets(completed, weight, reps, duration_seconds, distance_meters, rir, perceived_effort, note, set_type),
            exercises(exercise_muscles(muscle_id, role, contribution, muscles(slug)))
          )
        `)
        .eq('id', workoutId)
        .eq('user_id', userId)
        .maybeSingle();
      throwOnError(error, 'Load workout');
      return data as unknown as RecoveryWorkout | null;
    },

    async reserveCompletedAt(userId, workoutId, completedAt) {
      const { error } = await client
        .from('workouts')
        .update({ completed_at: completedAt })
        .eq('id', workoutId)
        .eq('user_id', userId)
        .is('completed_at', null);
      throwOnError(error, 'Reserve completion time');
      const { data, error: reloadError } = await client
        .from('workouts')
        .select('completed_at')
        .eq('id', workoutId)
        .eq('user_id', userId)
        .single();
      throwOnError(reloadError, 'Reload completion time');
      if (!data?.completed_at) throw new Error('Completion time was not reserved.');
      return data.completed_at as string;
    },

    async upsertLoads(loads) {
      const { error } = await client.from('muscle_training_loads').upsert(loads, {
        onConflict: 'workout_exercise_id,muscle_id,model_version',
      });
      throwOnError(error, 'Upsert muscle loads');
    },

    async listLoads(userId, modelVersion) {
      const pageSize = 500;
      const loads: PersistedMuscleLoad[] = [];
      let lastId: string | null = null;
      for (;;) {
        const baseQuery = client
          .from('muscle_training_loads')
          .select('id, user_id, workout_id, workout_exercise_id, muscle_id, completed_set_count, fatigue_points, new_fatigue, input_quality, occurred_at, model_version, muscles(slug)')
          .eq('user_id', userId)
          .eq('model_version', modelVersion)
          .order('id', { ascending: true })
          .limit(pageSize);
        const { data, error } = await (lastId ? baseQuery.gt('id', lastId) : baseQuery);
        throwOnError(error, 'List muscle loads page');
        const page = (data ?? []) as unknown as PersistedMuscleLoad[];
        loads.push(...page);
        if (page.length < pageSize) break;
        lastId = page[page.length - 1]?.id ?? null;
        if (!lastId) throw new Error('Muscle load keyset pagination requires an id.');
      }
      return loads;
    },

    async upsertStates(states) {
      for (const state of states) {
        const updateIfCurrentIsNotNewer = async () => client
          .from('muscle_recovery_states')
          .update(state)
          .eq('user_id', state.user_id)
          .eq('muscle_id', state.muscle_id)
          .or(recoveryStateAdvanceFilter(state))
          .select('muscle_id');

        const updateResult = await updateIfCurrentIsNotNewer();
        throwOnError(updateResult.error, 'Advance recovery state');
        if ((updateResult.data ?? []).length > 0) continue;

        const insertResult = await client.from('muscle_recovery_states').insert(state);
        if (!insertResult.error) continue;
        if (insertResult.error.code !== '23505') {
          throw new Error(`Insert recovery state: ${insertResult.error.message}`);
        }

        const retryResult = await updateIfCurrentIsNotNewer();
        throwOnError(retryResult.error, 'Retry recovery state advance');
      }
    },

    async markProcessed(input) {
      const { error } = await client
        .from('workouts')
        .update({
          status: 'completed',
          completed_at: input.completedAt,
          recovery_processed_at: input.processedAt,
          recovery_model_version: input.modelVersion,
        })
        .eq('id', input.workoutId)
        .eq('user_id', input.userId);
      throwOnError(error, 'Mark workout processed');
    },
  };
}
