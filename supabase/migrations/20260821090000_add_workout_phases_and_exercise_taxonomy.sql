-- AI workout phases and reviewed exercise taxonomy.
-- Additive/backward-compatible: existing workout exercises remain main/reps.

ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'main',
  ADD COLUMN IF NOT EXISTS prescription_mode TEXT NOT NULL DEFAULT 'reps',
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS hold_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS per_side BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.workout_exercises
  DROP CONSTRAINT IF EXISTS workout_exercises_phase_check,
  ADD CONSTRAINT workout_exercises_phase_check
    CHECK (phase IN ('warmup', 'main', 'cooldown')),
  DROP CONSTRAINT IF EXISTS workout_exercises_prescription_mode_check,
  ADD CONSTRAINT workout_exercises_prescription_mode_check
    CHECK (prescription_mode IN ('reps', 'time', 'hold')),
  DROP CONSTRAINT IF EXISTS workout_exercises_phase_prescription_check,
  ADD CONSTRAINT workout_exercises_phase_prescription_check CHECK (
    (phase = 'warmup' AND prescription_mode = 'time')
    OR (phase = 'main' AND prescription_mode = 'reps')
    OR (phase = 'cooldown' AND prescription_mode IN ('time', 'hold'))
  ),
  DROP CONSTRAINT IF EXISTS workout_exercises_duration_seconds_check,
  ADD CONSTRAINT workout_exercises_duration_seconds_check
    CHECK (duration_seconds IS NULL OR duration_seconds BETWEEN 1 AND 3600),
  DROP CONSTRAINT IF EXISTS workout_exercises_hold_seconds_check,
  ADD CONSTRAINT workout_exercises_hold_seconds_check
    CHECK (hold_seconds IS NULL OR hold_seconds BETWEEN 1 AND 600),
  DROP CONSTRAINT IF EXISTS workout_exercises_prescription_shape_check,
  ADD CONSTRAINT workout_exercises_prescription_shape_check CHECK (
    (prescription_mode = 'reps' AND duration_seconds IS NULL AND hold_seconds IS NULL)
    OR (prescription_mode = 'time' AND duration_seconds IS NOT NULL AND hold_seconds IS NULL)
    OR (prescription_mode = 'hold' AND hold_seconds IS NOT NULL AND duration_seconds IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_phase_order
  ON public.workout_exercises(workout_id, phase, order_index);

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS workout_role TEXT NOT NULL DEFAULT 'main_strength',
  ADD COLUMN IF NOT EXISTS workout_role_review_status TEXT NOT NULL DEFAULT 'needs_review',
  ADD COLUMN IF NOT EXISTS workout_role_confidence NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS workout_role_source TEXT;

ALTER TABLE public.exercises
  DROP CONSTRAINT IF EXISTS exercises_workout_role_check,
  ADD CONSTRAINT exercises_workout_role_check CHECK (
    workout_role IN (
      'general_warmup',
      'dynamic_mobility',
      'activation',
      'main_strength',
      'cooldown_aerobic',
      'static_stretch'
    )
  ),
  DROP CONSTRAINT IF EXISTS exercises_workout_role_review_status_check,
  ADD CONSTRAINT exercises_workout_role_review_status_check
    CHECK (workout_role_review_status IN ('reviewed', 'needs_review')),
  DROP CONSTRAINT IF EXISTS exercises_workout_role_confidence_check,
  ADD CONSTRAINT exercises_workout_role_confidence_check
    CHECK (workout_role_confidence IS NULL OR workout_role_confidence BETWEEN 0 AND 1);

CREATE INDEX IF NOT EXISTS idx_exercises_reviewed_workout_role
  ON public.exercises(workout_role, status)
  WHERE workout_role_review_status = 'reviewed';

-- Manually reviewed subset from data/exercise-taxonomy/workout-role-classification.json.
-- Unresolved entries deliberately remain needs_review and cannot enter accessory pools.
UPDATE public.exercises AS exercise
SET workout_role = seed.workout_role,
    workout_role_review_status = seed.review_status,
    workout_role_confidence = seed.confidence,
    workout_role_source = seed.source
FROM (VALUES
  ('jump-rope', 'general_warmup', 'reviewed', 0.96, 'manual_review:canonical_instructions:2026-08-21'),
  ('stationary-bike-run-v-3', 'general_warmup', 'reviewed', 0.95, 'manual_review:canonical_instructions:2026-08-21'),
  ('hands-bike', 'general_warmup', 'reviewed', 0.90, 'manual_review:canonical_instructions:2026-08-21'),
  ('dynamic-chest-stretch-male', 'dynamic_mobility', 'reviewed', 0.98, 'manual_review:canonical_instructions:2026-08-21'),
  ('inchworm', 'dynamic_mobility', 'reviewed', 0.96, 'manual_review:canonical_instructions:2026-08-21'),
  ('world-greatest-stretch', 'dynamic_mobility', 'reviewed', 0.95, 'manual_review:canonical_instructions:2026-08-21'),
  ('walking-high-knees-lunge', 'dynamic_mobility', 'reviewed', 0.93, 'manual_review:canonical_instructions:2026-08-21'),
  ('dead-bug', 'activation', 'reviewed', 0.96, 'manual_review:canonical_instructions:2026-08-21'),
  ('glute-bridge-march', 'activation', 'reviewed', 0.96, 'manual_review:canonical_instructions:2026-08-21'),
  ('scapula-push-up', 'activation', 'reviewed', 0.95, 'manual_review:canonical_instructions:2026-08-21'),
  ('scapular-pull-up', 'activation', 'reviewed', 0.94, 'manual_review:canonical_instructions:2026-08-21'),
  ('high-knee-against-wall', 'activation', 'reviewed', 0.90, 'manual_review:canonical_instructions:2026-08-21'),
  ('barbell-bench-press', 'main_strength', 'reviewed', 0.99, 'manual_review:canonical_instructions:2026-08-21'),
  ('dumbbell-standing-overhead-press', 'main_strength', 'reviewed', 0.99, 'manual_review:canonical_instructions:2026-08-21'),
  ('push-up', 'main_strength', 'reviewed', 0.98, 'manual_review:canonical_instructions:2026-08-21'),
  ('barbell-bent-over-row', 'main_strength', 'reviewed', 0.99, 'manual_review:canonical_instructions:2026-08-21'),
  ('pull-up', 'main_strength', 'reviewed', 0.99, 'manual_review:canonical_instructions:2026-08-21'),
  ('cable-lat-pulldown-full-range-of-motion', 'main_strength', 'reviewed', 0.99, 'manual_review:canonical_instructions:2026-08-21'),
  ('barbell-full-squat', 'main_strength', 'reviewed', 0.99, 'manual_review:canonical_instructions:2026-08-21'),
  ('barbell-deadlift', 'main_strength', 'reviewed', 0.99, 'manual_review:canonical_instructions:2026-08-21'),
  ('dumbbell-goblet-squat', 'main_strength', 'reviewed', 0.99, 'manual_review:canonical_instructions:2026-08-21'),
  ('sled-45-leg-press', 'main_strength', 'reviewed', 0.99, 'manual_review:canonical_instructions:2026-08-21'),
  ('stationary-bike-walk', 'cooldown_aerobic', 'reviewed', 0.96, 'manual_review:canonical_instructions:2026-08-21'),
  ('walk-elliptical-cross-trainer', 'cooldown_aerobic', 'reviewed', 0.96, 'manual_review:canonical_instructions:2026-08-21'),
  ('walking-on-incline-treadmill', 'cooldown_aerobic', 'reviewed', 0.91, 'manual_review:canonical_instructions:2026-08-21'),
  ('hamstring-stretch', 'static_stretch', 'reviewed', 0.98, 'manual_review:canonical_instructions:2026-08-21'),
  ('calf-stretch-with-hands-against-wall', 'static_stretch', 'reviewed', 0.98, 'manual_review:canonical_instructions:2026-08-21'),
  ('overhead-triceps-stretch', 'static_stretch', 'reviewed', 0.98, 'manual_review:canonical_instructions:2026-08-21'),
  ('kneeling-lat-stretch', 'static_stretch', 'reviewed', 0.97, 'manual_review:canonical_instructions:2026-08-21'),
  ('assisted-seated-pectoralis-major-stretch-with-stability-ball', 'static_stretch', 'reviewed', 0.97, 'manual_review:canonical_instructions:2026-08-21')
) AS seed(slug, workout_role, review_status, confidence, source)
WHERE exercise.slug = seed.slug;

COMMENT ON COLUMN public.workout_exercises.phase IS
  'Session phase. Independent from workout_sets.set_type, which remains a lifting-set classification.';
COMMENT ON COLUMN public.workout_exercises.prescription_mode IS
  'How the exercise is prescribed: repetitions, active time, or a static hold.';
COMMENT ON COLUMN public.exercises.workout_role_review_status IS
  'Only reviewed taxonomy rows may enter warmup/cooldown candidate pools.';
