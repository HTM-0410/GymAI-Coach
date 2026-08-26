import type { PrescriptionMode, WorkoutPhase } from './workout-contract';
import { normalizeTrackingMode, type TrackingMode } from '@/lib/workouts/metrics';
import type { MinimalAIPersonalizationContext } from './personalization-context';

export const SAFETY_POLICY_VERSION = '2026.2' as const;

export type ResolvedWorkoutConstraintsV1 = {
  policyVersion: string;
  contextRevision: string;
  exerciseCount: number | null;
  durationMinutes: number;
  allowedEquipment: string[];
  deniedEquipment: string[];
  deniedExerciseSlugs: string[];
  deniedMovementPatterns: string[];
  deniedRegionsOrJoints: string[];
  deniedImpactLevels: string[];
  deniedPositions: string[];
};

const PHASE_ROLES: Record<WorkoutPhase, readonly string[]> = {
  warmup: ['general_warmup', 'dynamic_mobility', 'activation'],
  main: ['main_strength'],
  cooldown: ['cooldown_aerobic', 'static_stretch'],
};

export function isPhasePrescriptionValid(phase: WorkoutPhase, mode: PrescriptionMode) {
  void phase;
  return Boolean(normalizeTrackingMode(mode));
}

export function isTrackingModeAllowed(
  mode: PrescriptionMode,
  exercise: { default_tracking_mode?: TrackingMode | null; allowed_tracking_modes?: readonly TrackingMode[] | null },
) {
  const normalized = normalizeTrackingMode(mode, {
    defaultTrackingMode: exercise.default_tracking_mode,
    allowedTrackingModes: exercise.allowed_tracking_modes,
  });
  const allowed = exercise.allowed_tracking_modes?.length
    ? exercise.allowed_tracking_modes
    : [exercise.default_tracking_mode ?? 'reps'];
  return allowed.includes(normalized);
}

export function isExerciseRoleAllowed(
  phase: WorkoutPhase,
  mode: PrescriptionMode,
  exercise: { owner_user_id?: string | null; workout_role?: string | null; workout_role_review_status?: string | null },
  userId: string,
) {
  if (!isPhasePrescriptionValid(phase, mode)) return false;
  const isOwnedCustom = Boolean(exercise.owner_user_id && exercise.owner_user_id === userId);
  if (isOwnedCustom && phase === 'main') return true;
  if (!PHASE_ROLES[phase].includes(exercise.workout_role ?? '')) return false;
  return phase === 'main' || exercise.workout_role_review_status === 'reviewed';
}

export function isEquipmentCompatible(
  required: readonly string[],
  available: readonly string[],
  unrestricted: boolean,
) {
  const actualRequired = required.filter((slug) => slug && slug !== 'bodyweight' && slug !== 'none' && slug !== 'no-equipment');
  return actualRequired.length === 0 || unrestricted || actualRequired.every((slug) => available.includes(slug));
}

export function effectiveGymEquipment(available: readonly string[], hasDumbbellInventory: boolean) {
  return [...new Set([
    ...available,
    ...(hasDumbbellInventory ? ['dumbbell'] : []),
  ])];
}

function normalize(value: string) {
  const aliased = value.toLowerCase()
    .replace(/tạ đơn/g, 'dumbbell')
    .replace(/tạ đòn/g, 'barbell')
    .replace(/máy|may/g, 'machine')
    .replace(/dây cáp|day cap|cáp|cap/g, 'cable');
  return aliased.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/chong day|hit dat/g, 'push up');
}

/**
 * Deterministically parses natural language prompts (Vietnamese and English)
 * to extract hard safety negations and constraints.
 */
export function resolveWorkoutConstraints(
  personalization?: MinimalAIPersonalizationContext,
  prompt?: string | null,
  durationMinutes: number = 30,
): ResolvedWorkoutConstraintsV1 {
  const normPrompt = prompt ? normalize(prompt) : '';
  const deniedMovementPatterns = new Set<string>();
  const deniedRegionsOrJoints = new Set<string>();
  const deniedPositions = new Set<string>();
  const deniedEquipment = new Set<string>();
  const allowedEquipment = new Set<string>();
  const deniedExerciseSlugs = new Set<string>();
  let exerciseCount: number | null = null;

  // 1. Parse from Context Hard Constraints (e.g. knee, shoulder, etc.)
  if (personalization?.hardConstraints) {
    (personalization.hardConstraints.excludedExerciseSlugs ?? []).forEach((slug) => deniedExerciseSlugs.add(slug));

    (personalization.hardConstraints.movementLimitations ?? []).forEach((limit) => {
      const region = limit.region?.toLowerCase();
      if (region === 'knee' || region === 'dau goi') {
        deniedRegionsOrJoints.add('knee');
        deniedRegionsOrJoints.add('lower_body');
        deniedMovementPatterns.add('squat');
        deniedMovementPatterns.add('lunge');
        deniedMovementPatterns.add('leg_press');
        deniedPositions.add('kneeling');
      } else if (region === 'shoulder' || region === 'vai') {
        deniedRegionsOrJoints.add('shoulder');
        deniedMovementPatterns.add('overhead_press');
      } else if (region === 'lower_back' || region === 'lung duoi') {
        deniedRegionsOrJoints.add('lower_back');
        deniedMovementPatterns.add('heavy_deadlift');
      }
    });
  }

  // 2. Parse from Prompt Hard Negations
  if (normPrompt) {
    // Exact count extraction: "3 bài", "chỉ 3 bài", "3 bai"
    const countMatch = normPrompt.match(/(?:chi\s+)?(\d+)\s+bai/);
    if (countMatch && countMatch[1]) {
      const parsedCount = parseInt(countMatch[1], 10);
      if (parsedCount > 0 && parsedCount <= 10) {
        exerciseCount = parsedCount;
      }
    }

    // Equipment specifications: "chỉ chọn ... bằng máy/cáp", "chi bang may/cap", "machine/cable"
    if (normPrompt.includes('may/cap') || normPrompt.includes('machine/cable') || normPrompt.includes('bang may hoac cap') || (normPrompt.includes('machine') && normPrompt.includes('cable'))) {
      allowedEquipment.add('machine');
      allowedEquipment.add('cable');
      allowedEquipment.add('cable-machine');
      allowedEquipment.add('smith-machine');
      deniedEquipment.add('barbell');
      deniedEquipment.add('dumbbell');
      deniedEquipment.add('kettlebell');
      deniedEquipment.add('ez-bar');
      deniedEquipment.add('bodyweight');
    }

    // Negations on lower body / leg exercises
    if (
      normPrompt.includes('khong bai chan') ||
      normPrompt.includes('khong tap chan') ||
      normPrompt.includes('bo chan') ||
      normPrompt.includes('ne chan') ||
      normPrompt.includes('khong lower body') ||
      normPrompt.includes('chi chon 3 bai than tren') ||
      normPrompt.includes('than tren')
    ) {
      deniedRegionsOrJoints.add('lower_body');
      deniedRegionsOrJoints.add('legs');
      deniedRegionsOrJoints.add('knee');
      deniedRegionsOrJoints.add('quadriceps');
      deniedRegionsOrJoints.add('hamstrings');
      deniedRegionsOrJoints.add('calves');
      deniedRegionsOrJoints.add('glutes');
    }

    // Specific exercise / movement negations
    if (normPrompt.includes('squat')) deniedMovementPatterns.add('squat');
    if (normPrompt.includes('lunge')) deniedMovementPatterns.add('lunge');
    if (normPrompt.includes('leg press')) deniedMovementPatterns.add('leg_press');
    if (normPrompt.includes('nhay') || normPrompt.includes('jump')) deniedMovementPatterns.add('jump');
    if (normPrompt.includes('chay') || normPrompt.includes('run')) deniedMovementPatterns.add('run');
    if (normPrompt.includes('xe dap') || normPrompt.includes('dap xe') || normPrompt.includes('bike') || normPrompt.includes('cycle')) deniedMovementPatterns.add('cycle');
    if (normPrompt.includes('elliptical')) deniedMovementPatterns.add('elliptical');
    if (normPrompt.includes('quy goi') || normPrompt.includes('quy') || normPrompt.includes('kneel')) deniedPositions.add('kneeling');
  }

  return {
    policyVersion: SAFETY_POLICY_VERSION,
    contextRevision: personalization?.version ?? '2.0',
    exerciseCount,
    durationMinutes,
    allowedEquipment: Array.from(allowedEquipment),
    deniedEquipment: Array.from(deniedEquipment),
    deniedExerciseSlugs: Array.from(deniedExerciseSlugs),
    deniedMovementPatterns: Array.from(deniedMovementPatterns),
    deniedRegionsOrJoints: Array.from(deniedRegionsOrJoints),
    deniedImpactLevels: ['high_impact'],
    deniedPositions: Array.from(deniedPositions),
  };
}

export type CandidateExerciseInfo = {
  id?: string;
  slug?: string | null;
  name?: string | null;
  name_vi?: string | null;
  movement_pattern?: string | null;
  primary_muscle?: string | null;
  secondary_muscles?: string[] | null;
  exercise_equipment?: Array<{ equipment?: { slug?: string | null } | null }> | null;
  equipment_slugs?: string[] | null;
  tags?: string[] | null;
  instructions?: any;
  workout_role?: string | null;
};

const LOWER_BODY_TERMS = [
  'chan', 'dui', 'mong', 'bap chan', 'dau goi', 'khop goi', 'knee', 'quad', 'hamstring', 'calf', 'glute',
  'squat', 'lunge', 'leg press', 'leg extension', 'leg curl', 'calf raise', 'ganh dui',
  'duoi dui', 'cuon dui', 'nhon bap', 'dap dui', 'quy goi', 'lower body', 'hamstrings', 'quadriceps', 'glutes'
];

/**
 * Deterministically checks if a candidate exercise violates any resolved constraints.
 */
export function isCandidateBanned(
  candidate: CandidateExerciseInfo,
  constraints: ResolvedWorkoutConstraintsV1,
): { banned: boolean; reason?: string } {
  const slug = (candidate.slug ?? '').toLowerCase();
  const name = (candidate.name ?? '').toLowerCase();
  const nameVi = (candidate.name_vi ?? '').toLowerCase();
  const pattern = (candidate.movement_pattern ?? '').toLowerCase();
  const primary = (candidate.primary_muscle ?? '').toLowerCase();
  const combinedText = `${slug} ${name} ${nameVi} ${pattern} ${primary}`.toLowerCase();
  const normText = normalize(combinedText);

  // 1. Explicitly denied slugs
  if (constraints.deniedExerciseSlugs.includes(slug)) {
    return { banned: true, reason: `Bài tập ${slug} nằm trong danh sách loại trừ cá nhân.` };
  }

  // 2. Denied movement patterns
  for (const mp of constraints.deniedMovementPatterns) {
    const normMp = normalize(mp);
    if (pattern.includes(normMp) || normText.includes(normMp)) {
      return { banned: true, reason: `Động tác ${mp} bị cấm theo yêu cầu an toàn.` };
    }
  }

  // 3. Denied positions (e.g. kneeling)
  if (constraints.deniedPositions.includes('kneeling')) {
    if (normText.includes('quy goi') || normText.includes('kneel')) {
      return { banned: true, reason: 'Tư thế quỳ gối bị cấm theo yêu cầu an toàn.' };
    }
  }

  // 4. Denied regions / joints (e.g. lower body, knee)
  if (constraints.deniedRegionsOrJoints.includes('lower_body') || constraints.deniedRegionsOrJoints.includes('knee') || constraints.deniedRegionsOrJoints.includes('legs')) {
    const isLower = LOWER_BODY_TERMS.some((term) => {
      const normTerm = normalize(term);
      // For short words like 'chan', 'dui', 'mong', require word boundary matching
      if (normTerm.length <= 4) {
        const regex = new RegExp(`\\b${normTerm}\\b`, 'i');
        return regex.test(normText);
      }
      return normText.includes(normTerm);
    });
    if (isLower || pattern === 'squat' || pattern === 'lunge' || pattern === 'hinge_legs') {
      return { banned: true, reason: 'Bài tập thân dưới / khớp gối bị cấm theo yêu cầu.' };
    }
  }

  // 5. Equipment constraints
  const candidateEquip: string[] = [
    ...(candidate.equipment_slugs ?? []),
    ...(candidate.exercise_equipment?.map((ee) => ee.equipment?.slug).filter(Boolean) as string[] ?? []),
  ].map((s) => s.toLowerCase());

  if (constraints.allowedEquipment.length > 0) {
    const isAllowed = candidateEquip.length > 0 && candidateEquip.every((eq) =>
      constraints.allowedEquipment.some((allowed) => eq.includes(allowed) || allowed.includes(eq))
    );
    if (!isAllowed) {
      return { banned: true, reason: `Thiết bị của bài tập không nằm trong danh sách cho phép (${constraints.allowedEquipment.join(', ')}).` };
    }
  }

  if (constraints.deniedEquipment.length > 0) {
    const hasDenied = candidateEquip.some((eq) =>
      constraints.deniedEquipment.some((denied) => eq.includes(denied) || denied.includes(eq))
    );
    if (hasDenied) {
      return { banned: true, reason: `Thiết bị bài tập (${candidateEquip.join(', ')}) bị loại trừ theo yêu cầu.` };
    }
  }

  return { banned: false };
}

/**
 * Filters candidates with strict safety checks.
 */
export function filterCandidateExercises<T extends CandidateExerciseInfo>(
  candidates: T[],
  constraints: ResolvedWorkoutConstraintsV1,
): T[] {
  return candidates.filter((c) => !isCandidateBanned(c, constraints).banned);
}

/**
 * Filters candidate exercises based on explicit avoidance phrases in prompt.
 */
export function filterExplicitlyAvoided<T extends CandidateExerciseInfo>(
  candidates: T[],
  prompt?: string | null,
): T[] {
  if (!prompt?.trim()) return candidates;
  const normPrompt = normalize(prompt);
  const constraints = resolveWorkoutConstraints(undefined, prompt);

  return candidates.filter((candidate) => {
    if (isCandidateBanned(candidate, constraints).banned) return false;

    const slug = normalize(candidate.slug ?? '');
    const name = normalize(candidate.name ?? '');
    const nameVi = normalize(candidate.name_vi ?? '');

    if (normPrompt.includes('tranh') || normPrompt.includes('khong tap') || normPrompt.includes('bo qua') || normPrompt.includes('dau co tay')) {
      if (normPrompt.includes('chong day') || normPrompt.includes('push up') || normPrompt.includes('hit dat')) {
        if (slug.includes('push-up') || name.includes('push up') || nameVi.includes('chong day') || nameVi.includes('hit dat')) {
          return false;
        }
      }
    }
    return true;
  });
}
