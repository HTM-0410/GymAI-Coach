import { createClient } from '@/lib/supabase/server';
import type { WorkoutPlan } from './schema';
import type { DumbbellInventoryItem } from '@/lib/dumbbell-inventory';

type Ctx = {
  userId: string;
  profile: any;
  programDayId: string;
  gymId: string | null;
  durationMinutes: number;
};

export async function buildContext(ctx: Ctx) {
  const supabase = await createClient();
  const [dayRes, gymRes, dumbbellRes, recentRes, weightRes] = await Promise.all([
    supabase
      .from('training_program_days')
      .select('id, name, training_programs(name), training_day_targets(role, target_sets, muscles(slug, name_vi))')
      .eq('id', ctx.programDayId)
      .maybeSingle(),
    ctx.gymId
      ? supabase.from('gym_equipment').select('equipment(slug, name_vi)').eq('gym_id', ctx.gymId)
      : Promise.resolve({ data: [] as any[] }),
    ctx.gymId
      ? supabase.from('gym_dumbbell_inventory').select('weight_kg, quantity').eq('gym_id', ctx.gymId).order('weight_kg')
      : Promise.resolve({ data: [] as DumbbellInventoryItem[] }),
    supabase
      .from('workout_sets')
      .select('weight, reps, rir, workout_exercises!inner(exercise_id, exercises(slug)), completed_at')
      .eq('workout_exercises.workouts.user_id', ctx.userId)
      .eq('completed', true)
      .order('completed_at', { ascending: false })
      .limit(30),
    supabase
      .from('body_weight_logs')
      .select('weight_kg, recorded_date')
      .eq('user_id', ctx.userId)
      .order('recorded_date', { ascending: false })
      .limit(5),
  ]);

  return {
    profile: ctx.profile,
    programDay: dayRes.data,
    gymEquipment: (gymRes.data ?? []).map((r: any) => r.equipment?.slug).filter(Boolean),
    dumbbellInventory: (dumbbellRes.data ?? []).map((item: any) => ({
      weight_kg: Number(item.weight_kg),
      quantity: Number(item.quantity),
    })) as DumbbellInventoryItem[],
    recentSets: recentRes.data ?? [],
    recentWeight: weightRes.data ?? [],
    duration: ctx.durationMinutes,
  };
}

// Constraint engine: filter candidate exercises
export async function candidateExercises(ctx: Ctx, existingContext?: Awaited<ReturnType<typeof buildContext>>) {
  const supabase = await createClient();
  const c = existingContext ?? await buildContext(ctx);

  const targetMuscles = ((c.programDay as any)?.training_day_targets ?? [])
    .filter((t: any) => t.role === 'primary')
    .map((t: any) => t.muscles?.slug)
    .filter(Boolean);

  if (targetMuscles.length === 0) return [];

  // Find exercises whose primary muscle matches AND equipment is in gym
  const { data: exMuscles } = await supabase
    .from('exercise_muscles')
    .select('exercise_id, muscles(slug), exercises!inner(id, slug, name_vi, difficulty, exercise_type, status, owner_user_id)')
    .eq('role', 'primary')
    .in('muscles.slug', targetMuscles);

  const candIds = (exMuscles ?? [])
    .filter((em: any) => {
      const e = em.exercises;
      if (!e || e.status !== 'published') return false;
      if (e.owner_user_id && e.owner_user_id !== ctx.userId) return false;
      if (e.difficulty && ctx.profile.experience_level === 'beginner' && e.difficulty === 'advanced') return false;
      return true;
    })
    .map((em: any) => em.exercise_id);

  if (candIds.length === 0) return [];

  // Filter by equipment
  let eqQuery = supabase
    .from('exercise_equipment')
    .select('exercise_id, equipment(slug)')
    .in('exercise_id', candIds);
  const { data: eqLinks } = await eqQuery;

  const exerciseEquipmentMap = new Map<string, string[]>();
  (eqLinks ?? []).forEach((l: any) => {
    if (!l.equipment?.slug) return;
    if (!exerciseEquipmentMap.has(l.exercise_id)) exerciseEquipmentMap.set(l.exercise_id, []);
    exerciseEquipmentMap.get(l.exercise_id)!.push(l.equipment.slug);
  });

  return candIds
    .filter((id) => {
      const required = exerciseEquipmentMap.get(id) ?? ['bodyweight'];
      if (required.length === 0) return true;
      if (c.gymEquipment.length === 0) return true;
      return required.every((slug) => c.gymEquipment.includes(slug));
    })
    .map((id) => {
      const em = (exMuscles ?? []).find((x: any) => x.exercise_id === id);
      return em?.exercises
        ? { ...em.exercises, equipment_slugs: exerciseEquipmentMap.get(id) ?? [] }
        : null;
    })
    .filter(Boolean);
}
