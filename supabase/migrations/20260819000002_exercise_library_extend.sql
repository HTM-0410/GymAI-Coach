-- =====================================================================
-- Exercise Library Sync — extend schema for full JSON content
-- Migration: 20260819000002_exercise_library_extend.sql
-- =====================================================================
-- Adds columns needed by scripts/sync-exercises.ts:
--   - exercises:  subtitle, tags, movement_pattern, primary_muscle_vi,
--                 safety_vi, setup_json, performance_metrics_json,
--                 performance_chart_json, ai_coach_json, content_json,
--                 updated_at, plus UNIQUE on system-exercises slug
--   - exercise_muscles: sort_order
--   - exercise_alternatives: sort_order
-- Idempotent: safe to re-run.

-- ─── exercises: extend ────────────────────────────────────────────────
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS subtitle_vi            TEXT,
  ADD COLUMN IF NOT EXISTS tags                   TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS movement_pattern       TEXT
    CHECK (movement_pattern IN ('squat','hinge','push','pull','lunge','carry','rotation','isolation')),
  ADD COLUMN IF NOT EXISTS primary_muscle_vi      TEXT,
  ADD COLUMN IF NOT EXISTS secondary_muscles_vi   TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS equipment_vi           TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS safety_vi              TEXT,
  ADD COLUMN IF NOT EXISTS setup_json             JSONB,
  ADD COLUMN IF NOT EXISTS performance_metrics_json JSONB,
  ADD COLUMN IF NOT EXISTS performance_chart_json JSONB,
  ADD COLUMN IF NOT EXISTS ai_coach_json          JSONB,
  ADD COLUMN IF NOT EXISTS content_json           JSONB,
  ADD COLUMN IF NOT EXISTS updated_at             TIMESTAMPTZ NOT NULL DEFAULT now();

-- Unique constraint on system-exercises (owner_user_id IS NULL).
-- Cannot use a simple UNIQUE(slug) because users may have a custom exercise
-- with the same slug. Use partial unique index.
CREATE UNIQUE INDEX IF NOT EXISTS exercises_system_slug_unique
  ON exercises (slug)
  WHERE owner_user_id IS NULL AND type = 'system';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exercises_movement_pattern ON exercises(movement_pattern);
CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscle ON exercises(primary_muscle_vi);
CREATE INDEX IF NOT EXISTS idx_exercises_tags ON exercises USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_exercises_content ON exercises USING GIN (content_json);

-- updated_at trigger
CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS exercises_set_updated_at ON exercises;
CREATE TRIGGER exercises_set_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ─── exercise_muscles: sort_order ─────────────────────────────────────
ALTER TABLE exercise_muscles
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- ─── exercise_alternatives: sort_order ───────────────────────────────
ALTER TABLE exercise_alternatives
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- ─── RLS: allow public read on system exercises ───────────────────────
-- Existing RLS likely restricts by owner. Verify and add public read if missing.
DO $$
BEGIN
  -- Drop the existing policy if present so we can recreate cleanly
  EXECUTE 'DROP POLICY IF EXISTS "exercises_public_read_system" ON exercises';
  EXECUTE 'DROP POLICY IF EXISTS "exercises_owner_read" ON exercises';
  EXECUTE 'DROP POLICY IF EXISTS "exercises_owner_write" ON exercises';
END $$;

CREATE POLICY "exercises_public_read_system"
  ON exercises FOR SELECT
  USING (owner_user_id IS NULL OR auth.uid() = owner_user_id);

CREATE POLICY "exercises_owner_write"
  ON exercises FOR ALL
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Note: service-role bypasses RLS so seed scripts using SERVICE_ROLE_KEY work directly.