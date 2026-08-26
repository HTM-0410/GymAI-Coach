-- Standardize system training programs against deterministic exercise slugs.
-- Research basis is documented in docs/TRAINING_PROGRAM_STANDARD.md.
-- Recovery is intentionally calculated in the application from session dose,
-- not stored as one fixed number in the database.

CREATE TEMP TABLE _program_day_plan (
  program_name TEXT NOT NULL,
  day_order INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  day_name TEXT NOT NULL,
  day_name_vi TEXT NOT NULL,
  archetype TEXT NOT NULL,
  PRIMARY KEY (program_name, day_order)
) ON COMMIT DROP;

INSERT INTO _program_day_plan VALUES
  ('Push Pull Legs (PPL)', 0, 1, 'Push A', 'Buổi 1 - Đẩy A (sức mạnh)', 'push_strength'),
  ('Push Pull Legs (PPL)', 1, 2, 'Pull A', 'Buổi 2 - Kéo A (sức mạnh)', 'pull_strength'),
  ('Push Pull Legs (PPL)', 2, 3, 'Legs A', 'Buổi 3 - Chân A (sức mạnh)', 'legs_strength'),
  ('Push Pull Legs (PPL)', 3, 4, 'Push B', 'Buổi 4 - Đẩy B (tăng cơ)', 'push_hypertrophy'),
  ('Push Pull Legs (PPL)', 4, 5, 'Pull B', 'Buổi 5 - Kéo B (tăng cơ)', 'pull_hypertrophy'),
  ('Push Pull Legs (PPL)', 5, 6, 'Legs B', 'Buổi 6 - Chân B (tăng cơ)', 'legs_hypertrophy'),

  ('Upper / Lower (4-day)', 0, 1, 'Upper A', 'Buổi 1 - Thân Trên A (sức mạnh)', 'upper_strength'),
  ('Upper / Lower (4-day)', 1, 2, 'Lower A', 'Buổi 2 - Thân Dưới A (sức mạnh)', 'lower_strength'),
  ('Upper / Lower (4-day)', 2, 4, 'Upper B', 'Buổi 3 - Thân Trên B (tăng cơ)', 'upper_hypertrophy'),
  ('Upper / Lower (4-day)', 3, 5, 'Lower B', 'Buổi 4 - Thân Dưới B (tăng cơ)', 'lower_hypertrophy'),

  ('PPL + Upper Lower (5-day)', 0, 1, 'Push', 'Buổi 1 - Đẩy', 'push_hypertrophy'),
  ('PPL + Upper Lower (5-day)', 1, 2, 'Pull', 'Buổi 2 - Kéo', 'pull_hypertrophy'),
  ('PPL + Upper Lower (5-day)', 2, 3, 'Legs', 'Buổi 3 - Chân', 'legs_hypertrophy'),
  ('PPL + Upper Lower (5-day)', 3, 5, 'Upper', 'Buổi 4 - Thân Trên', 'upper_hypertrophy'),
  ('PPL + Upper Lower (5-day)', 4, 6, 'Lower', 'Buổi 5 - Thân Dưới', 'lower_hypertrophy'),

  ('Full Body (3-day)', 0, 1, 'Full Body A', 'Buổi 1 - Toàn Thân A', 'full_a'),
  ('Full Body (3-day)', 1, 3, 'Full Body B', 'Buổi 2 - Toàn Thân B', 'full_b'),
  ('Full Body (3-day)', 2, 5, 'Full Body C', 'Buổi 3 - Toàn Thân C', 'full_c'),

  ('Bro Split (5-day)', 0, 1, 'Chest', 'Buổi 1 - Ngực', 'chest'),
  ('Bro Split (5-day)', 1, 2, 'Back', 'Buổi 2 - Lưng', 'back'),
  ('Bro Split (5-day)', 2, 3, 'Legs', 'Buổi 3 - Chân', 'legs_hypertrophy'),
  ('Bro Split (5-day)', 3, 5, 'Shoulders', 'Buổi 4 - Vai', 'shoulders'),
  ('Bro Split (5-day)', 4, 6, 'Arms', 'Buổi 5 - Tay Trước & Tay Sau', 'arms'),

  ('Arnold Split', 0, 1, 'Chest + Back A', 'Buổi 1 - Ngực & Lưng A', 'chest_back'),
  ('Arnold Split', 1, 2, 'Shoulders + Arms A', 'Buổi 2 - Vai & Tay A', 'shoulders_arms'),
  ('Arnold Split', 2, 3, 'Legs A', 'Buổi 3 - Chân A', 'legs_strength'),
  ('Arnold Split', 3, 4, 'Chest + Back B', 'Buổi 4 - Ngực & Lưng B', 'chest_back'),
  ('Arnold Split', 4, 5, 'Shoulders + Arms B', 'Buổi 5 - Vai & Tay B', 'shoulders_arms'),
  ('Arnold Split', 5, 6, 'Legs B', 'Buổi 6 - Chân B', 'legs_hypertrophy'),

  ('5x5 Strength', 0, 1, 'Workout A', 'Buổi A - Squat, Bench Press, Barbell Row', 'five_a'),
  ('5x5 Strength', 1, 3, 'Workout B', 'Buổi B - Squat, Overhead Press, Deadlift', 'five_b'),
  ('5x5 Strength', 2, 5, 'Workout A', 'Buổi A - Squat, Bench Press, Barbell Row', 'five_a'),

  ('PHAT', 0, 1, 'Upper Power', 'Buổi 1 - Thân Trên (Sức Mạnh)', 'phat_upper_power'),
  ('PHAT', 1, 2, 'Lower Power', 'Buổi 2 - Thân Dưới (Sức Mạnh)', 'phat_lower_power'),
  ('PHAT', 2, 4, 'Back + Shoulders', 'Buổi 3 - Lưng & Vai (Tăng Cơ)', 'phat_back_shoulders'),
  ('PHAT', 3, 5, 'Legs Hypertrophy', 'Buổi 4 - Chân (Tăng Cơ)', 'legs_hypertrophy'),
  ('PHAT', 4, 6, 'Chest + Arms', 'Buổi 5 - Ngực & Tay (Tăng Cơ)', 'phat_chest_arms');

UPDATE training_programs p
SET name_vi = v.name_vi,
    description = v.description
FROM (VALUES
  ('Push Pull Legs (PPL)', 'Đẩy - Kéo - Chân (6 buổi/tuần)', 'Mỗi nhóm cơ chính được tập 2 lần/tuần. Ba buổi đầu ưu tiên sức mạnh, ba buổi sau ưu tiên tăng cơ; phù hợp người tập trung cấp đã thích nghi với tần suất cao.'),
  ('Upper / Lower (4-day)', 'Thân Trên / Thân Dưới (4 buổi/tuần)', 'Mỗi vùng thân trên và thân dưới được tập 2 lần/tuần, xen kẽ ngày sức mạnh và ngày tăng cơ để cân bằng tiến bộ với phục hồi.'),
  ('PPL + Upper Lower (5-day)', 'PPL + Thân Trên / Thân Dưới (5 buổi/tuần)', 'Ba buổi Đẩy-Kéo-Chân kết hợp hai buổi Thân Trên-Thân Dưới, phân bổ khối lượng mỗi nhóm cơ khoảng 2 lần/tuần.'),
  ('Full Body (3-day)', 'Toàn Thân (3 buổi/tuần)', 'Lịch toàn thân vào Thứ Hai, Thứ Tư và Thứ Sáu; khối lượng mỗi buổi vừa phải, phù hợp người mới hoặc người có ít ngày tập.'),
  ('Bro Split (5-day)', 'Chia Nhóm Cơ (5 buổi/tuần)', 'Mỗi buổi tập trung một vùng cơ với khối lượng cao. Đây là lựa chọn thiên về sở thích; người mới nên ưu tiên Toàn Thân hoặc Thân Trên/Thân Dưới.'),
  ('Arnold Split', 'Arnold Split (6 buổi/tuần)', 'Chu kỳ Ngực-Lưng, Vai-Tay, Chân lặp lại hai lần/tuần; dành cho người tập trung cấp hoặc nâng cao có khả năng phục hồi tốt.'),
  ('5x5 Strength', '5×5 Sức Mạnh (3 buổi/tuần)', 'Ba buổi compound toàn thân cách ngày. Tuần kế tiếp nên đảo thứ tự A/B để cân bằng tần suất; luôn giữ kỹ thuật và dừng trước thất bại.'),
  ('PHAT', 'PHAT - Sức Mạnh & Tăng Cơ (5 buổi/tuần)', 'Hai buổi sức mạnh đầu tuần, một ngày nghỉ, sau đó ba buổi tăng cơ theo nhóm; phù hợp người tập trung cấp-nâng cao.')
) AS v(name, name_vi, description)
WHERE p.name = v.name AND p.type = 'system';

-- Temporarily remove the uniqueness constraint so day numbers can be swapped
-- safely in one deterministic update, then restore it below.
ALTER TABLE training_program_days
  DROP CONSTRAINT IF EXISTS training_program_days_program_id_day_of_week_key;

UPDATE training_program_days d
SET day_of_week = plan.day_of_week,
    name = plan.day_name,
    name_vi = plan.day_name_vi
FROM training_programs p
JOIN _program_day_plan plan ON plan.program_name = p.name
WHERE d.program_id = p.id
  AND d.order_index = plan.day_order
  AND p.type = 'system';

ALTER TABLE training_program_days
  ADD CONSTRAINT training_program_days_program_id_day_of_week_key
  UNIQUE (program_id, day_of_week);

CREATE TEMP TABLE _exercise_plan (
  archetype TEXT NOT NULL,
  exercise_order INTEGER NOT NULL,
  exercise_slug TEXT NOT NULL,
  sets INTEGER NOT NULL,
  rep_min INTEGER NOT NULL,
  rep_max INTEGER NOT NULL,
  rir INTEGER NOT NULL,
  rest_seconds INTEGER NOT NULL,
  PRIMARY KEY (archetype, exercise_order)
) ON COMMIT DROP;

INSERT INTO _exercise_plan VALUES
  ('push_strength',0,'barbell-bench-press',3,5,8,2,180),
  ('push_strength',1,'barbell-seated-overhead-press',3,6,8,2,150),
  ('push_strength',2,'dumbbell-incline-bench-press',3,8,10,2,120),
  ('push_strength',3,'dumbbell-seated-lateral-raise',3,12,15,1,75),
  ('push_strength',4,'cable-pushdown-with-rope-attachment',3,10,15,1,75),
  ('push_hypertrophy',0,'dumbbell-incline-bench-press',3,8,12,2,120),
  ('push_hypertrophy',1,'dumbbell-bench-press',3,8,12,1,120),
  ('push_hypertrophy',2,'dumbbell-seated-lateral-raise',3,12,20,1,75),
  ('push_hypertrophy',3,'dumbbell-fly',3,12,15,1,75),
  ('push_hypertrophy',4,'cable-overhead-triceps-extension-rope-attachment',3,10,15,1,75),

  ('pull_strength',0,'barbell-deadlift',3,3,5,2,240),
  ('pull_strength',1,'wide-grip-pull-up',3,5,8,2,150),
  ('pull_strength',2,'barbell-bent-over-row',3,6,8,2,150),
  ('pull_strength',3,'cable-seated-rear-lateral-raise',3,12,15,1,75),
  ('pull_strength',4,'barbell-curl',3,8,12,1,90),
  ('pull_hypertrophy',0,'cable-lat-pulldown-full-range-of-motion',3,8,12,2,120),
  ('pull_hypertrophy',1,'barbell-bent-over-row',3,8,12,2,120),
  ('pull_hypertrophy',2,'cable-seated-rear-lateral-raise',3,12,20,1,75),
  ('pull_hypertrophy',3,'dumbbell-hammer-curl',3,10,15,1,75),
  ('pull_hypertrophy',4,'barbell-shrug',3,10,15,1,90),

  ('legs_strength',0,'barbell-high-bar-squat',4,5,8,2,210),
  ('legs_strength',1,'barbell-romanian-deadlift',3,6,10,2,150),
  ('legs_strength',2,'sled-45-leg-press',3,8,12,2,150),
  ('legs_strength',3,'lever-seated-leg-curl',3,10,15,1,90),
  ('legs_strength',4,'barbell-standing-leg-calf-raise',4,10,15,1,75),
  ('legs_hypertrophy',0,'barbell-front-squat',3,8,12,2,180),
  ('legs_hypertrophy',1,'barbell-romanian-deadlift',3,8,12,2,150),
  ('legs_hypertrophy',2,'lever-leg-extension',3,12,15,1,75),
  ('legs_hypertrophy',3,'lever-seated-leg-curl',3,10,15,1,90),
  ('legs_hypertrophy',4,'barbell-standing-leg-calf-raise',4,12,20,1,75),
  ('legs_hypertrophy',5,'hanging-leg-raise',3,8,15,2,75),

  ('upper_strength',0,'barbell-bench-press',3,5,8,2,180),
  ('upper_strength',1,'barbell-bent-over-row',3,6,8,2,150),
  ('upper_strength',2,'barbell-seated-overhead-press',3,6,10,2,150),
  ('upper_strength',3,'cable-lat-pulldown-full-range-of-motion',3,8,12,2,120),
  ('upper_strength',4,'barbell-curl',2,8,12,1,75),
  ('upper_strength',5,'cable-pushdown-with-rope-attachment',2,10,15,1,75),
  ('upper_hypertrophy',0,'dumbbell-incline-bench-press',3,8,12,2,120),
  ('upper_hypertrophy',1,'wide-grip-pull-up',3,6,10,2,120),
  ('upper_hypertrophy',2,'dumbbell-bench-press',3,8,12,1,120),
  ('upper_hypertrophy',3,'barbell-bent-over-row',3,8,12,1,120),
  ('upper_hypertrophy',4,'dumbbell-seated-lateral-raise',3,12,20,1,75),
  ('upper_hypertrophy',5,'dumbbell-hammer-curl',2,10,15,1,75),
  ('upper_hypertrophy',6,'cable-overhead-triceps-extension-rope-attachment',2,10,15,1,75),
  ('lower_strength',0,'barbell-high-bar-squat',4,5,8,2,210),
  ('lower_strength',1,'barbell-romanian-deadlift',3,6,10,2,150),
  ('lower_strength',2,'sled-45-leg-press',3,8,12,2,150),
  ('lower_strength',3,'lever-seated-leg-curl',3,10,15,1,90),
  ('lower_strength',4,'barbell-standing-leg-calf-raise',3,10,15,1,75),
  ('lower_hypertrophy',0,'barbell-front-squat',3,8,12,2,180),
  ('lower_hypertrophy',1,'barbell-romanian-deadlift',3,8,12,2,150),
  ('lower_hypertrophy',2,'lever-leg-extension',3,12,15,1,75),
  ('lower_hypertrophy',3,'lever-seated-leg-curl',3,10,15,1,90),
  ('lower_hypertrophy',4,'barbell-standing-leg-calf-raise',3,12,20,1,75),
  ('lower_hypertrophy',5,'weighted-front-plank',3,30,60,2,75),

  ('full_a',0,'barbell-high-bar-squat',3,6,10,2,180),
  ('full_a',1,'barbell-bench-press',3,6,10,2,150),
  ('full_a',2,'barbell-bent-over-row',3,8,12,2,120),
  ('full_a',3,'barbell-standing-leg-calf-raise',2,12,20,2,75),
  ('full_a',4,'weighted-front-plank',2,30,60,2,75),
  ('full_b',0,'barbell-deadlift',2,3,5,2,240),
  ('full_b',1,'barbell-seated-overhead-press',3,6,10,2,150),
  ('full_b',2,'cable-lat-pulldown-full-range-of-motion',3,8,12,2,120),
  ('full_b',3,'sled-45-leg-press',3,10,15,2,120),
  ('full_b',4,'barbell-curl',2,10,15,2,75),
  ('full_c',0,'barbell-front-squat',3,8,12,2,180),
  ('full_c',1,'dumbbell-incline-bench-press',3,8,12,2,120),
  ('full_c',2,'wide-grip-pull-up',3,6,10,2,120),
  ('full_c',3,'barbell-romanian-deadlift',3,8,12,2,150),
  ('full_c',4,'cable-pushdown-with-rope-attachment',2,10,15,2,75),

  ('chest',0,'barbell-bench-press',4,6,10,2,180),
  ('chest',1,'dumbbell-incline-bench-press',3,8,12,1,120),
  ('chest',2,'chest-dip',3,6,12,1,120),
  ('chest',3,'dumbbell-fly',3,12,15,1,75),
  ('back',0,'barbell-deadlift',3,3,6,2,240),
  ('back',1,'wide-grip-pull-up',3,6,10,2,150),
  ('back',2,'barbell-bent-over-row',3,8,12,1,120),
  ('back',3,'cable-lat-pulldown-full-range-of-motion',3,10,15,1,120),
  ('back',4,'cable-seated-rear-lateral-raise',3,12,20,1,75),
  ('shoulders',0,'barbell-seated-overhead-press',4,6,10,2,150),
  ('shoulders',1,'dumbbell-seated-lateral-raise',4,12,20,1,75),
  ('shoulders',2,'cable-seated-rear-lateral-raise',4,12,20,1,75),
  ('shoulders',3,'barbell-shrug',3,10,15,1,90),
  ('arms',0,'barbell-curl',3,8,12,1,90),
  ('arms',1,'cable-overhead-triceps-extension-rope-attachment',3,8,12,1,90),
  ('arms',2,'dumbbell-hammer-curl',3,10,15,1,75),
  ('arms',3,'cable-pushdown-with-rope-attachment',3,10,15,1,75),

  ('chest_back',0,'barbell-bench-press',3,6,10,2,150),
  ('chest_back',1,'wide-grip-pull-up',3,6,10,2,150),
  ('chest_back',2,'dumbbell-incline-bench-press',3,8,12,1,120),
  ('chest_back',3,'barbell-bent-over-row',3,8,12,1,120),
  ('chest_back',4,'dumbbell-fly',2,12,15,1,75),
  ('chest_back',5,'cable-lat-pulldown-full-range-of-motion',2,10,15,1,90),
  ('shoulders_arms',0,'barbell-seated-overhead-press',3,6,10,2,150),
  ('shoulders_arms',1,'dumbbell-seated-lateral-raise',3,12,20,1,75),
  ('shoulders_arms',2,'cable-seated-rear-lateral-raise',3,12,20,1,75),
  ('shoulders_arms',3,'barbell-curl',3,8,12,1,75),
  ('shoulders_arms',4,'cable-pushdown-with-rope-attachment',3,10,15,1,75),

  ('five_a',0,'barbell-high-bar-squat',5,5,5,2,240),
  ('five_a',1,'barbell-bench-press',5,5,5,2,210),
  ('five_a',2,'barbell-bent-over-row',5,5,5,2,180),
  ('five_b',0,'barbell-high-bar-squat',5,5,5,2,240),
  ('five_b',1,'barbell-seated-overhead-press',5,5,5,2,210),
  ('five_b',2,'barbell-deadlift',1,5,5,2,240),

  ('phat_upper_power',0,'barbell-bench-press',4,3,5,2,240),
  ('phat_upper_power',1,'barbell-bent-over-row',4,3,5,2,240),
  ('phat_upper_power',2,'barbell-seated-overhead-press',3,5,8,2,180),
  ('phat_upper_power',3,'wide-grip-pull-up',3,5,8,2,180),
  ('phat_lower_power',0,'barbell-high-bar-squat',4,3,5,2,240),
  ('phat_lower_power',1,'barbell-deadlift',3,3,5,2,240),
  ('phat_lower_power',2,'sled-45-leg-press',3,6,10,2,180),
  ('phat_back_shoulders',0,'barbell-bent-over-row',3,8,12,1,120),
  ('phat_back_shoulders',1,'cable-lat-pulldown-full-range-of-motion',3,10,15,1,120),
  ('phat_back_shoulders',2,'dumbbell-seated-lateral-raise',3,12,20,1,75),
  ('phat_back_shoulders',3,'cable-seated-rear-lateral-raise',3,12,20,1,75),
  ('phat_back_shoulders',4,'dumbbell-hammer-curl',3,10,15,1,75),
  ('phat_chest_arms',0,'dumbbell-incline-bench-press',3,8,12,1,120),
  ('phat_chest_arms',1,'dumbbell-bench-press',3,8,12,1,120),
  ('phat_chest_arms',2,'dumbbell-fly',3,12,15,1,75),
  ('phat_chest_arms',3,'barbell-curl',3,8,12,1,75),
  ('phat_chest_arms',4,'cable-pushdown-with-rope-attachment',3,10,15,1,75);

DO $$
DECLARE missing_slugs TEXT;
BEGIN
  SELECT string_agg(DISTINCT plan.exercise_slug, ', ' ORDER BY plan.exercise_slug)
  INTO missing_slugs
  FROM _exercise_plan plan
  LEFT JOIN exercises e ON e.slug = plan.exercise_slug AND e.owner_user_id IS NULL
  WHERE e.id IS NULL;

  IF missing_slugs IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot standardize programs; missing canonical exercise slugs: %', missing_slugs;
  END IF;
END $$;

DELETE FROM program_day_exercises pde
USING training_program_days d, training_programs p, _program_day_plan plan
WHERE pde.program_day_id = d.id
  AND d.program_id = p.id
  AND p.name = plan.program_name
  AND d.order_index = plan.day_order
  AND p.type = 'system';

INSERT INTO program_day_exercises (
  program_day_id, exercise_id, order_index, target_sets,
  target_rep_min, target_rep_max, target_rir, rest_seconds
)
SELECT d.id, e.id, ep.exercise_order, ep.sets,
       ep.rep_min, ep.rep_max, ep.rir, ep.rest_seconds
FROM _program_day_plan dp
JOIN training_programs p ON p.name = dp.program_name AND p.type = 'system'
JOIN training_program_days d ON d.program_id = p.id AND d.order_index = dp.day_order
JOIN _exercise_plan ep ON ep.archetype = dp.archetype
JOIN LATERAL (
  SELECT candidate.id
  FROM exercises candidate
  WHERE candidate.slug = ep.exercise_slug
    AND candidate.owner_user_id IS NULL
  ORDER BY candidate.created_at, candidate.id
  LIMIT 1
) e ON TRUE;

CREATE TEMP TABLE _target_plan (
  archetype TEXT NOT NULL,
  muscle_slug TEXT NOT NULL,
  role day_target_muscle_role NOT NULL,
  target_sets INTEGER NOT NULL,
  PRIMARY KEY (archetype, muscle_slug, role)
) ON COMMIT DROP;

INSERT INTO _target_plan VALUES
  ('push_strength','chest','primary',6),('push_strength','shoulders','primary',6),('push_strength','triceps','secondary',3),
  ('push_hypertrophy','chest','primary',7),('push_hypertrophy','shoulders','primary',3),('push_hypertrophy','triceps','secondary',3),
  ('pull_strength','back','primary',9),('pull_strength','rear_delts','secondary',3),('pull_strength','biceps','secondary',3),
  ('pull_hypertrophy','back','primary',6),('pull_hypertrophy','lats','primary',3),('pull_hypertrophy','rear_delts','secondary',3),('pull_hypertrophy','biceps','secondary',3),
  ('legs_strength','quads','primary',7),('legs_strength','hamstrings','primary',6),('legs_strength','glutes','secondary',4),('legs_strength','calves','secondary',4),
  ('legs_hypertrophy','quads','primary',6),('legs_hypertrophy','hamstrings','primary',6),('legs_hypertrophy','glutes','secondary',3),('legs_hypertrophy','calves','secondary',4),('legs_hypertrophy','core','secondary',3),
  ('upper_strength','chest','primary',3),('upper_strength','back','primary',6),('upper_strength','shoulders','primary',3),('upper_strength','biceps','secondary',2),('upper_strength','triceps','secondary',2),
  ('upper_hypertrophy','chest','primary',6),('upper_hypertrophy','back','primary',6),('upper_hypertrophy','shoulders','primary',3),('upper_hypertrophy','biceps','secondary',2),('upper_hypertrophy','triceps','secondary',2),
  ('lower_strength','quads','primary',7),('lower_strength','hamstrings','primary',6),('lower_strength','glutes','secondary',4),('lower_strength','calves','secondary',3),
  ('lower_hypertrophy','quads','primary',6),('lower_hypertrophy','hamstrings','primary',6),('lower_hypertrophy','glutes','secondary',3),('lower_hypertrophy','calves','secondary',3),('lower_hypertrophy','core','secondary',3),
  ('full_a','quads','primary',3),('full_a','chest','primary',3),('full_a','back','primary',3),('full_a','calves','secondary',2),('full_a','core','secondary',2),
  ('full_b','hamstrings','primary',5),('full_b','shoulders','primary',3),('full_b','back','primary',3),('full_b','quads','secondary',3),('full_b','biceps','secondary',2),
  ('full_c','quads','primary',3),('full_c','hamstrings','primary',3),('full_c','chest','primary',3),('full_c','back','primary',3),('full_c','triceps','secondary',2),
  ('chest','chest','primary',13),('chest','triceps','secondary',3),('chest','front_delts','secondary',3),
  ('back','back','primary',12),('back','rear_delts','secondary',3),('back','biceps','secondary',3),
  ('shoulders','shoulders','primary',12),('shoulders','rear_delts','primary',4),('shoulders','forearms','secondary',3),
  ('arms','biceps','primary',6),('arms','triceps','primary',6),('arms','forearms','secondary',3),
  ('chest_back','chest','primary',8),('chest_back','back','primary',8),('chest_back','biceps','secondary',2),('chest_back','triceps','secondary',2),
  ('shoulders_arms','shoulders','primary',9),('shoulders_arms','biceps','primary',3),('shoulders_arms','triceps','primary',3),
  ('five_a','quads','primary',5),('five_a','chest','primary',5),('five_a','back','primary',5),
  ('five_b','quads','primary',5),('five_b','shoulders','primary',5),('five_b','hamstrings','primary',1),('five_b','back','secondary',1),
  ('phat_upper_power','chest','primary',4),('phat_upper_power','back','primary',7),('phat_upper_power','shoulders','primary',3),
  ('phat_lower_power','quads','primary',7),('phat_lower_power','hamstrings','primary',3),('phat_lower_power','glutes','secondary',3),
  ('phat_back_shoulders','back','primary',6),('phat_back_shoulders','shoulders','primary',6),('phat_back_shoulders','biceps','secondary',3),
  ('phat_chest_arms','chest','primary',9),('phat_chest_arms','biceps','primary',3),('phat_chest_arms','triceps','primary',3);

DELETE FROM training_day_targets t
USING training_program_days d, training_programs p, _program_day_plan plan
WHERE t.program_day_id = d.id
  AND d.program_id = p.id
  AND p.name = plan.program_name
  AND d.order_index = plan.day_order
  AND p.type = 'system';

INSERT INTO training_day_targets (program_day_id, muscle_id, role, target_sets)
SELECT d.id, m.id, tp.role, tp.target_sets
FROM _program_day_plan dp
JOIN training_programs p ON p.name = dp.program_name AND p.type = 'system'
JOIN training_program_days d ON d.program_id = p.id AND d.order_index = dp.day_order
JOIN _target_plan tp ON tp.archetype = dp.archetype
JOIN muscles m ON m.slug = tp.muscle_slug;
