-- =====================================================================
-- Migration: 20260819000000_program_day_exercises.sql
-- Purpose: Add program_day_exercises table so each program day can list
--          concrete exercises with target sets/reps/RIR/rest.
-- =====================================================================

CREATE TABLE program_day_exercises (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_day_id      UUID NOT NULL REFERENCES training_program_days(id) ON DELETE CASCADE,
  exercise_id         UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  order_index         INTEGER NOT NULL DEFAULT 0,
  target_sets         INTEGER NOT NULL CHECK (target_sets > 0),
  target_rep_min      INTEGER NOT NULL CHECK (target_rep_min > 0),
  target_rep_max      INTEGER NOT NULL CHECK (target_rep_max >= target_rep_min),
  target_rir          INTEGER CHECK (target_rir IS NULL OR target_rir BETWEEN 0 AND 10),
  rest_seconds        INTEGER CHECK (rest_seconds IS NULL OR rest_seconds BETWEEN 0 AND 600),
  notes               TEXT,
  UNIQUE(program_day_id, order_index)
);

CREATE INDEX idx_program_day_exercises_day
  ON program_day_exercises(program_day_id, order_index);

CREATE INDEX idx_program_day_exercises_exercise
  ON program_day_exercises(exercise_id);

-- =====================================================================
-- RLS
-- =====================================================================
ALTER TABLE program_day_exercises ENABLE ROW LEVEL SECURITY;

-- Read: anyone can read (programs are public templates; detail rows inherit)
CREATE POLICY "pde_select_all"
  ON program_day_exercises FOR SELECT
  USING (true);

-- Write: only service role / admin can mutate (seeded content)
CREATE POLICY "pde_insert_service"
  ON program_day_exercises FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "pde_update_service"
  ON program_day_exercises FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "pde_delete_service"
  ON program_day_exercises FOR DELETE
  USING (auth.role() = 'service_role');
