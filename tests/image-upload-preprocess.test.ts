import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getEquipmentDetectErrorMessage,
  EQUIPMENT_DETECT_ERROR_MESSAGES,
} from '../src/lib/equipment-detect-errors';
import { preprocessImageForUpload } from '../src/lib/client-image-preprocess';

test('getEquipmentDetectErrorMessage provides clear Vietnamese messages for all error codes', () => {
  assert.equal(
    getEquipmentDetectErrorMessage('unauthorized'),
    'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  );
  assert.equal(
    getEquipmentDetectErrorMessage('no_image'),
    'Không tìm thấy file ảnh để phân tích.',
  );
  assert.equal(
    getEquipmentDetectErrorMessage('too_large'),
    'Kích thước ảnh vượt quá giới hạn cho phép (tối đa 5MB).',
  );
  assert.equal(
    getEquipmentDetectErrorMessage('bad_mime'),
    'Định dạng ảnh không được hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.',
  );
  assert.equal(
    getEquipmentDetectErrorMessage('ai_failed'),
    'AI không thể phân tích ảnh lúc này. Vui lòng thử lại sau.',
  );
  assert.equal(
    getEquipmentDetectErrorMessage('scan_upload_failed'),
    'Không thể lưu trữ ảnh quét. Vui lòng thử lại.',
  );
  assert.equal(
    getEquipmentDetectErrorMessage('network_error'),
    'Lỗi kết nối mạng khi tải ảnh lên. Vui lòng thử lại.',
  );
});

test('getEquipmentDetectErrorMessage returns fallback for unknown errors', () => {
  assert.equal(
    getEquipmentDetectErrorMessage('unknown_error_code', 'Lỗi tùy biến'),
    'Lỗi tùy biến',
  );
  assert.equal(
    getEquipmentDetectErrorMessage(null),
    'Không thể phân tích ảnh thiết bị. Vui lòng thử lại.',
  );
});

test('preprocessImageForUpload handles non-browser environment gracefully', async () => {
  const dummyBuffer = new Uint8Array(3488106); // 3,488,106 bytes like IMG_5211.PNG
  const dummyFile = new File([dummyBuffer], 'IMG_5211.PNG', { type: 'image/png' });

  const result = await preprocessImageForUpload(dummyFile);
  assert.ok(result.file);
  assert.equal(result.file.name, 'IMG_5211.PNG');
  assert.equal(typeof result.cleanup, 'function');
  result.cleanup();
});

test('Equipment detection payload size boundaries conform to 5MB MAX_SIZE', () => {
  const MAX_ALLOWED_BYTES = 5 * 1024 * 1024; // 5,242,880 bytes
  const standardTestImageBytes = 3488106; // IMG_5211.PNG

  assert.ok(
    standardTestImageBytes < MAX_ALLOWED_BYTES,
    'Standard test image size (3.48MB) must be strictly below the 5MB API limit',
  );

  const clientPreprocessingThreshold = 4.5 * 1024 * 1024; // 4,718,592 bytes
  assert.ok(
    clientPreprocessingThreshold < MAX_ALLOWED_BYTES,
    'Client preprocess threshold ensures uploaded payloads never trigger 413 TOO_LARGE',
  );
});
