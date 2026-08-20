-- =====================================================================
-- RLS: anon & authenticated can read system exercises
-- Migration: 20260819000012_exercises_anon_read_policy.sql
-- =====================================================================
-- Idempotent.
-- =====================================================================

DROP POLICY IF EXISTS "anon can read system exercises" ON exercises;
CREATE POLICY "anon can read system exercises"
  ON exercises FOR SELECT
  TO anon, authenticated
  USING (
    type = 'system'
    AND status = 'published'
    AND owner_user_id IS NULL
  );
