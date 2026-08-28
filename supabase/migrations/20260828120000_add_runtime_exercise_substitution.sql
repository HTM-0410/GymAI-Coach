ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS equipment_scope TEXT;

UPDATE public.workouts
SET equipment_scope = CASE WHEN gym_id IS NULL THEN 'bodyweight' ELSE 'gym' END
WHERE equipment_scope IS NULL;

ALTER TABLE public.workouts
  ALTER COLUMN equipment_scope SET DEFAULT 'unrestricted',
  ALTER COLUMN equipment_scope SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workouts_equipment_scope_check'
      AND conrelid = 'public.workouts'::regclass
  ) THEN
    ALTER TABLE public.workouts
      ADD CONSTRAINT workouts_equipment_scope_check
      CHECK (equipment_scope IN ('unrestricted', 'bodyweight', 'gym'));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.swap_active_workout_exercise(
  p_user_id UUID,
  p_workout_id UUID,
  p_workout_exercise_id UUID,
  p_new_exercise_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM ws.id
  FROM public.workout_sets ws
  WHERE ws.workout_exercise_id = p_workout_exercise_id
  ORDER BY ws.id
  FOR UPDATE;

  PERFORM we.id
  FROM public.workout_exercises we
  WHERE we.workout_id = p_workout_id
  ORDER BY we.id
  FOR UPDATE;

  PERFORM w.id
  FROM public.workouts w
  WHERE w.id = p_workout_id
  FOR UPDATE;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workouts
    WHERE id = p_workout_id
      AND user_id = p_user_id
      AND status IN ('planned', 'in_progress')
  ) THEN
    RAISE EXCEPTION 'workout_not_swappable';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workout_exercises
    WHERE id = p_workout_exercise_id
      AND workout_id = p_workout_id
  ) THEN
    RAISE EXCEPTION 'workout_exercise_not_found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.workout_sets
    WHERE workout_exercise_id = p_workout_exercise_id
      AND completed = TRUE
  ) THEN
    RAISE EXCEPTION 'exercise_already_started';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.workout_exercises
    WHERE workout_id = p_workout_id
      AND exercise_id = p_new_exercise_id
      AND id <> p_workout_exercise_id
  ) THEN
    RAISE EXCEPTION 'duplicate_substitute';
  END IF;

  UPDATE public.workout_exercises
  SET exercise_id = p_new_exercise_id,
      target_weight = NULL,
      started_at = NULL,
      completed_at = NULL,
      ai_reason = LEFT(
        CONCAT_WS(' ', NULLIF(ai_reason, ''), 'Đổi bài trong lúc tập do thiết bị không khả dụng.'),
        500
      )
  WHERE id = p_workout_exercise_id
    AND workout_id = p_workout_id;

  UPDATE public.workout_sets
  SET weight = NULL,
      started_at = NULL,
      actual_rest_seconds = NULL
  WHERE workout_exercise_id = p_workout_exercise_id
    AND completed = FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.swap_active_workout_exercise(UUID, UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.swap_active_workout_exercise(UUID, UUID, UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.swap_active_workout_exercise(UUID, UUID, UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.swap_active_workout_exercise(UUID, UUID, UUID, UUID) TO service_role;
