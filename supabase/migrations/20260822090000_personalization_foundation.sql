-- Personalization foundation: owner-scoped structured inputs and compact AI provenance.
-- P0 intentionally stores no raw/redacted image bytes, URLs, or storage paths.

CREATE TABLE training_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region TEXT NOT NULL CHECK (char_length(btrim(region)) BETWEEN 1 AND 80),
  side TEXT CHECK (side IS NULL OR side IN ('left', 'right', 'both')),
  severity SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  triggers TEXT[] NOT NULL DEFAULT '{}',
  excluded_exercise_slugs TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),
  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'professional_note')),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  user_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at IS NULL OR expires_at > valid_from)
);

CREATE INDEX idx_training_constraints_user_active
  ON training_constraints(user_id, status, expires_at);

CREATE TABLE exercise_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('exercise', 'pattern', 'equipment', 'style')),
  target_key TEXT NOT NULL CHECK (char_length(btrim(target_key)) BETWEEN 1 AND 120),
  preference TEXT NOT NULL CHECK (preference IN ('prefer', 'avoid', 'exclude')),
  strength SMALLINT NOT NULL DEFAULT 3 CHECK (strength BETWEEN 1 AND 5),
  source TEXT NOT NULL CHECK (source IN ('explicit', 'inferred')),
  confidence NUMERIC(4,3) NOT NULL DEFAULT 1 CHECK (confidence BETWEEN 0 AND 1),
  last_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_type, target_key)
);

CREATE INDEX idx_exercise_preferences_user_source
  ON exercise_preferences(user_id, source);

ALTER TABLE workouts
  ADD CONSTRAINT workouts_id_user_id_unique UNIQUE (id, user_id);

CREATE TABLE readiness_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID,
  energy SMALLINT NOT NULL CHECK (energy BETWEEN 1 AND 5),
  sleep_quality SMALLINT CHECK (sleep_quality BETWEEN 1 AND 5),
  sleep_hours NUMERIC(3,1) CHECK (sleep_hours BETWEEN 0 AND 24),
  stress SMALLINT CHECK (stress BETWEEN 1 AND 5),
  discomfort_regions TEXT[] NOT NULL DEFAULT '{}',
  available_minutes SMALLINT NOT NULL CHECK (available_minutes BETWEEN 5 AND 360),
  intent TEXT CHECK (intent IS NULL OR char_length(intent) <= 240),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > checked_at),
  FOREIGN KEY (workout_id, user_id) REFERENCES workouts(id, user_id) ON DELETE CASCADE
);

CREATE INDEX idx_readiness_checkins_user_expiry
  ON readiness_checkins(user_id, expires_at DESC);
CREATE INDEX idx_readiness_checkins_workout_owner
  ON readiness_checkins(workout_id, user_id);

CREATE TABLE body_composition_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('manual', 'inbody_sheet', 'other_device')),
  measured_at TIMESTAMPTZ NOT NULL,
  measured_timezone TEXT,
  device_brand TEXT,
  device_model TEXT,
  location_label TEXT,
  weight_kg NUMERIC(5,2) CHECK (weight_kg > 0),
  total_body_water_l NUMERIC(5,2) CHECK (total_body_water_l > 0),
  protein_kg NUMERIC(5,2) CHECK (protein_kg > 0),
  mineral_kg NUMERIC(5,2) CHECK (mineral_kg > 0),
  body_fat_mass_kg NUMERIC(5,2) CHECK (body_fat_mass_kg >= 0),
  skeletal_muscle_mass_kg NUMERIC(5,2) CHECK (skeletal_muscle_mass_kg > 0),
  percent_body_fat NUMERIC(5,2) CHECK (percent_body_fat BETWEEN 0 AND 100),
  bmi NUMERIC(5,2) CHECK (bmi > 0),
  fat_free_mass_kg NUMERIC(5,2) CHECK (fat_free_mass_kg > 0),
  basal_metabolic_rate_kcal NUMERIC(7,2) CHECK (basal_metabolic_rate_kcal > 0),
  waist_hip_ratio NUMERIC(4,2) CHECK (waist_hip_ratio > 0),
  visceral_fat_level NUMERIC(5,2) CHECK (visceral_fat_level >= 0),
  skeletal_muscle_index NUMERIC(5,2) CHECK (skeletal_muscle_index > 0),
  device_score NUMERIC(5,2),
  device_target_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  preparation_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  extraction_method TEXT NOT NULL DEFAULT 'manual' CHECK (extraction_method IN ('manual', 'ocr', 'vision')),
  extraction_provider TEXT,
  extraction_confidence NUMERIC(4,3) CHECK (extraction_confidence BETWEEN 0 AND 1),
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'needs_review', 'confirmed', 'rejected')),
  confirmed_at TIMESTAMPTZ,
  comparability TEXT NOT NULL DEFAULT 'low' CHECK (comparability IN ('high', 'medium', 'low')),
  allowed_uses TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(id, user_id),
  CHECK (allowed_uses <@ ARRAY['planner', 'coach', 'weekly_report']::TEXT[]),
  CHECK ((review_status = 'confirmed' AND confirmed_at IS NOT NULL) OR review_status <> 'confirmed')
);

CREATE INDEX idx_body_composition_user_measured
  ON body_composition_measurements(user_id, measured_at DESC);

CREATE TABLE body_composition_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  segment TEXT NOT NULL CHECK (segment IN ('left_arm', 'right_arm', 'trunk', 'left_leg', 'right_leg')),
  tissue_type TEXT NOT NULL CHECK (tissue_type IN ('lean', 'fat')),
  mass_kg NUMERIC(5,2) NOT NULL CHECK (mass_kg >= 0),
  percent_of_reference NUMERIC(6,2) CHECK (percent_of_reference >= 0),
  device_evaluation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (measurement_id, user_id)
    REFERENCES body_composition_measurements(id, user_id) ON DELETE CASCADE,
  UNIQUE(measurement_id, segment, tissue_type)
);

CREATE INDEX idx_body_composition_segments_user
  ON body_composition_segments(user_id, measurement_id);
CREATE INDEX idx_body_composition_segments_measurement_owner
  ON body_composition_segments(measurement_id, user_id);

CREATE TABLE data_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN (
    'body_composition_planner',
    'body_composition_coach',
    'body_composition_weekly_report',
    'body_composition_external_processing'
  )),
  provider TEXT,
  data_categories TEXT[] NOT NULL DEFAULT '{}',
  policy_version TEXT NOT NULL CHECK (char_length(btrim(policy_version)) > 0),
  granted_at TIMESTAMPTZ NOT NULL,
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (withdrawn_at IS NULL OR withdrawn_at >= granted_at)
);

CREATE INDEX idx_data_consents_user_purpose
  ON data_consents(user_id, purpose, granted_at DESC);

CREATE TABLE ai_decision_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surface TEXT NOT NULL CHECK (surface IN ('planner', 'coach', 'weekly_report')),
  context_version TEXT NOT NULL DEFAULT '1.0',
  factor_keys_used TEXT[] NOT NULL DEFAULT '{}',
  factor_keys_ignored TEXT[] NOT NULL DEFAULT '{}',
  training_constraint_ids UUID[] NOT NULL DEFAULT '{}',
  exercise_preference_ids UUID[] NOT NULL DEFAULT '{}',
  readiness_checkin_id UUID,
  body_composition_measurement_ids UUID[] NOT NULL DEFAULT '{}',
  workout_ids UUID[] NOT NULL DEFAULT '{}',
  confidence NUMERIC(4,3) CHECK (confidence BETWEEN 0 AND 1),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_until > generated_at)
);

CREATE INDEX idx_ai_decision_contexts_user_generated
  ON ai_decision_contexts(user_id, generated_at DESC);

ALTER TABLE training_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE readiness_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_composition_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_composition_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_constraints_owner_all" ON training_constraints FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "exercise_preferences_owner_all" ON exercise_preferences FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "readiness_checkins_owner_all" ON readiness_checkins FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "body_composition_measurements_owner_all" ON body_composition_measurements FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "body_composition_segments_owner_all" ON body_composition_segments FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "data_consents_owner_all" ON data_consents FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "ai_decision_contexts_owner_all" ON ai_decision_contexts FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
