-- =====================================================================
-- GymAI Coach - Phase 1 MVP: Row Level Security Policies
-- Migration: 20260818120001_rls_policies.sql
-- =====================================================================
-- Nguyen tac:
--   - User chi doc/ghi duoc data cua minh (auth.uid() = user_id).
--   - Exercises/equipment/muscles la system data: ai cung doc,
--     chi owner moi sua duoc (custom exercise cua ho).
--   - System template programs: admin chi dinh (sau) / public read.
--   - Auth users khong the xem/ghi data cua user khac.
-- =====================================================================

-- Enable RLS cho toan bo tables
ALTER TABLE profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_weight_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE muscles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_muscles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_equipment        ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_media            ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_alternatives     ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyms                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_equipment             ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_scans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_program_days     ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_day_targets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_programs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises         ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_feedback          ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_user_stats       ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions           ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- profiles
-- =====================================================================
CREATE POLICY "profiles_select_own"   ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own"   ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own"   ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "profiles_delete_own"   ON profiles FOR DELETE USING (auth.uid() = user_id);

-- =====================================================================
-- body_weight_logs
-- =====================================================================
CREATE POLICY "bwl_select_own"  ON body_weight_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bwl_insert_own"  ON body_weight_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bwl_update_own"  ON body_weight_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "bwl_delete_own"  ON body_weight_logs FOR DELETE USING (auth.uid() = user_id);

-- =====================================================================
-- muscles / equipment (catalog do admin quan ly - public read, khong user write)
-- =====================================================================
CREATE POLICY "muscles_read_all"    ON muscles FOR SELECT USING (TRUE);
CREATE POLICY "equipment_read_all"  ON equipment FOR SELECT USING (TRUE);
-- Wrietable boi service_role only (admin tools)

-- =====================================================================
-- exercises
-- System: owner_user_id IS NULL -> ai cung doc, chi admin sua
-- Custom: owner_user_id = current user -> user do doc + sua
-- =====================================================================
CREATE POLICY "exercises_read_published"
  ON exercises FOR SELECT
  USING (
    status = 'published'
    OR (type = 'custom' AND owner_user_id = auth.uid())
  );

CREATE POLICY "exercises_insert_custom"
  ON exercises FOR INSERT
  WITH CHECK (type = 'custom' AND owner_user_id = auth.uid());

CREATE POLICY "exercises_update_own_custom"
  ON exercises FOR UPDATE
  USING (type = 'custom' AND owner_user_id = auth.uid())
  WITH CHECK (type = 'custom' AND owner_user_id = auth.uid());

CREATE POLICY "exercises_delete_own_custom"
  ON exercises FOR DELETE
  USING (type = 'custom' AND owner_user_id = auth.uid());

-- =====================================================================
-- exercise_muscles, exercise_equipment, exercise_alternatives
-- Doc theo quyen cua exercise cha
-- =====================================================================
CREATE POLICY "em_select"  ON exercise_muscles FOR SELECT
  USING (EXISTS (SELECT 1 FROM exercises e WHERE e.id = exercise_id AND (e.status = 'published' OR (e.type = 'custom' AND e.owner_user_id = auth.uid()))));

CREATE POLICY "ee_select"  ON exercise_equipment FOR SELECT
  USING (EXISTS (SELECT 1 FROM exercises e WHERE e.id = exercise_id AND (e.status = 'published' OR (e.type = 'custom' AND e.owner_user_id = auth.uid()))));

CREATE POLICY "ea_select"  ON exercise_alternatives FOR SELECT
  USING (EXISTS (SELECT 1 FROM exercises e WHERE e.id = exercise_id AND (e.status = 'published' OR (e.type = 'custom' AND e.owner_user_id = auth.uid()))));

-- Wrietable boi service_role only (admin imports + custom-exercise flow service-side)

-- =====================================================================
-- exercise_media
-- =====================================================================
CREATE POLICY "emedia_select" ON exercise_media FOR SELECT
  USING (EXISTS (SELECT 1 FROM exercises e WHERE e.id = exercise_id AND (e.status = 'published' OR (e.type = 'custom' AND e.owner_user_id = auth.uid()))));

-- =====================================================================
-- gyms + gym_equipment
-- =====================================================================
CREATE POLICY "gyms_owner_all"  ON gyms FOR ALL USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "gym_equip_owner_select" ON gym_equipment FOR SELECT
  USING (EXISTS (SELECT 1 FROM gyms g WHERE g.id = gym_id AND g.owner_user_id = auth.uid()));

CREATE POLICY "gym_equip_owner_write" ON gym_equipment FOR ALL
  USING (EXISTS (SELECT 1 FROM gyms g WHERE g.id = gym_id AND g.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM gyms g WHERE g.id = gym_id AND g.owner_user_id = auth.uid()));

-- equipment_scans
CREATE POLICY "scans_owner_all" ON equipment_scans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- training_programs
-- System (owner_user_id IS NULL): public read
-- Custom (owner_user_id = me): owner full access
-- =====================================================================
CREATE POLICY "programs_read" ON training_programs FOR SELECT
  USING (owner_user_id IS NULL OR owner_user_id = auth.uid());

CREATE POLICY "programs_insert_custom" ON training_programs FOR INSERT
  WITH CHECK (type = 'custom' AND owner_user_id = auth.uid());

CREATE POLICY "programs_update_custom" ON training_programs FOR UPDATE
  USING (type = 'custom' AND owner_user_id = auth.uid());

CREATE POLICY "programs_delete_custom" ON training_programs FOR DELETE
  USING (type = 'custom' AND owner_user_id = auth.uid());

-- program days + day targets: doc theo program cha
CREATE POLICY "tpd_read" ON training_program_days FOR SELECT
  USING (EXISTS (SELECT 1 FROM training_programs p WHERE p.id = program_id AND (p.owner_user_id IS NULL OR p.owner_user_id = auth.uid())));

CREATE POLICY "tpd_write" ON training_program_days FOR ALL
  USING (EXISTS (SELECT 1 FROM training_programs p WHERE p.id = program_id AND p.type = 'custom' AND p.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM training_programs p WHERE p.id = program_id AND p.type = 'custom' AND p.owner_user_id = auth.uid()));

CREATE POLICY "tdt_read" ON training_day_targets FOR SELECT
  USING (EXISTS (SELECT 1 FROM training_program_days d JOIN training_programs p ON p.id = d.program_id WHERE d.id = program_day_id AND (p.owner_user_id IS NULL OR p.owner_user_id = auth.uid())));

CREATE POLICY "tdt_write" ON training_day_targets FOR ALL
  USING (EXISTS (SELECT 1 FROM training_program_days d JOIN training_programs p ON p.id = d.program_id WHERE d.id = program_day_id AND p.type = 'custom' AND p.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM training_program_days d JOIN training_programs p ON p.id = d.program_id WHERE d.id = program_day_id AND p.type = 'custom' AND p.owner_user_id = auth.uid()));

-- =====================================================================
-- user_programs (user dang su dung program nao)
-- =====================================================================
CREATE POLICY "user_programs_owner_all" ON user_programs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- workouts
-- =====================================================================
CREATE POLICY "workouts_owner_all" ON workouts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "we_select"  ON workout_exercises FOR SELECT
  USING (EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));
CREATE POLICY "we_write"   ON workout_exercises FOR ALL
  USING (EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));

CREATE POLICY "ws_select"  ON workout_sets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = workout_exercise_id AND w.user_id = auth.uid()
  ));
CREATE POLICY "ws_write"   ON workout_sets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = workout_exercise_id AND w.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = workout_exercise_id AND w.user_id = auth.uid()
  ));

CREATE POLICY "wf_owner_all" ON workout_feedback FOR ALL
  USING (EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));

-- =====================================================================
-- Stats / PRs
-- =====================================================================
CREATE POLICY "stats_owner_all"  ON exercise_user_stats FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pr_owner_all"     ON personal_records FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- AI tables
-- =====================================================================
CREATE POLICY "ai_rec_owner_all"   ON ai_recommendations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_inter_select_own" ON ai_interactions FOR SELECT
  USING (auth.uid() = user_id);
-- Insert chi qua service_role (server-side) de audit chat luong
