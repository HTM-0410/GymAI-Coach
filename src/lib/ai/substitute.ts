// Layer 3 - Exercise substitution
// Tìm bài thay thế theo: cùng primary muscle + equipment có sẵn + difficulty phù hợp

import { createClient } from '@/lib/supabase/server';
import { callGemini } from './gemini';
import { effectiveGymEquipment, isCandidateBanned, isEquipmentCompatible, resolveWorkoutConstraints } from './workout-constraints';
import type { MinimalAIPersonalizationContext } from './personalization-context';
import { filterPersonalizedExerciseCandidates, minimalPromptContext } from './personalization-integration';
import type { TrackingMode } from '@/lib/workouts/metrics';
import { isTrackingModeCompatible, type WorkoutEquipmentScope } from '@/lib/workouts/substitution';

export type Substitute = {
  exercise_id: string;
  exercise_slug: string;
  name: string;
  name_vi: string;
  difficulty: string | null;
  exercise_type: string | null;
  required_equipment: string[];
  reason: string;
  confidence: number;
  default_tracking_mode: TrackingMode | null;
  allowed_tracking_modes: TrackingMode[] | null;
};

export async function findSubstitutes(args: {
  userId: string;
  exerciseSlug: string;
  gymId: string | null;
  equipmentScope?: WorkoutEquipmentScope;
  limit?: number;
  personalization?: MinimalAIPersonalizationContext;
  excludedSlugs?: string[];
  trackingMode?: TrackingMode;
  phase?: 'warmup' | 'main' | 'cooldown';
  useLlmRanking?: boolean;
}): Promise<Substitute[]> {
  const supabase = await createClient();
  const { data: ex, error: exerciseError } = await supabase
    .from('exercises')
    .select('id, slug, difficulty, exercise_type, workout_role, movement_pattern, exercise_muscles(role, muscles(slug, name_vi)), exercise_equipment(required, equipment(slug, name_vi))')
    .eq('slug', args.exerciseSlug)
    .maybeSingle();
  if (exerciseError) throw new Error(`substitute_source_lookup_failed: ${exerciseError.message}`);
  if (!ex) return [];

  const primaryMuscles = ((ex as any).exercise_muscles ?? [])
    .filter((m: any) => m.role === 'primary')
    .map((m: any) => m.muscles?.slug)
    .filter(Boolean);

  // Equipment đang có trong gym
  const equipmentScope = args.equipmentScope ?? (args.gymId ? 'gym' : 'unrestricted');
  let gymEquipment: string[] = [];
  if (equipmentScope === 'gym' && args.gymId) {
    const [gymEquipmentResult, dumbbellResult] = await Promise.all([
      supabase.from('gym_equipment').select('equipment(slug)').eq('gym_id', args.gymId),
      supabase.from('gym_dumbbell_inventory').select('id').eq('gym_id', args.gymId).limit(1),
    ]);
    if (gymEquipmentResult.error) throw new Error(`substitute_gym_equipment_failed: ${gymEquipmentResult.error.message}`);
    if (dumbbellResult.error) throw new Error(`substitute_dumbbell_inventory_failed: ${dumbbellResult.error.message}`);
    const ge = gymEquipmentResult.data;
    const dumbbells = dumbbellResult.data;
    gymEquipment = effectiveGymEquipment(
      (ge ?? []).map((r: any) => r.equipment?.slug).filter(Boolean),
      Boolean(dumbbells?.length),
    );
  }

  // Lấy exercises khác cùng primary muscle
  const { data: candidates, error: candidateError } = await supabase
    .from('exercises')
    .select('id, slug, name, name_vi, difficulty, exercise_type, status, owner_user_id, workout_role, workout_role_review_status, default_tracking_mode, allowed_tracking_modes, movement_pattern, exercise_muscles!inner(role, muscles!inner(slug)), exercise_equipment(required, equipment(slug))')
    .eq('status', 'published')
    .eq('exercise_muscles.role', 'primary')
    .in('exercise_muscles.muscles.slug', primaryMuscles.length > 0 ? primaryMuscles : ['_none_'])
    .neq('slug', args.exerciseSlug);
  if (candidateError) throw new Error(`substitute_candidate_lookup_failed: ${candidateError.message}`);

  const deduped = new Map<string, any>();
  ((candidates ?? []) as any[]).forEach((candidate) => {
    if (candidate?.id && !deduped.has(candidate.id)) deduped.set(candidate.id, candidate);
  });
  const excluded = new Set([args.exerciseSlug, ...(args.excludedSlugs ?? [])]);
  const safetyConstraints = resolveWorkoutConstraints(args.personalization);
  const allCands = filterPersonalizedExerciseCandidates([...deduped.values()]
    .filter((candidate: any) => candidate.status === 'published' && (!candidate.owner_user_id || candidate.owner_user_id === args.userId))
    .filter((candidate: any) => !excluded.has(candidate.slug))
    .filter((candidate: any) => !(
      args.personalization?.userDeclared.experienceLevel === 'beginner'
      && candidate.difficulty === 'advanced'
    ))
    .filter((candidate: any) => {
      if (!args.trackingMode || isTrackingModeCompatible(args.trackingMode, candidate)) return true;
      return false;
    })
    .filter((candidate: any) => {
      if (args.phase === 'main') {
        if (candidate.workout_role !== 'main_strength') return false;
        const sourcePattern = (ex as any).movement_pattern;
        return !sourcePattern || candidate.movement_pattern === sourcePattern;
      }
      if (args.phase === 'warmup') return candidate.workout_role_review_status === 'reviewed' && ['general_warmup', 'dynamic_mobility', 'activation'].includes(candidate.workout_role);
      if (args.phase === 'cooldown') return candidate.workout_role_review_status === 'reviewed' && ['cooldown_aerobic', 'static_stretch'].includes(candidate.workout_role);
      return true;
    })
    .filter((candidate: any) => !isCandidateBanned(candidate, safetyConstraints).banned), args.personalization);

  // Filter equipment
  const filtered = allCands.filter((c: any) => {
    const required = (c.exercise_equipment ?? []).map((e: any) => e.equipment?.slug).filter(Boolean);
    return isEquipmentCompatible(required, gymEquipment, equipmentScope === 'unrestricted');
  });

  // Nếu Gemini ranking được thì gọi; nếu không thì fallback top 5
  const top = [...filtered]
    .sort((a: any, b: any) => {
      const typeA = a.exercise_type === (ex as any).exercise_type ? 1 : 0;
      const typeB = b.exercise_type === (ex as any).exercise_type ? 1 : 0;
      const difficultyA = a.difficulty === (ex as any).difficulty ? 1 : 0;
      const difficultyB = b.difficulty === (ex as any).difficulty ? 1 : 0;
      return (typeB + difficultyB) - (typeA + difficultyA);
    })
    .slice(0, 12);
  if (top.length === 0) return [];

  const toSubstitute = (candidate: any, reason: string, confidence: number): Substitute => ({
    exercise_id: candidate.id,
    exercise_slug: candidate.slug,
    name: candidate.name,
    name_vi: candidate.name_vi ?? candidate.name,
    difficulty: candidate.difficulty,
    exercise_type: candidate.exercise_type,
    required_equipment: (candidate.exercise_equipment ?? []).map((item: any) => item.equipment?.slug).filter(Boolean),
    reason,
    confidence,
    default_tracking_mode: candidate.default_tracking_mode,
    allowed_tracking_modes: candidate.allowed_tracking_modes,
  });

  if (args.useLlmRanking === false) {
    return top.slice(0, args.limit ?? 5).map((candidate: any) => toSubstitute(
      candidate,
      'Cùng cơ chính, phù hợp thiết bị tại phòng gym đã chọn',
      0.8,
    ));
  }

  const candList = top.map((c: any) =>
    `- ${c.slug} (${c.name_vi}, ${c.difficulty}, ${c.exercise_type}, equipment: ${(c.exercise_equipment ?? []).map((e: any) => e.equipment?.slug).join(',') || 'none'})`
  ).join('\n');

  try {
    const prompt = `Gợi ý bài thay thế cho "${ex.slug}". Chọn TOP ${args.limit ?? 5} phù hợp nhất từ candidates (cùng primary muscle, equipment phù hợp, không trùng bài gốc).

CANDIDATES:
${candList}

GIỚI HẠN VẬN ĐỘNG DO USER KHAI (context, không phải chẩn đoán):
${JSON.stringify(minimalPromptContext(args.personalization, 'planner')?.constraints.movementLimitations ?? [])}

Trả về JSON:
[{ "exercise_slug": "...", "reason": "1 câu ngắn ≤ 15 từ", "confidence": 0.0-1.0 }]`;

    const raw = await callGemini({ prompt, jsonSchema: true, temperature: 0.3, maxOutputTokens: 400 });
    const ranked = JSON.parse(raw) as { exercise_slug: string; reason: string; confidence: number }[];

    const bySlug = new Map(top.map((c: any) => [c.slug, c]));
    return ranked
      .map((r) => {
        const c = bySlug.get(r.exercise_slug);
        if (!c) return null;
        return toSubstitute(c, r.reason, r.confidence);
      })
      .filter(Boolean) as Substitute[];
  } catch {
    return top.slice(0, args.limit ?? 5).map((candidate: any) => toSubstitute(
      candidate,
      'Cùng cơ chính, phù hợp thiết bị tại phòng gym đã chọn',
      0.5,
    ));
  }
}
