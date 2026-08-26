import {
  lowestRecoveryInputQuality,
  type RecoveryInputQuality,
} from '@/lib/recovery/confidence';

export const BODY_MUSCLE_GROUPS = [
  'CHEST',
  'SHOULDERS',
  'BACK',
  'TRICEPS',
  'BICEPS',
  'FOREARMS',
  'ABS',
  'LEGS',
  'GLUTES',
  'CALVES',
] as const;

export type BodyMuscleGroup = (typeof BODY_MUSCLE_GROUPS)[number];

export const BODY_MUSCLE_GROUP_LABELS: Readonly<Record<BodyMuscleGroup, string>> = {
  CHEST: 'Ngực',
  SHOULDERS: 'Vai',
  BACK: 'Lưng',
  TRICEPS: 'Tay sau',
  BICEPS: 'Tay trước',
  FOREARMS: 'Cẳng tay',
  ABS: 'Cơ bụng',
  LEGS: 'Đùi',
  GLUTES: 'Cơ mông',
  CALVES: 'Bắp chân',
};

const MUSCLE_GROUP_BY_SLUG: Readonly<Record<string, BodyMuscleGroup>> = {
  chest: 'CHEST',
  upper_chest: 'CHEST',
  inner_chest: 'CHEST',
  lower_chest: 'CHEST',
  serratus: 'CHEST',
  'serratus-anterior': 'CHEST',
  shoulders: 'SHOULDERS',
  deltoids: 'SHOULDERS',
  front_delts: 'SHOULDERS',
  side_delts: 'SHOULDERS',
  rear_delts: 'SHOULDERS',
  shoulder_front: 'SHOULDERS',
  shoulder_lateral: 'SHOULDERS',
  shoulder_rear: 'SHOULDERS',
  'rotator-cuff': 'SHOULDERS',
  back: 'BACK',
  upper_back: 'BACK',
  'upper-back': 'BACK',
  middle_back: 'BACK',
  lats: 'BACK',
  lung: 'BACK',
  lower_back: 'BACK',
  traps: 'BACK',
  rhomboids: 'BACK',
  spine: 'BACK',
  'levator-scapulae': 'BACK',
  triceps: 'TRICEPS',
  biceps: 'BICEPS',
  brachialis: 'BICEPS',
  forearms: 'FOREARMS',
  'wrist-extensors': 'FOREARMS',
  'wrist-flexors': 'FOREARMS',
  wrists: 'FOREARMS',
  'grip-muscles': 'FOREARMS',
  hands: 'FOREARMS',
  abs: 'ABS',
  lower_abs: 'ABS',
  obliques: 'ABS',
  core: 'ABS',
  quads: 'LEGS',
  hamstrings: 'LEGS',
  adductors: 'LEGS',
  abductors: 'LEGS',
  'inner-thighs': 'LEGS',
  groin: 'LEGS',
  'co-gap-hong': 'LEGS',
  hip_flexors: 'LEGS',
  glutes: 'GLUTES',
  calves: 'CALVES',
  soleus: 'CALVES',
  shins: 'CALVES',
  'ankle-stabilizers': 'CALVES',
};

export type MuscleReadinessValue = {
  id: string;
  slug: string;
  nameVi: string;
  readiness: number | null;
  confidence: RecoveryInputQuality | 'unknown';
};

export type AggregatedMuscleGroup = {
  group: BodyMuscleGroup;
  readiness: number | null;
  confidence: RecoveryInputQuality | 'unknown';
  limitingMuscle: MuscleReadinessValue | null;
  muscles: MuscleReadinessValue[];
};

export function getBodyMuscleGroup(slug: string): BodyMuscleGroup | null {
  return MUSCLE_GROUP_BY_SLUG[slug] ?? null;
}

export function getMuscleSlugsForBodyGroups(
  groups: readonly BodyMuscleGroup[],
): string[] {
  const requested = new Set(groups);
  return Object.entries(MUSCLE_GROUP_BY_SLUG)
    .filter(([, group]) => requested.has(group))
    .map(([slug]) => slug);
}

export function aggregateMuscleReadiness(
  values: readonly MuscleReadinessValue[],
): AggregatedMuscleGroup[] {
  return BODY_MUSCLE_GROUPS.map((group) => {
    const muscles = values.filter((value) => getBodyMuscleGroup(value.slug) === group);
    const measured = muscles
      .filter((value): value is MuscleReadinessValue & { readiness: number } => value.readiness !== null)
      .map((value) => ({ ...value, readiness: Math.max(0, Math.min(100, value.readiness)) }));

    if (measured.length === 0) {
      return { group, readiness: null, confidence: 'unknown', limitingMuscle: null, muscles };
    }

    const limitingMuscle = measured.reduce((lowest, value) => (
      value.readiness < lowest.readiness ? value : lowest
    ));
    const qualities = measured
      .map((value) => value.confidence)
      .filter((quality): quality is RecoveryInputQuality => quality !== 'unknown');

    return {
      group,
      readiness: limitingMuscle.readiness,
      confidence: qualities.length > 0 ? lowestRecoveryInputQuality(qualities) : 'unknown',
      limitingMuscle,
      muscles,
    };
  });
}

export function listUnmappedMuscleSlugs(slugs: readonly string[]): string[] {
  return [...new Set(slugs.filter((slug) => getBodyMuscleGroup(slug) === null))].sort();
}
