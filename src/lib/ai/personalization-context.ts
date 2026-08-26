import type {
  BodyCompositionAllowedUse,
  BodyCompositionComparability,
  ConsentPurpose,
  Database,
  ExperienceLevel,
  GoalType,
} from '@/types/database';

export const PERSONALIZATION_CONTEXT_VERSION = '1.0' as const;
const ALWAYS_ON_BODY_COMPOSITION_SURFACES: PersonalizationSurface[] = ['planner', 'coach', 'weekly_report'];

export type PersonalizationSurface = BodyCompositionAllowedUse;
export type TrainingConstraintRow = Database['public']['Tables']['training_constraints']['Row'];
export type ExercisePreferenceRow = Database['public']['Tables']['exercise_preferences']['Row'];
export type ReadinessCheckinRow = Database['public']['Tables']['readiness_checkins']['Row'];
export type BodyCompositionMeasurementRow = Database['public']['Tables']['body_composition_measurements']['Row'];
export type BodyCompositionSegmentRow = Database['public']['Tables']['body_composition_segments']['Row'];
export type BodyCompositionMeasurementWithSegments = BodyCompositionMeasurementRow & {
  body_composition_segments?: BodyCompositionSegmentRow[];
};
export type DataConsentRow = Database['public']['Tables']['data_consents']['Row'];

export interface DeclaredPersonalizationInput {
  goal: GoalType | null;
  experienceLevel: ExperienceLevel | null;
  preferredTrainingDays: number | null;
  preferredSessionMinutes: number | null;
  observedAt?: string | null;
}

export interface PerformancePersonalizationInput {
  recentSessions: Array<{
    sessionId: string;
    date: string;
    status: string;
    plannedDuration: number | null;
    startedAt: string | null;
    completedAt: string | null;
  }>;
  exerciseTrends: Array<{
    exerciseId: string;
    lastWeight: number | null;
    lastReps: number | null;
    bestWeight: number | null;
    bestReps: number | null;
    estimated1rm: number | null;
    totalVolumeKg: number;
    totalSets: number;
    lastPerformedAt: string | null;
    observedAt: string;
  }>;
  adherence: {
    completedSessions: number;
    observedSessions: number;
    completionRate: number;
  } | null;
}

export interface PersonalizationContextInput {
  declared: DeclaredPersonalizationInput;
  constraints: TrainingConstraintRow[];
  preferences: ExercisePreferenceRow[];
  readinessCheckins: ReadinessCheckinRow[];
  performance?: Partial<PerformancePersonalizationInput>;
  bodyCompositionMeasurements: BodyCompositionMeasurementWithSegments[];
  consents: DataConsentRow[];
}

export interface BodyCompositionSummary {
  measurementId: string;
  measuredAt: string;
  source: BodyCompositionMeasurementRow['source'];
  deviceBrand: string | null;
  deviceModel: string | null;
  weightKg: number | null;
  skeletalMuscleMassKg: number | null;
  percentBodyFat: number | null;
  bodyFatMassKg: number | null;
  fatFreeMassKg: number | null;
  segmental?: Array<{
    segment: BodyCompositionSegmentRow['segment'];
    tissueType: BodyCompositionSegmentRow['tissue_type'];
    massKg: number;
    percentOfReference: number | null;
    evaluation: string | null;
  }>;
  targetValues?: Record<string, number | null>;
}

export interface BodyCompositionTrend {
  fromMeasurementId: string;
  toMeasurementId: string;
  fromMeasuredAt: string;
  toMeasuredAt: string;
  comparability: Exclude<BodyCompositionComparability, 'low'>;
  delta: {
    weightKg?: number;
    skeletalMuscleMassKg?: number;
    percentBodyFat?: number;
  };
}

export interface PersonalizationContextV1 {
  version: typeof PERSONALIZATION_CONTEXT_VERSION;
  generatedAt: string;
  userDeclared: {
    goal: GoalType | null;
    experienceLevel: ExperienceLevel | null;
    schedule: { daysPerWeek: number | null; preferredMinutes: number | null };
    source: 'user';
    observedAt: string | null;
  };
  hardConstraints: {
    excludedExerciseSlugs: string[];
    movementLimitations: Array<{
      id: string;
      region: string;
      side: TrainingConstraintRow['side'];
      severity: 'mild' | 'moderate' | 'severe';
      triggers: string[];
      validUntil: string | null;
      source: TrainingConstraintRow['source'];
      observedAt: string;
    }>;
  };
  preferences: {
    explicit: Array<{
      key: string;
      targetType: ExercisePreferenceRow['target_type'];
      value: ExercisePreferenceRow['preference'];
      strength: number;
      observedAt: string;
    }>;
    inferred: Array<{
      key: string;
      targetType: ExercisePreferenceRow['target_type'];
      value: ExercisePreferenceRow['preference'];
      strength: number;
      confidence: number;
      observedAt: string;
    }>;
  };
  readiness?: {
    checkinId: string;
    energy: 1 | 2 | 3 | 4 | 5;
    sleepQuality: 1 | 2 | 3 | 4 | 5 | null;
    sleepHours: number | null;
    stress: 1 | 2 | 3 | 4 | 5 | null;
    discomfortRegions: string[];
    availableMinutes: number;
    intent: string | null;
    observedAt: string;
    expiresAt: string;
  };
  performance: PerformancePersonalizationInput;
  bodyComposition?: {
    latestConfirmed: BodyCompositionSummary;
    trend?: BodyCompositionTrend;
    comparability: BodyCompositionComparability;
    allowedUses: PersonalizationSurface[];
  };
  consentedAllowedUses: PersonalizationSurface[];
}

const PURPOSE_BY_SURFACE: Record<PersonalizationSurface, ConsentPurpose> = {
  planner: 'body_composition_planner',
  coach: 'body_composition_coach',
  weekly_report: 'body_composition_weekly_report',
};

function timestamp(value: string): number {
  const result = Date.parse(value);
  return Number.isFinite(result) ? result : Number.NaN;
}

export function isUnexpired(expiresAt: string | null | undefined, now: Date = new Date()): boolean {
  return expiresAt == null || timestamp(expiresAt) > now.getTime();
}

export function hasActiveConsent(
  consents: DataConsentRow[],
  purpose: ConsentPurpose,
  now: Date = new Date(),
): boolean {
  const latest = consents
    .filter((consent) => consent.purpose === purpose && timestamp(consent.granted_at) <= now.getTime())
    .sort((a, b) => timestamp(b.granted_at) - timestamp(a.granted_at))[0];
  return Boolean(latest && (latest.withdrawn_at == null || timestamp(latest.withdrawn_at) > now.getTime()));
}

export function consentedBodyCompositionUses(
  measurement: Pick<BodyCompositionMeasurementRow, 'allowed_uses'> | null | undefined,
  consents: DataConsentRow[],
  now: Date = new Date(),
): PersonalizationSurface[] {
  if (!measurement) return [];
  return measurement.allowed_uses.filter((surface) =>
    hasActiveConsent(consents, PURPOSE_BY_SURFACE[surface], now));
}

function deviceIdentity(measurement: BodyCompositionMeasurementRow): string | null {
  const identity = [measurement.device_brand, measurement.device_model]
    .map((value) => value?.trim().toLocaleLowerCase() ?? '')
    .join(':');
  return identity === ':' ? null : identity;
}

export function areMeasurementsComparable(
  previous: BodyCompositionMeasurementRow,
  current: BodyCompositionMeasurementRow,
): boolean {
  if (previous.review_status !== 'confirmed' || current.review_status !== 'confirmed') return false;
  if (current.comparability === 'low') return false;
  const previousDevice = deviceIdentity(previous);
  const currentDevice = deviceIdentity(current);
  if (previousDevice || currentDevice) return previousDevice === currentDevice;
  return previous.source === current.source;
}

function finiteDelta(current: number | null, previous: number | null): number | undefined {
  if (current == null || previous == null) return undefined;
  return Number((current - previous).toFixed(2));
}

export function buildBodyCompositionTrend(
  confirmedMeasurements: BodyCompositionMeasurementRow[],
): BodyCompositionTrend | undefined {
  const ordered = confirmedMeasurements
    .filter((measurement) => measurement.review_status === 'confirmed')
    .sort((a, b) => timestamp(b.measured_at) - timestamp(a.measured_at));
  const current = ordered[0];
  if (!current) return undefined;
  const previous = ordered.slice(1).find((candidate) => areMeasurementsComparable(candidate, current));
  if (!previous) return undefined;
  const delta = {
    weightKg: finiteDelta(current.weight_kg, previous.weight_kg),
    skeletalMuscleMassKg: finiteDelta(current.skeletal_muscle_mass_kg, previous.skeletal_muscle_mass_kg),
    percentBodyFat: finiteDelta(current.percent_body_fat, previous.percent_body_fat),
  };
  return {
    fromMeasurementId: previous.id,
    toMeasurementId: current.id,
    fromMeasuredAt: previous.measured_at,
    toMeasuredAt: current.measured_at,
    comparability: current.comparability as Exclude<BodyCompositionComparability, 'low'>,
    delta: Object.fromEntries(Object.entries(delta).filter(([, value]) => value !== undefined)),
  };
}

function summarizeMeasurement(measurement: BodyCompositionMeasurementWithSegments): BodyCompositionSummary {
  const targetSource = measurement.device_target_values && typeof measurement.device_target_values === 'object' && !Array.isArray(measurement.device_target_values)
    ? measurement.device_target_values as Record<string, unknown>
    : {};
  const targetValues = Object.fromEntries(Object.entries(targetSource)
    .filter(([key, value]) => key !== 'aiAnalysis' && (typeof value === 'number' || value === null))) as Record<string, number | null>;
  return {
    measurementId: measurement.id,
    measuredAt: measurement.measured_at,
    source: measurement.source,
    deviceBrand: measurement.device_brand,
    deviceModel: measurement.device_model,
    weightKg: measurement.weight_kg,
    skeletalMuscleMassKg: measurement.skeletal_muscle_mass_kg,
    percentBodyFat: measurement.percent_body_fat,
    bodyFatMassKg: measurement.body_fat_mass_kg,
    fatFreeMassKg: measurement.fat_free_mass_kg,
    segmental: (measurement.body_composition_segments ?? []).map((segment) => ({
      segment: segment.segment,
      tissueType: segment.tissue_type,
      massKg: segment.mass_kg,
      percentOfReference: segment.percent_of_reference,
      evaluation: segment.device_evaluation,
    })),
    targetValues,
  };
}

function severityLabel(severity: number): 'mild' | 'moderate' | 'severe' {
  if (severity <= 2) return 'mild';
  if (severity === 3) return 'moderate';
  return 'severe';
}

export function buildPersonalizationContextV1(
  input: PersonalizationContextInput,
  options: { now?: Date; surface?: PersonalizationSurface } = {},
): PersonalizationContextV1 {
  const now = options.now ?? new Date();
  const activeConstraints = input.constraints.filter((constraint) =>
    constraint.status === 'active'
    && timestamp(constraint.valid_from) <= now.getTime()
    && isUnexpired(constraint.expires_at, now));
  const latestReadiness = input.readinessCheckins
    .filter((checkin) => timestamp(checkin.checked_at) <= now.getTime() && isUnexpired(checkin.expires_at, now))
    .sort((a, b) => timestamp(b.checked_at) - timestamp(a.checked_at))[0];
  const confirmedMeasurements = input.bodyCompositionMeasurements
    .filter((measurement) => measurement.review_status === 'confirmed' && measurement.confirmed_at != null)
    .sort((a, b) => timestamp(b.measured_at) - timestamp(a.measured_at));
  const latestMeasurement = confirmedMeasurements[0];
  const allAllowedUses = latestMeasurement ? [...ALWAYS_ON_BODY_COMPOSITION_SURFACES] : [];
  const bodyCompositionAllowed = Boolean(latestMeasurement);
  const bodyCompositionTrend = buildBodyCompositionTrend(confirmedMeasurements);

  return {
    version: PERSONALIZATION_CONTEXT_VERSION,
    generatedAt: now.toISOString(),
    userDeclared: {
      goal: input.declared.goal,
      experienceLevel: input.declared.experienceLevel,
      schedule: {
        daysPerWeek: input.declared.preferredTrainingDays,
        preferredMinutes: input.declared.preferredSessionMinutes,
      },
      source: 'user',
      observedAt: input.declared.observedAt ?? null,
    },
    hardConstraints: {
      excludedExerciseSlugs: [...new Set(activeConstraints.flatMap((item) => item.excluded_exercise_slugs))],
      movementLimitations: activeConstraints.map((constraint) => ({
        id: constraint.id,
        region: constraint.region,
        side: constraint.side,
        severity: severityLabel(constraint.severity),
        triggers: constraint.triggers,
        validUntil: constraint.expires_at,
        source: constraint.source,
        observedAt: constraint.user_confirmed_at ?? constraint.updated_at,
      })),
    },
    preferences: {
      explicit: input.preferences.filter((item) => item.source === 'explicit').map((item) => ({
        key: item.target_key,
        targetType: item.target_type,
        value: item.preference,
        strength: item.strength,
        observedAt: item.last_confirmed_at ?? item.updated_at,
      })),
      inferred: input.preferences.filter((item) => item.source === 'inferred').map((item) => ({
        key: item.target_key,
        targetType: item.target_type,
        value: item.preference,
        strength: item.strength,
        confidence: item.confidence,
        observedAt: item.updated_at,
      })),
    },
    ...(latestReadiness ? {
      readiness: {
        checkinId: latestReadiness.id,
        energy: latestReadiness.energy as 1 | 2 | 3 | 4 | 5,
        sleepQuality: latestReadiness.sleep_quality as 1 | 2 | 3 | 4 | 5 | null,
        sleepHours: latestReadiness.sleep_hours,
        stress: latestReadiness.stress as 1 | 2 | 3 | 4 | 5 | null,
        discomfortRegions: latestReadiness.discomfort_regions,
        availableMinutes: latestReadiness.available_minutes,
        intent: latestReadiness.intent,
        observedAt: latestReadiness.checked_at,
        expiresAt: latestReadiness.expires_at,
      },
    } : {}),
    performance: {
      recentSessions: input.performance?.recentSessions ?? [],
      exerciseTrends: input.performance?.exerciseTrends ?? [],
      adherence: input.performance?.adherence ?? null,
    },
    ...(bodyCompositionAllowed ? {
      bodyComposition: {
        latestConfirmed: summarizeMeasurement(latestMeasurement),
        ...(bodyCompositionTrend ? {
          trend: bodyCompositionTrend,
        } : {}),
        comparability: latestMeasurement.comparability,
        allowedUses: allAllowedUses,
      },
    } : {}),
    consentedAllowedUses: allAllowedUses,
  };
}

export type MinimalAIPersonalizationContext = Omit<PersonalizationContextV1, 'consentedAllowedUses'>;

export function projectMinimalAIContext(
  context: PersonalizationContextV1,
  _surface: PersonalizationSurface,
): MinimalAIPersonalizationContext {
  const { consentedAllowedUses: _consentedAllowedUses, ...minimal } = context;
  return minimal;
}
