import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildWorkoutSummaryInsight,
  type SummaryExerciseInput,
} from '../src/lib/workouts/summary-insights';

function exercise(reps: number[], weight = 20): SummaryExerciseInput {
  return {
    exerciseId: 'exercise-1',
    exerciseSlug: 'machine-press',
    exerciseName: 'Máy đẩy ngực',
    targetRepMin: 8,
    targetRepMax: 10,
    sets: reps.map((rep, index) => ({
      setNumber: index + 1,
      weight,
      reps: rep,
      rir: 2,
      perceivedEffort: 'appropriate',
      completed: true,
      setType: 'working',
    })),
  };
}

function build(overrides: Partial<Parameters<typeof buildWorkoutSummaryInsight>[0]> = {}) {
  return buildWorkoutSummaryInsight({
    completionRate: 100,
    completedSets: 2,
    totalPlannedSets: 2,
    durationMinutes: 12,
    totalVolumeKg: 400,
    totalReps: 20,
    exercises: [exercise([10, 10])],
    previousByExercise: {},
    feedback: { difficulty: 3, energy: 4, quality: 5, note: null },
    recoveryEstimate: { minHours: 24, maxHours: 36, label: 'Nhẹ' },
    ...overrides,
  });
}

test('summary recommends an exact load increase only after every set reaches the upper rep bound', () => {
  const summary = build();
  const action = summary.exerciseActions[0];

  assert.equal(action.outcome, 'progress');
  assert.match(action.action, /22\.5 kg/);
  assert.match(action.action, /8-10 reps/);
  assert.equal(summary.dataStatus, 'factual');
  assert.match(summary.comparison, /mốc dữ liệu đầu tiên/i);
});

test('fatigue feedback caps an otherwise valid progression recommendation', () => {
  const summary = build({
    feedback: { difficulty: 2, energy: 3, quality: 3, note: null },
  });

  assert.match(summary.headline, /hồi phục chưa sẵn sàng/i);
  assert.match(summary.nextSessionAction, /Giữ mức tạ hiện tại/i);
  assert.equal(summary.exerciseActions[0].outcome, 'maintain');
  assert.doesNotMatch(summary.nextSessionAction, /22\.5 kg/);
});

test('pain feedback overrides performance progression and carries the selected area into safety guidance', () => {
  const summary = build({
    feedback: {
      difficulty: 2,
      energy: 4,
      quality: 1,
      note: '[Đau/khó chịu: Vai] đau khi đẩy',
    },
  });

  assert.match(summary.headline, /kiểm soát đau/i);
  assert.match(summary.nextSessionAction, /ở Vai/);
  assert.match(summary.recoveryNote, /không nên được xử lý như mệt cơ/i);
  assert.match(summary.nextSessionAction, /^Không tăng tải/i);
});

test('matching previous exercise data produces a bounded same-exercise comparison', () => {
  const summary = build({
    previousByExercise: {
      'exercise-1': {
        workoutId: 'workout-previous',
        completedAt: '2026-08-20T10:00:00.000Z',
        totalVolumeKg: 320,
        totalReps: 16,
        topWeightKg: 20,
      },
    },
  });

  assert.equal(summary.dataStatus, 'trend_ready');
  assert.equal(summary.dataStatusLabel, 'Có dữ liệu so sánh');
  assert.match(summary.comparison, /\+25%/);
  assert.match(summary.comparison, /1 bài/);
});

test('incomplete workouts do not recommend making up skipped sets or increasing load', () => {
  const summary = build({
    completionRate: 67,
    completedSets: 2,
    totalPlannedSets: 3,
    exercises: [exercise([10, 10])],
  });

  assert.match(summary.nextSessionAction, /Không cần tập bù dồn/i);
  assert.doesNotMatch(summary.nextSessionAction, /22\.5 kg/);
});
