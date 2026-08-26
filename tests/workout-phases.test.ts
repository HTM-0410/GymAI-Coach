import assert from 'node:assert/strict';
import test from 'node:test';
import {
  WorkoutDraftRequestSchema,
  WorkoutGenerateRequestSchema,
  allocatePhaseBudgets,
  type WorkoutPhase,
} from '../src/lib/ai/workout-contract';
import {
  isMainRepsExercise,
  resolveRequestedExerciseIndex,
  sortWorkoutExercises,
} from '../src/lib/training/workout-phases';
import {
  deterministicFallback,
  parseRequestedExercises,
  promptMatchedMainExercises,
  preserveNonTargetPhases,
  validatePlan,
  type ReferencedCandidate,
} from '../src/lib/ai/planner';
import { PlannedExerciseSchema } from '../src/lib/ai/schema';
import {
  filterExplicitlyAvoided,
  effectiveGymEquipment,
  isEquipmentCompatible,
  isExerciseRoleAllowed,
} from '../src/lib/ai/workout-constraints';
import {
  advanceTimer,
  pauseTimer,
  resetTimer,
  restoreTimer,
} from '../src/lib/training/timed-exercise';
import {
  TARGETED_EXERCISE_SELECT,
  rankAccessoryCandidates,
} from '../src/lib/ai/context';

const PROGRAM_DAY_ID = '11111111-1111-4111-8111-111111111111';
const IDS = {
  warmup: '22222222-2222-4222-8222-222222222222',
  main: '33333333-3333-4333-8333-333333333333',
  cooldown: '44444444-4444-4444-8444-444444444444',
};

function exercise(phase: WorkoutPhase) {
  const common = {
    exerciseId: IDS[phase],
    exerciseSlug: `${phase}-exercise`,
    name: phase,
    nameVi: null,
    difficulty: 'beginner',
    exerciseType: 'isolation',
    animationUrl: null,
    thumbnailUrl: null,
    phase,
    targetSets: phase === 'main' ? 2 : 1,
    targetWeight: null,
    restSeconds: phase === 'main' ? 60 : 0,
    aiReason: '',
  };
  if (phase === 'main') {
    return {
      ...common,
      prescriptionMode: 'reps' as const,
      targetRepMin: 8,
      targetRepMax: 12,
      targetRir: 2,
      durationSeconds: null,
      holdSeconds: null,
      perSide: false,
    };
  }
  if (phase === 'warmup') {
    return {
      ...common,
      prescriptionMode: 'time' as const,
      targetRepMin: null,
      targetRepMax: null,
      targetRir: null,
      durationSeconds: 60,
      holdSeconds: null,
      perSide: false,
    };
  }
  return {
    ...common,
    prescriptionMode: 'hold' as const,
    targetRepMin: null,
    targetRepMax: null,
    targetRir: null,
    durationSeconds: null,
    holdSeconds: 30,
    perSide: true,
  };
}

test('phase budget matrix covers boundary durations and all toggle combinations', () => {
  for (const duration of [15, 30, 60, 120, 240]) {
    for (const includeWarmup of [false, true]) {
      for (const includeCooldown of [false, true]) {
        const budgets = allocatePhaseBudgets(duration, { includeWarmup, includeCooldown });
        assert.equal(budgets.warmup + budgets.main + budgets.cooldown, duration);
        assert.ok(budgets.main >= 8);
        assert.equal(budgets.warmup > 0, includeWarmup);
        assert.equal(budgets.cooldown > 0, includeCooldown);
      }
    }
  }
});

test('legacy generate payload defaults both optional phases to false', () => {
  const parsed = WorkoutGenerateRequestSchema.parse({
    programDayId: PROGRAM_DAY_ID,
    gymId: null,
    durationMinutes: 60,
  });
  assert.deepEqual(parsed.options, { includeWarmup: false, includeCooldown: false });
});

test('legacy draft exercise defaults to main/reps and remains confirm-valid', () => {
  const parsed = WorkoutDraftRequestSchema.parse({
    programDayId: PROGRAM_DAY_ID,
    gymId: null,
    durationMinutes: 60,
    exercises: [{
      ...exercise('main'),
      phase: undefined,
      prescriptionMode: undefined,
    }],
  });
  assert.equal(parsed.exercises[0].phase, 'main');
  assert.equal(parsed.exercises[0].prescriptionMode, 'reps');
  assert.deepEqual(parsed.phaseBudgets, { warmup: 0, main: 60, cooldown: 0 });
});

test('draft contract accepts all four toggle combinations', () => {
  for (const includeWarmup of [false, true]) {
    for (const includeCooldown of [false, true]) {
      const options = { includeWarmup, includeCooldown };
      const phaseBudgets = allocatePhaseBudgets(60, options);
      const exercises = [
        ...(includeWarmup ? [exercise('warmup')] : []),
        exercise('main'),
        ...(includeCooldown ? [exercise('cooldown')] : []),
      ];
      const parsed = WorkoutDraftRequestSchema.safeParse({
        programDayId: PROGRAM_DAY_ID,
        gymId: null,
        durationMinutes: 60,
        options,
        phaseBudgets,
        exercises,
      });
      assert.equal(parsed.success, true);
    }
  }
});

test('invalid prescription shape and phase order are rejected', () => {
  const invalidTime = {
    ...exercise('warmup'),
    targetRepMin: 8,
    targetRepMax: 12,
  };
  assert.equal(WorkoutDraftRequestSchema.safeParse({
    programDayId: PROGRAM_DAY_ID,
    gymId: null,
    durationMinutes: 60,
    options: { includeWarmup: true, includeCooldown: false },
    exercises: [invalidTime, exercise('main')],
  }).success, false);

  assert.equal(WorkoutDraftRequestSchema.safeParse({
    programDayId: PROGRAM_DAY_ID,
    gymId: null,
    durationMinutes: 60,
    options: { includeWarmup: true, includeCooldown: false },
    exercises: [exercise('main'), exercise('warmup')],
  }).success, false);

  assert.equal(WorkoutDraftRequestSchema.safeParse({
    programDayId: PROGRAM_DAY_ID,
    gymId: null,
    durationMinutes: 60,
    exercises: [{ ...exercise('main'), phase: 'recovery' }],
  }).success, false);

  assert.equal(WorkoutDraftRequestSchema.safeParse({
    programDayId: PROGRAM_DAY_ID,
    gymId: null,
    durationMinutes: 60,
    exercises: [exercise('main'), exercise('main')],
  }).success, false);
});

test('analytics classification includes legacy/main reps and excludes accessory phases', () => {
  assert.equal(isMainRepsExercise({}), true);
  assert.equal(isMainRepsExercise({ phase: 'main', prescription_mode: 'reps' }), true);
  assert.equal(isMainRepsExercise({ phase: 'warmup', prescription_mode: 'time' }), false);
  assert.equal(isMainRepsExercise({ phase: 'cooldown', prescription_mode: 'hold' }), false);
});

test('deterministic fallback is valid for every duration/toggle matrix case', () => {
  const candidates = (phase: WorkoutPhase, prefix: string, role: string): ReferencedCandidate[] =>
    Array.from({ length: 10 }, (_, index) => ({
      ref: `${prefix}_${String(index + 1).padStart(3, '0')}`,
      phase,
      candidate: { id: `${phase}-${index}`, slug: `${phase}-${index}`, workout_role: role },
    }));
  const byPhase = {
    warmup: candidates('warmup', 'W', 'dynamic_mobility'),
    main: candidates('main', 'M', 'main_strength'),
    cooldown: candidates('cooldown', 'C', 'static_stretch'),
  };
  const refs = new Map(
    [...byPhase.warmup, ...byPhase.main, ...byPhase.cooldown].map((item) => [item.ref, item]),
  );

  for (const duration of [15, 30, 60, 120, 240]) {
    for (const includeWarmup of [false, true]) {
      for (const includeCooldown of [false, true]) {
        const options = { includeWarmup, includeCooldown };
        const budgets = allocatePhaseBudgets(duration, options);
        const fallback = deterministicFallback(byPhase, options, budgets);
        assert.doesNotThrow(() => validatePlan(fallback, refs, options, budgets));
      }
    }
  }
});

test('tracking mode is independent from phase when the metric shape is valid', () => {
  for (const [phase, prescriptionMode] of [
    ['warmup', 'reps'], ['main', 'time'], ['main', 'hold'], ['cooldown', 'reps'],
  ] as const) {
    const snake = {
      exercise_slug: 'X_001', phase, prescription_mode: prescriptionMode,
      target_sets: prescriptionMode === 'reps' ? 2 : 1,
      target_rep_min: prescriptionMode === 'reps' ? 8 : null,
      target_rep_max: prescriptionMode === 'reps' ? 12 : null,
      target_weight: null, target_rir: null, rest_seconds: prescriptionMode === 'reps' ? 60 : 0,
      duration_seconds: prescriptionMode === 'time' ? 60 : null,
      hold_seconds: prescriptionMode === 'hold' ? 30 : null, per_side: false, ai_reason: '',
    };
    assert.equal(PlannedExerciseSchema.safeParse(snake).success, true);
  }
});

test('server taxonomy policy rejects tampered roles and permits owned custom main only', () => {
  const userId = 'user-1';
  assert.equal(isExerciseRoleAllowed('warmup', 'time', { workout_role: 'dynamic_mobility', workout_role_review_status: 'reviewed' }, userId), true);
  assert.equal(isExerciseRoleAllowed('warmup', 'time', { workout_role: 'dynamic_mobility', workout_role_review_status: 'needs_review' }, userId), false);
  assert.equal(isExerciseRoleAllowed('cooldown', 'hold', { workout_role: 'main_strength', workout_role_review_status: 'reviewed' }, userId), false);
  assert.equal(isExerciseRoleAllowed('main', 'reps', { workout_role: 'main_strength' }, userId), true);
  assert.equal(isExerciseRoleAllowed('main', 'reps', { owner_user_id: userId, workout_role: null }, userId), true);
  assert.equal(isExerciseRoleAllowed('warmup', 'time', { owner_user_id: userId, workout_role: null }, userId), false);
});

test('bodyweight and no-equipment candidates remain gym compatible', () => {
  assert.equal(isEquipmentCompatible(['bodyweight'], ['barbell'], false), true);
  assert.equal(isEquipmentCompatible([], ['barbell'], false), true);
  assert.equal(isEquipmentCompatible(['bodyweight', 'bench'], ['bench'], false), true);
  assert.equal(isEquipmentCompatible(['cable'], ['barbell'], false), false);
});

test('equipment policy distinguishes unrestricted from a selected empty gym and shares dumbbell inference', () => {
  assert.equal(isEquipmentCompatible(['cable'], [], true), true, 'gymId=null is unrestricted');
  assert.equal(isEquipmentCompatible(['cable'], [], false), false, 'selected empty gym must fail closed');
  const effective = effectiveGymEquipment([], true);
  assert.deepEqual(effective, ['dumbbell']);
  assert.equal(isEquipmentCompatible(['dumbbell'], effective, false), true);
  assert.equal(isEquipmentCompatible(['barbell'], effective, false), false);
});

test('paused timer does not consume wall time across reload and reset restores target', () => {
  const started = { targetSeconds: 90, remainingSeconds: 90, running: true, updatedAtMs: 0 };
  const afterTen = advanceTimer(started, 10_000);
  assert.equal(afterTen.remainingSeconds, 80);
  const paused = pauseTimer(afterTen, 10_000);
  assert.equal(restoreTimer(paused, 100_000).remainingSeconds, 80);
  assert.deepEqual(resetTimer(90, 100_000), {
    targetSeconds: 90, remainingSeconds: 90, running: false, updatedAtMs: 100_000,
  });
});

test('explicit avoidance is applied before deterministic fallback', () => {
  const main = filterExplicitlyAvoided([
    { id: 'push', slug: 'push-up', name: 'Push Up', name_vi: 'Hít đất', workout_role: 'main_strength', equipment_slugs: ['bodyweight'] },
    { id: 'press', slug: 'bench-press', name: 'Bench Press', name_vi: 'Đẩy ngực ghế', workout_role: 'main_strength', equipment_slugs: ['barbell'] },
  ], 'đau cổ tay, tránh chống đẩy');
  assert.deepEqual(main.map((item) => item.slug), ['bench-press']);
  const refs = main.map((candidate, index) => ({ ref: `M_00${index + 1}`, phase: 'main' as const, candidate }));
  const fallback = deterministicFallback({ warmup: [], main: refs, cooldown: [] }, { includeWarmup: false, includeCooldown: false }, { warmup: 0, main: 60, cooldown: 0 });
  assert.equal(fallback.some((item) => item.exercise_slug === 'push-up'), false);
  assert.equal(fallback.length, 1);
});

test('Coach handoff parser preserves requested sets, reps and rest', () => {
  const prompt = 'Tạo buổi tập bám sát đề xuất AI Coach: 1. **Squat với thanh đòn (Barbell Back Squat):** 3 hiệp x 8-10 reps (Nghỉ 90 giây/hiệp) 2. **Đạp đùi trên máy (Leg Press):** 3 hiệp x 10-12 reps (Nghỉ 60 giây/hiệp) 3. **Cuốn chân nằm sấp máy (Seated/Lying Leg Curl):** 3 hiệp x 12 reps (Nghỉ 60 giây/hiệp)';
  assert.deepEqual(parseRequestedExercises(prompt), [
    { name: 'Squat với thanh đòn (Barbell Back Squat)', targetSets: 3, targetRepMin: 8, targetRepMax: 10, restSeconds: 90 },
    { name: 'Đạp đùi trên máy (Leg Press)', targetSets: 3, targetRepMin: 10, targetRepMax: 12, restSeconds: 60 },
    { name: 'Cuốn chân nằm sấp máy (Seated/Lying Leg Curl)', targetSets: 3, targetRepMin: 12, targetRepMax: 12, restSeconds: 60 },
  ]);
});

test('prompt-aware fallback selects requested leg exercises instead of earlier irrelevant candidates', () => {
  const candidates = [
    { id: 'push', slug: 'archer-push-up', name: 'Archer Push Up', name_vi: 'Chống Đẩy Kiểu Cung Thủ' },
    { id: 'stretch', slug: 'assisted-prone-rectus-femoris-stretch', name: 'Assisted Prone Rectus Femoris Stretch', name_vi: 'Kéo Giãn Đùi Trước Nằm Sấp' },
    { id: 'squat', slug: 'barbell-back-squat', name: 'Barbell Back Squat', name_vi: 'Squat với thanh đòn' },
    { id: 'press', slug: 'leg-press', name: 'Leg Press', name_vi: 'Đạp đùi trên máy' },
    { id: 'curl', slug: 'lying-leg-curl', name: 'Lying Leg Curl', name_vi: 'Cuốn chân nằm sấp máy' },
    { id: 'calf', slug: 'standing-calf-raise', name: 'Standing Calf Raise', name_vi: 'Nhón bắp chân đứng' },
  ];
  const refs = candidates.map((candidate, index) => ({ ref: `M_${String(index + 1).padStart(3, '0')}`, phase: 'main' as const, candidate }));
  const prompt = '1. Squat với thanh đòn (Barbell Back Squat): 3 hiệp x 8-10 reps (Nghỉ 90 giây/hiệp) 2. Đạp đùi trên máy (Leg Press): 3 hiệp x 10-12 reps (Nghỉ 60 giây/hiệp) 3. Cuốn chân nằm sấp máy (Seated/Lying Leg Curl): 3 hiệp x 12 reps (Nghỉ 60 giây/hiệp) 4. Nhón bắp chân đứng (Standing Calf Raise): 3 hiệp x 15 reps (Nghỉ 45 giây/hiệp)';
  const matched = promptMatchedMainExercises(refs, 60, prompt);
  assert.deepEqual(matched.exercises.map((item) => item.exercise_slug), ['M_003', 'M_004', 'M_005', 'M_006']);
  assert.deepEqual(matched.exercises.map((item) => [item.target_sets, item.target_rep_min, item.target_rep_max, item.rest_seconds]), [
    [3, 8, 10, 90], [3, 10, 12, 60], [3, 12, 12, 60], [3, 15, 15, 45],
  ]);
  assert.equal(matched.exercises.some((item) => item.exercise_slug === 'M_001'), false);

  const fallback = deterministicFallback(
    { warmup: [], main: refs, cooldown: [] },
    { includeWarmup: false, includeCooldown: false },
    { warmup: 0, main: 60, cooldown: 0 },
    prompt,
  );
  assert.deepEqual(fallback.map((item) => item.exercise_slug), ['M_003', 'M_004', 'M_005', 'M_006']);
});

test('phase regeneration preserves every non-target exercise exactly and fails closed', () => {
  const byPhase: Record<WorkoutPhase, ReferencedCandidate[]> = {
    warmup: [{ ref: 'W_001', phase: 'warmup', candidate: { id: 'w', slug: 'old-warmup' } }],
    main: [{ ref: 'M_001', phase: 'main', candidate: { id: 'm', slug: 'new-main' } }],
    cooldown: [{ ref: 'C_001', phase: 'cooldown', candidate: { id: 'c', slug: 'old-cooldown' } }],
  };
  const generated = [{
    exercise_slug: 'M_001', phase: 'main' as const, prescription_mode: 'reps' as const,
    target_sets: 3, target_rep_min: 8, target_rep_max: 12, target_weight: null, target_rir: 2,
    rest_seconds: 90, duration_seconds: null, hold_seconds: null, per_side: false, ai_reason: 'new',
  }];
  const current = [
    { exerciseSlug: 'old-warmup', phase: 'warmup' as const, prescriptionMode: 'time' as const, targetSets: 1, durationSeconds: 75, restSeconds: 0, aiReason: 'keep warmup' },
    { exerciseSlug: 'old-cooldown', phase: 'cooldown' as const, prescriptionMode: 'hold' as const, targetSets: 1, holdSeconds: 35, restSeconds: 0, perSide: true, aiReason: 'keep cooldown' },
  ];
  const result = preserveNonTargetPhases(generated, current, 'main', byPhase);
  assert.deepEqual(result.map((item) => [item.phase, item.ai_reason]), [['warmup', 'keep warmup'], ['main', 'new'], ['cooldown', 'keep cooldown']]);
  assert.equal(result[0].duration_seconds, 75);
  assert.equal(result[2].hold_seconds, 35);
  assert.throws(() => preserveNonTargetPhases(generated, current, 'main', { ...byPhase, warmup: [] }), /Không thể xác minh/);
});

test('Push accessory pool ranks reviewed target matches while retaining reviewed universal fallback', () => {
  assert.match(TARGETED_EXERCISE_SELECT, /exercise_muscles!inner\(muscles!inner\(slug\)\)/);
  const ranked = rankAccessoryCandidates([
    { slug: 'jump-rope', workout_role: 'general_warmup', exercise_muscles: [{ muscles: { slug: 'calves' } }] },
    { slug: 'dynamic-chest-stretch-male', workout_role: 'dynamic_mobility', exercise_muscles: [{ muscles: { slug: 'chest' } }, { muscles: { slug: 'shoulders' } }] },
    { slug: 'dead-bug', workout_role: 'activation', exercise_muscles: [{ muscles: { slug: 'abs' } }] },
  ], ['chest', 'triceps', 'shoulders']);
  assert.deepEqual(ranked.map((candidate) => candidate.slug), [
    'dynamic-chest-stretch-male',
    'jump-rope',
    'dead-bug',
  ]);
});

test('logger ordering is warmup then main then cooldown using persisted order index', () => {
  const unordered = [
    { id: 'cool-2', phase: 'cooldown', order_index: 10 },
    { id: 'main-2', phase: 'main', order_index: 4 },
    { id: 'warm-2', phase: 'warmup', order_index: 1 },
    { id: 'main-1', phase: 'main', order_index: 3 },
    { id: 'warm-1', phase: 'warmup', order_index: 0 },
    { id: 'cool-1', phase: 'cooldown', order_index: 9 },
  ];
  assert.deepEqual(sortWorkoutExercises(unordered).map((item) => item.id), [
    'warm-1', 'warm-2', 'main-1', 'main-2', 'cool-1', 'cool-2',
  ]);
  assert.equal(resolveRequestedExerciseIndex(null, unordered.length), 0);
  assert.equal(resolveRequestedExerciseIndex('4', unordered.length), 4);
  assert.equal(resolveRequestedExerciseIndex('99', unordered.length), 0);
});
