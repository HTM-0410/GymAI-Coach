-- Muscle Readiness V1 persistence foundation.
-- This migration is additive and does not backfill historical workouts.

ALTER TABLE public.exercise_muscles
  ADD COLUMN contribution NUMERIC(4,3);

ALTER TABLE public.exercise_muscles
  ADD CONSTRAINT exercise_muscles_contribution_range
  CHECK (contribution IS NULL OR (contribution > 0 AND contribution <= 1));

COMMENT ON COLUMN public.exercise_muscles.contribution IS
  'Exercise contribution to this muscle from 0 exclusive to 1 inclusive. Null uses the role fallback.';

ALTER TABLE public.workouts
  ADD COLUMN recovery_processed_at TIMESTAMPTZ,
  ADD COLUMN recovery_model_version TEXT;

ALTER TABLE public.workout_exercises
  ADD CONSTRAINT workout_exercises_id_workout_id_unique UNIQUE (id, workout_id);

CREATE TABLE public.muscle_training_loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL,
  workout_exercise_id UUID NOT NULL,
  muscle_id UUID NOT NULL REFERENCES public.muscles(id) ON DELETE RESTRICT,
  completed_set_count INTEGER NOT NULL CHECK (completed_set_count > 0),
  fatigue_points NUMERIC(10,4) NOT NULL CHECK (fatigue_points >= 0),
  new_fatigue NUMERIC(7,4) NOT NULL CHECK (new_fatigue BETWEEN 0 AND 100),
  input_quality TEXT NOT NULL CHECK (input_quality IN ('low', 'medium', 'high')),
  occurred_at TIMESTAMPTZ NOT NULL,
  model_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT muscle_training_loads_workout_owner_fk
    FOREIGN KEY (workout_id, user_id)
    REFERENCES public.workouts(id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT muscle_training_loads_exercise_workout_fk
    FOREIGN KEY (workout_exercise_id, workout_id)
    REFERENCES public.workout_exercises(id, workout_id)
    ON DELETE CASCADE,
  CONSTRAINT muscle_training_loads_event_unique
    UNIQUE (workout_exercise_id, muscle_id, model_version)
);

CREATE INDEX idx_muscle_training_loads_user_occurred
  ON public.muscle_training_loads(user_id, occurred_at DESC);

CREATE INDEX idx_muscle_training_loads_user_muscle_occurred
  ON public.muscle_training_loads(user_id, muscle_id, occurred_at DESC);

CREATE TABLE public.muscle_recovery_states (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muscle_id UUID NOT NULL REFERENCES public.muscles(id) ON DELETE RESTRICT,
  fatigue_score NUMERIC(7,4) NOT NULL CHECK (fatigue_score BETWEEN 0 AND 100),
  fatigue_at TIMESTAMPTZ NOT NULL,
  half_life_hours NUMERIC(7,3) NOT NULL CHECK (half_life_hours > 0),
  confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  last_workout_id UUID,
  model_version TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, muscle_id),
  CONSTRAINT muscle_recovery_states_last_workout_owner_fk
    FOREIGN KEY (last_workout_id, user_id)
    REFERENCES public.workouts(id, user_id)
    ON DELETE SET NULL (last_workout_id)
);

CREATE INDEX idx_muscle_recovery_states_user_updated
  ON public.muscle_recovery_states(user_id, updated_at DESC);

CREATE TRIGGER trg_muscle_recovery_states_updated_at
  BEFORE UPDATE ON public.muscle_recovery_states
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.muscle_training_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muscle_training_loads FORCE ROW LEVEL SECURITY;
ALTER TABLE public.muscle_recovery_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muscle_recovery_states FORCE ROW LEVEL SECURITY;

CREATE POLICY muscle_training_loads_owner_select
  ON public.muscle_training_loads
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY muscle_recovery_states_owner_select
  ON public.muscle_recovery_states
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.muscle_training_loads FROM anon, authenticated;
REVOKE ALL ON TABLE public.muscle_recovery_states FROM anon, authenticated;
GRANT SELECT ON TABLE public.muscle_training_loads TO authenticated;
GRANT SELECT ON TABLE public.muscle_recovery_states TO authenticated;
GRANT ALL ON TABLE public.muscle_training_loads TO service_role;
GRANT ALL ON TABLE public.muscle_recovery_states TO service_role;

COMMENT ON TABLE public.muscle_training_loads IS
  'Immutable, model-versioned fatigue load events produced from completed workout exercises.';

COMMENT ON TABLE public.muscle_recovery_states IS
  'Latest per-muscle fatigue snapshot. Current readiness is derived at read time.';
