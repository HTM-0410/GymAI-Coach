-- =====================================================================
-- Patch: add default_rest_seconds + default_rir to exercises
-- Migration: 20260818120002_patch_exercises_defaults.sql
-- =====================================================================

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS default_rest_seconds INTEGER
    CHECK (default_rest_seconds IS NULL OR default_rest_seconds BETWEEN 0 AND 600),
  ADD COLUMN IF NOT EXISTS default_rir INTEGER
    CHECK (default_rir IS NULL OR default_rir BETWEEN 0 AND 10);