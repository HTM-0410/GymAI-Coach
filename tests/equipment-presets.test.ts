import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolvePresetEquipmentIds,
  inferPresetFromEquipmentIds,
  EQUIPMENT_PRESETS,
  EquipmentItemSummary,
} from '../src/lib/equipment-presets';

const mockCatalog: EquipmentItemSummary[] = [
  { id: 'eq-1', slug: 'dumbbell', name: 'Dumbbell', name_vi: 'Tạ đơn', category: 'free_weight' },
  { id: 'eq-2', slug: 'barbell', name: 'Barbell', name_vi: 'Thanh đòn', category: 'free_weight' },
  { id: 'eq-3', slug: 'bench', name: 'Bench', name_vi: 'Ghế tập', category: 'furniture' },
  { id: 'eq-4', slug: 'incline-bench', name: 'Incline Bench', name_vi: 'Ghế nghiêng', category: 'furniture' },
  { id: 'eq-5', slug: 'squat-rack', name: 'Squat Rack', name_vi: 'Khung squat', category: 'furniture' },
  { id: 'eq-6', slug: 'cable', name: 'Cable Machine', name_vi: 'Máy cáp', category: 'machine' },
  { id: 'eq-7', slug: 'lat-pulldown', name: 'Lat Pulldown', name_vi: 'Máy kéo xô', category: 'machine' },
  { id: 'eq-8', slug: 'leg-press', name: 'Leg Press', name_vi: 'Máy đạp đùi', category: 'machine' },
  { id: 'eq-9', slug: 'leg-curl', name: 'Leg Curl', name_vi: 'Máy cuộn đùi', category: 'machine' },
  { id: 'eq-10', slug: 'leg-extension', name: 'Leg Extension', name_vi: 'Máy duỗi đùi', category: 'machine' },
  { id: 'eq-11', slug: 'pull-up-bar', name: 'Pull-up Bar', name_vi: 'Xà đơn', category: 'bodyweight' },
  { id: 'eq-12', slug: 'dip-station', name: 'Dip Station', name_vi: 'Xà kép', category: 'bodyweight' },
  { id: 'eq-13', slug: 'resistance-band', name: 'Resistance Band', name_vi: 'Dây kháng lực', category: 'accessory' },
  { id: 'eq-14', slug: 'exercise-mat', name: 'Exercise Mat', name_vi: 'Thảm tập', category: 'furniture' },
  { id: 'eq-15', slug: 'jump-rope', name: 'Jump Rope', name_vi: 'Dây nhảy', category: 'accessory' },
  { id: 'eq-16', slug: 'foam-roller', name: 'Foam Roller', name_vi: 'Con lăn xốp', category: 'accessory' },
  { id: 'eq-17', slug: 'kettlebell', name: 'Kettlebell', name_vi: 'Tạ chuông', category: 'free_weight' },
  { id: 'eq-18', slug: 'smith-machine', name: 'Smith Machine', name_vi: 'Máy Smith', category: 'machine' },
  { id: 'eq-19', slug: 'treadmill', name: 'Treadmill', name_vi: 'Máy chạy bộ', category: 'cardio' },
  { id: 'eq-20', slug: 'stationary-bike', name: 'Stationary Bike', name_vi: 'Xe đạp tập', category: 'cardio' },
  { id: 'eq-21', slug: 'pec-deck', name: 'Pec Deck', name_vi: 'Máy pec deck', category: 'machine' },
  { id: 'eq-22', slug: 'shoulder-press-machine', name: 'Shoulder Press Machine', name_vi: 'Máy đẩy vai', category: 'machine' },
  { id: 'eq-23', slug: 'chest-press-machine', name: 'Chest Press Machine', name_vi: 'Máy đẩy ngực', category: 'machine' },
  { id: 'eq-24', slug: 'rowing-machine', name: 'Rowing Machine', name_vi: 'Máy kéo rowing', category: 'cardio' },
  { id: 'eq-25', slug: 'ez-bar', name: 'EZ Bar', name_vi: 'Thanh EZ', category: 'free_weight' },
  { id: 'eq-26', slug: 'bodyweight', name: 'Bodyweight', name_vi: 'Tự trọng', category: 'bodyweight' },
];

test('EQUIPMENT_PRESETS contains all 6 required options with stable metadata', () => {
  assert.equal(EQUIPMENT_PRESETS.length, 6);
  const ids = EQUIPMENT_PRESETS.map((p) => p.id);
  assert.deepEqual(ids, ['none', 'home_basic', 'home_gym', 'gym_standard', 'gym_full', 'custom']);
});

test('resolvePresetEquipmentIds correctly resolves IDs for each preset', () => {
  // 'none' resolves to empty array
  assert.deepEqual(resolvePresetEquipmentIds('none', mockCatalog), []);

  // 'gym_full' resolves to physical equipment only, excluding the bodyweight sentinel
  const gymFullIds = resolvePresetEquipmentIds('gym_full', mockCatalog);
  assert.equal(gymFullIds.length, mockCatalog.length - 1);
  assert.equal(gymFullIds.includes('eq-26'), false);

  // 'home_basic' resolves to matching home basic items
  const homeBasicIds = resolvePresetEquipmentIds('home_basic', mockCatalog);
  assert.deepEqual(homeBasicIds, ['eq-1', 'eq-14']); // dumbbell + exercise mat only

  // 'home_gym' resolves to home gym items
  const homeGymIds = resolvePresetEquipmentIds('home_gym', mockCatalog);
  assert.ok(homeGymIds.includes('eq-1')); // dumbbell
  assert.ok(homeGymIds.includes('eq-2')); // barbell
  assert.ok(homeGymIds.includes('eq-3')); // bench
  assert.ok(homeGymIds.includes('eq-5')); // squat-rack

  // 'gym_standard' resolves to standard commercial gym items
  const stdIds = resolvePresetEquipmentIds('gym_standard', mockCatalog);
  assert.ok(stdIds.includes('eq-6')); // cable
  assert.ok(stdIds.includes('eq-7')); // lat-pulldown
  assert.ok(stdIds.includes('eq-8')); // leg-press

  // 'custom' returns empty array
  assert.deepEqual(resolvePresetEquipmentIds('custom', mockCatalog), []);
});

test('inferPresetFromEquipmentIds accurately identifies preset from selected IDs', () => {
  // Empty -> 'none'
  assert.equal(inferPresetFromEquipmentIds([], mockCatalog), 'none');

  // Full catalog -> 'gym_full'
  const allIds = mockCatalog.filter((e) => e.slug !== 'bodyweight').map((e) => e.id);
  assert.equal(inferPresetFromEquipmentIds(allIds, mockCatalog), 'gym_full');

  // Exact home basic set -> 'home_basic'
  const homeBasicIds = resolvePresetEquipmentIds('home_basic', mockCatalog);
  assert.equal(inferPresetFromEquipmentIds(homeBasicIds, mockCatalog), 'home_basic');

  // Exact home gym set -> 'home_gym'
  const homeGymIds = resolvePresetEquipmentIds('home_gym', mockCatalog);
  assert.equal(inferPresetFromEquipmentIds(homeGymIds, mockCatalog), 'home_gym');

  // Exact standard gym set -> 'gym_standard'
  const stdIds = resolvePresetEquipmentIds('gym_standard', mockCatalog);
  assert.equal(inferPresetFromEquipmentIds(stdIds, mockCatalog), 'gym_standard');

  // Arbitrary subset / custom selection -> 'custom'
  assert.equal(inferPresetFromEquipmentIds(['eq-1', 'eq-6'], mockCatalog), 'custom');
  assert.equal(inferPresetFromEquipmentIds(['eq-1', 'eq-2', 'eq-999'], mockCatalog), 'custom');
});
