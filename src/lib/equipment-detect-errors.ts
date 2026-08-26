export type EquipmentDetectErrorCode =
  | 'unauthorized'
  | 'no_image'
  | 'too_large'
  | 'bad_mime'
  | 'invalid_gym_id'
  | 'gym_not_found'
  | 'ai_failed'
  | 'scan_upload_failed'
  | 'network_error'
  | 'unknown';

export const EQUIPMENT_DETECT_ERROR_MESSAGES: Record<string, string> = {
  unauthorized: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  no_image: 'Không tìm thấy file ảnh để phân tích.',
  too_large: 'Kích thước ảnh vượt quá giới hạn cho phép (tối đa 5MB).',
  bad_mime: 'Định dạng ảnh không được hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.',
  invalid_gym_id: 'Mã phòng tập không hợp lệ.',
  gym_not_found: 'Không tìm thấy phòng tập hoặc bạn không có quyền truy cập.',
  ai_failed: 'AI không thể phân tích ảnh lúc này. Vui lòng thử lại sau.',
  scan_upload_failed: 'Không thể lưu trữ ảnh quét. Vui lòng thử lại.',
  network_error: 'Lỗi kết nối mạng khi tải ảnh lên. Vui lòng thử lại.',
};

/**
 * Maps error codes from the equipment detection API or client exceptions
 * to user-friendly Vietnamese messages.
 */
export function getEquipmentDetectErrorMessage(
  errorCode: string | null | undefined,
  fallback = 'Không thể phân tích ảnh thiết bị. Vui lòng thử lại.',
): string {
  if (!errorCode) return fallback;
  return EQUIPMENT_DETECT_ERROR_MESSAGES[errorCode] ?? fallback;
}
