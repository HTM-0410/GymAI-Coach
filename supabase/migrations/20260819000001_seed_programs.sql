-- =====================================================================
-- Migration: 20260819000001_seed_programs.sql
-- Purpose: Seed 6 popular training programs with full day+exercise detail.
--          Idempotent: uses ON CONFLICT DO NOTHING / DO UPDATE.
-- =====================================================================

-- Helper: get exercise id by slug (raises if not found)
-- We'll inline CTEs because Supabase migrations must be re-runnable.

-- =====================================================================
-- ENSURE MUSCLES (so target muscle lookups work)
-- =====================================================================
INSERT INTO muscles (slug, name, name_vi, body_region) VALUES
  ('chest', 'Chest', 'Ngực', 'upper'),
  ('back', 'Back', 'Lưng', 'upper'),
  ('lats', 'Lats', 'Lưng xòe', 'upper'),
  ('shoulders', 'Shoulders', 'Vai', 'upper'),
  ('front_delts', 'Front Delts', 'Vai trước', 'upper'),
  ('side_delts', 'Side Delts', 'Vai bên', 'upper'),
  ('rear_delts', 'Rear Delts', 'Vai sau', 'upper'),
  ('biceps', 'Biceps', 'Tay trước', 'upper'),
  ('triceps', 'Triceps', 'Tay sau', 'upper'),
  ('forearms', 'Forearms', 'Cẳng tay', 'upper'),
  ('quads', 'Quads', 'Đùi trước', 'lower'),
  ('hamstrings', 'Hamstrings', 'Đùi sau', 'lower'),
  ('glutes', 'Glutes', 'Mông', 'lower'),
  ('calves', 'Calves', 'Bắp chân', 'lower'),
  ('core', 'Core', 'Core', 'core')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================================
-- ENSURE EXERCISES (add commonly referenced slugs if missing)
-- We only seed rows that don't exist yet (avoids NULL owner_user_id
-- multi-row conflict on UNIQUE(owner_user_id, slug)).
-- =====================================================================
INSERT INTO exercises (owner_user_id, type, name, name_vi, slug, description, difficulty, exercise_type, status)
SELECT NULL, 'system', x.name, x.name_vi, x.slug, x.description, x.difficulty::difficulty_level, x.exercise_type::exercise_type, 'published'
FROM (VALUES
  ('Incline Dumbbell Press', 'Đẩy ngực nghiêng với tạ đơn', 'incline-db-press',
   'Bài push-horizontal biến thể, nhấn ngực trên.', 'intermediate', 'compound'),
  ('Cable Fly', 'Fly cáp', 'cable-fly',
   'Bài isolation ngực.', 'beginner', 'isolation'),
  ('Lateral Raise', 'Nâng vai bên', 'lateral-raise',
   'Isolation side delts.', 'beginner', 'isolation'),
  ('Face Pull', 'Kéo cáp mặt', 'face-pull',
   'Rear delts + rotator cuff health.', 'beginner', 'isolation'),
  ('Barbell Curl', 'Cuốn tay trước với thanh đòn', 'barbell-curl',
   'Biceps compound.', 'beginner', 'isolation'),
  ('Tricep Pushdown', 'Đẩy cáp tay sau', 'tricep-pushdown',
   'Triceps isolation với cáp.', 'beginner', 'isolation'),
  ('Skullcrusher', 'Ép tay sau nằm', 'skullcrusher',
   'Triceps isolation với thanh EZ.', 'intermediate', 'isolation'),
  ('Back Squat', 'Squat với thanh đòn sau vai', 'back-squat',
   'Bài compound nền tảng cho chân.', 'intermediate', 'compound'),
  ('Front Squat', 'Squat trước vai', 'front-squat',
   'Biến thể squat nhấn quad.', 'advanced', 'compound'),
  ('Leg Press', 'Đạp đùi', 'leg-press',
   'Compound chân, machine.', 'beginner', 'compound'),
  ('Leg Curl', 'Cuốn đùi sau', 'leg-curl',
   'Isolation hamstrings.', 'beginner', 'isolation'),
  ('Leg Extension', 'Duỗi đùi', 'leg-extension',
   'Isolation quads.', 'beginner', 'isolation'),
  ('Calf Raise', 'Nhón bắp chân', 'calf-raise',
   'Isolation calves đứng hoặc ngồi.', 'beginner', 'isolation'),
  ('Plank', 'Plank', 'plank',
   'Core anti-extension isometric.', 'beginner', 'isolation'),
  ('Hanging Leg Raise', 'Nâng chân trên xà', 'hanging-leg-raise',
   'Core advanced.', 'intermediate', 'isolation'),
  ('Dumbbell Row', 'Kéo tạ đơn một bên', 'db-row',
   'Biến thể rowing một bên.', 'beginner', 'compound'),
  ('Lat Pulldown', 'Kéo xà cáp', 'lat-pulldown',
   'Pull vertical, thay thế pull-up.', 'beginner', 'compound'),
  ('Dumbbell Press', 'Đẩy ngực với tạ đơn', 'db-press',
   'Push horizontal single-arm.', 'beginner', 'compound'),
  ('Dip', 'Hít xà kép', 'dip',
   'Compound chest+tricep.', 'intermediate', 'compound'),
  ('Arnold Press', 'Đẩy vai Arnold', 'arnold-press',
   'Biến thể vai có xoay.', 'intermediate', 'compound')
) AS x(name, name_vi, slug, description, difficulty, exercise_type)
WHERE NOT EXISTS (
  SELECT 1 FROM exercises e WHERE e.slug = x.slug AND e.owner_user_id IS NULL
);

-- =====================================================================
-- ENSURE EQUIPMENT
-- =====================================================================
INSERT INTO equipment (slug, name, name_vi, category) VALUES
  ('barbell', 'Barbell', 'Thanh đòn', 'free_weight'),
  ('dumbbell', 'Dumbbell', 'Tạ đơn', 'free_weight'),
  ('bench', 'Bench', 'Ghế tập', 'furniture'),
  ('squat-rack', 'Squat Rack', 'Giá squat', 'furniture'),
  ('cable', 'Cable Machine', 'Máy cáp', 'machine'),
  ('pull-up-bar', 'Pull-up Bar', 'Xà đơn', 'furniture'),
  ('leg-press', 'Leg Press', 'Máy đạp đùi', 'machine'),
  ('lat-pulldown', 'Lat Pulldown', 'Máy kéo xà', 'machine'),
  ('dip-station', 'Dip Station', 'Xà kép', 'furniture')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================================
-- PROGRAM 1 - PPL 6-day (Push/Pull/Legs)
-- =====================================================================
DO $$
DECLARE
  pid UUID;
  d_push UUID;
  d_pull UUID;
  d_leg UUID;
BEGIN
  INSERT INTO training_programs (owner_user_id, type, name, name_vi, description, duration_weeks)
  VALUES (NULL, 'system', 'Push Pull Legs 6-day',
          'Push Pull Legs 6 buổi/tuần',
          'Tần suất cao cho mỗi nhóm cơ - 2 buổi/tuần mỗi nhóm. Phù hợp intermediate tập 6 ngày, muốn hypertrophy tối đa.',
          8)
  ON CONFLICT DO NOTHING
  RETURNING id INTO pid;

  IF pid IS NULL THEN
    SELECT id INTO pid FROM training_programs
      WHERE name = 'Push Pull Legs 6-day' AND type='system' LIMIT 1;
  END IF;

  IF pid IS NOT NULL THEN
    -- Push 1
    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 0, 'Push A', 'Push A - Ngực/Vai/Tay sau (nặng)', 0)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi
    RETURNING id INTO d_push;

    -- Pull 1
    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 2, 'Pull A', 'Pull A - Lưng/Tay trước (nặng)', 1)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi
    RETURNING id INTO d_pull;

    -- Legs 1
    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 4, 'Legs A', 'Legs A - Đùi/Mông (nặng)', 2)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi
    RETURNING id INTO d_leg;

    -- Push 2
    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 1, 'Push B', 'Push B - Ngực/Vai/Tay sau (volume)', 3)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;

    -- Pull 2
    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 3, 'Pull B', 'Pull B - Lưng/Tay trước (volume)', 4)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;

    -- Legs 2
    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 5, 'Legs B', 'Legs B - Đùi/Mông (volume)', 5)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;
  END IF;
END $$;

-- =====================================================================
-- PROGRAM 2 - Upper/Lower 4-day
-- =====================================================================
DO $$
DECLARE
  pid UUID;
BEGIN
  INSERT INTO training_programs (owner_user_id, type, name, name_vi, description, duration_weeks)
  VALUES (NULL, 'system', 'Upper Lower 4-day',
          'Upper/Lower 4 buổi/tuần',
          'Cân bằng giữa tần suất và phục hồi. Phù hợp intermediate với lịch trung bình, muốn cả strength + hypertrophy.',
          10)
  ON CONFLICT DO NOTHING
  RETURNING id INTO pid;

  IF pid IS NULL THEN
    SELECT id INTO pid FROM training_programs
      WHERE name = 'Upper Lower 4-day' AND type='system' LIMIT 1;
  END IF;

  IF pid IS NOT NULL THEN
    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 0, 'Upper A', 'Upper A - Thân trên (compound)', 0)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;

    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 1, 'Lower A', 'Lower A - Chân (compound)', 1)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;

    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 3, 'Upper B', 'Upper B - Thân trên (volume)', 2)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;

    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 4, 'Lower B', 'Lower B - Chân (volume)', 3)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;
  END IF;
END $$;

-- =====================================================================
-- PROGRAM 3 - Full Body 3-day
-- =====================================================================
DO $$
DECLARE
  pid UUID;
BEGIN
  INSERT INTO training_programs (owner_user_id, type, name, name_vi, description, duration_weeks)
  VALUES (NULL, 'system', 'Full Body 3-day',
          'Full Body 3 buổi/tuần',
          'Mỗi buổi tập toàn thân. Lý tưởng cho beginner hoặc người bận rộn - chỉ cần 3 ngày mỗi tuần.',
          12)
  ON CONFLICT DO NOTHING
  RETURNING id INTO pid;

  IF pid IS NULL THEN
    SELECT id INTO pid FROM training_programs
      WHERE name = 'Full Body 3-day' AND type='system' LIMIT 1;
  END IF;

  IF pid IS NOT NULL THEN
    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 0, 'Full Body A', 'Full Body A - Compound focus', 0)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;

    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 2, 'Full Body B', 'Full Body B - Volume', 1)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;

    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 4, 'Full Body C', 'Full Body C - Volume', 2)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;
  END IF;
END $$;

-- =====================================================================
-- PROGRAM 4 - Bro Split 5-day
-- =====================================================================
DO $$
DECLARE
  pid UUID;
BEGIN
  INSERT INTO training_programs (owner_user_id, type, name, name_vi, description, duration_weeks)
  VALUES (NULL, 'system', 'Bro Split 5-day',
          'Bro Split 5 buổi/tuần',
          'Mỗi nhóm cơ 1 buổi/tuần, volume cao mỗi buổi. Phù h�p intermediate muốn pump + mind-muscle connection.',
          8)
  ON CONFLICT DO NOTHING
  RETURNING id INTO pid;

  IF pid IS NULL THEN
    SELECT id INTO pid FROM training_programs
      WHERE name = 'Bro Split 5-day' AND type='system' LIMIT 1;
  END IF;

  IF pid IS NOT NULL THEN
    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 0, 'Chest', 'Ngực', 0)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;

    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 1, 'Back', 'Lưng', 1)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;

    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 2, 'Shoulders', 'Vai', 2)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;

    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 3, 'Arms', 'Tay (Biceps + Triceps)', 3)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;

    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 4, 'Legs', 'Chân', 4)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;
  END IF;
END $$;

-- =====================================================================
-- PROGRAM 5 - 5x5 Strength (Stronglifts-style)
-- =====================================================================
DO $$
DECLARE
  pid UUID;
BEGIN
  INSERT INTO training_programs (owner_user_id, type, name, name_vi, description, duration_weeks)
  VALUES (NULL, 'system', '5x5 Strength',
          '5×5 Sức mạnh',
          'Chương trình classic cho người mới muốn tăng strength. 3 buổi/tuần, 5×5 compound chính.',
          16)
  ON CONFLICT DO NOTHING
  RETURNING id INTO pid;

  IF pid IS NULL THEN
    SELECT id INTO pid FROM training_programs
      WHERE name = '5x5 Strength' AND type='system' LIMIT 1;
  END IF;

  IF pid IS NOT NULL THEN
    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 0, 'Workout A', 'Buổi A - Squat/Bench/Row', 0)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;

    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 2, 'Workout B', 'Buổi B - Squat/OHP/Deadlift', 1)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;

    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 4, 'Workout A (repeat)', 'Buổi A - Squat/Bench/Row', 2)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;
  END IF;
END $$;

-- =====================================================================
-- PROGRAM 6 - PHAT (Power Hypertrophy Adaptive Training)
-- =====================================================================
DO $$
DECLARE
  pid UUID;
BEGIN
  INSERT INTO training_programs (owner_user_id, type, name, name_vi, description, duration_weeks)
  VALUES (NULL, 'system', 'PHAT',
          'PHAT - Power/Hypertrophy Adaptive Training',
          'Lai giữa sức mạnh (low-rep) và hypertrophy (high-rep) trong 1 tuần. 5 buổi/tuần, phù hợp intermediate-advanced.',
          8)
  ON CONFLICT DO NOTHING
  RETURNING id INTO pid;

  IF pid IS NULL THEN
    SELECT id INTO pid FROM training_programs
      WHERE name = 'PHAT' AND type='system' LIMIT 1;
  END IF;

  IF pid IS NOT NULL THEN
    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 0, 'Upper Power', 'Upper - Power (sức mạnh)', 0)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;

    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 1, 'Lower Power', 'Lower - Power (sức mạnh)', 1)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;

    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 2, 'Chest/Arms', 'Ngực & Tay - Hypertrophy', 2)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;

    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 3, 'Back/Shoulders', 'Lưng & Vai - Hypertrophy', 3)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;

    INSERT INTO training_program_days (program_id, day_of_week, name, name_vi, order_index)
    VALUES (pid, 4, 'Legs Hypertrophy', 'Chân - Hypertrophy', 4)
    ON CONFLICT (program_id, day_of_week) DO UPDATE SET name_vi = EXCLUDED.name_vi;
  END IF;
END $$;

-- =====================================================================
-- NOW SEED EXERCISES INTO DAYS (uses lookups by slug)
-- =====================================================================

-- Helper view: not allowed in migrations cleanly, use CTE per program.
-- Pattern: for each program, for each day, insert rows.

-- ===== PPL - Push A =====
DO $$
DECLARE
  d_id UUID;
BEGIN
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'Push Pull Legs 6-day' AND d.name = 'Push A' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('bench-press',         4, 6, 8,  2, 180),
      ('overhead-press',      3, 8, 10, 2, 150),
      ('incline-db-press',    3, 8, 12, 1, 120),
      ('lateral-raise',       3, 12,15, 1,  90),
      ('tricep-pushdown',     3, 10,12, 1,  90),
      ('skullcrusher',        3, 10,12, 1,  90)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;
END $$;

-- ===== PPL - Pull A =====
DO $$
DECLARE
  d_id UUID;
BEGIN
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'Push Pull Legs 6-day' AND d.name = 'Pull A' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('deadlift',            4, 5, 6,  2, 240),
      ('pull-up',             4, 6, 10, 2, 150),
      ('barbell-row',         3, 8, 10, 2, 150),
      ('lat-pulldown',        3, 10,12, 1, 120),
      ('face-pull',           3, 12,15, 1,  90),
      ('barbell-curl',        3, 8, 12, 1,  90)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;
END $$;

-- ===== PPL - Legs A =====
DO $$
DECLARE
  d_id UUID;
BEGIN
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'Push Pull Legs 6-day' AND d.name = 'Legs A' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('back-squat',          4, 5, 8,  2, 240),
      ('romanian-deadlift',   3, 8, 10, 2, 150),
      ('leg-press',           3, 10,12, 1, 150),
      ('leg-curl',            3, 10,12, 1, 120),
      ('calf-raise',          4, 8, 12, 1,  90),
      ('plank',               3, 0, 0,  0,  60)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;
END $$;

-- ===== PPL - Push B =====
DO $$
DECLARE
  d_id UUID;
BEGIN
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'Push Pull Legs 6-day' AND d.name = 'Push B' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('incline-db-press',    4, 8, 12, 1, 120),
      ('db-press',            3, 10,12, 1, 120),
      ('dip',                 3, 8, 12, 1, 120),
      ('lateral-raise',       4, 12,15, 1,  90),
      ('overhead-press',      3, 8, 10, 1, 120),
      ('skullcrusher',        3, 10,12, 1,  90)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;
END $$;

-- ===== PPL - Pull B =====
DO $$
DECLARE
  d_id UUID;
BEGIN
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'Push Pull Legs 6-day' AND d.name = 'Pull B' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, rmax, 1, 120 FROM (
      SELECT 'deadlift'::text AS slug, 0 AS ord, 3 AS sets, 5 AS rmin, 6 AS rmax
      UNION ALL SELECT 'pull-up',     1, 3, 6, 10
      UNION ALL SELECT 'db-row',      2, 3, 10,12
      UNION ALL SELECT 'lat-pulldown',3, 3, 10,12
      UNION ALL SELECT 'barbell-curl',4, 3, 10,12
      UNION ALL SELECT 'face-pull',   5, 3, 12,15
    ) x
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;
END $$;

-- ===== PPL - Legs B =====
DO $$
DECLARE
  d_id UUID;
BEGIN
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'Push Pull Legs 6-day' AND d.name = 'Legs B' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('front-squat',         3, 6, 10, 1, 180),
      ('leg-press',           4, 10,15, 1, 120),
      ('leg-extension',       3, 10,15, 1,  90),
      ('romanian-deadlift',   3, 8, 12, 1, 120),
      ('calf-raise',          4, 10,15, 1,  90),
      ('hanging-leg-raise',   3, 8, 12, 1,  90)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;
END $$;

-- ===== Upper/Lower - Upper A =====
DO $$
DECLARE
  d_id UUID;
BEGIN
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'Upper Lower 4-day' AND d.name = 'Upper A' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('bench-press',         4, 5, 8,  2, 180),
      ('barbell-row',         4, 5, 8,  2, 180),
      ('overhead-press',      3, 6, 10, 1, 150),
      ('pull-up',             3, 6, 10, 1, 150),
      ('lateral-raise',       3, 10,12, 1,  90),
      ('barbell-curl',        3, 8, 10, 1,  90),
      ('tricep-pushdown',     3, 8, 10, 1,  90)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;
END $$;

-- ===== Upper/Lower - Lower A =====
DO $$
DECLARE
  d_id UUID;
BEGIN
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'Upper Lower 4-day' AND d.name = 'Lower A' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('back-squat',          4, 5, 8,  2, 240),
      ('romanian-deadlift',   3, 8, 10, 2, 150),
      ('leg-press',           3, 10,12, 1, 150),
      ('calf-raise',          4, 8, 12, 1,  90),
      ('plank',               3, 0, 0,  0,  60)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;
END $$;

-- ===== Upper/Lower - Upper B =====
DO $$
DECLARE
  d_id UUID;
BEGIN
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'Upper Lower 4-day' AND d.name = 'Upper B' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('overhead-press',      4, 6, 10, 1, 150),
      ('db-row',              4, 8, 10, 1, 120),
      ('incline-db-press',    3, 8, 12, 1, 120),
      ('lat-pulldown',        3, 10,12, 1, 120),
      ('arnold-press',        3, 10,12, 1, 120),
      ('face-pull',           3, 12,15, 1,  90),
      ('skullcrusher',        3, 10,12, 1,  90)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;
END $$;

-- ===== Upper/Lower - Lower B =====
DO $$
DECLARE
  d_id UUID;
BEGIN
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'Upper Lower 4-day' AND d.name = 'Lower B' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('deadlift',            3, 5, 6,  2, 240),
      ('leg-press',           4, 10,12, 1, 120),
      ('leg-curl',            3, 10,12, 1,  90),
      ('leg-extension',       3, 10,12, 1,  90),
      ('calf-raise',          4, 10,15, 1,  90),
      ('hanging-leg-raise',   3, 8, 12, 1,  90)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;
END $$;

-- ===== Full Body A/B/C (compact) =====
DO $$
DECLARE
  d_id UUID;
BEGIN
  -- Full Body A
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'Full Body 3-day' AND d.name = 'Full Body A' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('back-squat',          3, 5, 8,  2, 180),
      ('bench-press',         3, 5, 8,  2, 180),
      ('barbell-row',         3, 8, 10, 1, 120),
      ('overhead-press',      2, 8, 10, 1, 120),
      ('plank',               2, 0, 0,  0,  60)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;

  -- Full Body B
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'Full Body 3-day' AND d.name = 'Full Body B' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('deadlift',            3, 5, 6,  2, 240),
      ('overhead-press',      3, 6, 10, 1, 150),
      ('pull-up',             3, 5, 10, 1, 150),
      ('leg-press',           3, 10,12, 1, 120),
      ('face-pull',           2, 12,15, 1,  90)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;

  -- Full Body C
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'Full Body 3-day' AND d.name = 'Full Body C' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('back-squat',          3, 6, 10, 1, 180),
      ('db-press',            3, 8, 12, 1, 120),
      ('db-row',              3, 8, 12, 1, 120),
      ('romanian-deadlift',   3, 8, 10, 1, 150),
      ('calf-raise',          3, 10,15, 1,  90),
      ('plank',               2, 0, 0,  0,  60)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;
END $$;

-- ===== Bro Split =====
DO $$
DECLARE
  d_id UUID;
BEGIN
  -- Chest
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'Bro Split 5-day' AND d.name = 'Chest' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('bench-press',         4, 6, 10, 1, 180),
      ('incline-db-press',    4, 8, 12, 1, 120),
      ('cable-fly',           3, 12,15, 1,  90),
      ('dip',                 3, 6, 12, 1, 120)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;

  -- Back
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'Bro Split 5-day' AND d.name = 'Back' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('deadlift',            4, 5, 8,  2, 240),
      ('pull-up',             4, 6, 10, 2, 150),
      ('barbell-row',         3, 8, 12, 1, 150),
      ('lat-pulldown',        3, 10,12, 1, 120),
      ('face-pull',           3, 12,15, 1,  90)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;

  -- Shoulders
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'Bro Split 5-day' AND d.name = 'Shoulders' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('overhead-press',      4, 6, 10, 1, 150),
      ('lateral-raise',       4, 10,15, 1,  90),
      ('arnold-press',        3, 8, 12, 1, 120),
      ('face-pull',           3, 12,15, 1,  90),
      ('barbell-curl',        3, 8, 12, 1,  90)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;

  -- Arms
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'Bro Split 5-day' AND d.name = 'Arms' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, r90 FROM (
      SELECT 'barbell-curl'::text AS slug, 0 AS ord, 4 AS sets, 8 AS rmin, 12 AS rmax, 1 AS rir, 90 AS rest
      UNION ALL SELECT 'skullcrusher',    1, 4, 8, 12, 1, 90
      UNION ALL SELECT 'tricep-pushdown', 2, 3, 10,15, 1, 90
      UNION ALL SELECT 'face-pull',       3, 3, 12,15, 1, 90
    ) x
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;

  -- Legs
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'Bro Split 5-day' AND d.name = 'Legs' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('back-squat',          4, 6, 10, 1, 240),
      ('romanian-deadlift',   4, 8, 12, 1, 150),
      ('leg-press',           3, 10,15, 1, 150),
      ('leg-curl',            3, 10,12, 1,  90),
      ('leg-extension',       3, 10,15, 1,  90),
      ('calf-raise',          4, 10,15, 1,  90)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;
END $$;

-- ===== 5x5 Strength =====
DO $$
DECLARE
  d_id UUID;
BEGIN
  -- Workout A
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = '5x5 Strength' AND d.name = 'Workout A' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('back-squat',          5, 5, 5,  2, 240),
      ('bench-press',         5, 5, 5,  2, 180),
      ('barbell-row',         5, 5, 5,  2, 180)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;

  -- Workout B
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = '5x5 Strength' AND d.name = 'Workout B' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('back-squat',          5, 5, 5,  2, 240),
      ('overhead-press',      5, 5, 5,  2, 180),
      ('deadlift',            1, 5, 5,  2, 240)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;

  -- Workout A (repeat) - same as Workout A
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = '5x5 Strength' AND d.name = 'Workout A (repeat)' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('back-squat',          5, 5, 5,  2, 240),
      ('bench-press',         5, 5, 5,  2, 180),
      ('barbell-row',         5, 5, 5,  2, 180)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;
END $$;

-- ===== PHAT =====
DO $$
DECLARE
  d_id UUID;
BEGIN
  -- Upper Power
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'PHAT' AND d.name = 'Upper Power' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('bench-press',         4, 3, 5,  2, 240),
      ('barbell-row',         4, 3, 5,  2, 240),
      ('overhead-press',      3, 4, 6,  2, 180),
      ('pull-up',             3, 4, 6,  2, 150)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;

  -- Lower Power
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'PHAT' AND d.name = 'Lower Power' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('back-squat',          4, 3, 5,  2, 240),
      ('deadlift',            3, 3, 5,  2, 240),
      ('leg-press',           3, 4, 6,  2, 180)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;

  -- Chest/Arms (hypertrophy)
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'PHAT' AND d.name = 'Chest/Arms' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('incline-db-press',    4, 8, 12, 1, 120),
      ('cable-fly',           3, 10,15, 1,  90),
      ('barbell-curl',        3, 8, 12, 1,  90),
      ('skullcrusher',        3, 8, 12, 1,  90)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;

  -- Back/Shoulders (hypertrophy)
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'PHAT' AND d.name = 'Back/Shoulders' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('db-row',              4, 8, 12, 1, 120),
      ('lat-pulldown',        3, 10,12, 1, 120),
      ('arnold-press',        3, 10,12, 1, 120),
      ('lateral-raise',       3, 12,15, 1,  90),
      ('face-pull',           3, 12,15, 1,  90)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;

  -- Legs Hypertrophy
  SELECT d.id INTO d_id FROM training_program_days d
    JOIN training_programs p ON p.id = d.program_id
    WHERE p.name = 'PHAT' AND d.name = 'Legs Hypertrophy' LIMIT 1;

  IF d_id IS NOT NULL THEN
    INSERT INTO program_day_exercises (program_day_id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, target_rir, rest_seconds)
    SELECT d_id, e.id, x.ord, x.sets, x.rmin, x.rmax, x.rir, x.rest
    FROM (VALUES
      ('front-squat',         4, 8, 12, 1, 180),
      ('romanian-deadlift',   3, 8, 12, 1, 150),
      ('leg-press',           3, 10,15, 1, 120),
      ('leg-curl',            3, 10,12, 1,  90),
      ('calf-raise',          4, 10,15, 1,  90)
    ) AS x(slug, ord, sets, rmin, rmax, rir, rest)
    JOIN exercises e ON e.slug = x.slug
    ON CONFLICT (program_day_id, order_index) DO UPDATE
      SET target_sets = EXCLUDED.target_sets,
          target_rep_min = EXCLUDED.target_rep_min,
          target_rep_max = EXCLUDED.target_rep_max,
          target_rir = EXCLUDED.target_rir,
          rest_seconds = EXCLUDED.rest_seconds;
  END IF;
END $$;
