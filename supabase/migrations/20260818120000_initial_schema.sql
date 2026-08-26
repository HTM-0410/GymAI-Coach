-- =====================================================================
-- GymAI Coach - Phase 1 MVP: Complete Database Schema
-- Migration: 20260818120000_initial_schema.sql
-- =====================================================================
-- Pham vi: 22 tables theo spec.md section 36
--   - profiles, body_weight_logs, muscles, equipment
--   - exercises, exercise_muscles, exercise_equipment, exercise_media
--   - exercise_alternatives
--   - gyms, gym_equipment
--   - training_programs, training_program_days, training_day_targets
--   - user_programs
--   - workouts, workout_exercises, workout_sets, workout_feedback
--   - exercise_user_stats, personal_records
--   - ai_recommendations, ai_interactions
-- Note: auth.users duoc Supabase quan ly san.
-- =====================================================================

-- Extension can thiet
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- ENUMS
-- =====================================================================

CREATE TYPE experience_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE goal_type AS ENUM ('muscle_gain', 'strength_gain', 'fat_loss', 'maintenance');
CREATE TYPE unit_system AS ENUM ('metric', 'imperial');

CREATE TYPE exercise_type AS ENUM ('compound', 'isolation');
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE owner_type AS ENUM ('system', 'custom');
CREATE TYPE exercise_status AS ENUM ('draft', 'published', 'archived');

CREATE TYPE muscle_role AS ENUM ('primary', 'secondary');

CREATE TYPE media_type AS ENUM ('image', 'video');
CREATE TYPE media_source AS ENUM ('web_search_grounding', 'manual', 'ai_generated_flux', 'ai_generated_veo');

CREATE TYPE workout_status AS ENUM ('planned', 'in_progress', 'completed', 'skipped');
CREATE TYPE set_type AS ENUM ('warmup', 'working', 'drop', 'failure');

CREATE TYPE program_type AS ENUM ('system', 'custom');
CREATE TYPE day_target_muscle_role AS ENUM ('primary', 'secondary');

CREATE TYPE recommendation_type AS ENUM (
  'weight_progression',
  'exercise_substitution',
  'program_modification',
  'workout_regeneration',
  'rest_adjustment'
);
CREATE TYPE recommendation_target AS ENUM ('workout', 'workout_exercise', 'program', 'exercise');
CREATE TYPE recommendation_status AS ENUM ('pending', 'accepted', 'rejected');

CREATE TYPE ai_endpoint AS ENUM (
  'workout_generate',
  'equipment_detect',
  'exercise_content',
  'exercise_alternative',
  'coach_chat',
  'image_search_seed'
);

-- =====================================================================
-- 1. profiles
-- =====================================================================
CREATE TABLE profiles (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name                TEXT,
  avatar_url                  TEXT,
  birthday                    DATE,
  height_cm                   NUMERIC(5,1) CHECK (height_cm BETWEEN 100 AND 250),
  current_weight_kg           NUMERIC(5,1) CHECK (current_weight_kg BETWEEN 20 AND 300),
  unit_system                 unit_system NOT NULL DEFAULT 'metric',
  experience_level            experience_level,
  goal                        goal_type,
  preferred_training_days     INTEGER CHECK (preferred_training_days BETWEEN 1 AND 7),
  preferred_session_duration  INTEGER CHECK (preferred_session_duration BETWEEN 15 AND 240),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- =====================================================================
-- 2. body_weight_logs
-- =====================================================================
CREATE TABLE body_weight_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recorded_date DATE NOT NULL,
  weight_kg     NUMERIC(5,1) NOT NULL CHECK (weight_kg BETWEEN 20 AND 300),
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, recorded_date)
);

CREATE INDEX idx_body_weight_logs_user_date ON body_weight_logs(user_id, recorded_date DESC);

-- =====================================================================
-- 3. muscles (catalog do admin quan ly)
-- =====================================================================
CREATE TABLE muscles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  name_vi       TEXT,
  body_region   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 4. equipment (catalog do admin quan ly)
-- =====================================================================
CREATE TABLE equipment (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  name_vi       TEXT,
  category      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 5. exercises
-- =====================================================================
CREATE TABLE exercises (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type                owner_type NOT NULL,
  name                TEXT NOT NULL,
  name_vi             TEXT,
  slug                TEXT NOT NULL,
  description         TEXT,
  difficulty          difficulty_level,
  exercise_type       exercise_type,
  instructions        TEXT,
  tips                TEXT,
  common_mistakes     TEXT,
  status              exercise_status NOT NULL DEFAULT 'draft',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_user_id, slug)
);

CREATE INDEX idx_exercises_owner ON exercises(owner_user_id);
CREATE INDEX idx_exercises_type_status ON exercises(type, status);
CREATE INDEX idx_exercises_slug ON exercises(slug);

-- =====================================================================
-- 6. exercise_muscles (N-N)
-- =====================================================================
CREATE TABLE exercise_muscles (
  exercise_id  UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  muscle_id    UUID NOT NULL REFERENCES muscles(id) ON DELETE RESTRICT,
  role         muscle_role NOT NULL,
  PRIMARY KEY (exercise_id, muscle_id, role)
);

CREATE INDEX idx_exercise_muscles_muscle ON exercise_muscles(muscle_id);

-- =====================================================================
-- 7. exercise_equipment (N-N)
-- =====================================================================
CREATE TABLE exercise_equipment (
  exercise_id  UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
  required     BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (exercise_id, equipment_id)
);

CREATE INDEX idx_exercise_equipment_equipment ON exercise_equipment(equipment_id);

-- =====================================================================
-- 8. exercise_media
-- =====================================================================
CREATE TABLE exercise_media (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id   UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  media_type    media_type NOT NULL,
  url           TEXT NOT NULL,
  thumbnail_url TEXT,
  source        media_source NOT NULL DEFAULT 'manual',
  license       TEXT,
  duration_sec  INTEGER CHECK (duration_sec IS NULL OR duration_sec > 0),
  width         INTEGER,
  height        INTEGER,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercise_media_exercise ON exercise_media(exercise_id, sort_order);

-- =====================================================================
-- 9. exercise_alternatives (self-referencing N-N)
-- =====================================================================
CREATE TABLE exercise_alternatives (
  exercise_id    UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  alternative_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  reason         TEXT,
  PRIMARY KEY (exercise_id, alternative_id),
  CHECK (exercise_id <> alternative_id)
);

-- =====================================================================
-- 10. gyms (user-owned)
-- =====================================================================
CREATE TABLE gyms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gyms_owner ON gyms(owner_user_id);

-- =====================================================================
-- 11. gym_equipment (which equipment each gym has)
-- =====================================================================
CREATE TABLE gym_equipment (
  gym_id       UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
  quantity     INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (gym_id, equipment_id)
);

CREATE INDEX idx_gym_equipment_equipment ON gym_equipment(equipment_id);

-- Equipment scan history (anh upload de AI detect)
CREATE TABLE equipment_scans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id        UUID REFERENCES gyms(id) ON DELETE SET NULL,
  image_url     TEXT NOT NULL,
  detected_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status        recommendation_status NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipment_scans_user ON equipment_scans(user_id, created_at DESC);

-- =====================================================================
-- 12. training_programs (template)
-- =====================================================================
CREATE TABLE training_programs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  name_vi         TEXT,
  description     TEXT,
  type            program_type NOT NULL DEFAULT 'custom',
  duration_weeks  INTEGER CHECK (duration_weeks IS NULL OR duration_weeks > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_programs_type ON training_programs(type);

-- =====================================================================
-- 13. training_program_days
-- =====================================================================
CREATE TABLE training_program_days (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id    UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  day_of_week   INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  name          TEXT NOT NULL,
  name_vi       TEXT,
  order_index   INTEGER NOT NULL DEFAULT 0,
  UNIQUE(program_id, day_of_week)
);

-- =====================================================================
-- 14. training_day_targets (muscle volume per day)
-- =====================================================================
CREATE TABLE training_day_targets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_day_id    UUID NOT NULL REFERENCES training_program_days(id) ON DELETE CASCADE,
  muscle_id         UUID NOT NULL REFERENCES muscles(id) ON DELETE RESTRICT,
  role              day_target_muscle_role NOT NULL DEFAULT 'primary',
  target_sets       INTEGER NOT NULL CHECK (target_sets >= 0),
  UNIQUE(program_day_id, muscle_id, role)
);

-- =====================================================================
-- 15. user_programs (user chon program nao de ap dung)
-- =====================================================================
CREATE TABLE user_programs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id    UUID NOT NULL REFERENCES training_programs(id) ON DELETE RESTRICT,
  started_at    DATE NOT NULL DEFAULT CURRENT_DATE,
  ended_at      DATE,
  is_active     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_programs_user_active ON user_programs(user_id, is_active);

-- Chi 1 active program/user
CREATE UNIQUE INDEX uniq_user_programs_active
  ON user_programs(user_id) WHERE is_active = TRUE;

-- =====================================================================
-- 16. workouts
-- =====================================================================
CREATE TABLE workouts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_program_day_id  UUID REFERENCES training_program_days(id) ON DELETE SET NULL,
  gym_id                   UUID REFERENCES gyms(id) ON DELETE SET NULL,
  date                     DATE NOT NULL,
  status                   workout_status NOT NULL DEFAULT 'planned',
  planned_duration         INTEGER CHECK (planned_duration IS NULL OR planned_duration > 0),
  started_at               TIMESTAMPTZ,
  completed_at             TIMESTAMPTZ,
  ai_generated             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workouts_user_date ON workouts(user_id, date DESC);
CREATE INDEX idx_workouts_status ON workouts(user_id, status);

-- =====================================================================
-- 17. workout_exercises
-- =====================================================================
CREATE TABLE workout_exercises (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id      UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id     UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  order_index     INTEGER NOT NULL,
  target_sets     INTEGER CHECK (target_sets IS NULL OR target_sets > 0),
  target_rep_min  INTEGER CHECK (target_rep_min IS NULL OR target_rep_min > 0),
  target_rep_max  INTEGER CHECK (target_rep_max IS NULL OR target_rep_max > 0),
  target_weight   NUMERIC(6,2),
  target_rir      INTEGER CHECK (target_rir IS NULL OR target_rir BETWEEN 0 AND 10),
  rest_seconds    INTEGER CHECK (rest_seconds IS NULL OR rest_seconds BETWEEN 0 AND 600),
  ai_reason       TEXT,
  UNIQUE(workout_id, order_index)
);

CREATE INDEX idx_workout_exercises_workout ON workout_exercises(workout_id, order_index);
CREATE INDEX idx_workout_exercises_exercise ON workout_exercises(exercise_id);

-- =====================================================================
-- 18. workout_sets
-- =====================================================================
CREATE TABLE workout_sets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id  UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number           INTEGER NOT NULL CHECK (set_number > 0),
  weight               NUMERIC(6,2) CHECK (weight IS NULL OR weight >= 0),
  reps                 INTEGER CHECK (reps IS NULL OR reps >= 0),
  rir                  INTEGER CHECK (rir IS NULL OR rir BETWEEN 0 AND 10),
  set_type             set_type NOT NULL DEFAULT 'working',
  note                 TEXT,
  completed            BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at         TIMESTAMPTZ,
  UNIQUE(workout_exercise_id, set_number)
);

CREATE INDEX idx_workout_sets_exercise ON workout_sets(workout_exercise_id);

-- =====================================================================
-- 19. workout_feedback
-- =====================================================================
CREATE TABLE workout_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id      UUID NOT NULL UNIQUE REFERENCES workouts(id) ON DELETE CASCADE,
  difficulty      INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  energy          INTEGER CHECK (energy BETWEEN 1 AND 5),
  quality         INTEGER CHECK (quality BETWEEN 1 AND 5),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 20. exercise_user_stats (denormalized stats per user per exercise)
-- =====================================================================
CREATE TABLE exercise_user_stats (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id              UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  last_weight              NUMERIC(6,2),
  last_reps                INTEGER,
  best_weight              NUMERIC(6,2),
  best_reps                INTEGER,
  estimated_1rm            NUMERIC(6,2),
  total_volume_kg          NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_sets               INTEGER NOT NULL DEFAULT 0,
  last_performed_at        TIMESTAMPTZ,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

CREATE INDEX idx_exercise_user_stats_user ON exercise_user_stats(user_id);

-- =====================================================================
-- 21. personal_records
-- =====================================================================
CREATE TABLE personal_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id     UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  record_type     TEXT NOT NULL,
  value           NUMERIC(8,2) NOT NULL,
  achieved_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  workout_set_id  UUID REFERENCES workout_sets(id) ON DELETE SET NULL,
  UNIQUE(user_id, exercise_id, record_type)
);

CREATE INDEX idx_pr_user_exercise ON personal_records(user_id, exercise_id);

-- =====================================================================
-- 22. ai_recommendations
-- =====================================================================
CREATE TABLE ai_recommendations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_type   recommendation_type NOT NULL,
  target_type           recommendation_target NOT NULL,
  target_id             UUID,
  current_value         JSONB,
  suggested_value       JSONB,
  reason                TEXT,
  confidence            NUMERIC(3,2) CHECK (confidence BETWEEN 0 AND 1),
  status                recommendation_status NOT NULL DEFAULT 'pending',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at           TIMESTAMPTZ
);

CREATE INDEX idx_ai_recs_user_status ON ai_recommendations(user_id, status, created_at DESC);

-- =====================================================================
-- 23. ai_interactions (audit log)
-- =====================================================================
CREATE TABLE ai_interactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint            ai_endpoint NOT NULL,
  prompt_tokens       INTEGER,
  completion_tokens   INTEGER,
  total_tokens        INTEGER,
  model               TEXT,
  latency_ms          INTEGER,
  status              TEXT NOT NULL,
  request_json        JSONB,
  response_json       JSONB,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_interactions_user_endpoint ON ai_interactions(user_id, endpoint, created_at DESC);

-- =====================================================================
-- updated_at triggers
-- =====================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_gyms_updated_at
  BEFORE UPDATE ON gyms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_exercise_user_stats_updated_at
  BEFORE UPDATE ON exercise_user_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- Auto-create profile khi user moi dang ky
-- =====================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, display_name, unit_system)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), 'metric')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
