BEGIN;

-- Merge the duplicate cardio rows into the existing catalog entries:
-- Air Bike -> Stationary Bike; Arc Trainer -> Elliptical.
-- Preserve all relationship rows and quantities before removing duplicates.

INSERT INTO public.exercise_equipment (exercise_id, equipment_id, required)
SELECT ee.exercise_id, target.id, ee.required
FROM public.exercise_equipment ee
JOIN public.equipment source ON source.id = ee.equipment_id
JOIN public.equipment target ON target.slug = CASE source.slug
  WHEN 'air-bike' THEN 'stationary-bike'
  WHEN 'arc-trainer' THEN 'elliptical'
END
WHERE source.slug IN ('air-bike', 'arc-trainer')
ON CONFLICT DO NOTHING;

INSERT INTO public.gym_equipment (gym_id, equipment_id, quantity)
SELECT ge.gym_id, target.id, ge.quantity
FROM public.gym_equipment ge
JOIN public.equipment source ON source.id = ge.equipment_id
JOIN public.equipment target ON target.slug = CASE source.slug
  WHEN 'air-bike' THEN 'stationary-bike'
  WHEN 'arc-trainer' THEN 'elliptical'
END
WHERE source.slug IN ('air-bike', 'arc-trainer')
ON CONFLICT (gym_id, equipment_id) DO UPDATE
SET quantity = public.gym_equipment.quantity + EXCLUDED.quantity;

INSERT INTO public.profile_equipment (profile_id, equipment_id)
SELECT pe.profile_id, target.id
FROM public.profile_equipment pe
JOIN public.equipment source ON source.id = pe.equipment_id
JOIN public.equipment target ON target.slug = CASE source.slug
  WHEN 'air-bike' THEN 'stationary-bike'
  WHEN 'arc-trainer' THEN 'elliptical'
END
WHERE source.slug IN ('air-bike', 'arc-trainer')
ON CONFLICT DO NOTHING;

UPDATE public.exercises
SET equipment_vi = ARRAY['Xe Đạp Tập'],
    content_json = jsonb_set(content_json, '{equipment}', '["Xe Đạp Tập"]'::jsonb)
WHERE slug = 'cycle-cross-trainer' AND type = 'system';

DELETE FROM public.exercise_equipment ee
USING public.equipment source
WHERE ee.equipment_id = source.id
  AND source.slug IN ('air-bike', 'arc-trainer');

DELETE FROM public.gym_equipment ge
USING public.equipment source
WHERE ge.equipment_id = source.id
  AND source.slug IN ('air-bike', 'arc-trainer');

DELETE FROM public.profile_equipment pe
USING public.equipment source
WHERE pe.equipment_id = source.id
  AND source.slug IN ('air-bike', 'arc-trainer');

DELETE FROM public.equipment
WHERE slug IN ('air-bike', 'arc-trainer');

COMMIT;
