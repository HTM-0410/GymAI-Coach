import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import {
  BACK_MUSCLE_IDS,
  BACK_REGIONS,
  FRONT_MUSCLE_IDS,
  FRONT_REGIONS,
  fatigueColor,
  readinessToFatigue,
} from '../src/components/ui/MuscleFatigueMap';
import { REGION_GROUP_MAP } from '../src/components/ui/MuscleBody';

const mapSource = readFileSync('src/components/ui/MuscleFatigueMap.tsx', 'utf8');
const adapterSource = readFileSync('src/components/ui/MuscleBody.tsx', 'utf8');

test('front and back expose each approved low-level ID exactly once', () => {
  assert.equal(FRONT_MUSCLE_IDS.length, 34);
  assert.equal(BACK_MUSCLE_IDS.length, 26);
  assert.deepEqual(FRONT_REGIONS.map((region) => region.id), [...FRONT_MUSCLE_IDS]);
  assert.deepEqual(BACK_REGIONS.map((region) => region.id), [...BACK_MUSCLE_IDS]);
  assert.equal(new Set(FRONT_MUSCLE_IDS).size, FRONT_MUSCLE_IDS.length);
  assert.equal(new Set(BACK_MUSCLE_IDS).size, BACK_MUSCLE_IDS.length);
});

test('front has six separate abs and three separate quadriceps regions per side', () => {
  assert.equal(FRONT_MUSCLE_IDS.filter((id) => id.startsWith('abs_')).length, 6);
  assert.equal(FRONT_MUSCLE_IDS.filter((id) => id.startsWith('quad_') && id.endsWith('_l')).length, 3);
  assert.equal(FRONT_MUSCLE_IDS.filter((id) => id.startsWith('quad_') && id.endsWith('_r')).length, 3);
});

test('map uses exact responsive inline SVG geometry without the coarse atlas', () => {
  assert.match(mapSource, /viewBox="0 0 240 560"/);
  assert.match(mapSource, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(mapSource, /fillRule="evenodd"/);
  assert.match(mapSource, /shapeRendering="geometricPrecision"/);
  assert.match(mapSource, /vectorEffect="non-scaling-stroke"/);
  assert.doesNotMatch(adapterSource, /muscle-body-atlas/);
  assert.doesNotMatch(mapSource, /linearGradient|radialGradient|feGaussianBlur|<image/);
});

test('decorative head hands and feet are not selectable while muscle paths are accessible', () => {
  for (const id of ['head', 'head_back', 'hand_l', 'hand_r', 'hand_back_l', 'hand_back_r', 'foot_l', 'foot_r', 'foot_back_l', 'foot_back_r']) {
    assert.equal(REGION_GROUP_MAP[id as keyof typeof REGION_GROUP_MAP], null);
  }
  assert.match(mapSource, /pointerEvents=\{decorative \? 'none' : 'auto'\}/);
  assert.match(mapSource, /role: 'button'/);
  assert.match(mapSource, /tabIndex: 0/);
  assert.match(mapSource, /event\.key !== 'Enter' && event\.key !== ' '/);
  assert.match(mapSource, /onSelect\(region\.id, event\.currentTarget\)/);
  assert.match(mapSource, /'aria-label'/);
});

test('readiness adapter and fatigue colors clamp and cross every approved band', () => {
  assert.equal(readinessToFatigue(100), 0);
  assert.equal(readinessToFatigue(75), 0.25);
  assert.equal(readinessToFatigue(30), 0.7);
  assert.equal(readinessToFatigue(0), 1);
  assert.equal(readinessToFatigue(120), 0);
  assert.equal(readinessToFatigue(-20), 1);
  assert.equal(readinessToFatigue(null), 0);
  assert.equal(fatigueColor(0), '#555566');
  assert.equal(fatigueColor(0.25), '#75677c');
  assert.equal(fatigueColor(0.7), '#b6607e');
  assert.equal(fatigueColor(1), '#ef3f65');
});

test('adapter maps exact left and right paths to the existing canonical popup groups', () => {
  assert.equal(REGION_GROUP_MAP.pec_l, 'CHEST');
  assert.equal(REGION_GROUP_MAP.pec_r, 'CHEST');
  assert.equal(REGION_GROUP_MAP.lat_l, 'BACK');
  assert.equal(REGION_GROUP_MAP.lat_r, 'BACK');
  assert.equal(REGION_GROUP_MAP.calf_l, 'CALVES');
  assert.match(adapterSource, /onSelectMuscle\?\.\(group, trigger\)/);
});

test('required TIP 22 clean previews and 50 percent source overlays exist', () => {
  for (const face of ['FRONT', 'BACK']) {
    assert.equal(existsSync(`docs/reports/artifacts/TIP-MR-UI-22-${face}.png`), true);
    assert.equal(existsSync(`docs/reports/artifacts/TIP-MR-UI-22-${face}-OVERLAY-50.png`), true);
  }
});
