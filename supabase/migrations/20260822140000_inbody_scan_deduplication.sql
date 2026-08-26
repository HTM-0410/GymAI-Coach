ALTER TABLE public.body_composition_measurements
  ADD COLUMN IF NOT EXISTS scan_fingerprint TEXT;

ALTER TABLE public.body_composition_measurements
  DROP CONSTRAINT IF EXISTS body_composition_scan_fingerprint_format;

ALTER TABLE public.body_composition_measurements
  ADD CONSTRAINT body_composition_scan_fingerprint_format
  CHECK (scan_fingerprint IS NULL OR scan_fingerprint ~ '^[a-f0-9]{64}$');

CREATE UNIQUE INDEX IF NOT EXISTS idx_body_composition_unique_scan
  ON public.body_composition_measurements(user_id, scan_fingerprint)
  WHERE scan_fingerprint IS NOT NULL;

COMMENT ON COLUMN public.body_composition_measurements.scan_fingerprint IS
  'HMAC fingerprint of owner, normalized phone and measurement minute. Raw phone is never stored.';
