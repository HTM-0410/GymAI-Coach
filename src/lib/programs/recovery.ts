export type RecoveryExerciseInput = {
  target_sets: number;
  target_rep_max: number;
  target_rir: number | null;
  rest_seconds: number | null;
  exercise?: {
    exercise_type?: string | null;
  } | null;
};

export type RecoveryMuscleInput = {
  role: string;
  target_sets: number;
};

export type RecoveryEstimate = {
  minHours: number;
  maxHours: number;
  load: 'light' | 'moderate' | 'high' | 'very_high';
  label: string;
  rationale: string;
};

/**
 * Estimate the recovery window from the prescribed session dose.
 *
 * This is deliberately a range, not a medical promise. Resistance-training
 * recovery varies with volume, proximity to failure, loading, training age,
 * sleep, nutrition and stress. The thresholds are conservative programming
 * heuristics based on the 2026 ACSM position stand and recovery time-course
 * research; readiness still takes precedence over the clock.
 */
export function estimateSessionRecovery(
  muscles: RecoveryMuscleInput[],
  exercises: RecoveryExerciseInput[],
): RecoveryEstimate {
  const totalSets = exercises.reduce((sum, item) => sum + Math.max(0, item.target_sets || 0), 0);
  const maxPrimarySets = muscles
    .filter((item) => item.role === 'primary')
    .reduce((max, item) => Math.max(max, item.target_sets || 0), 0);

  const hardSets = exercises.reduce(
    (sum, item) => sum + (item.target_rir !== null && item.target_rir <= 1 ? item.target_sets : 0),
    0,
  );
  const failureSets = exercises.reduce(
    (sum, item) => sum + (item.target_rir === 0 ? item.target_sets : 0),
    0,
  );
  const heavyCompoundSets = exercises.reduce((sum, item) => {
    const isCompound = item.exercise?.exercise_type === 'compound';
    const isHeavy = item.target_rep_max > 0 && item.target_rep_max <= 6;
    return sum + (isCompound && isHeavy ? item.target_sets : 0);
  }, 0);

  let minHours = 24;
  let maxHours = 36;
  let load: RecoveryEstimate['load'] = 'light';

  if (totalSets > 12 || maxPrimarySets >= 5 || hardSets >= 6) {
    minHours = 36;
    maxHours = 48;
    load = 'moderate';
  }
  if (totalSets > 18 || maxPrimarySets >= 7 || hardSets >= 10 || heavyCompoundSets >= 8) {
    minHours = 48;
    maxHours = 72;
    load = 'high';
  }
  if (totalSets > 26 || maxPrimarySets >= 10 || failureSets >= 4) {
    minHours = 72;
    maxHours = 96;
    load = 'very_high';
  } else if (failureSets > 0) {
    minHours = Math.min(72, minHours + 12);
    maxHours = Math.min(96, maxHours + 12);
  }

  const labels: Record<RecoveryEstimate['load'], string> = {
    light: 'Nhẹ',
    moderate: 'Vừa',
    high: 'Cao',
    very_high: 'Rất cao',
  };

  const factors = [
    `${totalSets} hiệp`,
    maxPrimarySets > 0 ? `tối đa ${maxPrimarySets} hiệp/nhóm cơ chính` : null,
    hardSets > 0 ? `${hardSets} hiệp RIR 0-1` : null,
    heavyCompoundSets > 0 ? `${heavyCompoundSets} hiệp compound nặng` : null,
  ].filter(Boolean);

  return {
    minHours,
    maxHours,
    load,
    label: labels[load],
    rationale: factors.join(' · '),
  };
}
