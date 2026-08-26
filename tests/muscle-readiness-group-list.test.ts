import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { RecoverySummaryGroup } from '../src/lib/recovery/group-list-view';
import {
  formatActivityRecency,
  normalizeRecoverySummaryGroups,
  recoveryGroupStatusPresentation,
  selectRecoveryGroupsForSection,
} from '../src/lib/recovery/group-list-view';
import { BODY_MUSCLE_GROUPS, type BodyMuscleGroup } from '../src/lib/recovery/muscle-groups';
import type { RecoveryStatus } from '../src/lib/recovery/read-model';

const pageSource = readFileSync('src/app/(app)/recovery/groups/recovery-groups-page.tsx', 'utf8');
const routeSource = readFileSync('src/app/(app)/recovery/groups/page.tsx', 'utf8');

function group(
  muscleGroup: BodyMuscleGroup,
  readiness: number | null,
  status: RecoveryStatus,
  stale = false,
): RecoverySummaryGroup {
  return {
    group: muscleGroup,
    label: muscleGroup,
    readiness,
    readinessSource: readiness === null ? 'default' : 'model',
    status,
    confidence: readiness === null ? 'unknown' : 'high',
    stale,
    limitingMuscle: null,
    projectedAt: { r60: null, r80: null, r90: null },
    lastTrainedAt: null,
    explanation: 'fixture',
    latestActivity: null,
  };
}

test('normalization renders exactly 10 canonical groups and removes duplicates', () => {
  const normalized = normalizeRecoverySummaryGroups([
    group('CHEST', 95, 'ready'),
    group('CHEST', 40, 'recovering'),
  ]);
  assert.equal(normalized.length, 10);
  assert.deepEqual(normalized.map((item) => item.group), BODY_MUSCLE_GROUPS);
  assert.equal(new Set(normalized.map((item) => item.group)).size, 10);
  assert.equal(normalized.find((item) => item.group === 'CHEST')?.readiness, 95);
  assert.equal(normalized.find((item) => item.group === 'CALVES')?.readiness, 100);
  assert.equal(normalized.find((item) => item.group === 'CALVES')?.readinessSource, 'default');
  assert.equal(normalized.find((item) => item.group === 'CALVES')?.status, 'ready');
});

test('main and accessory sections contain approved group counts only', () => {
  const all = BODY_MUSCLE_GROUPS.map((item) => group(item, 100, 'ready'));
  const main = selectRecoveryGroupsForSection(all, 'main');
  const accessory = selectRecoveryGroupsForSection(all, 'accessory');
  assert.equal(main.length, 8);
  assert.equal(accessory.length, 2);
  assert.deepEqual(accessory.map((item) => item.group), ['FOREARMS', 'CALVES']);
});

test('section sort is stable by status tier then canonical order', () => {
  const input = [
    group('ABS', 40, 'recovering'),
    group('BICEPS', 85, 'trainable'),
    group('CHEST', 95, 'ready'),
    group('BACK', 95, 'ready'),
    group('TRICEPS', 85, 'trainable'),
    group('SHOULDERS', null, 'unknown'),
    group('LEGS', 70, 'light_only'),
    group('GLUTES', 20, 'recovering'),
  ];
  assert.deepEqual(
    selectRecoveryGroupsForSection(input, 'main').map((item) => item.group),
    ['CHEST', 'BACK', 'TRICEPS', 'BICEPS', 'LEGS', 'ABS', 'GLUTES', 'SHOULDERS'],
  );
});

test('stale group uses old-data presentation and never ready styling', () => {
  const stale = recoveryGroupStatusPresentation(group('CHEST', 100, 'ready', true));
  assert.equal(stale.label, 'Dữ liệu cũ');
  assert.doesNotMatch(stale.textClass, /emerald/);
  assert.doesNotMatch(stale.dotClass, /emerald/);
});

test('activity recency has explicit minute, hour, day and invalid fallbacks', () => {
  const now = '2026-08-25T12:00:00.000Z';
  assert.equal(formatActivityRecency('2026-08-25T11:59:30.000Z', now), 'vừa xong');
  assert.equal(formatActivityRecency('2026-08-25T11:30:00.000Z', now), '30 phút trước');
  assert.equal(formatActivityRecency('2026-08-25T09:00:00.000Z', now), '3 giờ trước');
  assert.equal(formatActivityRecency('2026-08-23T12:00:00.000Z', now), '2 ngày trước');
  assert.equal(formatActivityRecency('invalid', now), 'gần đây');
});

test('rows are full buttons that open the shared dialog without navigation', () => {
  assert.match(pageSource, /<button[\s\S]*onClick=\{\(event\) => onSelect\(group\.group, event\.currentTarget\)\}/);
  assert.match(pageSource, /aria-label=\{`\$\{group\.label\}/);
  assert.match(pageSource, /min-h-\[88px\]/);
  assert.match(pageSource, /group\.readiness === null \|\| group\.stale \? '--'/);
  assert.match(pageSource, /Chưa có bài tập gần đây/);
  assert.match(pageSource, /<MuscleGroupInfoDialog/);
  assert.match(pageSource, /groupDialogTriggerRef\.current = trigger/);
  assert.match(pageSource, /returnFocusRef=\{groupDialogTriggerRef\}/);
  assert.doesNotMatch(pageSource, /href=\{`\/recovery\/groups\/\$\{group\.group/);
});

test('route has feature gate, Back link and no detail N plus one requests', () => {
  assert.match(routeSource, /isMuscleReadinessEnabled/);
  assert.match(pageSource, /href="\/recovery"/);
  assert.equal((pageSource.match(/fetch\('/g) ?? []).length, 1);
  assert.match(pageSource, /fetch\('\/api\/recovery'/);
  assert.doesNotMatch(pageSource, /fetch\(`\/api\/recovery\/\$\{/);
});

test('loading, retry, responsive containment and two sections are explicit', () => {
  assert.match(pageSource, /Đang tải danh sách phục hồi/);
  assert.match(pageSource, /Không tải được danh sách phục hồi/);
  assert.match(pageSource, /setRetryKey/);
  assert.match(pageSource, /overflow-x-hidden/);
  assert.match(pageSource, /Nhóm cơ chính/);
  assert.match(pageSource, /Nhóm cơ bổ trợ/);
});
