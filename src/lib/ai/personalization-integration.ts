import type {
  MinimalAIPersonalizationContext,
  PersonalizationContextV1,
  PersonalizationSurface,
} from './personalization-context';
import type { Verdict } from './rules';

export type PersonalizationFactors = {
  context_version: PersonalizationContextV1['version'];
  factors_used: string[];
};

type ExerciseCandidate = { slug?: string | null };

function unique(values: string[]) {
  return [...new Set(values)];
}

export function excludedExerciseSlugs(context?: MinimalAIPersonalizationContext): string[] {
  if (!context) return [];
  return unique([
    ...context.hardConstraints.excludedExerciseSlugs,
    ...context.preferences.explicit
      .filter((item) => item.targetType === 'exercise' && item.value === 'exclude')
      .map((item) => item.key),
  ]);
}

export function filterPersonalizedExerciseCandidates<T extends ExerciseCandidate>(
  candidates: T[],
  context?: MinimalAIPersonalizationContext,
): T[] {
  const excluded = new Set(excludedExerciseSlugs(context));
  return candidates.filter((candidate) => !candidate.slug || !excluded.has(candidate.slug));
}

export function personalizationFactors(
  context: MinimalAIPersonalizationContext | undefined,
  options: { includeBodyComposition?: boolean; includePerformance?: boolean } = {},
): PersonalizationFactors {
  if (!context) return { context_version: '1.0', factors_used: [] };
  const factors: string[] = [];
  if (context.userDeclared.goal) factors.push('declared.goal');
  if (context.userDeclared.experienceLevel) factors.push('declared.experience_level');
  if (context.userDeclared.schedule.daysPerWeek || context.userDeclared.schedule.preferredMinutes) {
    factors.push('declared.schedule');
  }
  if (context.hardConstraints.excludedExerciseSlugs.length) factors.push('constraints.exercise_exclusions');
  if (context.hardConstraints.movementLimitations.length) factors.push('constraints.movement_limitations');
  if (context.preferences.explicit.length) factors.push('preferences.explicit');
  if (context.preferences.inferred.length) factors.push('preferences.inferred');
  if (context.readiness) factors.push('readiness.current');
  if (options.includePerformance && (
    context.performance.recentSessions.length
    || context.performance.exerciseTrends.length
    || context.performance.adherence
  )) factors.push('performance.verified_logs');
  if (options.includeBodyComposition && context.bodyComposition) {
    factors.push(context.bodyComposition.trend
      ? 'body_composition.comparable_trend'
      : 'body_composition.confirmed_baseline');
  }
  return { context_version: context.version, factors_used: factors };
}

export function minimalPromptContext(
  context: MinimalAIPersonalizationContext | undefined,
  _surface: PersonalizationSurface,
) {
  if (!context) return null;
  const body = context.bodyComposition
    ? {
        status: context.bodyComposition.trend ? 'comparable_trend' : 'confirmed_baseline',
        measuredAt: context.bodyComposition.latestConfirmed.measuredAt,
        weightKg: context.bodyComposition.latestConfirmed.weightKg,
        skeletalMuscleMassKg: context.bodyComposition.latestConfirmed.skeletalMuscleMassKg,
        percentBodyFat: context.bodyComposition.latestConfirmed.percentBodyFat,
        bodyFatMassKg: context.bodyComposition.latestConfirmed.bodyFatMassKg,
        fatFreeMassKg: context.bodyComposition.latestConfirmed.fatFreeMassKg,
        segmental: context.bodyComposition.latestConfirmed.segmental,
        targetValues: context.bodyComposition.latestConfirmed.targetValues,
        trendDelta: context.bodyComposition.trend?.delta,
        comparability: context.bodyComposition.comparability,
      }
    : undefined;
  return {
    version: context.version,
    declared: context.userDeclared,
    constraints: {
      excludedExerciseSlugs: excludedExerciseSlugs(context),
      movementLimitations: context.hardConstraints.movementLimitations.map((item) => ({
        region: item.region,
        side: item.side,
        severity: item.severity,
        triggers: item.triggers,
        validUntil: item.validUntil,
        source: item.source,
        observedAt: item.observedAt,
      })),
    },
    preferences: context.preferences,
    readiness: context.readiness ? {
      energy: context.readiness.energy,
      sleepQuality: context.readiness.sleepQuality,
      sleepHours: context.readiness.sleepHours,
      stress: context.readiness.stress,
      discomfortRegions: context.readiness.discomfortRegions,
      availableMinutes: context.readiness.availableMinutes,
      intent: context.readiness.intent,
      observedAt: context.readiness.observedAt,
    } : undefined,
    bodyComposition: body,
  };
}

export function isLowReadiness(context?: MinimalAIPersonalizationContext): boolean {
  const readiness = context?.readiness;
  return Boolean(readiness && (
    readiness.energy <= 2
    || (readiness.sleepQuality != null && readiness.sleepQuality <= 2)
    || (readiness.stress != null && readiness.stress >= 4)
  ));
}

export function conservativePlannerDuration(
  requestedMinutes: number,
  context?: MinimalAIPersonalizationContext,
): number {
  if (!isLowReadiness(context)) return requestedMinutes;
  const readinessLimit = context?.readiness?.availableMinutes ?? requestedMinutes;
  return Math.max(15, Math.min(requestedMinutes, readinessLimit, Math.floor(requestedMinutes * 0.8)));
}

export function conservativelyCapProgression(
  verdict: Verdict,
  context?: MinimalAIPersonalizationContext,
): Verdict {
  if (verdict.outcome !== 'progress' || !isLowReadiness(context)) return verdict;
  return {
    ...verdict,
    outcome: 'maintain',
    weight_delta: Math.min(0, verdict.weight_delta),
    rep_shift: Math.min(0, verdict.rep_shift),
    reason_vi: `${verdict.reason_vi} Readiness hiện tại thấp nên tạm giữ mức tập; đánh giá lại ở buổi sau.`,
    confidence: Math.min(verdict.confidence, 0.8),
  };
}

export function bodyCompositionNarrative(context?: MinimalAIPersonalizationContext): string | null {
  const body = context?.bodyComposition;
  if (!body) return null;
  if (!body.trend) {
    return `Mốc thành phần cơ thể đã xác nhận ngày ${body.latestConfirmed.measuredAt.slice(0, 10)} là baseline, chưa đủ dữ liệu để kết luận xu hướng.`;
  }
  const parts = Object.entries(body.trend.delta).map(([key, value]) => `${key} ${Number(value) >= 0 ? '+' : ''}${value}`);
  return `Xu hướng thành phần cơ thể giữa hai lần đo có thể so sánh: ${parts.join(', ') || 'chưa có chỉ số chung'}; đây là mô tả xu hướng, không phải chẩn đoán.`;
}
