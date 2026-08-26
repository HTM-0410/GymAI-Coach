import type { RecoveryInputQuality } from '@/lib/recovery/confidence';

export function recoveryConfidenceLabel(
  confidence: RecoveryInputQuality | 'unknown',
): string {
  switch (confidence) {
    case 'high': return 'Cao';
    case 'medium': return 'Trung bình';
    case 'low': return 'Thấp';
    default: return 'Chưa xác định';
  }
}

export function formatRecoveryProjection(
  projectedAt: string | null,
  generatedAt: string,
): string {
  if (!projectedAt) return 'Chưa ước tính';
  const projectedMs = Date.parse(projectedAt);
  const generatedMs = Date.parse(generatedAt);
  if (!Number.isFinite(projectedMs) || !Number.isFinite(generatedMs)) return 'Chưa ước tính';
  if (projectedMs <= generatedMs) return 'Đã đạt';

  const remainingMinutes = Math.max(1, Math.ceil((projectedMs - generatedMs) / 60_000));
  if (remainingMinutes < 60) return `Khoảng ${remainingMinutes} phút`;
  const remainingHours = Math.ceil(remainingMinutes / 60);
  if (remainingHours < 24) return `Khoảng ${remainingHours} giờ`;
  return `Khoảng ${Math.ceil(remainingHours / 24)} ngày`;
}
