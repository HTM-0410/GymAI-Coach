-- Cover every Muscle Readiness foreign key used for parent updates or deletes.

CREATE INDEX idx_muscle_training_loads_workout_owner
  ON public.muscle_training_loads(workout_id, user_id);

CREATE INDEX idx_muscle_training_loads_exercise_workout
  ON public.muscle_training_loads(workout_exercise_id, workout_id);

CREATE INDEX idx_muscle_training_loads_muscle
  ON public.muscle_training_loads(muscle_id);

CREATE INDEX idx_muscle_recovery_states_last_workout_owner
  ON public.muscle_recovery_states(last_workout_id, user_id)
  WHERE last_workout_id IS NOT NULL;

CREATE INDEX idx_muscle_recovery_states_muscle
  ON public.muscle_recovery_states(muscle_id);
