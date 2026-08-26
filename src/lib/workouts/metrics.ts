export const TRACKING_MODES = ['weight_reps', 'reps', 'duration', 'duration_distance'] as const;
export type TrackingMode = (typeof TRACKING_MODES)[number];
export type LegacyPrescriptionMode = 'reps' | 'time' | 'hold';
export type CompatibleTrackingMode = TrackingMode | LegacyPrescriptionMode;
export type DurationStyle = 'active' | 'hold';
export type LoadBasis = 'external_total' | 'per_implement' | 'assistance' | 'none';
export type UnitSystem = 'metric' | 'imperial';

export type TrackingEvidence = {
  targetWeight?: number | null;
  actualWeight?: number | null;
  targetRir?: number | null;
  defaultTrackingMode?: TrackingMode | null;
  allowedTrackingModes?: readonly TrackingMode[] | null;
};

export function isTrackingMode(value: unknown): value is TrackingMode {
  return typeof value === 'string' && (TRACKING_MODES as readonly string[]).includes(value);
}

export function normalizeTrackingMode(
  value: CompatibleTrackingMode | string | null | undefined,
  evidence: TrackingEvidence = {},
): TrackingMode {
  if (value === 'time' || value === 'hold') return 'duration';
  if (value === 'reps') {
    const reviewedDefault = evidence.defaultTrackingMode;
    const allowed = evidence.allowedTrackingModes ?? [];
    const hasLoadEvidence = Number(evidence.targetWeight ?? 0) > 0
      || Number(evidence.actualWeight ?? 0) > 0
      || evidence.targetRir != null;
    if (reviewedDefault === 'weight_reps' && allowed.includes('weight_reps')) return 'weight_reps';
    return hasLoadEvidence ? 'weight_reps' : 'reps';
  }
  if (isTrackingMode(value)) return value;
  return evidence.defaultTrackingMode ?? 'reps';
}

export function isSingleSetTimedMode(mode: TrackingMode, targetSets: number): boolean {
  return targetSets === 1 && (mode === 'duration' || mode === 'duration_distance');
}

export function normalizeDurationStyle(
  mode: string | null | undefined,
  style?: string | null,
): DurationStyle {
  if (style === 'hold') return 'hold';
  return mode === 'hold' ? 'hold' : 'active';
}

export type MetricValues = {
  weight?: number | null;
  reps?: number | null;
  durationSeconds?: number | null;
  distanceMeters?: number | null;
};

export function validateMetricValues(
  mode: TrackingMode,
  values: MetricValues,
  options: { allowMissingWeight?: boolean } = {},
): string[] {
  const errors: string[] = [];
  const weight = values.weight == null ? null : Number(values.weight);
  const reps = values.reps == null ? null : Number(values.reps);
  const duration = values.durationSeconds == null ? null : Number(values.durationSeconds);
  const distance = values.distanceMeters == null ? null : Number(values.distanceMeters);
  if (mode === 'weight_reps') {
    if (!options.allowMissingWeight && !(weight != null && weight > 0)) errors.push('weight_reps requires positive kg');
    if (weight != null && weight <= 0) errors.push('weight_reps weight must be positive when provided');
    if (!(reps != null && Number.isInteger(reps) && reps > 0)) errors.push('weight_reps requires positive integer reps');
    if (duration != null || distance != null) errors.push('weight_reps cannot include duration or distance');
  } else if (mode === 'reps') {
    if (!(reps != null && Number.isInteger(reps) && reps > 0)) errors.push('reps requires positive integer reps');
    if (weight != null || duration != null || distance != null) errors.push('reps cannot include weight, duration or distance');
  } else if (mode === 'duration') {
    if (!(duration != null && Number.isInteger(duration) && duration > 0)) errors.push('duration requires positive integer seconds');
    if (weight != null || reps != null || distance != null) errors.push('duration cannot include weight, reps or distance');
  } else {
    if (!(duration != null && Number.isInteger(duration) && duration > 0) && !(distance != null && distance > 0)) {
      errors.push('duration_distance requires duration or distance');
    }
    if (weight != null || reps != null) errors.push('duration_distance cannot include weight or reps');
  }
  return errors;
}

export type MetricSet = MetricValues & { completed?: boolean; setType?: string | null };
export type MetricTotals = { completedSets: number; volumeKg: number; reps: number; durationSeconds: number; distanceMeters: number };

export function aggregateMetricSets(mode: TrackingMode, sets: readonly MetricSet[]) {
  return sets.filter((set) => set.completed !== false && set.setType !== 'warmup').reduce<MetricTotals>(
    (total, set) => {
      const weight = Number(set.weight) || 0;
      const reps = Number(set.reps) || 0;
      if (mode === 'weight_reps') total.volumeKg += weight * reps;
      if (mode === 'weight_reps' || mode === 'reps') total.reps += reps;
      if (mode === 'duration' || mode === 'duration_distance') total.durationSeconds += Number(set.durationSeconds) || 0;
      if (mode === 'duration_distance') total.distanceMeters += Number(set.distanceMeters) || 0;
      total.completedSets += 1;
      return total;
    },
    { completedSets: 0, volumeKg: 0, reps: 0, durationSeconds: 0, distanceMeters: 0 },
  );
}

export const kgToLb = (kg: number) => kg * 2.2046226218;
export const lbToKg = (lb: number) => lb / 2.2046226218;
export const metersToMiles = (meters: number) => meters / 1609.344;
export const milesToMeters = (miles: number) => miles * 1609.344;

export const loadUnitLabel = (unitSystem: UnitSystem) => unitSystem === 'imperial' ? 'lb' : 'kg';
export const distanceUnitLabel = (unitSystem: UnitSystem) => unitSystem === 'imperial' ? 'mi' : 'm';
export const loadFromCanonical = (kg: number, unitSystem: UnitSystem) => unitSystem === 'imperial' ? kgToLb(kg) : kg;
export const loadToCanonical = (value: number, unitSystem: UnitSystem) => unitSystem === 'imperial' ? lbToKg(value) : value;
export const distanceFromCanonical = (meters: number, unitSystem: UnitSystem) => unitSystem === 'imperial' ? metersToMiles(meters) : meters;
export const distanceToCanonical = (value: number, unitSystem: UnitSystem) => unitSystem === 'imperial' ? milesToMeters(value) : value;

export function roundCanonical(value: number, decimals = 6) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatLoad(kg: number, unitSystem: UnitSystem = 'metric') {
  return unitSystem === 'imperial' ? `${kgToLb(kg).toFixed(1)} lb` : `${kg.toFixed(1)} kg`;
}

export function formatDistance(meters: number, unitSystem: UnitSystem = 'metric') {
  if (unitSystem === 'imperial') return `${metersToMiles(meters).toFixed(2)} mi`;
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
}

export function formatDurationDistanceActual(
  durationSeconds: number | null | undefined,
  distanceMeters: number | null | undefined,
  unitSystem: UnitSystem = 'metric',
) {
  return [
    Number(durationSeconds) > 0 ? formatMetricDuration(Number(durationSeconds)) : null,
    Number(distanceMeters) > 0 ? formatDistance(Number(distanceMeters), unitSystem) : null,
  ].filter(Boolean).join(' · ');
}

export function formatMetricDuration(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return minutes > 0 ? `${minutes}:${String(remainder).padStart(2, '0')}` : `${remainder} giây`;
}

export function derivePaceSecondsPerKm(durationSeconds: number, distanceMeters: number) {
  return durationSeconds > 0 && distanceMeters > 0 ? durationSeconds / (distanceMeters / 1000) : null;
}

export function buildCompletedMetricSet(
  mode: TrackingMode,
  values: MetricValues,
  timestamps: { startedAt: string; completedAt: string },
) {
  const errors = validateMetricValues(mode, values);
  if (mode === 'duration_distance' && !(Number(values.durationSeconds) > 0 && Number(values.distanceMeters) > 0)) {
    errors.push('completed duration_distance requires positive duration and distance');
  }
  if (errors.length > 0) throw new Error(errors.join('; '));
  return {
    weight: mode === 'weight_reps' ? Number(values.weight) : null,
    reps: mode === 'weight_reps' || mode === 'reps' ? Number(values.reps) : null,
    rir: null,
    duration_seconds: mode === 'duration' || mode === 'duration_distance' ? Number(values.durationSeconds) || null : null,
    distance_meters: mode === 'duration_distance' ? Number(values.distanceMeters) || null : null,
    started_at: timestamps.startedAt,
    completed_at: timestamps.completedAt,
    completed: true,
  };
}
