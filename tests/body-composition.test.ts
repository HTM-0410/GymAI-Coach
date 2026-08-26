import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createInBodyScanFingerprint, normalizeInBodyPhone } from '../src/lib/personalization/inbody-deduplication.server';
import {
  ALL_BODY_COMPOSITION_ALLOWED_USES,
  INBODY_EXTRACTION_FLAGS,
  BodyCompositionExtractionSchema,
  SaveBodyCompositionSchema,
  buildInBodyPrompt,
  bodyCompositionSegmentInserts,
  calculateBodyCompositionTrend,
  normalizeInBodyExtractionPayload,
} from '../src/lib/personalization/body-composition';

const baseSave = {
  source: 'manual' as const,
  measuredAt: '2026-08-22T04:00:00.000Z',
  values: { weightKg: 70, skeletalMuscleMassKg: 31, percentBodyFat: 18 },
  extractionMethod: 'manual' as const,
  comparability: 'medium' as const,
  allowedUses: ['planner' as const],
  reviewed: true as const,
};

test('manual baseline is valid without Gemini when user reviewed it', () => {
  assert.equal(SaveBodyCompositionSchema.safeParse(baseSave).success, true);
});

test('draft extraction cannot be saved before explicit review', () => {
  assert.equal(SaveBodyCompositionSchema.safeParse({ ...baseSave, reviewed: false }).success, false);
});

test('body composition ranges fail closed', () => {
  assert.equal(SaveBodyCompositionSchema.safeParse({ ...baseSave, values: { weightKg: 900 } }).success, false);
  assert.equal(SaveBodyCompositionSchema.safeParse({ ...baseSave, values: {} }).success, false);
});

test('one measurement is baseline and does not create a trend', () => {
  assert.equal(calculateBodyCompositionTrend([{
    id: 'one', measured_at: '2026-08-22T00:00:00Z', device_brand: 'InBody', device_model: '270',
    comparability: 'high', weight_kg: 70, skeletal_muscle_mass_kg: 31, percent_body_fat: 18,
  }]), null);
});

test('two comparable same-device measurements expose descriptive deltas', () => {
  const trend = calculateBodyCompositionTrend([
    { id: 'old', measured_at: '2026-08-01T00:00:00Z', device_brand: 'InBody', device_model: '270', comparability: 'high', weight_kg: 70, skeletal_muscle_mass_kg: 31, percent_body_fat: 18 },
    { id: 'new', measured_at: '2026-08-22T00:00:00Z', device_brand: 'InBody', device_model: '270', comparability: 'high', weight_kg: 71, skeletal_muscle_mass_kg: 31.4, percent_body_fat: 17.5 },
  ]);
  assert.deepEqual(trend, { fromId: 'old', toId: 'new', weightKg: 1, skeletalMuscleMassKg: 0.4, percentBodyFat: -0.5 });
});

test('different devices or low comparability suppress trend', () => {
  const rows = [
    { id: 'old', measured_at: '2026-08-01T00:00:00Z', device_brand: 'InBody', device_model: '270', comparability: 'high' as const, weight_kg: 70, skeletal_muscle_mass_kg: 31, percent_body_fat: 18 },
    { id: 'new', measured_at: '2026-08-22T00:00:00Z', device_brand: 'Other', device_model: 'X', comparability: 'high' as const, weight_kg: 71, skeletal_muscle_mass_kg: 31.4, percent_body_fat: 17.5 },
  ];
  assert.equal(calculateBodyCompositionTrend(rows), null);
});

test('extraction schema requires confidence for every editable field', () => {
  const parsed = BodyCompositionExtractionSchema.safeParse({
    measuredAt: null, deviceBrand: null, deviceModel: null,
    values: {}, confidence: {}, overallConfidence: 0.5, missingFields: [],
  });
  assert.equal(parsed.success, false);
});

test('InBody prompt treats image as untrusted and forbids personal identifiers', () => {
  const prompt = buildInBodyPrompt();
  assert.match(prompt, /KHÔNG ĐÁNG TIN CẬY/);
  assert.match(prompt, /số điện thoại/);
  assert.match(prompt, /Không suy đoán/);
  assert.match(prompt, /Skeletal Muscle Mass\/SMM/);
});

test('InBody payload normalizes a date-only measurement timestamp', () => {
  assert.deepEqual(normalizeInBodyExtractionPayload({ measuredAt: '2026-08-22', values: {} }), {
    measuredAt: '2026-08-22T00:00:00.000Z',
    values: {},
  });
});

test('scan fingerprint matches only when owner, normalized phone, and measurement minute match', () => {
  assert.equal(normalizeInBodyPhone('+84 986 122 510'), '0986122510');
  const base = { userId: 'user-a', phoneNumber: '0986 122 510', measuredAt: '2026-03-18T10:41:20.000Z' };
  const fingerprint = createInBodyScanFingerprint(base, 'test-secret');
  assert.match(fingerprint ?? '', /^[a-f0-9]{64}$/);
  assert.equal(createInBodyScanFingerprint({ ...base, phoneNumber: '+84 986 122 510', measuredAt: '2026-03-18T10:41:59.000Z' }, 'test-secret'), fingerprint);
  assert.notEqual(createInBodyScanFingerprint({ ...base, measuredAt: '2026-03-18T10:42:00.000Z' }, 'test-secret'), fingerprint);
  assert.notEqual(createInBodyScanFingerprint({ ...base, phoneNumber: '0912345678' }, 'test-secret'), fingerprint);
});

test('segmental lean and fat analysis creates ten normalized persistence rows', () => {
  const metric = (massKg: number) => ({ massKg, percentOfReference: 100, evaluation: 'normal' as const });
  const segments = {
    leftArm: { lean: metric(2.6), fat: metric(0.8) },
    rightArm: { lean: metric(2.6), fat: metric(0.8) },
    trunk: { lean: metric(22.2), fat: { ...metric(7.1), evaluation: 'above' as const } },
    leftLeg: { lean: metric(7.63), fat: metric(2.1) },
    rightLeg: { lean: metric(7.81), fat: metric(2.1) },
  };
  const rows = bodyCompositionSegmentInserts(segments);
  assert.equal(rows.length, 10);
  assert.deepEqual(rows.find((row) => row.segment === 'trunk' && row.tissue_type === 'fat'), {
    segment: 'trunk', tissue_type: 'fat', mass_kg: 7.1, percent_of_reference: 100, device_evaluation: 'above',
  });
});

test('confirmed body composition always targets all three AI surfaces', () => {
  assert.deepEqual([...ALL_BODY_COMPOSITION_ALLOWED_USES], ['planner', 'coach', 'weekly_report']);
});

test('automatic extraction sends the selected image directly with external processing consent', () => {
  assert.deepEqual(INBODY_EXTRACTION_FLAGS, { consent: 'true' });
  const route = readFileSync(new URL('../src/app/api/inbody/extract/route.ts', import.meta.url), 'utf8');
  assert.match(route, /body_composition_external_processing/);
  assert.match(route, /user_selected_inbody_image/);
  assert.match(route, /INBODY_EXTRACTION_FLAGS\.consent/);
  assert.match(route, /No readable body-composition metrics/);
  assert.match(route, /MEDIA_RESOLUTION_HIGH/);
  assert.match(route, /duplicate_scan/);
  assert.match(route, /createInBodyScanFingerprint/);
  assert.match(route, /const \{ phoneNumber, \.\.\.extraction \}/);
  assert.doesNotMatch(route, /redactionApplied|redactedImage|redaction_required/);

  const gemini = readFileSync(new URL('../src/lib/ai/gemini.ts', import.meta.url), 'utf8');
  assert.match(gemini, /responseJsonSchema = opts\.responseSchema/);
  assert.doesNotMatch(gemini, /generationConfig\.response_schema/);
});

test('modal scan UI auto-extracts and has one final save action', () => {
  const source = readFileSync(new URL('../src/app/(app)/profile/body-composition/body-composition-client.tsx', import.meta.url), 'utf8');
  assert.match(source, /await extract\(file\)/);
  assert.match(source, /Dialog\.Trigger/);
  assert.match(source, /Dialog\.Content/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /Dialog\.Overlay style=\{\{ position: 'fixed', zIndex: 60 \}\}/);
  assert.match(source, /Dialog\.Content style=\{\{ position: 'fixed', left: '50%', top: '50%', zIndex: 70 \}\}/);
  assert.match(source, /Chụp hoặc tải ảnh/);
  assert.match(source, /Lưu kết quả/);
  assert.match(source, /setModalOpen\(false\)/);
  assert.match(source, /reviewed: true/);
  assert.match(source, /allowedUses: \[\.\.\.ALL_BODY_COMPOSITION_ALLOWED_USES\]/);
  assert.doesNotMatch(source, /externalConsent|Phân tích bản đã che|Tôi đã đối chiếu|role="switch"|\/api\/body-composition\/consent|aiEnabled|previewUrl|redactedImage/);
});

test('profile InBody modal sends directly and never renders an uploaded-image preview', () => {
  const source = readFileSync(new URL('../src/components/inbody-scan-modal.tsx', import.meta.url), 'utf8');
  assert.match(source, /await extract\(file\)/);
  assert.match(source, /form\.append\('image', imageFile/);
  assert.match(source, /Gemini 3\.5 Flash-Lite/);
  assert.match(source, /style=\{\{ position: 'fixed', inset: 0, zIndex: 99999 \}\}/);
  assert.doesNotMatch(source, /next\/image|previewUrl|createRedactedDerivative|redactedImage|redactionApplied/);
});

test('measurement page has one add trigger and no inline workflow section', () => {
  const source = readFileSync(new URL('../src/app/(app)/profile/body-composition/body-composition-client.tsx', import.meta.url), 'utf8');
  assert.equal((source.match(/<Dialog\.Trigger/g) ?? []).length, 1);
  assert.doesNotMatch(source, /measurement-form-title|Cá nhân hoá AI/);
  assert.match(source, /Nhập thủ công/);
  assert.match(source, /overflow-y-auto overflow-x-hidden/);
});

test('save API enforces always-on uses without creating legacy AI consent', () => {
  const source = readFileSync(new URL('../src/app/api/body-composition/route.ts', import.meta.url), 'utf8');
  assert.match(source, /allowed_uses: \[\.\.\.ALL_BODY_COMPOSITION_ALLOWED_USES\]/);
  assert.doesNotMatch(source, /body_composition_planner|reviewed_body_composition|data_consents/);
  assert.match(source, /body_composition_segments/);
  assert.match(source, /device_target_values/);
  assert.match(source, /segment_save_failed/);
});

test('post-scan UI presents Vietnamese AI, segmental muscle-fat, and weight control sections', () => {
  const source = readFileSync(new URL('../src/components/inbody-detailed-results.tsx', import.meta.url), 'utf8');
  assert.match(source, /AI phân tích chỉ số/);
  assert.match(source, /Tổng quan thành phần cơ thể/);
  assert.match(source, /Nguồn mục tiêu: thiết bị InBody/);
  assert.match(source, /đây chưa phải mục tiêu do bạn tự chọn/);
  assert.match(source, /Biểu đồ Cơ - Mỡ/);
  assert.match(source, /Phân tích BMI và PBF/);
  assert.match(source, /vạch đen là mục tiêu/);
  assert.match(source, /Mức thay đổi cần thiết/);
  assert.match(source, /Thay đổi lớn/);
  assert.match(source, /cần \$\{comparison > 0 \? 'giảm' : 'tăng'\}/);
  assert.match(source, /Phân bố cơ và mỡ theo vùng/);
  assert.match(source, /Tay trái/);
  assert.match(source, /Thân người/);
  assert.match(source, /Kiểm soát cân nặng và chuyển hoá/);
});

test('deduplication migration stores only a unique HMAC fingerprint, never a raw phone', () => {
  const sql = readFileSync('supabase/migrations/20260822140000_inbody_scan_deduplication.sql', 'utf8');
  assert.match(sql, /scan_fingerprint TEXT/);
  assert.match(sql, /UNIQUE INDEX[\s\S]*user_id, scan_fingerprint/i);
  assert.doesNotMatch(sql, /phone_number|raw_phone/i);
});

test('database-backed AI context no longer queries legacy body composition consent', () => {
  const source = readFileSync(new URL('../src/lib/ai/personalization-context.server.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from\('data_consents'\)/);
  assert.match(source, /consents: \[\]/);
});
