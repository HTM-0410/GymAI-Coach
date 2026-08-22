-- Objective workout tracking. RIR columns intentionally remain for backward
-- compatibility with existing program templates, but the live logger no longer
-- requires users to estimate RIR.

alter table public.workout_exercises
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table public.workout_sets
  add column if not exists started_at timestamptz,
  add column if not exists actual_rest_seconds integer;

alter table public.workout_sets
  drop constraint if exists workout_sets_actual_rest_seconds_check;

alter table public.workout_sets
  add constraint workout_sets_actual_rest_seconds_check
  check (actual_rest_seconds is null or actual_rest_seconds between 0 and 86400);

comment on column public.workout_exercises.started_at is
  'Time the user starts the first working set for this exercise.';
comment on column public.workout_exercises.completed_at is
  'Time the user finishes or leaves this exercise.';
comment on column public.workout_sets.started_at is
  'Time the user explicitly starts this set.';
comment on column public.workout_sets.actual_rest_seconds is
  'Observed seconds from this set completion until the next set starts.';

create index if not exists workout_sets_exercise_completed_at_idx
  on public.workout_sets (workout_exercise_id, completed_at desc)
  where completed = true;
