import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WorkoutDraftRequestSchema } from '@/lib/ai/workout-contract';
import {
  effectiveGymEquipment,
  isCandidateBanned,
  isEquipmentCompatible,
  isExerciseRoleAllowed,
  isTrackingModeAllowed,
  resolveWorkoutConstraints,
} from '@/lib/ai/workout-constraints';
import { normalizeTrackingMode } from '@/lib/workouts/metrics';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsedBody = WorkoutDraftRequestSchema.safeParse(await req.json());
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: 'invalid_draft', detail: parsedBody.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const draft = parsedBody.data;

  const [{ data: dayData }, gymResult, { data: visibleExercises }, constraintsResult] = await Promise.all([
    supabase
      .from('training_program_days')
      .select('id, program_id, training_programs(id, type, owner_user_id)')
      .eq('id', draft.programDayId)
      .maybeSingle(),
    draft.gymId && draft.gymId !== 'bodyweight' && draft.gymId !== 'no_equipment'
      ? supabase
          .from('gyms')
          .select('id, gym_equipment(equipment(slug)), gym_dumbbell_inventory(id)')
          .eq('id', draft.gymId)
          .eq('owner_user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: draft.gymId === 'bodyweight' || draft.gymId === 'no_equipment' ? { id: draft.gymId } : null }),
    supabase
      .from('exercises')
      .select('id, slug, name, name_vi, movement_pattern, primary_muscle_vi, type, owner_user_id, workout_role, workout_role_review_status, default_tracking_mode, allowed_tracking_modes, tracking_mode_review_status, load_basis, exercise_equipment(equipment(slug))')
      .in('id', draft.exercises.map((exercise) => exercise.exerciseId))
      .eq('status', 'published'),
    supabase
      .from('training_constraints')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active'),
  ]);

  const prog = dayData?.training_programs as any;
  if (!dayData || !prog || (prog.type !== 'system' && prog.owner_user_id !== user.id)) {
    return NextResponse.json({ error: 'program_day_not_allowed' }, { status: 403 });
  }
  if (draft.gymId && draft.gymId !== 'bodyweight' && draft.gymId !== 'no_equipment' && !gymResult.data) {
    return NextResponse.json({ error: 'gym_not_allowed' }, { status: 403 });
  }

  const allowedExercises = (visibleExercises ?? []).filter((exercise: any) => (
    exercise.owner_user_id == null || exercise.owner_user_id === user.id
  ));
  const visibleIds = new Set(allowedExercises.map((exercise: any) => exercise.id));
  if (draft.exercises.some((exercise) => !visibleIds.has(exercise.exerciseId))) {
    return NextResponse.json({ error: 'exercise_not_allowed' }, { status: 403 });
  }

  const exerciseMap = new Map(allowedExercises.map((exercise: any) => [exercise.id, exercise]));
  const invalidRole = draft.exercises.find((item) => {
    const exercise: any = exerciseMap.get(item.exerciseId);
    return !exercise || !isExerciseRoleAllowed(item.phase, item.prescriptionMode, exercise, user.id);
  });
  if (invalidRole) {
    return NextResponse.json({ error: 'exercise_phase_role_not_allowed' }, { status: 400 });
  }
  const invalidMode = draft.exercises.find((item) => {
    const exercise: any = exerciseMap.get(item.exerciseId);
    return !exercise || !isTrackingModeAllowed(item.prescriptionMode, exercise);
  });
  if (invalidMode) {
    return NextResponse.json({ error: 'exercise_tracking_mode_not_allowed' }, { status: 400 });
  }

  // Revalidate hard safety constraints on confirm
  const activeConstraints = (constraintsResult.data ?? []);
  const resolvedConstraints = resolveWorkoutConstraints({
    version: '1.0',
    generatedAt: new Date().toISOString(),
    userDeclared: { goal: null, experienceLevel: null, schedule: { daysPerWeek: null, preferredMinutes: null }, source: 'user', observedAt: null },
    hardConstraints: {
      excludedExerciseSlugs: [...new Set(activeConstraints.flatMap((item: any) => item.excluded_exercise_slugs ?? []))],
      movementLimitations: activeConstraints.map((constraint: any) => ({
        id: constraint.id,
        region: constraint.region,
        side: constraint.side,
        severity: (constraint.severity <= 2 ? 'mild' : constraint.severity === 3 ? 'moderate' : 'severe') as 'mild' | 'moderate' | 'severe',
        triggers: constraint.triggers ?? [],
        validUntil: constraint.expires_at,
        source: constraint.source,
        observedAt: constraint.updated_at,
      })),
    },
    preferences: { explicit: [], inferred: [] },
    performance: { recentSessions: [], exerciseTrends: [], adherence: null },
  });

  const bannedExercise = draft.exercises.find((item) => {
    const exercise: any = exerciseMap.get(item.exerciseId);
    return exercise && isCandidateBanned({
      ...exercise,
      primary_muscle: exercise.primary_muscle_vi,
    }, resolvedConstraints).banned;
  });
  if (bannedExercise) {
    return NextResponse.json({ error: 'constraint_violation', detail: `Bài tập ${bannedExercise.exerciseSlug} vi phạm ràng buộc an toàn của bạn.` }, { status: 400 });
  }

  const isBodyweightMode = draft.gymId === 'bodyweight' || draft.gymId === 'no_equipment';
  const gymEquipment = isBodyweightMode
    ? ['bodyweight']
    : effectiveGymEquipment(
        ((gymResult.data as any)?.gym_equipment ?? [])
          .map((item: any) => item.equipment?.slug)
          .filter(Boolean),
        ((gymResult.data as any)?.gym_dumbbell_inventory ?? []).length > 0,
      );
  const incompatible = draft.exercises.find((item) => {
    const exercise: any = exerciseMap.get(item.exerciseId);
    const required = (exercise?.exercise_equipment ?? [])
      .map((link: any) => link.equipment?.slug)
      .filter((slug: string | undefined): slug is string => Boolean(slug));
    return !isEquipmentCompatible(required, gymEquipment, draft.gymId === null);
  });
  if (incompatible) {
    return NextResponse.json({ error: 'exercise_equipment_not_available' }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const resolvedGymId = (draft.gymId && draft.gymId !== 'bodyweight' && draft.gymId !== 'no_equipment') ? draft.gymId : null;
  const equipmentScope = draft.gymId === null
    ? 'unrestricted'
    : draft.gymId === 'bodyweight' || draft.gymId === 'no_equipment'
      ? 'bodyweight'
      : 'gym';
  const workoutInsert = {
    user_id: user.id,
    training_program_day_id: draft.programDayId,
    gym_id: resolvedGymId,
    date: today,
    status: 'planned',
    planned_duration: draft.durationMinutes,
    ai_generated: true,
  };
  let workoutResult = await supabase
    .from('workouts')
    .insert({ ...workoutInsert, equipment_scope: equipmentScope })
    .select('id')
    .single();

  if (workoutResult.error && /equipment_scope|schema cache/i.test(workoutResult.error.message)) {
    workoutResult = await supabase
      .from('workouts')
      .insert(workoutInsert)
      .select('id')
      .single();
  }
  const { data: workout, error: workoutError } = workoutResult;

  if (workoutError) {
    return NextResponse.json(
      { error: 'workout_create_failed', detail: workoutError.message },
      { status: 500 },
    );
  }

  const rows = draft.exercises.map((exercise, index) => {
    const trackingMode = normalizeTrackingMode(exercise.prescriptionMode, {
      targetWeight: exercise.targetWeight,
      targetRir: exercise.targetRir,
    });
    const durationStyle = trackingMode === 'duration' || trackingMode === 'duration_distance'
      ? exercise.durationStyle ?? (exercise.prescriptionMode === 'hold' ? 'hold' : 'active')
      : null;
    const targetDuration = exercise.targetDurationSeconds ?? exercise.durationSeconds ?? exercise.holdSeconds;
    return ({
    workout_id: workout.id,
    exercise_id: exercise.exerciseId,
    order_index: index,
    target_sets: exercise.targetSets,
    target_rep_min: exercise.targetRepMin,
    target_rep_max: exercise.targetRepMax,
    target_weight: exercise.targetWeight,
    target_rir: exercise.targetRir,
    rest_seconds: exercise.restSeconds,
    phase: exercise.phase,
    prescription_mode: trackingMode === 'weight_reps' || trackingMode === 'reps'
      ? 'reps'
      : durationStyle === 'hold' ? 'hold' : 'time',
    tracking_mode: trackingMode,
    duration_style: durationStyle,
    duration_seconds: trackingMode === 'duration' || trackingMode === 'duration_distance' ? targetDuration : null,
    hold_seconds: durationStyle === 'hold' ? targetDuration : null,
    target_duration_seconds: targetDuration,
    target_distance_meters: exercise.targetDistanceMeters,
    per_side: exercise.perSide,
    ai_reason: exercise.aiReason,
  });
  });

  const { error: exerciseInsertError } = await supabase.from('workout_exercises').insert(rows);
  if (exerciseInsertError) {
    await supabase.from('workouts').delete().eq('id', workout.id).eq('user_id', user.id);
    return NextResponse.json(
      { error: 'workout_exercises_create_failed', detail: exerciseInsertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ workoutId: workout.id });
}
