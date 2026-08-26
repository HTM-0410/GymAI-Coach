import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildRecoverySummary, type RecoveryStateReadRow } from '@/lib/recovery/read-model';
import { RECOVERY_MODEL_VERSION } from '@/lib/recovery/constants';
import { isMuscleReadinessEnabled } from '@/lib/recovery/feature-flags';
import {
  buildLatestActivityByGroup,
  type RecoveryActivityReadRow,
} from '@/lib/recovery/activity';

const ACTIVITY_DAYS = 14;

export async function GET() {
  if (!isMuscleReadinessEnabled()) return NextResponse.json({ error: 'recovery_disabled' }, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const generatedAt = new Date().toISOString();
  const activityStart = new Date(
    Date.parse(generatedAt) - ACTIVITY_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const [statesResult, workoutResult, activityResult] = await Promise.all([
    supabase
      .from('muscle_recovery_states')
      .select('user_id, muscle_id, fatigue_score, fatigue_at, half_life_hours, confidence, last_workout_id, model_version, muscles(id, slug, name, name_vi)')
      .eq('user_id', user.id),
    supabase
      .from('workouts')
      .select('completed_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('muscle_training_loads')
      .select('id, workout_id, workout_exercise_id, muscle_id, completed_set_count, occurred_at, muscles(slug), workout_exercises(exercises(name, name_vi, slug))')
      .eq('user_id', user.id)
      .gte('occurred_at', activityStart)
      .order('occurred_at', { ascending: false }),
  ]);
  if (statesResult.error || workoutResult.error || activityResult.error) {
    return NextResponse.json({ error: 'recovery_read_failed' }, { status: 500 });
  }

  const latestActivity = buildLatestActivityByGroup(
    (activityResult.data ?? []) as unknown as RecoveryActivityReadRow[],
  );
  const groups = buildRecoverySummary(
    (statesResult.data ?? []) as unknown as RecoveryStateReadRow[],
    generatedAt,
  ).map((group) => ({
    ...group,
    latestActivity: latestActivity[group.group] ?? null,
  }));
  return NextResponse.json({
    modelVersion: RECOVERY_MODEL_VERSION,
    generatedAt,
    lastCompletedWorkoutAt: workoutResult.data?.completed_at ?? null,
    groups,
  });
}
