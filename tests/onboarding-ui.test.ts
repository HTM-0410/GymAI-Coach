import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  normalizeOnboardingDuration,
  ONBOARDING_DURATION_OPTIONS,
} from '../src/lib/onboarding';

const formSource = readFileSync('src/app/onboarding/onboarding-form.tsx', 'utf8');
const equipmentSource = readFileSync('src/app/onboarding/equipment-step.tsx', 'utf8');
const pageSource = readFileSync('src/app/onboarding/page.tsx', 'utf8');
const globalStyles = readFileSync('src/app/globals.css', 'utf8');
const layoutSource = readFileSync('src/app/layout.tsx', 'utf8');

test('onboarding keeps the four-step data flow while using one form submission path', () => {
  assert.match(formSource, /const TOTAL_STEPS = 4/);
  assert.match(formSource, /onSubmit=\{handleSubmit\}/);
  assert.match(formSource, /if \(step === 1\)/);
  assert.match(formSource, /if \(step === 2\)/);
  assert.match(formSource, /if \(step === 3\)/);
  assert.match(formSource, /void save\(\)/);
});

test('bodyweight remains a required hidden default across preset changes', () => {
  assert.match(formSource, /item\.slug === 'bodyweight'/);
  assert.match(formSource, /\.\.\.preselectedEquipment, \.\.\.bodyweightEquipmentIds/);
  assert.match(equipmentSource, /function withBodyweight/);
  assert.match(equipmentSource, /onChange\(withBodyweight\(\[\]\)\)/);
});

test('onboarding UI includes directional motion, reduced motion and responsive constraints', () => {
  assert.match(formSource, /onboarding-step-forward/);
  assert.match(formSource, /onboarding-step-back/);
  assert.match(formSource, /focus-visible:ring-2/);
  assert.match(pageSource, /max-w-\[(1480|1800)px\]/);
  assert.match(pageSource, /pose-thumbs-up(-nobg)?\.png/);
  assert.doesNotMatch(pageSource, /profile-athlete-v5\.png/);
  assert.doesNotMatch(pageSource, /mix-blend-screen/);
  assert.match(globalStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(globalStyles, /\.onboarding-range:focus-visible/);
  assert.doesNotMatch(layoutSource, /maximumScale/);
});

test('profile inputs reserve space for leading icons and trailing units', () => {
  assert.match(formSource, /onboarding-input onboarding-input--leading/);
  assert.match(
    formSource,
    /onboarding-input onboarding-input--leading onboarding-input--trailing/,
  );
  assert.match(globalStyles, /\.onboarding-input--leading\s*{\s*padding-left: 52px;/);
  assert.match(globalStyles, /\.onboarding-input--trailing\s*{\s*padding-right: 56px;/);
  assert.doesNotMatch(formSource, /onboarding-input pl-\[52px\]/);
});

test('profile requires valid height and weight before advancing', () => {
  assert.match(formSource, /const heightIsValid = height !== ''/);
  assert.match(formSource, /const weightIsValid = weight !== ''/);
  assert.match(
    formSource,
    /displayName\.trim\(\) && heightIsValid && weightIsValid && ageIsValid && gender/,
  );
  assert.match(formSource, /setHeightTouched\(true\)/);
  assert.match(formSource, /setWeightTouched\(true\)/);
});

test('only the onboarding form body scrolls while the page remains fixed', () => {
  assert.match(pageSource, /h-svh min-h-0 overflow-hidden/);
  assert.match(formSource, /onboarding-form-body min-h-0 flex-1 overflow-y-auto overscroll-contain/);
  assert.match(globalStyles, /\.onboarding-form-body\s*{\s*scrollbar-gutter: stable;/);
  assert.match(globalStyles, /\.onboarding-form-body::-webkit-scrollbar\s*{\s*width: 8px;/);
});

test('desktop hero and the form security footer follow the unified onboarding composition', () => {
  assert.match(pageSource, /Cá nhân hoá thông minh/);
  assert.match(pageSource, /Hiệu quả vượt trội/);
  assert.match(formSource, /Dữ liệu chỉ lưu để cá nhân hoá cho bạn/);
  assert.match(formSource, /Không chia sẻ với bên thứ ba/);
  assert.match(formSource, /Bạn có thể chỉnh sửa bất kỳ lúc nào/);
});

test('onboarding collects profile details and up to two goals without an injury questionnaire', () => {
  assert.match(formSource, /id="onboarding-age"/);
  assert.match(formSource, /const \[gender, setGender\]/);
  assert.match(formSource, /if \(current\.length >= 2\) return current/);
  assert.match(formSource, /goals\[0\] === goal/);
  assert.doesNotMatch(formSource, /Có chấn thương hay vùng cần lưu ý không\?/);
});

test('onboarding session duration follows the shared 30-120 minute contract', () => {
  assert.deepEqual(ONBOARDING_DURATION_OPTIONS, [30, 45, 60, 75, 90, 105, 120]);
  assert.equal(normalizeOnboardingDuration(undefined), 60);
  assert.equal(normalizeOnboardingDuration(15), 30);
  assert.equal(normalizeOnboardingDuration(50), 45);
  assert.equal(normalizeOnboardingDuration(180), 120);
  assert.match(formSource, /ONBOARDING_DURATION_OPTIONS\.map/);
  assert.match(formSource, /Xác nhận & Khởi tạo/);
  assert.match(pageSource, /~2 phút để hoàn tất/);
});

test('profile schema is validated before related equipment records are mutated', () => {
  const profileWrite = formSource.indexOf('const { error: profileFieldsErr }');
  const equipmentDelete = formSource.indexOf(".from('profile_equipment')");
  assert.ok(profileWrite > -1);
  assert.ok(equipmentDelete > profileWrite);
  assert.match(formSource, /isMissingOnboardingSchema\(profileFieldsErr\.message\)/);
  assert.match(formSource, /Database chưa được cập nhật cho hồ sơ mới/);
});
