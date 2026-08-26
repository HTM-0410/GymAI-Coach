import {
  DEFAULT_HALF_LIFE_HOURS,
  EFFORT_FACTORS,
  FATIGUE_SATURATION_K,
  MUSCLE_HALF_LIFE_HOURS,
  RECOVERY_MODEL_VERSION,
  ROLE_CONTRIBUTION_FALLBACK,
  SET_TYPE_FACTORS,
  type RecoverySetType,
} from '@/lib/recovery/constants';
import {
  lowestRecoveryInputQuality,
  type RecoveryInputQuality,
} from '@/lib/recovery/confidence';
import type { PerceivedEffort } from '@/lib/workouts/perceived-effort';

export type MuscleRole = keyof typeof ROLE_CONTRIBUTION_FALLBACK;

export type RecoverySetInput = {
  completed: boolean;
  reps: number | null;
  perceivedEffort: PerceivedEffort;
  setType: RecoverySetType;
};

export type FatigueEvent = {
  newFatigue: number;
  occurredAt: string;
  halfLifeHours: number;
  confidence: RecoveryInputQuality;
};

export type MuscleFatigueState = {
  fatigueScore: number;
  fatigueAt: string;
  halfLifeHours: number;
  confidence: RecoveryInputQuality;
  modelVersion: typeof RECOVERY_MODEL_VERSION;
};

const HOURS_IN_MS = 60 * 60 * 1000;

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${label} must be finite.`);
}

function clampPercent(value: number): number {
  assertFinite(value, 'Percent');
  return Math.max(0, Math.min(100, value));
}

function parseTimestamp(value: string, label: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new RangeError(`${label} must be a valid timestamp.`);
  return timestamp;
}

export function resolveMuscleContribution(
  contribution: number | null | undefined,
  role: MuscleRole,
): { value: number; source: 'curated' | 'role_fallback' } {
  if (contribution === null || contribution === undefined) {
    return { value: ROLE_CONTRIBUTION_FALLBACK[role], source: 'role_fallback' };
  }
  if (!Number.isFinite(contribution) || contribution <= 0 || contribution > 1) {
    throw new RangeError('Muscle contribution must be greater than 0 and at most 1.');
  }
  return { value: contribution, source: 'curated' };
}

export function calculateFatiguePoints(input: {
  contribution: number;
  sets: readonly RecoverySetInput[];
}): { completedSetCount: number; fatiguePoints: number } {
  if (!Number.isFinite(input.contribution) || input.contribution <= 0 || input.contribution > 1) {
    throw new RangeError('Muscle contribution must be greater than 0 and at most 1.');
  }

  const usableSets = input.sets.filter((set) => (
    set.completed && set.reps !== null && Number.isFinite(set.reps) && set.reps > 0
  ));
  const fatiguePoints = usableSets.reduce((sum, set) => (
    sum + input.contribution * EFFORT_FACTORS[set.perceivedEffort] * SET_TYPE_FACTORS[set.setType]
  ), 0);

  return { completedSetCount: usableSets.length, fatiguePoints };
}

export function fatigueFromPoints(
  fatiguePoints: number,
  saturationK = FATIGUE_SATURATION_K,
): number {
  assertFinite(fatiguePoints, 'Fatigue points');
  assertFinite(saturationK, 'Saturation K');
  if (fatiguePoints < 0) throw new RangeError('Fatigue points cannot be negative.');
  if (saturationK <= 0) throw new RangeError('Saturation K must be greater than 0.');
  return 100 * (1 - Math.exp(-fatiguePoints / saturationK));
}

export function decayFatigue(
  fatigueScore: number,
  elapsedHours: number,
  halfLifeHours: number,
): number {
  assertFinite(elapsedHours, 'Elapsed hours');
  assertFinite(halfLifeHours, 'Half-life hours');
  if (halfLifeHours <= 0) throw new RangeError('Half-life hours must be greater than 0.');
  return clampPercent(fatigueScore) * 2 ** (-Math.max(0, elapsedHours) / halfLifeHours);
}

export function combineFatigue(oldFatigue: number, newFatigue: number): number {
  const oldValue = clampPercent(oldFatigue);
  const newValue = clampPercent(newFatigue);
  return 100 * (1 - (1 - oldValue / 100) * (1 - newValue / 100));
}

export function calculateReadinessAt(
  state: Pick<MuscleFatigueState, 'fatigueScore' | 'fatigueAt' | 'halfLifeHours'>,
  at: string,
): number {
  const elapsedHours = Math.max(0, (parseTimestamp(at, 'Read time') - parseTimestamp(state.fatigueAt, 'Fatigue time')) / HOURS_IN_MS);
  return 100 - decayFatigue(state.fatigueScore, elapsedHours, state.halfLifeHours);
}

export function projectReadinessAt(
  state: Pick<MuscleFatigueState, 'fatigueScore' | 'fatigueAt' | 'halfLifeHours'>,
  targetReadiness: number,
  from: string,
): string | null {
  if (!Number.isFinite(targetReadiness) || targetReadiness < 0 || targetReadiness > 100) {
    throw new RangeError('Target readiness must be between 0 and 100.');
  }

  const fromTimestamp = parseTimestamp(from, 'Projection start');
  const currentReadiness = calculateReadinessAt(state, from);
  if (currentReadiness >= targetReadiness) return new Date(fromTimestamp).toISOString();
  if (targetReadiness === 100) return null;

  const currentFatigue = 100 - currentReadiness;
  const targetFatigue = 100 - targetReadiness;
  const hoursNeeded = state.halfLifeHours * Math.log2(currentFatigue / targetFatigue);
  return new Date(fromTimestamp + Math.max(0, hoursNeeded) * HOURS_IN_MS).toISOString();
}

export function resolveHalfLifeHours(slug: string): {
  value: number;
  source: 'configured' | 'default';
} {
  const configured = MUSCLE_HALF_LIFE_HOURS[slug];
  return configured
    ? { value: configured, source: 'configured' }
    : { value: DEFAULT_HALF_LIFE_HOURS, source: 'default' };
}

export function foldFatigueEvents(events: readonly FatigueEvent[]): MuscleFatigueState | null {
  if (events.length === 0) return null;
  const sorted = [...events].sort((a, b) => (
    parseTimestamp(a.occurredAt, 'Event time') - parseTimestamp(b.occurredAt, 'Event time')
  ));

  return sorted.reduce<MuscleFatigueState | null>((state, event) => {
    if (!Number.isFinite(event.halfLifeHours) || event.halfLifeHours <= 0) {
      throw new RangeError('Event half-life hours must be greater than 0.');
    }
    const occurredAt = new Date(parseTimestamp(event.occurredAt, 'Event time')).toISOString();
    const newFatigue = clampPercent(event.newFatigue);
    if (!state) {
      return {
        fatigueScore: newFatigue,
        fatigueAt: occurredAt,
        halfLifeHours: event.halfLifeHours,
        confidence: event.confidence,
        modelVersion: RECOVERY_MODEL_VERSION,
      };
    }

    const elapsedHours = (
      parseTimestamp(occurredAt, 'Event time') - parseTimestamp(state.fatigueAt, 'State time')
    ) / HOURS_IN_MS;
    const oldAtEvent = decayFatigue(state.fatigueScore, elapsedHours, state.halfLifeHours);
    return {
      fatigueScore: combineFatigue(oldAtEvent, newFatigue),
      fatigueAt: occurredAt,
      halfLifeHours: event.halfLifeHours,
      confidence: lowestRecoveryInputQuality([state.confidence, event.confidence]),
      modelVersion: RECOVERY_MODEL_VERSION,
    };
  }, null);
}
