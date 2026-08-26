import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const detailSource = readFileSync('src/app/(app)/gyms/[id]/gym-detail-client.tsx', 'utf8');
const newGymSource = readFileSync('src/app/(app)/gyms/new/new-gym-form.tsx', 'utf8');
const onboardingSource = readFileSync('src/app/onboarding/equipment-step.tsx', 'utf8');
const onboardingModalSource = readFileSync('src/app/onboarding/custom-gym-setup-modal.tsx', 'utf8');

test('AI equipment scan inputs allow choosing an existing gallery image', () => {
  assert.equal(
    (detailSource.match(/capture="environment"/g) ?? []).length,
    1,
    'Only the custom-equipment camera input may force the rear camera',
  );
  assert.doesNotMatch(newGymSource, /capture="environment"/);
  assert.match(detailSource, /Chọn ảnh AI quét/);
  assert.match(newGymSource, /Chọn ảnh để AI quét/);
});

test('onboarding keeps image detection inside the custom gym modal', () => {
  assert.match(onboardingSource, /Tự thiết lập phòng tập của bạn/);
  assert.match(onboardingSource, /CustomGymSetupModal/);
  assert.doesNotMatch(onboardingSource, /type="file"/);
  assert.doesNotMatch(onboardingSource, /capture="environment"/);
  assert.doesNotMatch(onboardingSource, /\/api\/equipment\/detect/);

  assert.equal((onboardingModalSource.match(/type="file"/g) ?? []).length, 2);
  assert.equal((onboardingModalSource.match(/capture="environment"/g) ?? []).length, 1);
  assert.match(onboardingModalSource, /Tên phòng tập/);
  assert.match(onboardingModalSource, /\/api\/equipment\/detect/);
  assert.match(onboardingModalSource, /EQUIPMENT_CATEGORIES/);
  assert.match(onboardingModalSource, /WEIGHT_SUBCATEGORIES/);
  assert.match(onboardingModalSource, /label="Tạ"/);
  assert.match(onboardingModalSource, /showImageMenu/);
  assert.match(onboardingModalSource, /chooseImageSource\('camera'\)/);
  assert.match(onboardingModalSource, /chooseImageSource\('gallery'\)/);
  assert.equal(
    (onboardingModalSource.match(/Quét ảnh AI/g) ?? []).length,
    1,
    'The compact AI picker should expose a single trigger before choosing camera or gallery',
  );
  assert.match(onboardingModalSource, /classifyEquipment\(item\) === 'no-equipment'/);
  assert.match(onboardingModalSource, /new Set\(\[\.\.\.selected, \.\.\.bodyweightEquipmentIds\]\)/);
  assert.match(onboardingModalSource, /category\.id !== 'no-equipment'/);
  assert.match(onboardingModalSource, /sticky top-0 z-20/);
  assert.match(
    onboardingModalSource,
    /style=\{\{ position: 'fixed', inset: 0, zIndex: 120 \}\}/,
    'The body-level modal portal must outrank the global noise-overlay positioning rule',
  );
});
