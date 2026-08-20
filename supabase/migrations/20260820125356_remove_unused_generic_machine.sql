-- Remove the unused generic machine fallback. All machine exercises are mapped
-- to a concrete subtype; this row has no exercise, gym, or profile references.
DELETE FROM public.equipment
WHERE slug = 'machine'
  AND NOT EXISTS (
    SELECT 1 FROM public.exercise_equipment ee
    WHERE ee.equipment_id = equipment.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.gym_equipment ge
    WHERE ge.equipment_id = equipment.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.profile_equipment pe
    WHERE pe.equipment_id = equipment.id
  );
