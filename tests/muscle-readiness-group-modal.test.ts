import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { dedupeRecoveryActivities, type RecoveryActivityReadRow } from '../src/lib/recovery/activity';

const modal = readFileSync('src/components/recovery/muscle-group-info-dialog.tsx', 'utf8');
const overview = readFileSync('src/app/(app)/recovery/recovery-dashboard.tsx', 'utf8');
const list = readFileSync('src/app/(app)/recovery/groups/recovery-groups-page.tsx', 'utf8');
const detailRoute = readFileSync('src/app/(app)/recovery/groups/[group]/page.tsx', 'utf8');

function activity(id: string, workoutExerciseId: string, occurredAt: string): RecoveryActivityReadRow {
  return {
    id,
    workout_id: 'workout-1',
    workout_exercise_id: workoutExerciseId,
    muscle_id: 'chest',
    completed_set_count: 4,
    occurred_at: occurredAt,
    muscles: { slug: 'chest' },
    workout_exercises: { exercises: { name_vi: 'Đẩy ngực' } },
  };
}

test('overview and list select a group without changing the URL', () => {
  assert.match(overview, /setSelectedGroup\(muscle as BodyMuscleGroup\)/);
  assert.doesNotMatch(overview, /router\.push\(`\/recovery\/groups\/\$\{muscle/);
  assert.match(list, /onClick=\{\(event\) => onSelect\(group\.group, event\.currentTarget\)\}/);
  assert.doesNotMatch(list, /href=\{`\/recovery\/groups\/\$\{group\.group/);
  assert.match(overview, /<MuscleGroupInfoDialog/);
  assert.match(list, /<MuscleGroupInfoDialog/);
});

test('modal renders required identity anatomy and recent activity content', () => {
  assert.match(modal, /metadata\.label/);
  assert.match(modal, /detail!\.group\.readiness/);
  assert.match(modal, /Nhóm cơ này là gì\?/);
  assert.match(modal, /metadata\.anatomyDescription/);
  assert.match(modal, /Các bài tập gần đây ảnh hưởng đến nhóm cơ này/);
  assert.match(modal, /recoveryActivityExerciseName\(load\)/);
  assert.match(modal, /load\.completed_set_count/);
  assert.match(modal, /formatActivityRecency\(load\.occurred_at/);
});

test('each modal instance is scoped to exactly one selected group', () => {
  assert.match(modal, /type Props = \{[\s\S]*group: BodyMuscleGroup \| null/);
  assert.doesNotMatch(modal, /RECOVERY_GROUP_UI_ITEMS/);
  assert.doesNotMatch(modal, /Chọn nhóm cơ/);
  assert.doesNotMatch(modal, /role="tab"/);
  assert.doesNotMatch(modal, /href=\{`\/recovery\/groups\//);
});

test('modal fetches real detail data and handles loading error retry and empty history', () => {
  assert.match(modal, /fetch\(`\/api\/recovery\/\$\{encodeURIComponent\(group\)\}`/);
  assert.match(modal, /cache: 'no-store'/);
  assert.match(modal, /Đang tải thông tin nhóm cơ/);
  assert.match(modal, /loading \|\| \(!detail && !error\)/);
  assert.match(modal, /Không tải được thông tin/);
  assert.match(modal, /setRetryKey/);
  assert.match(modal, /Thử lại/);
  assert.match(modal, /Chưa có bài tập gần đây ảnh hưởng đến nhóm cơ này/);
});

test('modal aborts and rejects stale group responses', () => {
  assert.match(modal, /const requestId = \+\+requestIdRef\.current/);
  assert.match(modal, /signal: controller\.signal/);
  assert.match(modal, /requestIdRef\.current !== requestId \|\| responseDetail\.group\.group !== group/);
  assert.match(modal, /return \(\) => controller\.abort\(\)/);
  assert.match(modal, /detail\?\.group\.group === group/);
});

test('modal dedupes repeated workout exercise activity', () => {
  const deduped = dedupeRecoveryActivities([
    activity('load-1', 'exercise-1', '2026-08-25T10:00:00.000Z'),
    { ...activity('load-2', 'exercise-1', '2026-08-25T11:00:00.000Z'), completed_set_count: 5 },
  ]);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].completed_set_count, 5);
  assert.match(modal, /dedupeRecoveryActivities\(detail\?\.recentLoads/);
});

test('controlled dialog restores the exact explicit connected trigger', () => {
  assert.match(modal, /Dialog\.Root/);
  assert.match(modal, /Dialog\.Overlay/);
  assert.match(modal, /Dialog\.Content/);
  assert.match(modal, /Dialog\.Close/);
  assert.match(modal, /aria-label="Đóng thông tin nhóm cơ"/);
  assert.doesNotMatch(modal, /onOpenAutoFocus/);
  assert.match(modal, /onCloseAutoFocus=\{\(event\) => \{/);
  assert.match(modal, /const trigger = returnFocusRef\.current/);
  assert.match(modal, /if \(!trigger\?\.isConnected\) return/);
  assert.match(modal, /event\.preventDefault\(\)/);
  assert.match(modal, /trigger\.focus\(\)/);
  assert.doesNotMatch(modal, /onOpenAutoFocus/);
  assert.doesNotMatch(modal, /document\.activeElement/);
  assert.match(modal, /h-11 w-11/);
});

test('overview SVG and list button forward their concrete event targets', () => {
  const muscleBody = readFileSync('src/components/ui/MuscleBody.tsx', 'utf8');
  const fatigueMap = readFileSync('src/components/ui/MuscleFatigueMap.tsx', 'utf8');
  assert.match(muscleBody, /onSelectMuscle\?: \(muscle: MuscleName, trigger\?: HTMLElement \| SVGElement\)/);
  assert.match(fatigueMap, /onSelect\(region\.id, event\.currentTarget\)/);
  assert.match(muscleBody, /onSelectMuscle\?\.\(group, trigger\)/);
  assert.match(overview, /groupDialogTriggerRef\.current = trigger \?\? null/);
  assert.match(overview, /returnFocusRef=\{groupDialogTriggerRef\}/);
  assert.match(list, /groupDialogTriggerRef\.current = trigger/);
  assert.match(list, /returnFocusRef=\{groupDialogTriggerRef\}/);
});

test('dialog is internally scrollable and responsive from mobile sheet to centered desktop', () => {
  assert.match(modal, /max-h-\[90dvh\]/);
  assert.match(modal, /overflow-y-auto/);
  assert.match(modal, /overscroll-contain/);
  assert.match(modal, /bottom-0/);
  assert.match(modal, /sm:top-1\/2/);
  assert.match(modal, /sm:max-w-xl/);
  assert.match(modal, /safe-area-inset-bottom/);
});

test('portal children lock viewport positioning and use readable glass surfaces', () => {
  assert.match(modal, /Dialog\.Overlay[\s\S]*style=\{\{ position: 'fixed', inset: 0, zIndex: 50 \}\}/);
  assert.match(modal, /Dialog\.Content[\s\S]*style=\{\{ position: 'fixed', zIndex: 51 \}\}/);
  assert.match(modal, /bg-black\/45/);
  assert.match(modal, /backdrop-blur-\[2px\]/);
  assert.match(modal, /bg-chassis-hi\/90/);
  assert.match(modal, /backdrop-blur-md/);
  assert.match(modal, /sm:left-1\/2[\s\S]*sm:right-auto[\s\S]*sm:top-1\/2[\s\S]*sm:w-full/);
  assert.match(modal, /sm:-translate-x-1\/2 sm:-translate-y-1\/2/);
  assert.doesNotMatch(modal, /border-white\/10 bg-chassis-hi p-5/);
});

test('legacy detail route remains available for direct deep links', () => {
  assert.match(detailRoute, /<RecoveryGroupDetailPage group=\{group\}/);
});
