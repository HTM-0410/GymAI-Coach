-- Add perceived_effort to workout_sets for natural language set difficulty tracking
ALTER TABLE public.workout_sets
  ADD COLUMN IF NOT EXISTS perceived_effort TEXT
  CHECK (perceived_effort IS NULL OR perceived_effort IN ('too_hard', 'hard', 'appropriate', 'easy'));

COMMENT ON COLUMN public.workout_sets.perceived_effort IS
  'Subjective rating of set difficulty: too_hard (Quá sức ~ RIR 0), hard (Nặng ~ RIR 1), appropriate (Vừa sức ~ RIR 2), easy (Nhẹ ~ RIR 4+).';
