-- Extend onboarding profile context without changing existing primary-goal consumers.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS age SMALLINT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS secondary_goal goal_type,
  ADD COLUMN IF NOT EXISTS injury_areas TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS injury_note TEXT;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_age_check,
  ADD CONSTRAINT profiles_age_check CHECK (age IS NULL OR age BETWEEN 13 AND 100),
  DROP CONSTRAINT IF EXISTS profiles_gender_check,
  ADD CONSTRAINT profiles_gender_check CHECK (gender IS NULL OR gender IN ('male', 'female', 'other')),
  DROP CONSTRAINT IF EXISTS profiles_injury_areas_check,
  ADD CONSTRAINT profiles_injury_areas_check CHECK (
    injury_areas <@ ARRAY['knee', 'shoulder', 'lower_back', 'wrist', 'ankle', 'other']::TEXT[]
  );

COMMENT ON COLUMN profiles.goal IS 'Primary onboarding goal; remains the goal used by existing planner consumers.';
COMMENT ON COLUMN profiles.secondary_goal IS 'Optional second onboarding goal.';
COMMENT ON COLUMN profiles.injury_areas IS 'User-declared areas to consider during workout planning.';
COMMENT ON COLUMN profiles.injury_note IS 'Optional free-text injury or movement limitation note.';
