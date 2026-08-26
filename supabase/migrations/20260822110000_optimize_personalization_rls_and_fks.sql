-- Bring already-migrated personalization tables in line with the optimized
-- fresh-deploy definition. SELECT-wrapped auth.uid() is evaluated once per
-- statement by the RLS initplan instead of once per candidate row.

DROP POLICY IF EXISTS "training_constraints_owner_all" ON training_constraints;
CREATE POLICY "training_constraints_owner_all" ON training_constraints FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "exercise_preferences_owner_all" ON exercise_preferences;
CREATE POLICY "exercise_preferences_owner_all" ON exercise_preferences FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "readiness_checkins_owner_all" ON readiness_checkins;
CREATE POLICY "readiness_checkins_owner_all" ON readiness_checkins FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "body_composition_measurements_owner_all" ON body_composition_measurements;
CREATE POLICY "body_composition_measurements_owner_all" ON body_composition_measurements FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "body_composition_segments_owner_all" ON body_composition_segments;
CREATE POLICY "body_composition_segments_owner_all" ON body_composition_segments FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "data_consents_owner_all" ON data_consents;
CREATE POLICY "data_consents_owner_all" ON data_consents FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "ai_decision_contexts_owner_all" ON ai_decision_contexts;
CREATE POLICY "ai_decision_contexts_owner_all" ON ai_decision_contexts FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_readiness_checkins_workout_owner
  ON readiness_checkins(workout_id, user_id);

CREATE INDEX IF NOT EXISTS idx_body_composition_segments_measurement_owner
  ON body_composition_segments(measurement_id, user_id);
