-- Add explicit, balanced forearm work to system programs.
--
-- Forearm isolation is placed at the end of Pull, Upper, Arms or Full Body
-- sessions. Flexion and extension are split across the week where possible so
-- one wrist action is not trained exclusively. The classic 5x5 template stays
-- unchanged because adding isolation work would alter its intentionally minimal
-- structure; its compound lifts already impose substantial grip demand.

CREATE TEMP TABLE _forearm_program_plan (
  program_name TEXT NOT NULL,
  day_order INTEGER NOT NULL,
  slot INTEGER NOT NULL,
  exercise_slug TEXT NOT NULL,
  target_sets INTEGER NOT NULL,
  target_rep_min INTEGER NOT NULL,
  target_rep_max INTEGER NOT NULL,
  target_rir INTEGER NOT NULL,
  rest_seconds INTEGER NOT NULL,
  notes TEXT NOT NULL,
  PRIMARY KEY (program_name, day_order, slot)
) ON COMMIT DROP;

INSERT INTO _forearm_program_plan VALUES
  ('Push Pull Legs (PPL)',          1, 0, 'barbell-palms-down-wrist-curl-over-a-bench', 2, 12, 20, 2, 60, 'Cẳng tay — nhóm duỗi cổ tay'),
  ('Push Pull Legs (PPL)',          4, 0, 'barbell-palms-up-wrist-curl-over-a-bench',   2, 12, 20, 2, 60, 'Cẳng tay — nhóm gập cổ tay'),

  ('Upper / Lower (4-day)',         0, 0, 'barbell-palms-down-wrist-curl-over-a-bench', 2, 12, 20, 2, 60, 'Cẳng tay — nhóm duỗi cổ tay'),
  ('Upper / Lower (4-day)',         2, 0, 'barbell-palms-up-wrist-curl-over-a-bench',   2, 12, 20, 2, 60, 'Cẳng tay — nhóm gập cổ tay'),

  ('PPL + Upper Lower (5-day)',     1, 0, 'barbell-palms-down-wrist-curl-over-a-bench', 2, 12, 20, 2, 60, 'Cẳng tay — nhóm duỗi cổ tay'),
  ('PPL + Upper Lower (5-day)',     3, 0, 'barbell-palms-up-wrist-curl-over-a-bench',   2, 12, 20, 2, 60, 'Cẳng tay — nhóm gập cổ tay'),

  ('Full Body (3-day)',             1, 0, 'barbell-palms-down-wrist-curl-over-a-bench', 2, 12, 20, 2, 60, 'Cẳng tay — nhóm duỗi cổ tay'),
  ('Full Body (3-day)',             2, 0, 'barbell-palms-up-wrist-curl-over-a-bench',   2, 12, 20, 2, 60, 'Cẳng tay — nhóm gập cổ tay'),

  ('Bro Split (5-day)',             4, 0, 'barbell-palms-down-wrist-curl-over-a-bench', 2, 12, 20, 2, 60, 'Cẳng tay — nhóm duỗi cổ tay'),
  ('Bro Split (5-day)',             4, 1, 'barbell-palms-up-wrist-curl-over-a-bench',   2, 12, 20, 2, 60, 'Cẳng tay — nhóm gập cổ tay'),

  ('Arnold Split',                  1, 0, 'barbell-palms-down-wrist-curl-over-a-bench', 2, 12, 20, 2, 60, 'Cẳng tay — nhóm duỗi cổ tay'),
  ('Arnold Split',                  4, 0, 'barbell-palms-up-wrist-curl-over-a-bench',   2, 12, 20, 2, 60, 'Cẳng tay — nhóm gập cổ tay'),

  ('PHAT',                          2, 0, 'barbell-palms-down-wrist-curl-over-a-bench', 2, 12, 20, 2, 60, 'Cẳng tay — nhóm duỗi cổ tay'),
  ('PHAT',                          4, 0, 'barbell-palms-up-wrist-curl-over-a-bench',   2, 12, 20, 2, 60, 'Cẳng tay — nhóm gập cổ tay');

DO $$
DECLARE
  missing_programs TEXT;
  missing_exercises TEXT;
  missing_forearms BOOLEAN;
BEGIN
  SELECT string_agg(DISTINCT plan.program_name, ', ' ORDER BY plan.program_name)
  INTO missing_programs
  FROM _forearm_program_plan plan
  LEFT JOIN training_programs program
    ON program.name = plan.program_name AND program.type = 'system'
  LEFT JOIN training_program_days day
    ON day.program_id = program.id AND day.order_index = plan.day_order
  WHERE day.id IS NULL;

  IF missing_programs IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot add forearm work; missing program days for: %', missing_programs;
  END IF;

  SELECT string_agg(DISTINCT plan.exercise_slug, ', ' ORDER BY plan.exercise_slug)
  INTO missing_exercises
  FROM _forearm_program_plan plan
  LEFT JOIN exercises exercise
    ON exercise.slug = plan.exercise_slug
   AND exercise.owner_user_id IS NULL
   AND exercise.type = 'system'
   AND exercise.status = 'published'
  WHERE exercise.id IS NULL;

  IF missing_exercises IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot add forearm work; missing published exercises: %', missing_exercises;
  END IF;

  SELECT NOT EXISTS (SELECT 1 FROM muscles WHERE slug = 'forearms')
  INTO missing_forearms;

  IF missing_forearms THEN
    RAISE EXCEPTION 'Cannot add forearm work; muscle slug forearms is missing';
  END IF;
END $$;

-- Make the migration idempotent: remove only the two exact movements managed
-- by this migration, then append them after the existing session exercises.
DELETE FROM program_day_exercises existing
USING training_program_days day,
      training_programs program,
      exercises exercise,
      _forearm_program_plan plan
WHERE existing.program_day_id = day.id
  AND day.program_id = program.id
  AND existing.exercise_id = exercise.id
  AND program.type = 'system'
  AND plan.program_name = program.name
  AND plan.day_order = day.order_index
  AND plan.exercise_slug = exercise.slug;

WITH resolved AS (
  SELECT day.id AS program_day_id,
         plan.slot,
         exercise.id AS exercise_id,
         plan.target_sets,
         plan.target_rep_min,
         plan.target_rep_max,
         plan.target_rir,
         plan.rest_seconds,
         plan.notes
  FROM _forearm_program_plan plan
  JOIN training_programs program
    ON program.name = plan.program_name AND program.type = 'system'
  JOIN training_program_days day
    ON day.program_id = program.id AND day.order_index = plan.day_order
  JOIN exercises exercise
    ON exercise.slug = plan.exercise_slug
   AND exercise.owner_user_id IS NULL
   AND exercise.type = 'system'
),
ordered AS (
  SELECT resolved.*,
         COALESCE(existing.max_order, -1)
           + ROW_NUMBER() OVER (
               PARTITION BY resolved.program_day_id
               ORDER BY resolved.slot
             ) AS new_order
  FROM resolved
  LEFT JOIN LATERAL (
    SELECT MAX(program_day_exercises.order_index) AS max_order
    FROM program_day_exercises
    WHERE program_day_exercises.program_day_id = resolved.program_day_id
  ) existing ON TRUE
)
INSERT INTO program_day_exercises (
  program_day_id,
  exercise_id,
  order_index,
  target_sets,
  target_rep_min,
  target_rep_max,
  target_rir,
  rest_seconds,
  notes
)
SELECT program_day_id,
       exercise_id,
       new_order,
       target_sets,
       target_rep_min,
       target_rep_max,
       target_rir,
       rest_seconds,
       notes
FROM ordered;

-- Remove stale forearm targets (the old Bro Split shoulder day had one without
-- a matching exercise), then rebuild targets exclusively from the plan above.
DELETE FROM training_day_targets target
USING training_program_days day,
      training_programs program,
      muscles muscle
WHERE target.program_day_id = day.id
  AND day.program_id = program.id
  AND target.muscle_id = muscle.id
  AND program.type = 'system'
  AND muscle.slug = 'forearms';

INSERT INTO training_day_targets (program_day_id, muscle_id, role, target_sets)
SELECT day.id,
       muscle.id,
       'secondary'::day_target_muscle_role,
       SUM(plan.target_sets)::INTEGER
FROM _forearm_program_plan plan
JOIN training_programs program
  ON program.name = plan.program_name AND program.type = 'system'
JOIN training_program_days day
  ON day.program_id = program.id AND day.order_index = plan.day_order
JOIN muscles muscle ON muscle.slug = 'forearms'
GROUP BY day.id, muscle.id;

DO $$
DECLARE
  planned_count INTEGER;
  mapped_count INTEGER;
  orphan_target_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO planned_count FROM _forearm_program_plan;

  SELECT COUNT(*)
  INTO mapped_count
  FROM _forearm_program_plan plan
  JOIN training_programs program
    ON program.name = plan.program_name AND program.type = 'system'
  JOIN training_program_days day
    ON day.program_id = program.id AND day.order_index = plan.day_order
  JOIN program_day_exercises item ON item.program_day_id = day.id
  JOIN exercises exercise
    ON exercise.id = item.exercise_id AND exercise.slug = plan.exercise_slug;

  IF mapped_count <> planned_count THEN
    RAISE EXCEPTION 'Forearm mapping incomplete: expected %, found %', planned_count, mapped_count;
  END IF;

  SELECT COUNT(*)
  INTO orphan_target_count
  FROM training_day_targets target
  JOIN muscles muscle ON muscle.id = target.muscle_id AND muscle.slug = 'forearms'
  JOIN training_program_days day ON day.id = target.program_day_id
  JOIN training_programs program ON program.id = day.program_id AND program.type = 'system'
  WHERE NOT EXISTS (
    SELECT 1
    FROM program_day_exercises item
    JOIN exercise_muscles mapping
      ON mapping.exercise_id = item.exercise_id AND mapping.role = 'primary'
    JOIN muscles mapped_muscle
      ON mapped_muscle.id = mapping.muscle_id AND mapped_muscle.slug = 'forearms'
    WHERE item.program_day_id = day.id
  );

  IF orphan_target_count > 0 THEN
    RAISE EXCEPTION 'Found % forearm targets without a primary forearm exercise', orphan_target_count;
  END IF;
END $$;
