import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WorkoutDraftRequestSchema } from '@/lib/ai/workout-contract';
import { effectiveGymEquipment, isEquipmentCompatible, isExerciseRoleAllowed } from '@/lib/ai/workout-constraints';

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

  const [{ data: dayData }, gymResult, { data: visibleExercises }] = await Promise.all([
    supabase
      .from('training_program_days')
      .select('id, program_id, training_programs(id, type, owner_user_id)')
      .eq('id', draft.programDayId)
      .maybeSingle(),
    draft.gymId
      ? supabase
          .from('gyms')
          .select('id, gym_equipment(equipment(slug)), gym_dumbbell_inventory(weight_kg)')
          .eq('id', draft.gymId)
          .eq('owner_user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('exercises')
      .select('id, owner_user_id, type, workout_role, workout_role_review_status, exercise_equipment(equipment(slug))')
      .in('id', draft.exercises.map((exercise) => exercise.exerciseId))
      .eq('status', 'published'),
  ]);

  const prog = dayData?.training_programs as any;
  if (!dayData || !prog || (prog.type !== 'system' && prog.owner_user_id !== user.id)) {
    return NextResponse.json({ error: 'program_day_not_allowed' }, { status: 403 });
  }
  if (draft.gymId && !gymResult.data) {
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

  const gymEquipment = effectiveGymEquipment(
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
  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .insert({
      user_id: user.id,
      training_program_day_id: draft.programDayId,
      gym_id: draft.gymId,
      date: today,
      status: 'planned',
      planned_duration: draft.durationMinutes,
      ai_generated: true,
    })
    .select('id')
    .single();

  if (workoutError) {
    return NextResponse.json(
      { error: 'workout_create_failed', detail: workoutError.message },
      { status: 500 },
    );
  }

  const rows = draft.exercises.map((exercise, index) => ({
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
    prescription_mode: exercise.prescriptionMode,
    duration_seconds: exercise.durationSeconds,
    hold_seconds: exercise.holdSeconds,
    per_side: exercise.perSide,
    ai_reason: exercise.aiReason,
  }));

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
