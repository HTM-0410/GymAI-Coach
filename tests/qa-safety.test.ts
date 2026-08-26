import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isCandidateBanned,
  filterCandidateExercises,
  resolveWorkoutConstraints,
} from '../src/lib/ai/workout-constraints';
import { evaluatePreparticipationScreening } from '../src/lib/safety/screening-policy';
import { QA_HARD_CONSTRAINT_PROMPT, QA_PERSONA_NEW_USER } from './fixtures/qa-new-user';

test('RT-002A: exact QA prompt resolves 3 machine/cable upper body constraints and rejects banned exercises', () => {
  const constraints = resolveWorkoutConstraints(
    {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      userDeclared: {
        goal: QA_PERSONA_NEW_USER.goal,
        experienceLevel: QA_PERSONA_NEW_USER.experience_level,
        schedule: { daysPerWeek: 2, preferredMinutes: 30 },
        source: 'user',
        observedAt: null,
      },
      hardConstraints: {
        excludedExerciseSlugs: [],
        movementLimitations: [{
          id: 'knee-limitation-1',
          region: 'knee',
          side: 'both',
          severity: 'moderate',
          triggers: ['squat', 'lunge', 'kneeling'],
          validUntil: null,
          source: 'user',
          observedAt: new Date().toISOString(),
        }],
      },
      preferences: { explicit: [], inferred: [] },
      performance: { recentSessions: [], exerciseTrends: [], adherence: null },
    },
    QA_HARD_CONSTRAINT_PROMPT,
    30,
  );

  assert.equal(constraints.exerciseCount, 3);
  assert.ok(constraints.allowedEquipment.includes('machine'));
  assert.ok(constraints.allowedEquipment.includes('cable'));
  assert.ok(constraints.deniedMovementPatterns.includes('squat'));
  assert.ok(constraints.deniedMovementPatterns.includes('lunge'));
  assert.ok(constraints.deniedPositions.includes('kneeling'));
  assert.ok(constraints.deniedRegionsOrJoints.includes('lower_body'));

  // Test individual candidates against constraints
  const barbellSquat = {
    slug: 'barbell-squat',
    name: 'barbell squat',
    name_vi: 'Gánh tạ đòn',
    movement_pattern: 'squat',
    primary_muscle: 'Đùi trước',
    equipment_slugs: ['barbell'],
  };
  assert.equal(isCandidateBanned(barbellSquat, constraints).banned, true);

  const kneelingSquat = {
    slug: 'kneeling-squat',
    name: 'kneeling squat',
    name_vi: 'Gánh đùi quỳ gối với thanh đòn',
    movement_pattern: 'squat',
    primary_muscle: 'Đùi trước',
    equipment_slugs: ['barbell'],
  };
  assert.equal(isCandidateBanned(kneelingSquat, constraints).banned, true);

  const legExtensionMachine = {
    slug: 'leg-extension-machine',
    name: 'leg extension machine',
    name_vi: 'Duỗi đùi trước trên máy',
    movement_pattern: 'isolation_quads',
    primary_muscle: 'Đùi trước',
    equipment_slugs: ['machine'],
  };
  assert.equal(isCandidateBanned(legExtensionMachine, constraints).banned, true);

  const dumbbellBenchPress = {
    slug: 'dumbbell-bench-press',
    name: 'dumbbell bench press',
    name_vi: 'Đẩy ngực tạ đơn',
    movement_pattern: 'horizontal_push',
    primary_muscle: 'Ngực',
    equipment_slugs: ['dumbbell'],
  };
  assert.equal(isCandidateBanned(dumbbellBenchPress, constraints).banned, true);

  const cableChestPress = {
    slug: 'cable-chest-press',
    name: 'cable chest press',
    name_vi: 'Đẩy ngực trên máy cáp',
    movement_pattern: 'horizontal_push',
    primary_muscle: 'Ngực',
    equipment_slugs: ['cable'],
  };
  assert.equal(isCandidateBanned(cableChestPress, constraints).banned, false);

  const latPulldownMachine = {
    slug: 'lat-pulldown-machine',
    name: 'lat pulldown machine',
    name_vi: 'Kéo xô trên máy',
    movement_pattern: 'vertical_pull',
    primary_muscle: 'Lưng xô',
    equipment_slugs: ['machine'],
  };
  assert.equal(isCandidateBanned(latPulldownMachine, constraints).banned, false);

  const seatedCableRow = {
    slug: 'seated-cable-row',
    name: 'seated cable row',
    name_vi: 'Kéo cáp ngồi',
    movement_pattern: 'horizontal_pull',
    primary_muscle: 'Lưng giữa',
    equipment_slugs: ['cable'],
  };
  assert.equal(isCandidateBanned(seatedCableRow, constraints).banned, false);

  const candidatePool = [
    barbellSquat,
    kneelingSquat,
    legExtensionMachine,
    dumbbellBenchPress,
    cableChestPress,
    latPulldownMachine,
    seatedCableRow,
  ];

  const filtered = filterCandidateExercises(candidatePool, constraints);
  assert.equal(filtered.length, 3);
  assert.deepEqual(filtered.map((e) => e.slug), ['cable-chest-press', 'lat-pulldown-machine', 'seated-cable-row']);
});

test('RT-002B: candidate pool with insufficient valid exercises fails closed', () => {
  const constraints = resolveWorkoutConstraints(
    undefined,
    'Không bài chân; chỉ chọn máy cáp thân trên',
    30,
  );

  // Pool contains only lower body or free weight
  const candidatePool = [
    {
      slug: 'barbell-deadlift',
      name: 'barbell deadlift',
      movement_pattern: 'hinge',
      primary_muscle: 'Lưng dưới',
      equipment_slugs: ['barbell'],
    },
    {
      slug: 'dumbbell-lunge',
      name: 'dumbbell lunge',
      movement_pattern: 'lunge',
      primary_muscle: 'Đùi trước',
      equipment_slugs: ['dumbbell'],
    },
  ];

  const filtered = filterCandidateExercises(candidatePool, constraints);
  assert.equal(filtered.length, 0);
});

test('RT-003A-D: preparticipation screening decision table produces deterministic dispositions', () => {
  // Clear case
  const clearResult = evaluatePreparticipationScreening({
    hasChestPainOrDizziness: false,
    hasKnownHeartMetabolicRenalDisease: false,
    hasUnexplainedShortnessOfBreath: false,
  });
  assert.equal(clearResult.disposition, 'clear');
  assert.equal(clearResult.reasonCodes[0], 'NO_KNOWN_CONTRAINDICATIONS');

  // Modify case: knee concern without red flags
  const modifyResult = evaluatePreparticipationScreening({
    hasChestPainOrDizziness: false,
    hasKnownHeartMetabolicRenalDisease: false,
    injuryArea: 'knee',
    injurySeverity: 'moderate',
  });
  assert.equal(modifyResult.disposition, 'modify');
  assert.ok(modifyResult.reasonCodes.includes('KNEE_LOAD_LIMITATION'));
  assert.equal(modifyResult.recommendedConstraints.length, 1);
  assert.equal(modifyResult.recommendedConstraints[0].region, 'knee');

  // Medical Review case: chest pain / dizziness red flag
  const redFlagResult = evaluatePreparticipationScreening({
    hasChestPainOrDizziness: true,
  });
  assert.equal(redFlagResult.disposition, 'medical_review');
  assert.ok(redFlagResult.reasonCodes.includes('RED_FLAG_CARDIOVASCULAR_SYMPTOM'));

  // Medical Review case: known disease without medical clearance
  const diseaseResult = evaluatePreparticipationScreening({
    hasKnownHeartMetabolicRenalDisease: true,
    hasMedicalClearance: false,
  });
  assert.equal(diseaseResult.disposition, 'medical_review');
  assert.ok(diseaseResult.reasonCodes.includes('KNOWN_DISEASE_WITHOUT_CLEARANCE'));
});
