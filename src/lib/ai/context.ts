import { createClient } from '@/lib/supabase/server';
import type { DumbbellInventoryItem } from '@/lib/dumbbell-inventory';
import type { WorkoutPhase } from './workout-contract';
import { effectiveGymEquipment, filterExplicitlyAvoided, isEquipmentCompatible, isExerciseRoleAllowed } from './workout-constraints';
import type { MinimalAIPersonalizationContext } from './personalization-context';
import { filterPersonalizedExerciseCandidates } from './personalization-integration';
import {
  getMuscleSlugsForBodyGroups,
  type BodyMuscleGroup,
} from '@/lib/recovery/muscle-groups';

export const TARGETED_EXERCISE_SELECT = 'id, slug, name, name_vi, difficulty, exercise_type, status, owner_user_id, workout_role, workout_role_review_status, default_tracking_mode, allowed_tracking_modes, tracking_mode_review_status, load_basis, exercise_muscles!inner(muscles!inner(slug)), exercise_equipment(equipment(slug))';
export const ACCESSORY_EXERCISE_SELECT = 'id, slug, name, name_vi, difficulty, exercise_type, status, owner_user_id, workout_role, workout_role_review_status, default_tracking_mode, allowed_tracking_modes, tracking_mode_review_status, load_basis, exercise_muscles(muscles(slug)), exercise_equipment(equipment(slug))';

export function rankAccessoryCandidates<T extends { workout_role?: string | null; exercise_muscles?: any[] }>(
  candidates: T[],
  targetMuscles: string[],
) {
  const targets = new Set(targetMuscles);
  const score = (candidate: T) => {
    const overlap = (candidate.exercise_muscles ?? []).filter((link: any) => targets.has(link.muscles?.slug)).length;
    const universal = ['general_warmup', 'cooldown_aerobic'].includes(candidate.workout_role ?? '') ? 0.5 : 0;
    return overlap + universal;
  };
  return [...candidates].sort((a, b) => score(b) - score(a));
}

type Ctx = {
  userId: string;
  profile: any;
  programDayId: string;
  gymId: string | null;
  durationMinutes: number;
  userPrompt?: string | null;
  personalization?: MinimalAIPersonalizationContext;
  targetMuscleGroups?: BodyMuscleGroup[];
};

export async function buildContext(ctx: Ctx) {
  const supabase = await createClient();
  const [dayRes, gymRes, recentRes, weightRes] = await Promise.all([
    supabase
      .from('training_program_days')
      .select('id, name, training_programs(name), training_day_targets(role, target_sets, muscles(slug, name_vi))')
      .eq('id', ctx.programDayId)
      .maybeSingle(),
    ctx.gymId && ctx.gymId !== 'bodyweight' && ctx.gymId !== 'no_equipment'
      ? supabase.from('gyms').select('id, gym_equipment(equipment(slug, name_vi)), gym_dumbbell_inventory(weight_kg, quantity)').eq('id', ctx.gymId).eq('owner_user_id', ctx.userId).maybeSingle()
      : Promise.resolve({ data: null }),
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

  const isBodyweightMode = ctx.gymId === 'bodyweight' || ctx.gymId === 'no_equipment';
  const dumbbellInventory = isBodyweightMode
    ? []
    : (((gymRes.data as any)?.gym_dumbbell_inventory ?? []).map((item: any) => ({
        weight_kg: Number(item.weight_kg),
        quantity: Number(item.quantity),
      })) as DumbbellInventoryItem[]);
  const gymEquipment = isBodyweightMode
    ? ['bodyweight']
    : effectiveGymEquipment(
        ((gymRes.data as any)?.gym_equipment ?? [])
          .map((item: any) => item.equipment?.slug)
          .filter(Boolean),
        dumbbellInventory.length > 0,
      );

  return {
    profile: ctx.profile,
    programDay: dayRes.data,
    gymEquipment,
    equipmentUnrestricted: ctx.gymId === null,
    dumbbellInventory,
    recentSets: recentRes.data ?? [],
    recentWeight: weightRes.data ?? [],
    duration: ctx.durationMinutes,
  };
}

// Constraint engine: filter candidate exercises
export async function candidateExercises(
  ctx: Ctx,
  existingContext?: Awaited<ReturnType<typeof buildContext>>,
  phase: WorkoutPhase = 'main',
) {
  const supabase = await createClient();
  const c = existingContext ?? await buildContext(ctx);

  const targetMuscles = ctx.targetMuscleGroups?.length
    ? getMuscleSlugsForBodyGroups(ctx.targetMuscleGroups)
    : ((c.programDay as any)?.training_day_targets ?? [])
        .map((t: any) => t.muscles?.slug)
        .filter(Boolean);

  // If userPrompt is provided, also dynamically incorporate requested muscles/categories
  const promptLower = (ctx.userPrompt ?? '').toLowerCase();
  const mentionsPositive = (...terms: string[]) => terms.some((term) => {
    const index = promptLower.indexOf(term);
    if (index < 0) return false;
    const prefix = promptLower.slice(Math.max(0, index - 24), index);
    return !/(không|tránh|né|đau|mỏi|chấn thương)\s*[^,.]{0,16}$/.test(prefix);
  });
  const additionalMuscles: string[] = [];
  if (mentionsPositive('cadio', 'cardio', 'chạy', 'tim mạch')) {
    additionalMuscles.push('core', 'quads', 'calves', 'glutes');
  }
  if (mentionsPositive('bụng', 'abs', 'core')) {
    additionalMuscles.push('core');
  }
  if (mentionsPositive('tay trước', 'bicep')) {
    additionalMuscles.push('biceps', 'forearms');
  }
  if (mentionsPositive('tay sau', 'tricep')) {
    additionalMuscles.push('triceps');
  }
  if (mentionsPositive('vai', 'shoulder')) {
    additionalMuscles.push('shoulders', 'front_delts', 'side_delts', 'rear_delts');
  }
  if (mentionsPositive('ngực', 'chest')) {
    additionalMuscles.push('chest');
  }
  if (mentionsPositive('lưng', 'back', 'lat')) {
    additionalMuscles.push('back', 'lats');
  }
  if (mentionsPositive('chân', 'mông', 'đùi')) {
    additionalMuscles.push('quads', 'hamstrings', 'glutes', 'calves');
  }

  const combinedMuscles = [...new Set([...targetMuscles, ...additionalMuscles])];
  if (combinedMuscles.length === 0 && phase === 'main') return [];

  // Query from exercises so PostgREST filters the parent relation and cannot
  // truncate matching rows behind the default 1,000-row relationship page.
  const phaseRoles = phase === 'warmup'
    ? ['general_warmup', 'dynamic_mobility', 'activation']
    : ['cooldown_aerobic', 'static_stretch'];
  const exerciseQuery = phase === 'main'
    ? supabase
        .from('exercises')
        .select(TARGETED_EXERCISE_SELECT)
        .in('exercise_muscles.muscles.slug', combinedMuscles)
        .eq('status', 'published')
    : supabase
        .from('exercises')
        .select(ACCESSORY_EXERCISE_SELECT)
        .in('workout_role', phaseRoles)
        .eq('workout_role_review_status', 'reviewed')
        .eq('status', 'published');
  const { data: exerciseRows, error: exerciseError } = await exerciseQuery;
  if (exerciseError) throw new Error(`Không thể tải candidate bài tập: ${exerciseError.message}`);
  const rankedRows = phase === 'main'
    ? (exerciseRows ?? [])
    : rankAccessoryCandidates(exerciseRows ?? [], combinedMuscles);

  const eligibleExercises = filterPersonalizedExerciseCandidates(rankedRows, ctx.personalization).filter((e: any) => {
      if (!e || e.status !== 'published') return false;
      if (e.owner_user_id && e.owner_user_id !== ctx.userId) return false;
      if (e.difficulty && ctx.profile.experience_level === 'beginner' && e.difficulty === 'advanced') return false;
      const mode = e.default_tracking_mode ?? 'reps';
      return isExerciseRoleAllowed(phase, mode, e, ctx.userId);
    });
  const candIds = eligibleExercises.map((exercise: any) => exercise.id);

  if (candIds.length === 0) return [];

  // Filter by equipment and fetch muscle roles
  const { data: muscleLinks } = await supabase
      .from('exercise_muscles')
      .select('exercise_id, role, muscles(slug, name_vi, name)')
      .in('exercise_id', candIds);

  const exerciseEquipmentMap = new Map<string, string[]>();
  eligibleExercises.forEach((exercise: any) => {
    exerciseEquipmentMap.set(exercise.id, (exercise.exercise_equipment ?? [])
      .map((link: any) => link.equipment?.slug)
      .filter(Boolean));
  });

  const exerciseMuscleMap = new Map<string, {
    primaryVi?: string;
    primarySlug?: string;
    allMusclesVi: string[];
    allMuscleSlugs: string[];
  }>();
  (muscleLinks ?? []).forEach((m: any) => {
    if (!exerciseMuscleMap.has(m.exercise_id)) {
      exerciseMuscleMap.set(m.exercise_id, { allMusclesVi: [], allMuscleSlugs: [] });
    }
    const info = exerciseMuscleMap.get(m.exercise_id)!;
    const nameVi = m.muscles?.name_vi || m.muscles?.name;
    const muscleSlug = m.muscles?.slug;
    if (nameVi && !info.allMusclesVi.includes(nameVi)) info.allMusclesVi.push(nameVi);
    if (muscleSlug && !info.allMuscleSlugs.includes(muscleSlug)) info.allMuscleSlugs.push(muscleSlug);
    if (m.role === 'primary' && !info.primaryVi) {
      info.primaryVi = nameVi;
      info.primarySlug = m.muscles?.slug;
    }
  });

  return candIds
    .filter((id) => {
      const required = exerciseEquipmentMap.get(id) ?? ['bodyweight'];
      return isEquipmentCompatible(required, c.gymEquipment, c.equipmentUnrestricted);
    })
    .map((id) => {
      const exercise = eligibleExercises.find((item: any) => item.id === id);
      const muscleInfo = exerciseMuscleMap.get(id);
      return exercise
        ? {
            ...exercise,
            exercise_muscles: undefined,
            exercise_equipment: undefined,
            equipment_slugs: exerciseEquipmentMap.get(id) ?? [],
            primary_muscle_vi: muscleInfo?.primaryVi ?? muscleInfo?.allMusclesVi?.[0] ?? 'Toàn thân',
            primary_muscle_slug: muscleInfo?.primarySlug ?? '',
            muscle_slugs: muscleInfo?.allMuscleSlugs ?? [],
            muscle_names_vi: muscleInfo?.allMusclesVi ?? [],
          }
        : null;
    })
    .filter(Boolean)
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .filter((candidate) => filterExplicitlyAvoided([candidate], ctx.userPrompt).length === 1);
}

export async function visibleExercisesBySlugs(
  ctx: Ctx,
  slugs: string[],
  phaseBySlug: Map<string, { phase: WorkoutPhase; mode: import('@/lib/workouts/metrics').CompatibleTrackingMode }>,
  existingContext?: Awaited<ReturnType<typeof buildContext>>,
) {
  if (slugs.length === 0) return [];
  const supabase = await createClient();
  const c = existingContext ?? await buildContext(ctx);
  const { data } = await supabase
    .from('exercises')
    .select('id, slug, name, name_vi, difficulty, exercise_type, status, owner_user_id, workout_role, workout_role_review_status, default_tracking_mode, allowed_tracking_modes, tracking_mode_review_status, load_basis, exercise_equipment(equipment(slug))')
    .in('slug', slugs)
    .eq('status', 'published');

  return filterPersonalizedExerciseCandidates((data ?? []).map((exercise: any) => ({
    ...exercise,
    equipment_slugs: (exercise.exercise_equipment ?? []).map((link: any) => link.equipment?.slug).filter(Boolean),
  })), ctx.personalization).filter((exercise: any) => {
    const requested = phaseBySlug.get(exercise.slug);
    return requested
      && (!exercise.owner_user_id || exercise.owner_user_id === ctx.userId)
      && isExerciseRoleAllowed(requested.phase, requested.mode, exercise, ctx.userId)
      && isEquipmentCompatible(exercise.equipment_slugs, c.gymEquipment, c.equipmentUnrestricted)
      && filterExplicitlyAvoided([exercise], ctx.userPrompt).length === 1;
  });
}
