import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { BODY_MUSCLE_GROUPS, type BodyMuscleGroup } from '../src/lib/recovery/muscle-groups';
import { readinessStatus, type MuscleReadinessGroup } from '../src/lib/recovery/read-model';
import {
  daysSinceCompletedWorkout,
  selectFreshRecoveryGroups,
  selectWorkoutEligibleRecoveryGroups,
} from '../src/lib/recovery/ui-selectors';

const overview = readFileSync('src/app/(app)/recovery/recovery-dashboard.tsx', 'utf8');

function group(
  groupName: BodyMuscleGroup,
  readiness: number | null,
  stale = false,
): MuscleReadinessGroup {
  return {
    group: groupName,
    label: groupName,
    readiness,
    readinessSource: readiness === null ? 'default' : 'model',
    status: readinessStatus(readiness),
    confidence: readiness === null ? 'unknown' : 'high',
    stale,
    limitingMuscle: null,
    projectedAt: { r60: null, r80: null, r90: null },
    lastTrainedAt: null,
    explanation: '',
  };
}

test('overview KPI selectors preserve exact fresh and workout boundaries', () => {
  const groups = [
    group('CHEST', 79),
    group('SHOULDERS', 80),
    group('BACK', 89),
    group('TRICEPS', 90),
    group('BICEPS', null),
    group('CALVES', 100, true),
  ];
  assert.deepEqual(selectFreshRecoveryGroups(groups).map((item) => item.group), ['TRICEPS']);
  assert.deepEqual(
    selectWorkoutEligibleRecoveryGroups(groups).map((item) => item.group),
    ['SHOULDERS', 'BACK', 'TRICEPS'],
  );
});

test('cold-start default groups count as fresh and workout eligible', () => {
  const defaults = BODY_MUSCLE_GROUPS.map((groupName) => group(groupName, 100));
  assert.equal(selectFreshRecoveryGroups(defaults).length, 10);
  assert.equal(selectWorkoutEligibleRecoveryGroups(defaults).length, 10);
});

test('days KPI keeps null distinct from a legitimate same-day zero', () => {
  assert.equal(daysSinceCompletedWorkout(null, '2026-08-25T12:00:00.000Z'), null);
  assert.equal(
    daysSinceCompletedWorkout('2026-08-25T08:00:00.000Z', '2026-08-25T12:00:00.000Z'),
    0,
  );
  assert.match(overview, /value === null \? '--' : value/);
  assert.match(overview, /lastCompletedWorkoutAt: string \| null/);
});

test('fresh KPI navigates to list while body groups open the shared dialog', () => {
  assert.match(overview, /<Link[\s\S]*href="\/recovery\/groups"/);
  assert.match(overview, /focus-visible:ring-2/);
  assert.match(overview, /onSelectMuscle=\{\(muscle, trigger\) => \{/);
  assert.match(overview, /groupDialogTriggerRef\.current = trigger \?\? null/);
  assert.match(overview, /returnFocusRef=\{groupDialogTriggerRef\}/);
  assert.match(overview, /<MuscleGroupInfoDialog/);
  assert.doesNotMatch(overview, /router\.push\(`\/recovery\/groups\/\$\{muscle/);
  assert.doesNotMatch(overview, /SVG_GROUPS/);
});

test('front and back controls expose complete tab semantics and keyboard switching', () => {
  assert.match(overview, /role="tablist"/);
  assert.match(overview, /role="tab"/);
  assert.match(overview, /aria-selected=\{selected\}/);
  assert.match(overview, /aria-controls="recovery-body-panel"/);
  assert.match(overview, /role="tabpanel"/);
  assert.match(overview, /aria-labelledby=\{`recovery-\$\{view\}-tab`\}/);
  assert.match(overview, /event\.key !== 'ArrowLeft' && event\.key !== 'ArrowRight'/);
  assert.match(overview, /tabRefs\.current\[nextView\]\?\.focus\(\)/);
});

test('legend communicates every status with visible text', () => {
  for (const label of [
    'Đang phục hồi',
    'Chỉ nên tập nhẹ',
    'Có thể tập',
    'Sẵn sàng',
  ]) {
    assert.match(overview, new RegExp(label));
  }
  assert.match(overview, /VISIBLE_RECOVERY_STATUSES/);
  assert.match(overview, /sm:grid-cols-4/);
  assert.doesNotMatch(overview, /chưa đủ dữ liệu/i);
  assert.doesNotMatch(overview, /Không xác định/);
  assert.doesNotMatch(overview, /Object\.entries\(STATUS_COPY\)/);
  assert.match(overview, /Chú thích mức phục hồi/);
});

test('recovery overview no longer owns a separate workout generation CTA', () => {
  assert.doesNotMatch(overview, /Tạo buổi tập theo phục hồi/);
  assert.doesNotMatch(overview, /Tạo với nhóm có thể tập/);
  assert.doesNotMatch(overview, /RECOVERY_WORKOUT_HANDOFF_STORAGE_KEY/);
  assert.doesNotMatch(overview, /sessionStorage\.setItem/);
});

test('loading, default, stale, error and retry states stay explicit', () => {
  assert.match(overview, /function LoadingState/);
  assert.match(overview, /Một số dữ liệu dùng mô hình cũ/);
  assert.match(overview, /role="alert"/);
  assert.match(overview, /Không tải được dữ liệu phục hồi/);
  assert.match(overview, /setRetryKey/);
  assert.match(overview, /Thử lại/);
});

test('overview uses bounded responsive layout without an inline group list or detail request', () => {
  assert.match(overview, /overflow-x-hidden/);
  assert.match(overview, /w-full max-w-4xl/);
  assert.match(overview, /grid grid-cols-2 gap-3/);
  assert.match(overview, /max-w-\[280px\]/);
  assert.doesNotMatch(overview, /Danh sách mức phục hồi/);
  assert.doesNotMatch(overview, /fetch\(`\/api\/recovery\/\$\{/);
});
