import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { BODY_MUSCLE_GROUPS } from '../src/lib/recovery/muscle-groups';
import {
  RECOVERY_GROUP_UI_ITEMS,
  RECOVERY_GROUP_UI_METADATA,
} from '../src/lib/recovery/ui-metadata';
import {
  BACK_MUSCLE_PATHS,
  FRONT_MUSCLE_PATHS,
  REGION_GROUP_MAP,
} from '../src/components/ui/MuscleBody';

const muscleBody = readFileSync('src/components/ui/MuscleBody.tsx', 'utf8');
const fatigueMap = readFileSync('src/components/ui/MuscleFatigueMap.tsx', 'utf8');
const dayMap = readFileSync('src/components/programs/day-muscle-map.tsx', 'utf8');
const recoveryUi = readFileSync('src/app/(app)/recovery/recovery-dashboard.tsx', 'utf8');
const workoutGenerator = readFileSync('src/app/(app)/workouts/new/new-workout-form.tsx', 'utf8');
const nav = readFileSync('src/components/nav.tsx', 'utf8');
const palette = readFileSync('src/components/command-palette.tsx', 'utf8');
const thumbnail = readFileSync('src/components/recovery/muscle-group-thumbnail.tsx', 'utf8');
const recoveryMetadata = readFileSync('src/lib/recovery/ui-metadata.ts', 'utf8');
const recoveryDetail = readFileSync('src/app/(app)/recovery/groups/[group]/recovery-group-detail-page.tsx', 'utf8');
const globalStyles = readFileSync('src/app/globals.css', 'utf8');

test('MuscleBody readiness props are optional and old day map usage remains valid', () => {
  assert.match(muscleBody, /readinessScores\?:/);
  assert.match(muscleBody, /selectedMuscle\?:/);
  assert.match(muscleBody, /onSelectMuscle\?:/);
  assert.match(dayMap, /<MuscleBody/);
  assert.doesNotMatch(dayMap, /readinessScores=/);
});

test('recovery body colors match the four visible legend states without neon treatment', () => {
  for (const variable of ['recovery-recovering', 'recovery-light-only', 'recovery-trainable', 'recovery-ready']) {
    assert.match(muscleBody, new RegExp(`--${variable}`));
    assert.match(recoveryUi, new RegExp(`--${variable}`));
    assert.match(globalStyles, new RegExp(`--${variable}:`));
  }
  assert.match(muscleBody, /!hasScore && \(isActive \|\| isSelected\)/);
  assert.match(muscleBody, /isActive && !hasScore/);
  assert.match(muscleBody, /--recovery-muscle-selected/);
  assert.match(muscleBody, /--recovery-muscle-stroke/);
});

test('recovery abdominal group fills the torso while legacy program geometry stays unchanged', () => {
  assert.match(muscleBody, /hasScore && group === 'ABS'/);
  assert.match(muscleBody, /translate\(-8\.4 -1\.2\) scale\(1\.14 1\)/);
  assert.doesNotMatch(dayMap, /readinessScores=/);
});

test('front forearms taper into rounded wrists instead of square terminals', () => {
  assert.equal(FRONT_MUSCLE_PATHS.FOREARMS?.length, 2);
  for (const path of FRONT_MUSCLE_PATHS.FOREARMS ?? []) {
    assert.match(path, /C/);
    assert.doesNotMatch(path, /123\.0|123\.73/);
    assert.match(path, /117\.4/);
  }
  assert.match(muscleBody, /strokeLinecap="round"/);
});

test('recovery repairs arms legs and groin while preserving legacy abdomen side lines', () => {
  assert.match(muscleBody, /FRONT_ARM_CONTOUR_REPAIRS/);
  assert.match(muscleBody, /readinessScores && isFront/);
  assert.match(muscleBody, /strokeWidth="3\.6"/);
  assert.match(muscleBody, /strokeWidth="0\.75"/);
  assert.doesNotMatch(muscleBody, /M 38\.9,115\.0/);
  assert.match(muscleBody, /M 27\.2,60\.8/);
  assert.match(muscleBody, /M 38\.9,173\.0/);
  assert.match(muscleBody, /M 54\.8,146\.5/);
});

test('interactive body regions support keyboard selection and accessible labels', () => {
  assert.match(fatigueMap, /event\.key !== 'Enter' && event\.key !== ' '/);
  assert.match(fatigueMap, /tabIndex: 0/);
  assert.match(fatigueMap, /role: 'button'/);
  assert.match(fatigueMap, /'aria-pressed': selected/);
  assert.match(fatigueMap, /'aria-label': `\$\{region\.label\}/);
  assert.match(fatigueMap, /onMouseEnter=\{decorative \? undefined/);
  assert.match(fatigueMap, /onMouseLeave=\{decorative \? undefined/);
  assert.match(fatigueMap, /strokeWidth=\{selected \? 2 : 1\.35\}/);
});

test('inline silhouette renders before interactive regions with crisp non-scaling strokes', () => {
  const baseLayer = fatigueMap.indexOf("d={view === 'front' ? FRONT_SILHOUETTE : BACK_SILHOUETTE}");
  const muscleLayer = fatigueMap.indexOf('{regions.map((region) => {');
  assert.ok(baseLayer >= 0 && muscleLayer > baseLayer);
  assert.match(fatigueMap, /shapeRendering="geometricPrecision"/);
  assert.match(fatigueMap, /vectorEffect="non-scaling-stroke"/);
  assert.match(fatigueMap, /strokeLinecap="round"/);
  assert.match(fatigueMap, /strokeLinejoin="round"/);
});

test('recovery UI metadata covers exactly 10 canonical groups with existing assets', () => {
  assert.deepEqual(RECOVERY_GROUP_UI_ITEMS.map((item) => item.group), BODY_MUSCLE_GROUPS);
  assert.equal(RECOVERY_GROUP_UI_ITEMS.length, 10);
  assert.deepEqual(Object.keys(RECOVERY_GROUP_UI_METADATA), [...BODY_MUSCLE_GROUPS]);
  for (const item of RECOVERY_GROUP_UI_ITEMS) {
    assert.equal(item.label.length > 0, true);
    assert.equal(item.thumbnailPath.startsWith('/muscle-groups/full/'), true);
    assert.equal(existsSync(`public${item.thumbnailPath}`), true, item.thumbnailPath);
    assert.equal(item.anatomyDescription.length >= 60, true, item.group);
    assert.match(item.anatomyDescription, /[ăâđêôơưáàảãạ]/i);
  }
  assert.doesNotMatch(recoveryMetadata, /@\/lib\/ai|fetch\(|generateContent/);
});

test('calves and thighs own detailed distinct path collections on both views', () => {
  assert.equal(FRONT_MUSCLE_PATHS.LEGS?.length, 6);
  assert.equal(FRONT_MUSCLE_PATHS.CALVES?.length, 4);
  assert.equal(BACK_MUSCLE_PATHS.LEGS?.length, 4);
  assert.equal(BACK_MUSCLE_PATHS.CALVES?.length, 2);
  assert.equal(
    FRONT_MUSCLE_PATHS.LEGS?.some((path) => FRONT_MUSCLE_PATHS.CALVES?.includes(path)),
    false,
  );
  assert.equal(
    BACK_MUSCLE_PATHS.LEGS?.some((path) => BACK_MUSCLE_PATHS.CALVES?.includes(path)),
    false,
  );
});

test('calves inherit interactive score, focus, label and selection behavior', () => {
  assert.match(muscleBody, /\| 'CALVES'/);
  for (const id of ['shin_outer_l', 'shin_inner_l', 'shin_outer_r', 'shin_inner_r', 'calf_l', 'calf_r'] as const) {
    assert.equal(REGION_GROUP_MAP[id], 'CALVES');
  }
  assert.match(muscleBody, /recoveryColor\(score\)/);
  assert.match(muscleBody, /onSelectMuscle\?\.\(group, trigger\)/);
  assert.match(fatigueMap, /onSelect\(region\.id, event\.currentTarget\)/);
});

test('thumbnail supports decorative and meaningful modes with an accessible fallback', () => {
  assert.match(thumbnail, /mode\?: 'decorative' \| 'meaningful'/);
  assert.match(thumbnail, /alt=\{decorative \? ''/);
  assert.match(thumbnail, /onError=\{\(\) => setHasError\(true\)\}/);
  assert.match(thumbnail, /role=\{!decorative && hasError \? 'img'/);
  assert.match(thumbnail, /Minh họa nhóm cơ/);
});

test('recovery UI exposes four visible states and routed Why detail without generation handoff', () => {
  assert.doesNotMatch(recoveryUi, /RECOVERY_WORKOUT_HANDOFF_STORAGE_KEY/);
  assert.doesNotMatch(recoveryUi, /chưa đủ dữ liệu/i);
  assert.doesNotMatch(recoveryUi, /Không xác định/);
  assert.match(recoveryUi, /readonly VisibleRecoveryStatus\[\]/);
  assert.match(recoveryUi, /Không tải được dữ liệu phục hồi/);
  assert.match(recoveryUi, /mô hình cũ/);
  assert.doesNotMatch(recoveryUi, /Tạo buổi tập theo phục hồi/);
  assert.match(recoveryDetail, /Vì sao có mức này/);
  assert.match(recoveryUi, /Đau hoặc khó chịu thực tế luôn được ưu tiên/);
  assert.match(recoveryUi, /overflow-x-hidden/);
});

test('recovery is discoverable from navigation and command palette', () => {
  assert.match(nav, /href: '\/recovery'/);
  assert.match(palette, /router\.push\('\/recovery'\)/);
});

test('AI workout generation warns for weak selected groups and offers both decisions', () => {
  assert.match(workoutGenerator, /fetch\('\/api\/recovery'/);
  assert.match(workoutGenerator, /group\.readiness < 80/);
  assert.match(workoutGenerator, /Nhóm cơ của buổi này đang yếu/);
  assert.match(workoutGenerator, /Tạo nhưng bỏ nhóm cơ yếu/);
  assert.match(workoutGenerator, /Vẫn tạo và giảm tải/);
  assert.match(workoutGenerator, /recoveryDecision/);
  assert.match(workoutGenerator, /requestedRecoveryGroups: recoveryGroupsOverride \?\? BODY_MUSCLE_GROUPS/);
});
