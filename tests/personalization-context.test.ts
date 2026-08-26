import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { Database } from '../src/types/database';
import {
  areMeasurementsComparable,
  buildPersonalizationContextV1,
  consentedBodyCompositionUses,
  projectMinimalAIContext,
  type BodyCompositionMeasurementRow,
  type DataConsentRow,
  type PersonalizationContextInput,
} from '../src/lib/ai/personalization-context';

const NOW = new Date('2026-08-22T10:00:00.000Z');

function measurement(overrides: Partial<BodyCompositionMeasurementRow> = {}): BodyCompositionMeasurementRow {
  return {
    id: 'measurement-1', user_id: 'user-1', source: 'inbody_sheet',
    measured_at: '2026-08-22T08:00:00.000Z', measured_timezone: 'Asia/Bangkok',
    device_brand: 'InBody', device_model: '270', location_label: null,
    weight_kg: 70, total_body_water_l: 40, protein_kg: 11, mineral_kg: 4,
    body_fat_mass_kg: 15, skeletal_muscle_mass_kg: 31, percent_body_fat: 21.4,
    bmi: 23, fat_free_mass_kg: 55, basal_metabolic_rate_kcal: 1600,
    waist_hip_ratio: 0.85, visceral_fat_level: 6, skeletal_muscle_index: 8,
    device_score: 80, device_target_values: {}, preparation_metadata: {}, scan_fingerprint: null,
    extraction_method: 'vision', extraction_provider: 'gemini', extraction_confidence: 0.97,
    review_status: 'confirmed', confirmed_at: '2026-08-22T09:00:00.000Z',
    comparability: 'high', allowed_uses: ['planner', 'coach', 'weekly_report'],
    created_at: '2026-08-22T09:00:00.000Z', updated_at: '2026-08-22T09:00:00.000Z',
    ...overrides,
  };
}

function consent(purpose: DataConsentRow['purpose'], overrides: Partial<DataConsentRow> = {}): DataConsentRow {
  return {
    id: `consent-${purpose}`, user_id: 'user-1', purpose, provider: null,
    data_categories: ['body_composition'], policy_version: '2026-08-22',
    granted_at: '2026-08-20T00:00:00.000Z', withdrawn_at: null,
    created_at: '2026-08-20T00:00:00.000Z', ...overrides,
  };
}

function input(overrides: Partial<PersonalizationContextInput> = {}): PersonalizationContextInput {
  return {
    declared: {
      goal: 'muscle_gain', experienceLevel: 'intermediate',
      preferredTrainingDays: 4, preferredSessionMinutes: 60,
      observedAt: '2026-08-01T00:00:00.000Z',
    },
    constraints: [], preferences: [], readinessCheckins: [], performance: {},
    bodyCompositionMeasurements: [], consents: [], ...overrides,
  };
}

test('expired constraints and readiness are excluded while current records remain', () => {
  type Constraint = Database['public']['Tables']['training_constraints']['Row'];
  type Readiness = Database['public']['Tables']['readiness_checkins']['Row'];
  const baseConstraint: Constraint = {
    id: 'constraint-current', user_id: 'user-1', region: 'shoulder', side: 'left', severity: 4,
    triggers: ['overhead press'], excluded_exercise_slugs: ['barbell-overhead-press'],
    status: 'active', source: 'user', valid_from: '2026-08-20T00:00:00.000Z',
    expires_at: '2026-08-23T00:00:00.000Z', user_confirmed_at: '2026-08-20T00:00:00.000Z',
    created_at: '2026-08-20T00:00:00.000Z', updated_at: '2026-08-20T00:00:00.000Z',
  };
  const baseReadiness: Readiness = {
    id: 'readiness-current', user_id: 'user-1', workout_id: null, energy: 4,
    sleep_quality: 4, sleep_hours: 7.5, stress: 2, discomfort_regions: [],
    available_minutes: 50, intent: null, checked_at: '2026-08-22T09:00:00.000Z',
    expires_at: '2026-08-22T16:00:00.000Z', created_at: '2026-08-22T09:00:00.000Z',
  };
  const context = buildPersonalizationContextV1(input({
    constraints: [baseConstraint, {
      ...baseConstraint, id: 'constraint-expired', region: 'knee',
      excluded_exercise_slugs: ['back-squat'], expires_at: '2026-08-21T00:00:00.000Z',
    }],
    readinessCheckins: [baseReadiness, {
      ...baseReadiness, id: 'readiness-expired', energy: 1,
      checked_at: '2026-08-21T08:00:00.000Z', expires_at: '2026-08-21T10:00:00.000Z',
    }],
  }), { now: NOW, surface: 'planner' });
  assert.deepEqual(context.hardConstraints.excludedExerciseSlugs, ['barbell-overhead-press']);
  assert.deepEqual(context.hardConstraints.movementLimitations.map((item) => item.region), ['shoulder']);
  assert.equal(context.readiness?.checkinId, 'readiness-current');
});

test('confirmed body composition is available to every AI surface without legacy consent', () => {
  const scan = measurement();
  const consents = [
    consent('body_composition_planner'),
    consent('body_composition_coach', { withdrawn_at: '2026-08-21T00:00:00.000Z' }),
  ];
  // Legacy audit helper remains readable, but no longer gates the AI context.
  assert.deepEqual(consentedBodyCompositionUses(scan, consents, NOW), ['planner']);
  assert.ok(buildPersonalizationContextV1(input({
    bodyCompositionMeasurements: [scan], consents,
  }), { now: NOW, surface: 'planner' }).bodyComposition);
  assert.ok(buildPersonalizationContextV1(input({
    bodyCompositionMeasurements: [scan], consents: [],
  }), { now: NOW, surface: 'coach' }).bodyComposition);
  const report = buildPersonalizationContextV1(input({
    bodyCompositionMeasurements: [scan], consents,
  }), { now: NOW, surface: 'weekly_report' });
  assert.ok(report.bodyComposition);
  assert.deepEqual(report.bodyComposition?.allowedUses, ['planner', 'coach', 'weekly_report']);
});

test('one confirmed measurement is a baseline without trend', () => {
  const context = buildPersonalizationContextV1(input({
    bodyCompositionMeasurements: [measurement()],
    consents: [consent('body_composition_planner')],
  }), { now: NOW, surface: 'planner' });
  assert.equal(context.bodyComposition?.latestConfirmed.measurementId, 'measurement-1');
  assert.equal(context.bodyComposition?.trend, undefined);
});

test('two comparable confirmed measurements produce deltas', () => {
  const previous = measurement({
    id: 'measurement-0', measured_at: '2026-07-22T08:00:00.000Z',
    weight_kg: 68.5, skeletal_muscle_mass_kg: 30.2, percent_body_fat: 20,
  });
  const current = measurement();
  assert.equal(areMeasurementsComparable(previous, current), true);
  const context = buildPersonalizationContextV1(input({
    bodyCompositionMeasurements: [previous, current],
    consents: [consent('body_composition_planner')],
  }), { now: NOW, surface: 'planner' });
  assert.deepEqual(context.bodyComposition?.trend?.delta, {
    weightKg: 1.5, skeletalMuscleMassKg: 0.8, percentBodyFat: 1.4,
  });
});

test('low-comparability or different-device scans never create a trend', () => {
  const previous = measurement({ id: 'measurement-0', measured_at: '2026-07-22T08:00:00.000Z' });
  assert.equal(areMeasurementsComparable(previous, measurement({ comparability: 'low' })), false);
  assert.equal(areMeasurementsComparable(previous, measurement({ device_model: '570' })), false);
});

test('minimal AI projection contains no raw image or direct identity fields', () => {
  const context = buildPersonalizationContextV1(input({
    bodyCompositionMeasurements: [measurement()],
    consents: [consent('body_composition_planner')],
  }), { now: NOW, surface: 'planner' });
  const projection = projectMinimalAIContext(context, 'planner');
  const serialized = JSON.stringify(projection).toLowerCase();
  for (const forbidden of ['raw_image', 'image_path', 'storage_path', 'email', 'phone', 'birthday']) {
    assert.equal(serialized.includes(forbidden), false, `projection leaked ${forbidden}`);
  }
  assert.equal('deviceScore' in (projection.bodyComposition?.latestConfirmed ?? {}), false);
});

test('migration enables initplan-optimized owner-only CRUD RLS and has no image persistence column', () => {
  const sql = readFileSync('supabase/migrations/20260822090000_personalization_foundation.sql', 'utf8');
  const tables = [
    'training_constraints', 'exercise_preferences', 'readiness_checkins',
    'body_composition_measurements', 'body_composition_segments',
    'data_consents', 'ai_decision_contexts',
  ];
  for (const table of tables) {
    assert.match(sql, new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`, 'i'));
    assert.match(sql, new RegExp(`ON ${table} FOR ALL\\s+USING \\(\\(select auth\\.uid\\(\\)\\) = user_id\\) WITH CHECK \\(\\(select auth\\.uid\\(\\)\\) = user_id\\)`, 'i'));
  }
  assert.doesNotMatch(sql, /USING \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /ON readiness_checkins\(workout_id, user_id\)/i);
  assert.match(sql, /ON body_composition_segments\(measurement_id, user_id\)/i);
  assert.doesNotMatch(sql, /raw_image|redacted_image|image_(?:url|path)|storage_path/i);
});

test('post-deploy optimization migration recreates all policies and adds both FK-covering indexes', () => {
  const sql = readFileSync('supabase/migrations/20260822110000_optimize_personalization_rls_and_fks.sql', 'utf8');
  const policyNames = [
    'training_constraints_owner_all', 'exercise_preferences_owner_all',
    'readiness_checkins_owner_all', 'body_composition_measurements_owner_all',
    'body_composition_segments_owner_all', 'data_consents_owner_all',
    'ai_decision_contexts_owner_all',
  ];
  for (const policyName of policyNames) {
    assert.match(sql, new RegExp(`DROP POLICY IF EXISTS "${policyName}"`, 'i'));
    assert.match(sql, new RegExp(`CREATE POLICY "${policyName}"`, 'i'));
  }
  assert.equal((sql.match(/USING \(\(select auth\.uid\(\)\) = user_id\)/gi) ?? []).length, 7);
  assert.equal((sql.match(/WITH CHECK \(\(select auth\.uid\(\)\) = user_id\)/gi) ?? []).length, 7);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_readiness_checkins_workout_owner\s+ON readiness_checkins\(workout_id, user_id\)/i);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_body_composition_segments_measurement_owner\s+ON body_composition_segments\(measurement_id, user_id\)/i);
});
