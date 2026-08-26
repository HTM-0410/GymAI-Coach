import { createHmac } from 'node:crypto';

export function normalizeInBodyPhone(value: string): string | null {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('0084')) digits = digits.slice(2);
  if (digits.startsWith('84') && digits.length >= 11) digits = `0${digits.slice(2)}`;
  return digits.length >= 9 && digits.length <= 15 ? digits : null;
}

export function inBodyMeasurementMinute(value: string): string | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 16) : null;
}

export function createInBodyScanFingerprint(input: {
  userId: string;
  phoneNumber: string | null;
  measuredAt: string | null;
}, secret = process.env.INBODY_DEDUPE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''): string | null {
  const phone = input.phoneNumber ? normalizeInBodyPhone(input.phoneNumber) : null;
  const minute = input.measuredAt ? inBodyMeasurementMinute(input.measuredAt) : null;
  if (!secret || !phone || !minute) return null;
  return createHmac('sha256', secret).update(`${input.userId}|${phone}|${minute}`).digest('hex');
}
