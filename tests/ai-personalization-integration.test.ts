import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bodyCompositionNarrative,
  conservativePlannerDuration,
  conservativelyCapProgression,
  filterPersonalizedExerciseCandidates,
  minimalPromptContext,
  personalizationFactors,
} from '../src/lib/ai/personalization-integration';
import { projectMinimalAIContext, type PersonalizationContextV1 } from '../src/lib/ai/personalization-context';
import type { Verdict } from '../src/lib/ai/rules';
import { deterministicFallback } from '../src/lib/ai/planner';

function context(overrides: Partial<PersonalizationContextV1> = {}): PersonalizationContextV1 {
  return {
    version: '1.0',
    generatedAt: '2026-08-22T10:00:00.000Z',
    userDeclared: {
      goal: 'muscle_gain', experienceLevel: 'intermediate',
      schedule: { daysPerWeek: 4, preferredMinutes: 60 },
      source: 'user', observedAt: '2026-08-22T09:00:00.000Z',
    },
    hardConstraints: {
      excludedExerciseSlugs: ['back-squat'],
      movementLimitations: [{
        id: 'constraint-secret-id', region: 'knee', side: 'left', severity: 'moderate',
        triggers: ['deep-flexion'], validUntil: null, source: 'user', observedAt: '2026-08-22T09:00:00.000Z',
      }],
    },
    preferences: {
      explicit: [{
        key: 'barbell-overhead-press', targetType: 'exercise', value: 'exclude',
        strength: 1, observedAt: '2026-08-22T09:00:00.000Z',
      }],
      inferred: [],
    },
    performance: { recentSessions: [], exerciseTrends: [], adherence: null },
    consentedAllowedUses: [],
    ...overrides,
  };
}

const progressVerdict: Verdict = {
  outcome: 'progress', weight_delta: 2.5, rep_shift: 0, rest_delta: 0,
  reason_vi: 'Đạt toàn bộ rep range.', confidence: 0.9,
};

test('hard and explicit exclusions win over a conflicting candidate request and fallback pool', () => {
  const filtered = filterPersonalizedExerciseCandidates([
    { slug: 'back-squat' },
    { slug: 'barbell-overhead-press' },
    { slug: 'goblet-squat' },
  ], projectMinimalAIContext(context(), 'planner'));
  assert.deepEqual(filtered.map((item) => item.slug), ['goblet-squat']);
  const refs = filtered.map((candidate, index) => ({
    ref: `M_${String(index + 1).padStart(3, '0')}`,
    phase: 'main' as const,
    candidate: { id: candidate.slug, ...candidate, workout_role: 'main_strength' },
  }));
  const fallback = deterministicFallback(
    { warmup: [], main: refs, cooldown: [] },
    { includeWarmup: false, includeCooldown: false },
    { warmup: 0, main: 60, cooldown: 0 },
  );
  assert.equal(fallback.length, 1);
  assert.equal(fallback[0].exercise_slug, 'M_001');
});

test('low readiness may cap objective progress but can never increase prescribed work', () => {
  const low = projectMinimalAIContext(context({
    readiness: {
      checkinId: 'readiness-id', energy: 2, sleepQuality: 2, sleepHours: 5,
      stress: 4, discomfortRegions: [], availableMinutes: 45, intent: null,
      observedAt: '2026-08-22T09:00:00.000Z', expiresAt: '2026-08-23T09:00:00.000Z',
    },
  }), 'planner');
  const capped = conservativelyCapProgression(progressVerdict, low);
  assert.equal(capped.outcome, 'maintain');
  assert.equal(capped.weight_delta, 0);
  assert.ok(capped.weight_delta <= progressVerdict.weight_delta);
  assert.equal(conservativePlannerDuration(60, low), 45);
  assert.ok(conservativePlannerDuration(60, low) <= 60);

  const deload: Verdict = { ...progressVerdict, outcome: 'deload', weight_delta: -2.5 };
  assert.deepEqual(conservativelyCapProgression(deload, low), deload);
});

test('InBody alone never changes a progression result', () => {
  const withoutBody = projectMinimalAIContext(context(), 'planner');
  const withBody = projectMinimalAIContext(context({
    bodyComposition: {
      latestConfirmed: {
        measurementId: 'measurement-secret-id', measuredAt: '2026-08-22T08:00:00.000Z',
        source: 'inbody_sheet', deviceBrand: 'InBody', deviceModel: '270',
        weightKg: 70, skeletalMuscleMassKg: 31, percentBodyFat: 21.4,
        bodyFatMassKg: 15, fatFreeMassKg: 55,
        segmental: [{ segment: 'trunk', tissueType: 'fat', massKg: 7.1, percentOfReference: 177, evaluation: 'above' }],
        targetValues: { muscleControlKg: 5.1, fatControlKg: -4.5 },
      },
      comparability: 'high', allowedUses: ['planner'],
    },
    consentedAllowedUses: ['planner'],
  }), 'planner');
  assert.deepEqual(
    conservativelyCapProgression(progressVerdict, withBody),
    conservativelyCapProgression(progressVerdict, withoutBody),
  );
});

test('confirmed body composition reaches every surface and prompt projection omits record identifiers', () => {
  const full = context({
    bodyComposition: {
      latestConfirmed: {
        measurementId: 'measurement-secret-id', measuredAt: '2026-08-22T08:00:00.000Z',
        source: 'inbody_sheet', deviceBrand: 'InBody', deviceModel: '270',
        weightKg: 70, skeletalMuscleMassKg: 31, percentBodyFat: 21.4,
        bodyFatMassKg: 15, fatFreeMassKg: 55,
        segmental: [{ segment: 'trunk', tissueType: 'fat', massKg: 7.1, percentOfReference: 177, evaluation: 'above' }],
        targetValues: { muscleControlKg: 5.1, fatControlKg: -4.5 },
      },
      comparability: 'high', allowedUses: ['planner', 'coach', 'weekly_report'],
    },
    consentedAllowedUses: ['planner', 'coach', 'weekly_report'],
  });
  const planner = minimalPromptContext(projectMinimalAIContext(full, 'planner'), 'planner');
  const coach = minimalPromptContext(projectMinimalAIContext(full, 'coach'), 'coach');
  const report = minimalPromptContext(projectMinimalAIContext(full, 'weekly_report'), 'weekly_report');
  assert.ok(planner?.bodyComposition);
  assert.ok(coach?.bodyComposition);
  assert.ok(report?.bodyComposition);
  assert.deepEqual(planner?.bodyComposition?.segmental, full.bodyComposition?.latestConfirmed.segmental);
  assert.deepEqual(coach?.bodyComposition?.targetValues, full.bodyComposition?.latestConfirmed.targetValues);
  assert.deepEqual(report?.bodyComposition?.segmental, full.bodyComposition?.latestConfirmed.segmental);
  const serialized = JSON.stringify(planner);
  assert.equal(serialized.includes('measurement-secret-id'), false);
  assert.equal(serialized.includes('constraint-secret-id'), false);
});

test('weekly body composition language distinguishes baseline from a comparable trend', () => {
  const baseline = projectMinimalAIContext(context({
    bodyComposition: {
      latestConfirmed: {
        measurementId: 'm1', measuredAt: '2026-08-22T08:00:00.000Z', source: 'inbody_sheet',
        deviceBrand: null, deviceModel: null, weightKg: 70, skeletalMuscleMassKg: 31,
        percentBodyFat: 21, bodyFatMassKg: null, fatFreeMassKg: null,
      }, comparability: 'high', allowedUses: ['weekly_report'],
    }, consentedAllowedUses: ['weekly_report'],
  }), 'weekly_report');
  assert.match(bodyCompositionNarrative(baseline) ?? '', /baseline/);

  const withTrend = {
    ...baseline,
    bodyComposition: {
      ...baseline.bodyComposition!,
      trend: {
        fromMeasurementId: 'm0', toMeasurementId: 'm1',
        fromMeasuredAt: '2026-07-22T08:00:00.000Z', toMeasuredAt: '2026-08-22T08:00:00.000Z',
        comparability: 'high' as const, delta: { weightKg: -0.5 },
      },
    },
  };
  assert.match(bodyCompositionNarrative(withTrend) ?? '', /Xu hướng/);
  assert.doesNotMatch(bodyCompositionNarrative(withTrend) ?? '', /baseline/);
});

test('no-data fallback exposes an empty, versioned factor list', () => {
  assert.deepEqual(personalizationFactors(undefined), { context_version: '1.0', factors_used: [] });
});
