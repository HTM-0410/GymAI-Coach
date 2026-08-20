-- =====================================================================
-- Exercise schema normalize — JSONB for content arrays + gallery column
-- Migration: 20260819000010_exercise_jsonb_normalize.sql
-- =====================================================================
-- Idempotent: safe to re-run.
--
-- Changes:
--   1. exercises.instructions      text → jsonb
--   2. exercises.tips              text → jsonb
--   3. exercises.common_mistakes   text → jsonb
--   4. exercises.gallery_json      jsonb (new — full gallery object)
--   5. GIN indexes on equipment_vi, secondary_muscles_vi for fast facet
--      filtering (avoids in-memory array scans)
-- =====================================================================

-- ─── 1–3. JSONB conversions ───────────────────────────────────────────
-- Existing text columns contain JSON.stringify(string[]).
-- to_jsonb(text) parses the string if valid JSON, else raises.
-- All existing values are arrays produced by sync-exercises.ts → safe.
ALTER TABLE exercises
  ALTER COLUMN instructions     TYPE jsonb USING to_jsonb(instructions),
  ALTER COLUMN tips             TYPE jsonb USING to_jsonb(tips),
  ALTER COLUMN common_mistakes  TYPE jsonb USING to_jsonb(common_mistakes);

-- ─── 4. gallery_json ──────────────────────────────────────────────────
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS gallery_json jsonb;

-- ─── 5. GIN indexes for fast array filtering ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_exercises_equipment_gin
  ON exercises USING gin (equipment_vi);

CREATE INDEX IF NOT EXISTS idx_exercises_secondary_muscles_gin
  ON exercises USING gin (secondary_muscles_vi);
