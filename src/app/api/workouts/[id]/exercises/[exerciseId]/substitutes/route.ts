import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { findSubstitutes } from '@/lib/ai/substitute';
import { buildPersonalizationContextForUser } from '@/lib/ai/personalization-context.server';
import { projectMinimalAIContext } from '@/lib/ai/personalization-context';
import { normalizeTrackingMode } from '@/lib/workouts/metrics';
import { canSwapWorkoutExercise, resolveWorkoutEquipmentScope } from '@/lib/workouts/substitution';

const SwapBody = z.object({ exerciseId: z.string().uuid() });

type RouteContext = { params: { id: string; exerciseId: string } };

async function loadSwapContext(userId: string, workoutId: string, workoutExerciseId: string) {
  const supabase = await createClient();
  const [{ data: workout }, { data: workoutExercise }, { data: existingRows }] = await Promise.all([
    supabase.from('workouts').select('*').eq('id', workoutId).eq('user_id', userId).maybeSingle(),
    supabase
      .from('workout_exercises')
      .select(`
        id, workout_id, exercise_id, phase, prescription_mode, tracking_mode,
        target_weight, completed_at, workout_sets(completed),
        exercises(slug)
      `)
      .eq('id', workoutExerciseId)
      .eq('workout_id', workoutId)
      .maybeSingle(),
    supabase
      .from('workout_exercises')
      .select('exercise_id, exercises(slug)')
      .eq('workout_id', workoutId),
  ]);
  if (!workout || !workoutExercise) return null;
  const exercise = workoutExercise.exercises as any;
  const completedSets = ((workoutExercise.workout_sets ?? []) as any[]).filter((set) => set.completed).length;
  const swapState = canSwapWorkoutExercise({
    workoutStatus: workout.status,
    completedSets,
    exerciseCompletedAt: workoutExercise.completed_at,
  });
  return {
    supabase,
    workout,
    workoutExercise,
    exerciseSlug: exercise?.slug as string,
    existingSlugs: (existingRows ?? []).map((row: any) => row.exercises?.slug).filter(Boolean),
    trackingMode: normalizeTrackingMode(workoutExercise.tracking_mode ?? workoutExercise.prescription_mode, {
      targetWeight: workoutExercise.target_weight,
    }),
    phase: (workoutExercise.phase ?? 'main') as 'warmup' | 'main' | 'cooldown',
    swapState,
  };
}

async function getEligibleSubstitutes(userId: string, context: NonNullable<Awaited<ReturnType<typeof loadSwapContext>>>) {
  const personalization = projectMinimalAIContext(
    await buildPersonalizationContextForUser(userId, 'planner'),
    'planner',
  );
  return findSubstitutes({
    userId,
    exerciseSlug: context.exerciseSlug,
    gymId: context.workout.gym_id,
    equipmentScope: resolveWorkoutEquipmentScope(context.workout),
    personalization,
    excludedSlugs: context.existingSlugs,
    trackingMode: context.trackingMode,
    phase: context.phase,
    useLlmRanking: false,
    limit: 8,
  });
}

export async function GET(_request: Request, route: RouteContext) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const context = await loadSwapContext(user.id, route.params.id, route.params.exerciseId);
    if (!context) return NextResponse.json({ error: 'workout_exercise_not_found' }, { status: 404 });
    if (!context.swapState.allowed) {
      return NextResponse.json({ error: 'exercise_not_swappable', detail: context.swapState.reason }, { status: 409 });
    }
    const substitutes = await getEligibleSubstitutes(user.id, context);
    return NextResponse.json({
      substitutes,
      equipmentScope: resolveWorkoutEquipmentScope(context.workout),
      gymId: context.workout.gym_id,
    });
  } catch (error) {
    console.error('Runtime substitute lookup failed', error);
    return NextResponse.json({ error: 'substitution_lookup_failed', detail: 'Không thể tải bài thay thế lúc này.' }, { status: 500 });
  }
}

export async function POST(request: Request, route: RouteContext) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = SwapBody.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_substitute' }, { status: 400 });
  try {
    const context = await loadSwapContext(user.id, route.params.id, route.params.exerciseId);
    if (!context) return NextResponse.json({ error: 'workout_exercise_not_found' }, { status: 404 });
    if (!context.swapState.allowed) {
      return NextResponse.json({ error: 'exercise_not_swappable', detail: context.swapState.reason }, { status: 409 });
    }
    const substitutes = await getEligibleSubstitutes(user.id, context);
    const selected = substitutes.find((substitute) => substitute.exercise_id === parsed.data.exerciseId);
    if (!selected) return NextResponse.json({ error: 'substitute_not_eligible' }, { status: 400 });

    const service = createServiceClient();
    const { error } = await service.rpc('swap_active_workout_exercise', {
      p_user_id: user.id,
      p_workout_id: route.params.id,
      p_workout_exercise_id: route.params.exerciseId,
      p_new_exercise_id: selected.exercise_id,
    });
    if (error) {
      const migrationMissing = /swap_active_workout_exercise|schema cache|function/i.test(error.message);
      return NextResponse.json(
        {
          error: migrationMissing ? 'substitution_migration_required' : 'substitution_failed',
          detail: migrationMissing
            ? 'Tính năng đổi bài chưa được kích hoạt trên cơ sở dữ liệu.'
            : 'Không thể đổi bài vì trạng thái buổi tập vừa thay đổi.',
        },
        { status: migrationMissing ? 503 : 409 },
      );
    }
    return NextResponse.json({ success: true, substitute: selected });
  } catch (error) {
    console.error('Runtime exercise substitution failed', error);
    return NextResponse.json({ error: 'substitution_failed', detail: 'Không thể đổi bài lúc này.' }, { status: 500 });
  }
}
