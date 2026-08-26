import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  formatRecoveryProjection,
  recoveryConfidenceLabel,
} from '../src/lib/recovery/group-detail-view';

const route = readFileSync('src/app/(app)/recovery/groups/[group]/page.tsx', 'utf8');
const detail = readFileSync('src/app/(app)/recovery/groups/[group]/recovery-group-detail-page.tsx', 'utf8');

test('server route validates canonical group before mounting client detail', () => {
  assert.match(route, /params\.group\.toUpperCase\(\)/);
  assert.match(route, /if \(!isBodyMuscleGroup\(group\)\) notFound\(\)/);
  assert.match(route, /<RecoveryGroupDetailPage group=\{group\}/);
  assert.doesNotMatch(route, /fetch\(/);
});

test('chip scroller contains canonical metadata with selected and accessible state', () => {
  assert.match(detail, /aria-label="Chọn nhóm cơ"/);
  assert.match(detail, /RECOVERY_GROUP_UI_ITEMS\.map/);
  assert.match(detail, /aria-current=\{selected \? 'page'/);
  assert.match(detail, /overflow-x-auto/);
  assert.match(detail, /min-h-11/);
});

test('detail request aborts and ignores outdated group responses', () => {
  assert.match(detail, /const requestId = \+\+requestIdRef\.current/);
  assert.match(detail, /signal: controller\.signal/);
  assert.match(detail, /responseDetail\.group\.group !== group/);
  assert.match(detail, /requestIdRef\.current !== requestId/);
  assert.match(detail, /return \(\) => controller\.abort\(\)/);
  assert.match(detail, /setDetail\(null\)/);
});

test('detail renders all approved content and explicit empty state', () => {
  assert.match(detail, /metadata\.anatomyDescription/);
  assert.match(detail, /detail\.group\.explanation/);
  assert.match(detail, /detail\.group\.readinessSource === 'default'/);
  assert.match(detail, /Mặc định khi chưa có tải cơ hiện hành/);
  assert.match(detail, /limitingMuscle\.nameVi/);
  assert.match(detail, /projectedAt\.r60/);
  assert.match(detail, /projectedAt\.r80/);
  assert.match(detail, /projectedAt\.r90/);
  assert.match(detail, /recoveryConfidenceLabel/);
  assert.match(detail, /Chưa có bài tập tác động trong 14 ngày gần đây/);
  assert.match(detail, /không phải chẩn đoán y khoa/);
});

test('recent activity is deduped by workout exercise and renders sets and time', () => {
  assert.match(detail, /dedupeRecoveryActivities\(detail\?\.recentLoads/);
  assert.match(detail, /key=\{load\.workout_exercise_id\}/);
  assert.match(detail, /load\.completed_set_count/);
  assert.match(detail, /formatActivityRecency\(load\.occurred_at/);
});

test('header and chips remain outside loading and error body states', () => {
  const navIndex = detail.indexOf('aria-label="Chọn nhóm cơ"');
  const loadingIndex = detail.indexOf('{loading || (detail !== null && !detailIsCurrent) ? (');
  assert.equal(navIndex > 0, true);
  assert.equal(loadingIndex > navIndex, true);
  assert.match(detail, /Đang tải chi tiết phục hồi/);
  assert.match(detail, /Không tải được chi tiết phục hồi/);
  assert.match(detail, /setRetryKey/);
});

test('UI Back and native links support keyboard and browser history navigation', () => {
  assert.match(detail, /if \(window\.history\.length > 1\) router\.back\(\)/);
  assert.match(detail, /else router\.push\('\/recovery\/groups'\)/);
  assert.match(detail, /onClick=\{goBack\}/);
  assert.match(detail, /aria-label="Quay lại trang trước"/);
  assert.match(detail, /focus-visible:ring-2/);
  assert.match(detail, /href=\{`\/recovery\/groups\/\$\{item\.group\.toLowerCase\(\)\}`\}/);
});

test('projection and confidence helpers cover achieved, future and Unknown states', () => {
  const generatedAt = '2026-08-25T12:00:00.000Z';
  assert.equal(formatRecoveryProjection(null, generatedAt), 'Chưa ước tính');
  assert.equal(formatRecoveryProjection('invalid', generatedAt), 'Chưa ước tính');
  assert.equal(formatRecoveryProjection('2026-08-25T11:00:00.000Z', generatedAt), 'Đã đạt');
  assert.equal(formatRecoveryProjection('2026-08-25T12:30:00.000Z', generatedAt), 'Khoảng 30 phút');
  assert.equal(formatRecoveryProjection('2026-08-25T15:00:00.000Z', generatedAt), 'Khoảng 3 giờ');
  assert.equal(formatRecoveryProjection('2026-08-27T12:00:00.000Z', generatedAt), 'Khoảng 2 ngày');
  assert.equal(recoveryConfidenceLabel('high'), 'Cao');
  assert.equal(recoveryConfidenceLabel('medium'), 'Trung bình');
  assert.equal(recoveryConfidenceLabel('low'), 'Thấp');
  assert.equal(recoveryConfidenceLabel('unknown'), 'Chưa xác định');
});
