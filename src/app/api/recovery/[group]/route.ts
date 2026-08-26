import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { RECOVERY_MODEL_VERSION } from '@/lib/recovery/constants';
import { getBodyMuscleGroup } from '@/lib/recovery/muscle-groups';
import {
  buildRecoverySummary,
  isBodyMuscleGroup,
  type RecoveryStateReadRow,
} from '@/lib/recovery/read-model';
import { isMuscleReadinessEnabled } from '@/lib/recovery/feature-flags';
import {
  dedupeRecoveryActivities,
  type RecoveryActivityReadRow,
} from '@/lib/recovery/activity';

const HISTORY_DAYS = 14;
const HISTORY_LIMIT = 20;

export async function GET(
  _request: Request,
  context: { params: { group: string } },
) {
  if (!isMuscleReadinessEnabled()) {
    return NextResponse.json({ error: 'recovery_disabled' }, { status: 404 });
  }
  const group = context.params.group.toUpperCase();
  if (!isBodyMuscleGroup(group)) {
    return NextResponse.json({ error: 'invalid_recovery_group' }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const generatedAt = new Date().toISOString();
  const historyStart = new Date(Date.parse(generatedAt) - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const statesResult = await supabase
    .from('muscle_recovery_states')
    .select('user_id, muscle_id, fatigue_score, fatigue_at, half_life_hours, confidence, last_workout_id, model_version, muscles(id, slug, name, name_vi)')
    .eq('user_id', user.id);
  if (statesResult.error) {
    return NextResponse.json({ error: 'recovery_read_failed' }, { status: 500 });
  }

  const summary = buildRecoverySummary(
    (statesResult.data ?? []) as unknown as RecoveryStateReadRow[],
    generatedAt,
  );
  const selected = summary.find((item) => item.group === group)!;
  const muscleIds = (statesResult.data ?? []).flatMap((state: any) => {
    const muscle = Array.isArray(state.muscles) ? state.muscles[0] : state.muscles;
    return muscle?.slug && getBodyMuscleGroup(muscle.slug) === group ? [state.muscle_id] : [];
  });
  let loads: any[] = [];
  if (muscleIds.length > 0) {
    const loadsResult = await supabase
      .from('muscle_training_loads')
      .select('id, workout_id, workout_exercise_id, muscle_id, completed_set_count, fatigue_points, new_fatigue, input_quality, occurred_at, model_version, muscles(id, slug, name, name_vi), workout_exercises(exercises(name, name_vi, slug))')
      .eq('user_id', user.id)
      .in('muscle_id', muscleIds)
      .gte('occurred_at', historyStart)
      .order('occurred_at', { ascending: false })
      .limit(HISTORY_LIMIT);
    if (loadsResult.error) {
      return NextResponse.json({ error: 'recovery_read_failed' }, { status: 500 });
    }
    loads = dedupeRecoveryActivities(
      (loadsResult.data ?? []) as unknown as RecoveryActivityReadRow[],
    );
  }

  return NextResponse.json({
    modelVersion: RECOVERY_MODEL_VERSION,
    generatedAt,
    group: selected,
    recentLoads: loads,
    historyWindowDays: HISTORY_DAYS,
  });
}
