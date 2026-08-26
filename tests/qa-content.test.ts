import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { evaluateProgramCompatibility } from '../src/lib/programs/compatibility';
import { resolveEffectiveTrainingPlan } from '../src/lib/training/effective-plan';
import { QA_PERSONA_NEW_USER } from './fixtures/qa-new-user';

test('RT-004A/E: evaluateProgramCompatibility gates mismatched and unsafe program activation', () => {
  const pplProgram = {
    id: 'prog-ppl-6day',
    name: 'Push Pull Legs 6-Day',
    name_vi: 'Đẩy Kéo Chân 6 Ngày',
    days_count: 6,
    duration_weeks: 12,
  };

  // Beginner 2-day user attempting 6-day PPL
  const evalResult = evaluateProgramCompatibility(pplProgram, {
    experienceLevel: QA_PERSONA_NEW_USER.experience_level,
    preferredTrainingDays: QA_PERSONA_NEW_USER.preferred_training_days,
    preferredSessionMinutes: QA_PERSONA_NEW_USER.preferred_session_duration,
    injuryAreas: ['knee'],
    screeningDisposition: 'clear',
  });

  assert.equal(evalResult.status, 'requires_confirmation');
  assert.equal(evalResult.requiresExplicitReason, true);
  assert.ok(evalResult.reasonCodes.includes('SCHEDULE_EXCEEDS_PREFERRED_DAYS'));
  assert.ok(evalResult.reasonCodes.includes('SAFETY_HIGH_LOWER_BODY_VOLUME'));

  // Medical review user is blocked from activating programs
  const blockedResult = evaluateProgramCompatibility(pplProgram, {
    experienceLevel: 'intermediate',
    preferredTrainingDays: 6,
    preferredSessionMinutes: 60,
    screeningDisposition: 'medical_review',
  });

  assert.equal(blockedResult.status, 'blocked');
  assert.ok(blockedResult.reasonCodes.includes('BLOCKED_MEDICAL_REVIEW_REQUIRED'));

  // Beginner user with matching 2-day program is recommended
  const beginnerProgram = {
    id: 'prog-beginner-2day',
    name: 'Beginner Full Body 2-Day',
    name_vi: 'Khởi Động Toàn Thân 2 Buổi / Tuần',
    days_count: 2,
    duration_weeks: 4,
  };

  const recommendedResult = evaluateProgramCompatibility(beginnerProgram, {
    experienceLevel: 'beginner',
    preferredTrainingDays: 2,
    preferredSessionMinutes: 30,
    injuryAreas: [],
    screeningDisposition: 'clear',
  });

  assert.equal(recommendedResult.status, 'recommended');
  assert.equal(recommendedResult.requiresExplicitReason, false);
});

test('RT-006A/B/E: resolveEffectiveTrainingPlan snapshot maintains declared vs effective schedule and equipment', () => {
  const profile = {
    preferred_training_days: 2,
    preferred_session_duration: 30,
    updated_at: '2026-08-23T10:00:00.000Z',
  };

  // Without active program
  const noProgramSnapshot = resolveEffectiveTrainingPlan(profile, null);
  assert.equal(noProgramSnapshot.declared.daysPerWeek, 2);
  assert.equal(noProgramSnapshot.declared.minutesPerSession, 30);
  assert.equal(noProgramSnapshot.effective.daysPerWeek, 2);
  assert.equal(noProgramSnapshot.effective.minutesPerSession, 30);
  assert.equal(noProgramSnapshot.source, 'profile');
  assert.deepEqual(noProgramSnapshot.equipment, { kind: 'profile' });

  // With active 3-day program
  const activeProgram = {
    training_programs: {
      training_program_days: [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }],
    },
  };
  const activeProgramSnapshot = resolveEffectiveTrainingPlan(profile, activeProgram);
  assert.equal(activeProgramSnapshot.declared.daysPerWeek, 2);
  assert.equal(activeProgramSnapshot.effective.daysPerWeek, 3);
  assert.equal(activeProgramSnapshot.source, 'active_program');
});

test('RT-007B: Front Squat golden record satisfies content and safety taxonomy specifications', async () => {
  const frontSquatPath = path.join(process.cwd(), 'data', 'exercises', 'barbell-front-squat.json');
  const frontSquat = JSON.parse(await fs.readFile(frontSquatPath, 'utf8'));

  assert.equal(frontSquat.slug, 'barbell-front-squat');
  assert.equal(frontSquat.primary_muscle, 'Đùi trước');
  assert.equal(frontSquat.movement_pattern, 'squat');

  // Verify setup, safety cues and stop rule
  assert.ok(Array.isArray(frontSquat.instructions) && frontSquat.instructions.length >= 4);
  assert.ok(frontSquat.tips.some((tip: string) => tip.toLowerCase().includes('safety pin') || tip.toLowerCase().includes('thanh an toan')));
  assert.ok(frontSquat.tips.some((tip: string) => tip.toLowerCase().includes('dừng') || tip.toLowerCase().includes('dau goi')));

  // Verify knee-safe alternatives exist
  assert.ok(Array.isArray(frontSquat.alternatives) && frontSquat.alternatives.length > 0);
  assert.ok(frontSquat.alternatives.includes('dumbbell-goblet-squat') || frontSquat.alternatives.includes('leg-press-machine'));
});
