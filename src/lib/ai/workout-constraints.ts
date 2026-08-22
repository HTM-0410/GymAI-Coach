import type { PrescriptionMode, WorkoutPhase } from './workout-contract';

const PHASE_ROLES: Record<WorkoutPhase, readonly string[]> = {
  warmup: ['general_warmup', 'dynamic_mobility', 'activation'],
  main: ['main_strength'],
  cooldown: ['cooldown_aerobic', 'static_stretch'],
};

export function isPhasePrescriptionValid(phase: WorkoutPhase, mode: PrescriptionMode) {
  return phase === 'warmup'
    ? mode === 'time'
    : phase === 'main'
      ? mode === 'reps'
      : mode === 'time' || mode === 'hold';
}

export function isExerciseRoleAllowed(
  phase: WorkoutPhase,
  mode: PrescriptionMode,
  exercise: { owner_user_id?: string | null; workout_role?: string | null; workout_role_review_status?: string | null },
  userId: string,
) {
  if (!isPhasePrescriptionValid(phase, mode)) return false;
  const isOwnedCustom = Boolean(exercise.owner_user_id && exercise.owner_user_id === userId);
  if (isOwnedCustom && phase === 'main' && mode === 'reps') return true;
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
  const aliased = value.toLowerCase().replace(/tạ đơn/g, 'dumbbell').replace(/tạ đòn/g, 'barbell');
  return aliased.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/chong day|hit dat/g, 'push up')
    .replace(/day cap/g, 'cable');
}

export type AvoidableCandidate = {
  slug?: string | null;
  name?: string | null;
  name_vi?: string | null;
  equipment_slugs?: string[] | null;
};

export function explicitAvoidanceTerms(prompt?: string | null) {
  if (!prompt) return [];
  const normalized = normalize(prompt);
  const terms: string[] = [];
  const pattern = /(?:tranh|bo|khong dung|khong tap|ne)\s+([^,.;]+?)(?=\s+(?:va|nhung|vi)\s+|$|[,.;])/g;
  for (const match of normalized.matchAll(pattern)) {
    const term = match[1]?.trim();
    if (term) terms.push(term);
  }
  return terms;
}

export function isExplicitlyAvoided(candidate: AvoidableCandidate, prompt?: string | null) {
  const terms = explicitAvoidanceTerms(prompt);
  if (terms.length === 0) return false;
  const candidateTerms = [candidate.slug, candidate.name, candidate.name_vi, ...(candidate.equipment_slugs ?? [])]
    .filter((value): value is string => Boolean(value))
    .map(normalize);
  return terms.some((term) => candidateTerms.some((candidateTerm) => (
    term.includes(candidateTerm) || candidateTerm.includes(term)
  )));
}

export function filterExplicitlyAvoided<T extends AvoidableCandidate>(candidates: T[], prompt?: string | null) {
  return candidates.filter((candidate) => !isExplicitlyAvoided(candidate, prompt));
}
