-- =====================================================================
-- Migration: 20260820140600_add_user_saved_exercises.sql
-- Description: Table and RLS policies for Bookmarking / Saving Exercises
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.user_saved_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

-- Indexes for fast query lookup
CREATE INDEX IF NOT EXISTS idx_user_saved_exercises_user ON public.user_saved_exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_exercises_exercise ON public.user_saved_exercises(exercise_id);

-- Enable RLS
ALTER TABLE public.user_saved_exercises ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own saved exercises" ON public.user_saved_exercises;
CREATE POLICY "Users can view their own saved exercises"
  ON public.user_saved_exercises
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own saved exercises" ON public.user_saved_exercises;
CREATE POLICY "Users can insert their own saved exercises"
  ON public.user_saved_exercises
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own saved exercises" ON public.user_saved_exercises;
CREATE POLICY "Users can delete their own saved exercises"
  ON public.user_saved_exercises
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role bypass
DROP POLICY IF EXISTS "Service role full access on saved exercises" ON public.user_saved_exercises;
CREATE POLICY "Service role full access on saved exercises"
  ON public.user_saved_exercises
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
