import type { PerceivedEffort } from '@/lib/workouts/perceived-effort';

export const RECOVERY_MODEL_VERSION = 'muscle_readiness_v1';
export const FATIGUE_SATURATION_K = 6;
export const DEFAULT_HALF_LIFE_HOURS = 18;

export type RecoverySetType = 'warmup' | 'working' | 'drop' | 'failure';

export const EFFORT_FACTORS: Readonly<Record<PerceivedEffort, number>> = {
  too_hard: 1.35,
  hard: 1.15,
  appropriate: 1,
  easy: 0.7,
};

export const SET_TYPE_FACTORS: Readonly<Record<RecoverySetType, number>> = {
  warmup: 0.3,
  working: 1,
  drop: 1.15,
  failure: 1.3,
};

export const ROLE_CONTRIBUTION_FALLBACK = {
  primary: 1,
  secondary: 0.5,
} as const;

export const MUSCLE_HALF_LIFE_HOURS: Readonly<Record<string, number>> = {
  chest: 20,
  upper_chest: 20,
  inner_chest: 20,
  lower_chest: 20,
  serratus: 20,
  'serratus-anterior': 20,
  back: 20,
  upper_back: 20,
  'upper-back': 20,
  middle_back: 20,
  lats: 20,
  lung: 20,
  lower_back: 20,
  traps: 20,
  rhomboids: 20,
  spine: 20,
  'levator-scapulae': 20,
  shoulders: 18,
  deltoids: 18,
  front_delts: 18,
  side_delts: 18,
  rear_delts: 18,
  shoulder_front: 18,
  shoulder_lateral: 18,
  shoulder_rear: 18,
  'rotator-cuff': 18,
  biceps: 16,
  brachialis: 16,
  triceps: 16,
  forearms: 14,
  'wrist-extensors': 14,
  'wrist-flexors': 14,
  wrists: 14,
  'grip-muscles': 14,
  hands: 14,
  abs: 14,
  lower_abs: 14,
  obliques: 14,
  core: 14,
  quads: 22,
  hamstrings: 22,
  adductors: 22,
  abductors: 22,
  'inner-thighs': 22,
  groin: 22,
  'co-gap-hong': 22,
  hip_flexors: 22,
  glutes: 22,
  calves: 18,
  soleus: 18,
  shins: 18,
  'ankle-stabilizers': 18,
};

export const READINESS_THRESHOLDS = {
  recoveryHeavy: 30,
  lightOnly: 60,
  trainable: 80,
  ready: 90,
} as const;
