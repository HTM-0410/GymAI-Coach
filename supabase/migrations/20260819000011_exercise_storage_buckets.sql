-- =====================================================================
-- Storage buckets for exercise media
-- Migration: 20260819000011_exercise_storage_buckets.sql
-- =====================================================================
-- Two public buckets:
--   - exercise-images     — 1324 JPG thumbnails (≤512 KB / file)
--   - exercise-animations — 1324 GIF animations (≤2 MB / file)
--
-- Idempotent: safe to re-run.
-- =====================================================================

-- ─── Buckets ──────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'exercise-images',
    'exercise-images',
    true,
    524288, -- 512 KB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'exercise-animations',
    'exercise-animations',
    true,
    2097152, -- 2 MB
    ARRAY['image/gif']
  )
ON CONFLICT (id) DO NOTHING;

-- ─── Policies ─────────────────────────────────────────────────────────
-- Public buckets allow public read by default.
-- Only service_role may write (upload done by scripts with service key).

DROP POLICY IF EXISTS "Service role can write exercise-images" ON storage.objects;
CREATE POLICY "Service role can write exercise-images"
  ON storage.objects FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'exercise-images');

DROP POLICY IF EXISTS "Service role can write exercise-animations" ON storage.objects;
CREATE POLICY "Service role can write exercise-animations"
  ON storage.objects FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'exercise-animations');

DROP POLICY IF EXISTS "Service role can update exercise media" ON storage.objects;
CREATE POLICY "Service role can update exercise media"
  ON storage.objects FOR UPDATE TO service_role
  USING (bucket_id IN ('exercise-images', 'exercise-animations'));

DROP POLICY IF EXISTS "Service role can delete exercise media" ON storage.objects;
CREATE POLICY "Service role can delete exercise media"
  ON storage.objects FOR DELETE TO service_role
  USING (bucket_id IN ('exercise-images', 'exercise-animations'));
