BEGIN;

-- Correct mappings against the actual source GIFs:
--   air-bike.gif is a floor bicycle crunch (bodyweight + mat), while
--   cycle-cross-trainer.gif shows a fan-resistance Air Bike.
WITH ex AS (
  SELECT id FROM public.exercises WHERE slug = 'air-bike' AND type = 'system'
)
DELETE FROM public.exercise_equipment ee
USING ex
WHERE ee.exercise_id = ex.id;

INSERT INTO public.exercise_equipment (exercise_id, equipment_id, required)
SELECT ex.id, eq.id, TRUE
FROM public.exercises ex
JOIN public.equipment eq ON eq.slug IN ('bodyweight', 'exercise-mat')
WHERE ex.slug = 'air-bike' AND ex.type = 'system'
ON CONFLICT DO NOTHING;

WITH ex AS (
  SELECT id FROM public.exercises WHERE slug = 'cycle-cross-trainer' AND type = 'system'
)
DELETE FROM public.exercise_equipment ee
USING ex
WHERE ee.exercise_id = ex.id;

INSERT INTO public.exercise_equipment (exercise_id, equipment_id, required)
SELECT ex.id, eq.id, TRUE
FROM public.exercises ex
JOIN public.equipment eq ON eq.slug = 'air-bike'
WHERE ex.slug = 'cycle-cross-trainer' AND ex.type = 'system'
ON CONFLICT DO NOTHING;

COMMIT;
