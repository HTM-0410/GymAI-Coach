import test from 'node:test';
import assert from 'node:assert/strict';
import { projectWorkoutActualsV1 } from '../src/lib/workouts/actuals';
import { QA_COMPLETED_WORKOUT_FIXTURE } from './fixtures/qa-new-user';

test('RT-011D/F/G/H: projectWorkoutActualsV1 accurately computes canonical metrics from base workout rows', () => {
  const actuals = projectWorkoutActualsV1(QA_COMPLETED_WORKOUT_FIXTURE);

  // Exact set, rep, volume, and duration metrics
  assert.equal(actuals.workoutId, QA_COMPLETED_WORKOUT_FIXTURE.id);
  assert.equal(actuals.status, 'completed');
  assert.equal(actuals.completedMainWorkingSets, 6);
  assert.equal(actuals.totalReps, 54);
  assert.equal(actuals.totalVolumeKg, 1360);

  // Planned vs Actual duration separation
  assert.equal(actuals.plannedDurationMinutes, 30);
  assert.equal(actuals.actualDurationSeconds, 360);
  assert.equal(actuals.actualDurationMinutes, 6);

  // Per-exercise actuals & rep ranges
  assert.equal(actuals.exercises.length, 3);

  const chestPress = actuals.exercises.find((e) => e.exerciseSlug === 'cable-chest-press');
  assert.ok(chestPress);
  assert.equal(chestPress.setCount, 2);
  assert.equal(chestPress.repMin, 8);
  assert.equal(chestPress.repMax, 9);
  assert.equal(chestPress.repRangeDisplay, '8-9 reps');
  assert.equal(chestPress.volumeKg, 578); // 34*8 + 34*9 = 272 + 306 = 578
  assert.equal(chestPress.avgActualRir, null); // Unrecorded RIR remains null, not 0!

  const latPulldown = actuals.exercises.find((e) => e.exerciseSlug === 'lat-pulldown-machine');
  assert.ok(latPulldown);
  assert.equal(latPulldown.setCount, 2);
  assert.equal(latPulldown.repMin, 9);
  assert.equal(latPulldown.repMax, 10);
  assert.equal(latPulldown.repRangeDisplay, '9-10 reps');
  assert.equal(latPulldown.volumeKg, 494); // 26*10 + 26*9 = 260 + 234 = 494
  assert.equal(latPulldown.avgActualRir, null);

  const seatedRow = actuals.exercises.find((e) => e.exerciseSlug === 'cable-seated-row');
  assert.ok(seatedRow);
  assert.equal(seatedRow.setCount, 2);
  assert.equal(seatedRow.repMin, 9);
  assert.equal(seatedRow.repMax, 9);
  assert.equal(seatedRow.repRangeDisplay, '9 reps');
  assert.equal(seatedRow.volumeKg, 288); // 16*9 + 16*9 = 144 + 144 = 288
  assert.equal(seatedRow.avgActualRir, null);

  // Total volume check: 578 + 494 + 288 = 1360
  assert.equal(chestPress.volumeKg + latPulldown.volumeKg + seatedRow.volumeKg, 1360);

  // Feedback hydration
  assert.ok(actuals.feedback);
  assert.equal(actuals.feedback.difficulty, 2);
  assert.equal(actuals.feedback.energy, 3);
  assert.equal(actuals.feedback.quality, 3);
});

test('RT-011H: actual duration does not fallback to planned duration when timestamps are missing', () => {
  const missingTimestamps = {
    ...QA_COMPLETED_WORKOUT_FIXTURE,
    started_at: null,
    completed_at: null,
    planned_duration: 45,
  };

  const actuals = projectWorkoutActualsV1(missingTimestamps);
  assert.equal(actuals.actualDurationSeconds, null);
  assert.equal(actuals.actualDurationMinutes, null);
  assert.equal(actuals.plannedDurationMinutes, 45);
});

test('RT-011F: recorded RIR samples produce exact numeric average while missing RIR remains null', () => {
  const withRirSamples = {
    ...QA_COMPLETED_WORKOUT_FIXTURE,
    workout_exercises: [
      {
        id: 'we-1',
        phase: 'main',
        prescription_mode: 'reps',
        exercises: { slug: 'cable-chest-press', name_vi: 'Đẩy ngực trên máy cáp' },
        workout_sets: [
          { set_number: 1, set_type: 'working', weight: 40, reps: 8, rir: 2, completed: true },
          { set_number: 2, set_type: 'working', weight: 40, reps: 8, rir: 3, completed: true },
        ],
      },
    ],
  };

  const actuals = projectWorkoutActualsV1(withRirSamples);
  assert.equal(actuals.exercises[0].avgActualRir, 2.5);
});
