import { callGemini } from './gemini';
import {
  AiWorkoutPlanSchema,
  PlannedExerciseSchema,
  WorkoutPlanSchema,
  type PlannedExercise,
  type WorkoutPlan,
} from './schema';
import { buildContext, candidateExercises, visibleExercisesBySlugs } from './context';
import {
  allocatePhaseBudgets,
  WorkoutOptionsSchema,
  type PrescriptionMode,
  type WorkoutPhase,
} from './workout-contract';
import {
  availableDumbbellWeights,
  dumbbellWeightAtOrBelow,
  formatDumbbellInventory,
  nearestDumbbellWeight,
} from '@/lib/dumbbell-inventory';
import type { MinimalAIPersonalizationContext } from './personalization-context';
import { conservativePlannerDuration, minimalPromptContext, personalizationFactors, type PersonalizationFactors } from './personalization-integration';
import {
  filterCandidateExercises,
  isCandidateBanned,
  resolveWorkoutConstraints,
  workoutConstraintsForPhase,
} from './workout-constraints';
import {
  filterCandidatesForRecovery,
  recoveryPromptContext,
  type RecoveryWorkoutSelection,
} from '@/lib/recovery/recommendation-policy';
import type { BodyMuscleGroup } from '@/lib/recovery/muscle-groups';
import { normalizeTrackingMode, type TrackingMode } from '@/lib/workouts/metrics';

type CurrentDraftExercise = {
  exerciseSlug: string;
  name?: string;
  nameVi?: string | null;
  phase?: WorkoutPhase;
  prescriptionMode?: PrescriptionMode;
  targetSets?: number;
  targetRepMin?: number | null;
  targetRepMax?: number | null;
  targetWeight?: number | null;
  targetRir?: number | null;
  restSeconds?: number;
  durationSeconds?: number | null;
  holdSeconds?: number | null;
  targetDurationSeconds?: number | null;
  targetDistanceMeters?: number | null;
  durationStyle?: 'active' | 'hold' | null;
  perSide?: boolean;
  aiReason?: string;
};

type Args = {
  userId: string;
  profile: any;
  programDayId: string;
  gymId: string | null;
  durationMinutes: number;
  options?: { includeWarmup?: boolean; includeCooldown?: boolean };
  regeneratePhase?: WorkoutPhase;
  excludedExerciseSlugs?: string[];
  userPrompt?: string | null;
  currentExercises?: CurrentDraftExercise[] | null;
  personalization?: MinimalAIPersonalizationContext;
  recoverySelection?: RecoveryWorkoutSelection;
  targetMuscleGroups?: BodyMuscleGroup[];
};

export type WorkoutGenerationSource = 'gemini' | 'gemini_repaired' | 'fallback';
export type PersonalizedWorkoutPlan = WorkoutPlan & {
  personalization: PersonalizationFactors;
  generation_source: WorkoutGenerationSource;
};

export type ReferencedCandidate = { ref: string; phase: WorkoutPhase; candidate: any };

export function excludeCandidatesBySlug<T extends { slug?: string | null }>(
  candidates: T[],
  excludedSlugs: readonly string[] = [],
) {
  if (excludedSlugs.length === 0) return candidates;
  const excluded = new Set(excludedSlugs.map((slug) => slug.trim()).filter(Boolean));
  return candidates.filter((candidate) => !candidate.slug || !excluded.has(candidate.slug));
}

export function repairGeneratedPlanPhases(
  exercises: PlannedExercise[],
  refs: Map<string, ReferencedCandidate>,
  fallback: PlannedExercise[],
  enabledPhases: WorkoutPhase[],
) {
  const seenCandidateIds = new Set<string>();
  let repaired = false;
  const valid = exercises.filter((exercise) => {
    const referenced = refs.get(exercise.exercise_slug);
    if (!referenced) throw new Error(`AI đã chọn mã ngoài candidate pool: ${exercise.exercise_slug}`);
    if (referenced.phase !== exercise.phase) {
      repaired = true;
      return false;
    }
    if (seenCandidateIds.has(referenced.candidate.id)) {
      repaired = true;
      return false;
    }
    seenCandidateIds.add(referenced.candidate.id);
    return true;
  });

  for (const phase of enabledPhases) {
    if (valid.some((exercise) => exercise.phase === phase)) continue;
    const replacement = fallback.find((exercise) => exercise.phase === phase);
    if (replacement) {
      valid.push(replacement);
      repaired = true;
    }
  }

  return {
    exercises: PHASE_ORDER.flatMap((phase) => valid.filter((exercise) => exercise.phase === phase)),
    repaired,
  };
}

const PHASE_ORDER: WorkoutPhase[] = ['warmup', 'main', 'cooldown'];

function estimateExerciseSeconds(exercise: PlannedExercise) {
  const transition = 20;
  const betweenSets = Math.max(0, exercise.target_sets - 1) * exercise.rest_seconds;
  const mode = normalizeTrackingMode(exercise.prescription_mode, { targetWeight: exercise.target_weight });
  if (mode === 'reps' || mode === 'weight_reps') {
    const averageReps = ((exercise.target_rep_min ?? 8) + (exercise.target_rep_max ?? 12)) / 2;
    return transition + exercise.target_sets * averageReps * 4 + betweenSets;
  }
  if (mode === 'duration' || mode === 'duration_distance') {
    return transition + exercise.target_sets * (exercise.target_duration_seconds ?? exercise.duration_seconds ?? exercise.hold_seconds ?? 60) + betweenSets;
  }
  const sides = exercise.per_side ? 2 : 1;
  return transition + exercise.target_sets * (exercise.hold_seconds ?? 30) * sides + betweenSets;
}

export function validatePlan(
  exercises: PlannedExercise[],
  refs: Map<string, ReferencedCandidate>,
  options: { includeWarmup: boolean; includeCooldown: boolean },
  budgets: { warmup: number; main: number; cooldown: number },
) {
  const seen = new Set<string>();
  const phases = new Set<WorkoutPhase>();
  let previousRank = -1;
  const seconds: Record<WorkoutPhase, number> = { warmup: 0, main: 0, cooldown: 0 };

  for (const exercise of exercises) {
    const referenced = refs.get(exercise.exercise_slug);
    if (!referenced) throw new Error(`AI đã chọn mã ngoài candidate pool: ${exercise.exercise_slug}`);
    if (referenced.phase !== exercise.phase) throw new Error(`AI đặt sai phase cho ${exercise.exercise_slug}`);
    if (seen.has(referenced.candidate.id)) throw new Error(`AI đã chọn trùng bài: ${referenced.candidate.slug}`);
    const mode = normalizeTrackingMode(exercise.prescription_mode, { targetWeight: exercise.target_weight });
    const allowed = referenced.candidate.allowed_tracking_modes;
    if (allowed?.length && !allowed.includes(mode)) throw new Error(`AI chọn tracking mode không được phép cho ${referenced.candidate.slug}`);
    seen.add(referenced.candidate.id);
    phases.add(exercise.phase);
    const rank = PHASE_ORDER.indexOf(exercise.phase);
    if (rank < previousRank) throw new Error('AI trả phase sai thứ tự');
    previousRank = rank;
    seconds[exercise.phase] += estimateExerciseSeconds(exercise);
  }

  if (!phases.has('main')) throw new Error('Kế hoạch thiếu phần tập chính');
  if (options.includeWarmup !== phases.has('warmup')) throw new Error('Kế hoạch không khớp tùy chọn khởi động');
  if (options.includeCooldown !== phases.has('cooldown')) throw new Error('Kế hoạch không khớp tùy chọn giãn cơ');
  for (const phase of PHASE_ORDER) {
    if (seconds[phase] > budgets[phase] * 60) {
      throw new Error(`Phần ${phase} vượt ngân sách ${budgets[phase]} phút`);
    }
  }
}

export type RequestedExercise = {
  name: string;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
  restSeconds: number;
};

function normalizeExerciseText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .toLocaleLowerCase('vi')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const MATCH_STOP_WORDS = new Set([
  'bai', 'co', 'tren', 'may', 'voi', 'the', 'and', 'or', 'seated', 'lying',
]);

function exerciseTokens(value: string) {
  return normalizeExerciseText(value)
    .split(' ')
    .filter((token) => token.length > 1 && !MATCH_STOP_WORDS.has(token));
}

export function parseRequestedExercises(userPrompt?: string | null): RequestedExercise[] {
  if (!userPrompt?.trim()) return [];
  const compact = userPrompt.replace(/\s+/g, ' ').trim();
  const itemPattern = /(?:^|\s)(\d{1,2})\.\s+(.+?)(?=\s+\d{1,2}\.\s+|$)/g;
  const requested: RequestedExercise[] = [];

  for (const match of compact.matchAll(itemPattern)) {
    const item = match[2].replace(/\*\*/g, '').trim();
    const prescription = item.match(/(\d+)\s*(?:hiệp|hiep|sets?)\s*x\s*(\d+)(?:\s*[--]\s*(\d+))?\s*(?:reps?|lần|lan)/i);
    if (!prescription) continue;
    const name = item.slice(0, prescription.index).replace(/\s*[:\--]\s*$/, '').trim();
    if (!name) continue;
    const rest = item.match(/(?:nghỉ|nghi|rest)\s*(\d+)\s*(?:giây|giay|s(?:ec(?:onds?)?)?)/i);
    const targetRepMin = Number(prescription[2]);
    requested.push({
      name,
      targetSets: Number(prescription[1]),
      targetRepMin,
      targetRepMax: Number(prescription[3] ?? targetRepMin),
      restSeconds: Number(rest?.[1] ?? 90),
    });
  }
  return requested;
}

function requestedMatchScore(requestedName: string, candidate: any) {
  const requested = normalizeExerciseText(requestedName);
  const aliases = [candidate.slug, candidate.name, candidate.name_vi]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map(normalizeExerciseText);
  if (aliases.some((alias) => alias.length >= 5 && (requested.includes(alias) || alias.includes(requested)))) {
    return 100;
  }

  const requestedTokens = new Set(exerciseTokens(requestedName));
  let best = 0;
  for (const alias of aliases) {
    const aliasTokens = new Set(exerciseTokens(alias));
    const overlap = [...requestedTokens].filter((token) => aliasTokens.has(token)).length;
    const denominator = Math.max(1, Math.min(requestedTokens.size, aliasTokens.size));
    best = Math.max(best, overlap / denominator);
  }
  return best;
}

export function promptMatchedMainExercises(
  refs: ReferencedCandidate[],
  budget: number,
  userPrompt?: string | null,
) {
  const requested = parseRequestedExercises(userPrompt);
  const remaining = [...refs];
  const exercises: PlannedExercise[] = [];
  const unmatched: string[] = [];

  for (const item of requested) {
    let bestIndex = -1;
    let bestScore = 0;
    remaining.forEach((candidate, index) => {
      const score = requestedMatchScore(item.name, candidate.candidate);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    if (bestIndex < 0 || bestScore < 0.5) {
      unmatched.push(item.name);
      continue;
    }

    const [{ ref }] = remaining.splice(bestIndex, 1);
    const exercise = PlannedExerciseSchema.parse({
      exercise_slug: ref,
      phase: 'main',
      prescription_mode: 'reps',
      target_sets: item.targetSets,
      target_rep_min: item.targetRepMin,
      target_rep_max: item.targetRepMax,
      target_weight: null,
      target_rir: 2,
      rest_seconds: Math.max(30, item.restSeconds),
      duration_seconds: null,
      hold_seconds: null,
      per_side: false,
      ai_reason: `Khớp đề xuất AI Coach: ${item.name}.`,
    });
    if ([...exercises, exercise].reduce((sum, value) => sum + estimateExerciseSeconds(value), 0) <= budget * 60) {
      exercises.push(exercise);
    } else {
      unmatched.push(`${item.name} (vượt thời lượng)`);
    }
  }

  return { exercises, requested, unmatched };
}

function mainFallback(
  refs: ReferencedCandidate[],
  budget: number,
  userPrompt?: string | null,
  exactCount?: number | null,
): PlannedExercise[] {
  const matched = promptMatchedMainExercises(refs, budget, userPrompt);
  if (matched.exercises.length > 0) return matched.exercises;
  const shortSession = budget <= 15;
  const sets = shortSession ? 2 : 3;
  const rest = shortSession ? 60 : 90;
  const perExerciseSeconds = sets * 40 + (sets - 1) * rest + 20;
  let count = Math.max(1, Math.min(7, refs.length, Math.floor((budget * 60) / perExerciseSeconds)));
  if (exactCount && exactCount > 0) {
    count = Math.min(exactCount, refs.length);
  }
  return refs.slice(0, count).map(({ ref, candidate }) => {
    const mode = (candidate.default_tracking_mode ?? 'reps') as TrackingMode;
    const isRepMode = mode === 'reps' || mode === 'weight_reps';
    return {
      exercise_slug: ref,
      phase: 'main' as const,
      prescription_mode: mode,
      duration_style: mode === 'duration' ? 'active' as const : null,
      target_sets: isRepMode ? sets : 1,
      target_rep_min: isRepMode ? 8 : null,
      target_rep_max: isRepMode ? 12 : null,
      target_weight: null,
      target_rir: mode === 'weight_reps' ? 2 : null,
      rest_seconds: isRepMode ? rest : 0,
      duration_seconds: null,
      hold_seconds: null,
      target_duration_seconds: isRepMode ? null : Math.max(30, Math.min(600, budget * 60)),
      target_distance_meters: null,
      per_side: false,
      ai_reason: 'Phương án dự phòng phù hợp an toàn, thời lượng và thiết bị hiện có.',
    };
  });
}

function accessoryFallback(
  phase: 'warmup' | 'cooldown',
  refs: ReferencedCandidate[],
  budget: number,
): PlannedExercise[] {
  const count = Math.max(1, Math.min(refs.length, budget >= 5 ? 2 : 1));
  return refs.slice(0, count).map(({ ref, candidate }) => {
    const candidateMode = normalizeTrackingMode(candidate.default_tracking_mode, {
      defaultTrackingMode: candidate.default_tracking_mode,
      allowedTrackingModes: candidate.allowed_tracking_modes,
    });
    const isRepMode = candidateMode === 'reps' || candidateMode === 'weight_reps';
    const staticHold = phase === 'cooldown'
      && candidate.workout_role === 'static_stretch'
      && candidateMode === 'duration';
    const perSide = candidate.workout_role === 'dynamic_mobility' || candidate.workout_role === 'static_stretch';
    if (staticHold) {
      const multiplier = perSide ? 2 : 1;
      const availableHold = Math.max(15, Math.floor((budget * 60 - count * 20) / (count * multiplier)));
      return {
        exercise_slug: ref,
        phase,
        prescription_mode: 'duration' as const,
        duration_style: 'hold' as const,
        target_sets: 1,
        target_rep_min: null,
        target_rep_max: null,
        target_weight: null,
        target_rir: null,
        rest_seconds: 0,
        duration_seconds: null,
        hold_seconds: Math.min(45, availableHold),
        target_duration_seconds: Math.min(45, availableHold),
        target_distance_meters: null,
        per_side: perSide,
        ai_reason: 'Giãn cơ tĩnh an toàn hỗ trợ hồi phục cơ sau buổi tập.',
      };
    }
    if (isRepMode) {
      return {
        exercise_slug: ref,
        phase,
        prescription_mode: candidateMode,
        duration_style: null,
        target_sets: 1,
        target_rep_min: 8,
        target_rep_max: 12,
        target_weight: null,
        target_rir: null,
        rest_seconds: 30,
        duration_seconds: null,
        hold_seconds: null,
        target_duration_seconds: null,
        target_distance_meters: null,
        per_side: perSide,
        ai_reason: phase === 'warmup'
          ? 'Khởi động theo số lần phù hợp với cách theo dõi của bài tập.'
          : 'Thả lỏng theo số lần phù hợp với cách theo dõi của bài tập.',
      };
    }
    const secondsPerExercise = Math.max(30, Math.floor((budget * 60 - count * 20) / count));
    return {
      exercise_slug: ref,
      phase,
      prescription_mode: candidateMode,
      duration_style: 'active' as const,
      target_sets: 1,
      target_rep_min: null,
      target_rep_max: null,
      target_weight: null,
      target_rir: null,
      rest_seconds: 0,
      duration_seconds: secondsPerExercise,
      hold_seconds: null,
      target_duration_seconds: secondsPerExercise,
      target_distance_meters: null,
      per_side: false,
      ai_reason: phase === 'warmup' ? 'Khởi động an toàn chuẩn bị cơ khớp.' : 'Thả lỏng nhịp tim sau buổi tập.',
    };
  });
}

export function deterministicFallback(
  byPhase: Record<WorkoutPhase, ReferencedCandidate[]>,
  options: { includeWarmup: boolean; includeCooldown: boolean },
  budgets: { warmup: number; main: number; cooldown: number },
  userPrompt?: string | null,
  exactCount?: number | null,
) {
  return [
    ...(options.includeWarmup ? accessoryFallback('warmup', byPhase.warmup, budgets.warmup) : []),
    ...mainFallback(byPhase.main, budgets.main, userPrompt, exactCount),
    ...(options.includeCooldown ? accessoryFallback('cooldown', byPhase.cooldown, budgets.cooldown) : []),
  ];
}

export function preserveNonTargetPhases(
  generated: PlannedExercise[],
  current: CurrentDraftExercise[] | null | undefined,
  targetPhase: WorkoutPhase | undefined,
  byPhase: Record<WorkoutPhase, ReferencedCandidate[]>,
) {
  if (!targetPhase || !current?.length) return generated;
  return PHASE_ORDER.flatMap((phase) => {
    if (phase === targetPhase) return generated.filter((exercise) => exercise.phase === phase);
    const preserved = current
      .filter((exercise) => (exercise.phase ?? 'main') === phase)
      .map((exercise) => {
        const referenced = byPhase[phase].find((item) => item.candidate.slug === exercise.exerciseSlug);
        if (!referenced) {
          throw new Error(`Không thể xác minh để giữ nguyên bài ${exercise.exerciseSlug} trong phase ${phase}.`);
        }
        const mode = exercise.prescriptionMode ?? 'reps';
        const normalizedMode = normalizeTrackingMode(mode, { targetWeight: exercise.targetWeight });
        const isRepMode = normalizedMode === 'reps' || normalizedMode === 'weight_reps';
        return PlannedExerciseSchema.parse({
          exercise_slug: referenced.ref,
          phase,
          prescription_mode: mode,
          duration_style: exercise.durationStyle ?? (mode === 'hold' ? 'hold' : 'active'),
          target_sets: exercise.targetSets ?? (isRepMode ? 3 : 1),
          target_rep_min: isRepMode ? (exercise.targetRepMin ?? 8) : null,
          target_rep_max: isRepMode ? (exercise.targetRepMax ?? 12) : null,
          target_weight: normalizedMode === 'weight_reps' ? (exercise.targetWeight ?? null) : null,
          target_rir: normalizedMode === 'weight_reps' ? (exercise.targetRir ?? 2) : null,
          rest_seconds: isRepMode ? (exercise.restSeconds ?? 90) : (exercise.restSeconds ?? 0),
          duration_seconds: mode === 'time' ? (exercise.durationSeconds ?? 60) : null,
          hold_seconds: mode === 'hold' ? (exercise.holdSeconds ?? 30) : null,
          target_duration_seconds: isRepMode ? null : (exercise.targetDurationSeconds ?? exercise.durationSeconds ?? exercise.holdSeconds ?? 60),
          target_distance_meters: normalizedMode === 'duration_distance' ? (exercise.targetDistanceMeters ?? null) : null,
          per_side: isRepMode ? false : (exercise.perSide ?? false),
          ai_reason: exercise.aiReason ?? 'Giữ nguyên từ bản nháp hiện tại.',
        });
      });
    return preserved;
  });
}

export async function generateWorkoutPlan(args: Args): Promise<PersonalizedWorkoutPlan> {
  const options = WorkoutOptionsSchema.parse(args.options ?? {});
  const safetyText = args.userPrompt?.toLowerCase() ?? '';
  if (/(đau ngực|khó thở|chóng mặt|ngất|chấn thương cấp|acute injury)/i.test(safetyText)) {
    throw new Error('Không thể tự tạo buổi tập với triệu chứng nguy cơ. Hãy dừng tập và tham khảo chuyên gia y tế phù hợp.');
  }
  const effectiveDuration = args.regeneratePhase
    ? args.durationMinutes
    : conservativePlannerDuration(args.durationMinutes, args.personalization);
  const budgets = allocatePhaseBudgets(effectiveDuration, options);
  const context = await buildContext(args);
  const enabledPhases = PHASE_ORDER.filter((phase) => (
    phase === 'main'
    || (phase === 'warmup' && options.includeWarmup)
    || (phase === 'cooldown' && options.includeCooldown)
  ));
  const candidateResults = await Promise.all(
    enabledPhases.map(async (phase) => [phase, await candidateExercises(args, context, phase)] as const),
  );
  const rawByPhase: Record<WorkoutPhase, any[]> = { warmup: [], main: [], cooldown: [] };
  candidateResults.forEach(([phase, candidates]) => { rawByPhase[phase] = candidates; });

  if (args.regeneratePhase && args.currentExercises?.length) {
    const nonTarget = args.currentExercises.filter((exercise) => (exercise.phase ?? 'main') !== args.regeneratePhase);
    const phaseBySlug = new Map(nonTarget.map((exercise) => [exercise.exerciseSlug, {
      phase: exercise.phase ?? 'main',
      mode: exercise.prescriptionMode ?? 'reps',
    }]));
    const preservedCandidates = await visibleExercisesBySlugs(args, [...phaseBySlug.keys()], phaseBySlug, context);
    const resolvedSlugs = new Set(preservedCandidates.map((candidate: any) => candidate.slug));
    const unresolved = nonTarget.find((exercise) => !resolvedSlugs.has(exercise.exerciseSlug));
    if (unresolved) {
      throw new Error(`Không thể xác minh bài ${unresolved.exerciseSlug}; không thể giữ nguyên phase ngoài mục đang tạo lại.`);
    }
    preservedCandidates.forEach((candidate: any) => {
      const phase = phaseBySlug.get(candidate.slug)!.phase;
      if (!rawByPhase[phase].some((item) => item.slug === candidate.slug)) rawByPhase[phase].push(candidate);
    });
  }

  const resolvedConstraints = resolveWorkoutConstraints(args.personalization, args.userPrompt, effectiveDuration);
  for (const phase of enabledPhases) {
    rawByPhase[phase] = filterCandidateExercises(
      rawByPhase[phase],
      workoutConstraintsForPhase(resolvedConstraints, phase),
    );
  }
  rawByPhase.main = filterCandidatesForRecovery(rawByPhase.main, args.recoverySelection);
  if (
    rawByPhase.main.length === 0
    && args.recoverySelection?.decision === 'exclude_weak'
    && args.recoverySelection.selectedGroups.length > 0
  ) {
      const alternatives = await candidateExercises({
      ...args,
      targetMuscleGroups: args.recoverySelection.selectedGroups,
    }, context, 'main');
    rawByPhase.main = filterCandidatesForRecovery(
      filterCandidateExercises(alternatives, workoutConstraintsForPhase(resolvedConstraints, 'main')),
      args.recoverySelection,
    );
  }

  for (const phase of enabledPhases) {
    rawByPhase[phase] = excludeCandidatesBySlug(rawByPhase[phase], args.excludedExerciseSlugs);
  }

  for (const phase of enabledPhases) {
    if (rawByPhase[phase].length === 0) {
      const label = phase === 'warmup' ? 'khởi động' : phase === 'cooldown' ? 'giãn cơ' : 'tập chính';
      throw new Error(`constraint_unsatisfied: Không có bài ${label} phù hợp với toàn bộ ràng buộc an toàn, thiết bị và yêu cầu đã chọn.`);
    }
  }

  const prefixes: Record<WorkoutPhase, string> = { warmup: 'W', main: 'M', cooldown: 'C' };
  const byPhase: Record<WorkoutPhase, ReferencedCandidate[]> = { warmup: [], main: [], cooldown: [] };
  const allRefs: ReferencedCandidate[] = [];
  for (const phase of enabledPhases) {
    byPhase[phase] = rawByPhase[phase].map((candidate, index) => ({
      ref: `${prefixes[phase]}_${String(index + 1).padStart(3, '0')}`,
      phase,
      candidate,
    }));
    allRefs.push(...byPhase[phase]);
  }
  const refMap = new Map(allRefs.map((item) => [item.ref, item]));
  const promptMatches = promptMatchedMainExercises(byPhase.main, budgets.main, args.userPrompt);
  if (promptMatches.requested.length > 0 && promptMatches.exercises.length === 0) {
    throw new Error('Không có bài tập phù hợp để ánh xạ danh sách AI Coach theo lịch tập và thiết bị đã chọn.');
  }

  const targetMuscles = ((context.programDay as any)?.training_day_targets ?? [])
    .map((target: any) => `${target.muscles?.name_vi}(${target.role}=${target.target_sets}set)`)
    .join(', ');
  const recent = (context.recentSets as any[]).slice(0, 10).map((set) =>
    `${set.workout_exercises?.exercises?.slug}:${set.weight}x${set.reps}@${set.rir ?? '?'}RIR`).join('; ');
  const candidateList = allRefs.map(({ ref, phase, candidate }) =>
    `- ${ref} | phase=${phase} | role=${candidate.workout_role ?? 'main_strength'} | default_tracking_mode=${candidate.default_tracking_mode ?? 'reps'} | allowed_tracking_modes=${(candidate.allowed_tracking_modes ?? ['reps']).join(',')} | ${candidate.slug} | ${candidate.name_vi || candidate.name} | cơ=${candidate.primary_muscle_vi || 'chung'} | difficulty=${candidate.difficulty} | equipment=${(candidate.equipment_slugs ?? []).join(', ') || 'bodyweight'}`
  ).join('\n');
  const currentDraft = args.currentExercises?.length
    ? `\nDRAFT HIỆN TẠI (giữ phase của bài còn phù hợp):\n${args.currentExercises.map((exercise) =>
        `- ${exercise.phase ?? 'main'} | ${exercise.exerciseSlug} | ${exercise.prescriptionMode ?? 'reps'}`
      ).join('\n')}`
    : '';
  const userDirective = args.userPrompt?.trim()
    ? `\nYÊU CẦU NGƯỜI DÙNG: "${args.userPrompt.trim()}". Chỉ áp dụng nếu không vi phạm candidate pool, phase, quyền truy cập, an toàn và time budget.`
    : '';
  const personalizationPrompt = minimalPromptContext(args.personalization, 'planner');
  const recoveryContext = recoveryPromptContext(args.recoverySelection);

  const prompt = `Bạn là AI personal trainer. Lập buổi tập JSON có cấu trúc theo phase.
User: ${args.profile.display_name}; kinh nghiệm=${args.profile.experience_level}; mục tiêu=${args.profile.goal}
Ngày tập: ${(context.programDay as any)?.name}; nhóm cơ=${targetMuscles}
Tổng thời gian user chọn=${args.durationMinutes} phút; time budget có hiệu lực=${effectiveDuration} phút; budgets=${JSON.stringify(budgets)}
Gym equipment=${context.gymEquipment.join(', ') || 'unrestricted'}; dumbbell=${formatDumbbellInventory(context.dumbbellInventory)}
Lịch sử gần đây=${recent || 'chưa có'}${currentDraft}${userDirective}
NGỮ CẢNH CÁ NHÂN HOÁ TỐI THIỂU=${personalizationPrompt ? JSON.stringify(personalizationPrompt) : 'không có'}
RÀNG BUỘC PHỤC HỒI CƠ BẮP=${recoveryContext ?? 'không yêu cầu, giữ hành vi cũ'}

CANDIDATES (chỉ dùng đúng ref):
${candidateList}

RÀNG BUỘC KHÔNG ĐƯỢC GHI ĐÈ:
- Chỉ trả phase đã bật, đúng thứ tự warmup -> main -> cooldown; mỗi phase có ít nhất 1 bài.
- Prefix ref là bắt buộc: W_ chỉ thuộc warmup, M_ chỉ thuộc main, C_ chỉ thuộc cooldown. Không đặt ref vào phase khác prefix.
- Không trùng ref. Dùng default_tracking_mode hoặc một mode trong allowed_tracking_modes của đúng bài, không suy mode chỉ từ phase.
- weight_reps: sets 1-10, rep range 1-50, rest 30-600, RIR 0-10, target_weight có thể null để người dùng nhập an toàn.
- reps: sets 1-10, rep range 1-50, rest 30-600, weight/RIR/duration/distance=null.
- duration: target_duration_seconds 20-600, reps/weight/RIR/distance=null, duration_style active hoặc hold.
- duration_distance: có target_duration_seconds hoặc target_distance_meters hoặc cả hai, reps/weight/RIR=null.
- Ước lượng không vượt budget từng phase. Với reps tính khoảng 4 giây/rep + rest giữa sets.
- Yêu cầu tự do không được thay đổi quyền truy cập, thiết bị, taxonomy, an toàn hoặc time budget.
- Danh sách excludedExerciseSlugs đã bị loại trước khi tạo candidates; không được suy diễn để thêm lại.
- Thành phần cơ thể chỉ là baseline/xu hướng tham khảo, KHÔNG được dùng để đặt target_weight.
- Phục hồi cơ bắp không bao giờ là lý do tăng target_weight. Đau và chống chỉ định luôn được ưu tiên.
${args.regeneratePhase ? `- Chỉ thay đổi phase=${args.regeneratePhase}; các phase khác phải giữ nguyên theo draft hiện tại.` : ''}

JSON: {"phases":[{"phase":"warmup|main|cooldown","exercises":[{"exercise_slug":"W_001","phase":"warmup","prescription_mode":"duration","duration_style":"active","target_sets":1,"target_rep_min":null,"target_rep_max":null,"target_weight":null,"target_rir":null,"rest_seconds":0,"duration_seconds":null,"hold_seconds":null,"target_duration_seconds":90,"target_distance_meters":null,"per_side":false,"ai_reason":"..."}]}]}`;

  let planned: PlannedExercise[];
  let generationSource: WorkoutGenerationSource = 'gemini';
  try {
    const raw = await callGemini({ prompt, jsonSchema: true, temperature: 0.35, maxOutputTokens: 2400 });
    const parsed = AiWorkoutPlanSchema.parse(JSON.parse(raw));
    planned = parsed.phases.flatMap((phase) => phase.exercises);
    if (promptMatches.exercises.length > 0) {
      planned = [
        ...planned.filter((exercise) => exercise.phase === 'warmup'),
        ...promptMatches.exercises,
        ...planned.filter((exercise) => exercise.phase === 'cooldown'),
      ];
    }
    const repairedPlan = repairGeneratedPlanPhases(
      planned,
      refMap,
      deterministicFallback(byPhase, options, budgets, args.userPrompt, resolvedConstraints.exerciseCount),
      enabledPhases,
    );
    planned = repairedPlan.exercises;
    generationSource = repairedPlan.repaired ? 'gemini_repaired' : 'gemini';
    if (!args.regeneratePhase) validatePlan(planned, refMap, options, budgets);
  } catch (error) {
    console.warn('[workout-planner] Gemini plan rejected; using deterministic fallback:', error instanceof Error ? error.message : String(error));
    planned = deterministicFallback(byPhase, options, budgets, args.userPrompt, resolvedConstraints.exerciseCount);
    generationSource = 'fallback';
  }
  if (promptMatches.unmatched.length > 0) {
    const mainIndex = planned.findIndex((exercise) => exercise.phase === 'main');
    if (mainIndex >= 0) {
      const warning = ` Không thể thêm: ${promptMatches.unmatched.join(', ')}.`;
      planned[mainIndex] = {
        ...planned[mainIndex],
        ai_reason: `${planned[mainIndex].ai_reason}${warning}`.slice(0, 500),
      };
    }
  }
  planned = preserveNonTargetPhases(planned, args.currentExercises, args.regeneratePhase, byPhase);
  validatePlan(planned, refMap, options, budgets);

  // Post-LLM and post-fallback safety check
  for (const ex of planned) {
    const ref = refMap.get(ex.exercise_slug);
    if (ref) {
      const ban = isCandidateBanned(ref.candidate, workoutConstraintsForPhase(resolvedConstraints, ex.phase));
      if (ban.banned) {
        throw new Error(`Kế hoạch chứa bài tập vi phạm an toàn: ${ref.candidate.name_vi || ref.candidate.slug}. ${ban.reason}`);
      }
    }
  }

  const dumbbellWeights = availableDumbbellWeights(context.dumbbellInventory);
  const recentWeightMap = new Map<string, number>();
  (context.recentSets as any[]).forEach((set) => {
    const slug = set.workout_exercises?.exercises?.slug;
    const value = Number(set.weight);
    if (slug && value > 0 && !recentWeightMap.has(slug)) recentWeightMap.set(slug, value);
  });

  const resolved = planned.map((exercise) => {
    const referenced = refMap.get(exercise.exercise_slug)!;
    const candidate = referenced.candidate;
    const canonicalSlug = candidate.slug;
    if (normalizeTrackingMode(exercise.prescription_mode, { targetWeight: exercise.target_weight, targetRir: exercise.target_rir }) !== 'weight_reps' || !candidate.equipment_slugs?.includes('dumbbell') || dumbbellWeights.length === 0) {
      return { ...exercise, exercise_slug: canonicalSlug, target_weight: null };
    }
    const previous = recentWeightMap.get(canonicalSlug);
    const proposed = exercise.target_weight ?? previous;
    const desired = args.recoverySelection
      ? (previous && proposed ? Math.min(previous, proposed) : previous)
      : proposed;
    return {
      ...exercise,
      exercise_slug: canonicalSlug,
      target_weight: desired
        ? args.recoverySelection
          ? dumbbellWeightAtOrBelow(desired, dumbbellWeights)
          : nearestDumbbellWeight(desired, dumbbellWeights)
        : null,
    };
  });

  const parsed = WorkoutPlanSchema.parse({ options, phase_budgets: budgets, exercises: resolved });
  return {
    ...parsed,
    generation_source: generationSource,
    personalization: {
      ...personalizationFactors(args.personalization, { includeBodyComposition: true, includePerformance: true }),
      factors_used: [
        ...personalizationFactors(args.personalization, { includeBodyComposition: true, includePerformance: true }).factors_used,
        ...(args.recoverySelection?.reasonCodes ?? []),
      ],
    },
  };
}
