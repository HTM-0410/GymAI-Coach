-- Additive workout metric standardization. Canonical units are kg, seconds and meters.
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS default_tracking_mode TEXT NOT NULL DEFAULT 'reps',
  ADD COLUMN IF NOT EXISTS allowed_tracking_modes TEXT[] NOT NULL DEFAULT ARRAY['reps']::TEXT[],
  ADD COLUMN IF NOT EXISTS tracking_mode_review_status TEXT NOT NULL DEFAULT 'needs_review',
  ADD COLUMN IF NOT EXISTS tracking_mode_source TEXT NOT NULL DEFAULT 'safe_fallback',
  ADD COLUMN IF NOT EXISTS load_basis TEXT NOT NULL DEFAULT 'none';

ALTER TABLE exercises
  DROP CONSTRAINT IF EXISTS exercises_default_tracking_mode_check,
  ADD CONSTRAINT exercises_default_tracking_mode_check CHECK (default_tracking_mode IN ('weight_reps', 'reps', 'duration', 'duration_distance')),
  DROP CONSTRAINT IF EXISTS exercises_allowed_tracking_modes_check,
  ADD CONSTRAINT exercises_allowed_tracking_modes_check CHECK (allowed_tracking_modes <@ ARRAY['weight_reps', 'reps', 'duration', 'duration_distance']::TEXT[] AND cardinality(allowed_tracking_modes) > 0 AND default_tracking_mode = ANY(allowed_tracking_modes)),
  DROP CONSTRAINT IF EXISTS exercises_tracking_mode_review_status_check,
  ADD CONSTRAINT exercises_tracking_mode_review_status_check CHECK (tracking_mode_review_status IN ('reviewed', 'needs_review')),
  DROP CONSTRAINT IF EXISTS exercises_load_basis_check,
  ADD CONSTRAINT exercises_load_basis_check CHECK (load_basis IN ('external_total', 'per_implement', 'assistance', 'none'));

ALTER TABLE workout_exercises
  DROP CONSTRAINT IF EXISTS workout_exercises_phase_prescription_check,
  DROP CONSTRAINT IF EXISTS workout_exercises_prescription_shape_check,
  ADD COLUMN IF NOT EXISTS tracking_mode TEXT,
  ADD COLUMN IF NOT EXISTS duration_style TEXT,
  ADD COLUMN IF NOT EXISTS target_duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS target_distance_meters NUMERIC(10,2);

ALTER TABLE workout_exercises
  ADD CONSTRAINT workout_exercises_tracking_mode_check CHECK (tracking_mode IS NULL OR tracking_mode IN ('weight_reps', 'reps', 'duration', 'duration_distance')),
  ADD CONSTRAINT workout_exercises_duration_style_check CHECK (duration_style IS NULL OR duration_style IN ('active', 'hold')),
  ADD CONSTRAINT workout_exercises_target_duration_check CHECK (target_duration_seconds IS NULL OR target_duration_seconds > 0),
  ADD CONSTRAINT workout_exercises_target_distance_check CHECK (target_distance_meters IS NULL OR target_distance_meters > 0);

ALTER TABLE workout_exercises
  ADD CONSTRAINT workout_exercises_tracking_shape_check CHECK (
    tracking_mode IS NULL
    OR (tracking_mode = 'weight_reps' AND target_rep_min IS NOT NULL AND target_rep_max IS NOT NULL AND target_duration_seconds IS NULL AND target_distance_meters IS NULL)
    OR (tracking_mode = 'reps' AND target_rep_min IS NOT NULL AND target_rep_max IS NOT NULL AND target_weight IS NULL AND target_rir IS NULL AND target_duration_seconds IS NULL AND target_distance_meters IS NULL)
    OR (tracking_mode = 'duration' AND target_duration_seconds IS NOT NULL AND target_weight IS NULL AND target_rir IS NULL AND target_rep_min IS NULL AND target_rep_max IS NULL AND target_distance_meters IS NULL)
    OR (tracking_mode = 'duration_distance' AND (target_duration_seconds IS NOT NULL OR target_distance_meters IS NOT NULL) AND target_weight IS NULL AND target_rir IS NULL AND target_rep_min IS NULL AND target_rep_max IS NULL)
  );

ALTER TABLE workout_sets
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS distance_meters NUMERIC(10,2);

ALTER TABLE workout_sets
  ADD CONSTRAINT workout_sets_duration_seconds_check CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  ADD CONSTRAINT workout_sets_distance_meters_check CHECK (distance_meters IS NULL OR distance_meters > 0);

COMMENT ON COLUMN workout_sets.weight IS 'Canonical load in kilograms';
COMMENT ON COLUMN workout_sets.duration_seconds IS 'Canonical actual duration in seconds';
COMMENT ON COLUMN workout_sets.distance_meters IS 'Canonical actual distance in meters';
