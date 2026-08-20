-- Merge every Smith exercise-specific row into one physical Smith Machine.
-- Other equipment rows are intentionally untouched.
BEGIN;

INSERT INTO equipment (slug, name, name_vi, category)
VALUES ('smith-machine', 'Smith Machine', 'Máy Smith', 'machine')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    name_vi = EXCLUDED.name_vi,
    category = EXCLUDED.category;

CREATE TEMP TABLE _smith_alias (legacy_slug TEXT PRIMARY KEY) ON COMMIT DROP;

INSERT INTO _smith_alias (legacy_slug) VALUES
  ('smith'),
  ('smith_machine'),
  ('smith-bench-press'),
  ('smith-incline-press'),
  ('smith-shoulder-press'),
  ('smith-squat'),
  ('smith-row'),
  ('smith-curl'),
  ('smith-triceps-extension'),
  ('smith-lateral-raise'),
  ('smith-shrug'),
  ('smith-calf-raise'),
  ('may-smith-cuon-tay'),
  ('may-smith-ay-nguc'),
  ('may-smith-ay-nguc-nghieng'),
  ('may-smith-ay-vai'),
  ('may-smith-duoi-tay-sau'),
  ('may-smith-keo-lung'),
  ('may-smith-nang-got'),
  ('may-smith-nhun-vai'),
  ('may-smith-squat');

-- Copy relationships first. Aggregation prevents a single statement from
-- targeting the same canonical primary key more than once.
INSERT INTO exercise_equipment (exercise_id, equipment_id, required)
SELECT ee.exercise_id, canonical.id, bool_or(ee.required)
FROM exercise_equipment ee
JOIN equipment legacy ON legacy.id = ee.equipment_id
JOIN _smith_alias alias ON alias.legacy_slug = legacy.slug
CROSS JOIN equipment canonical
WHERE canonical.slug = 'smith-machine'
GROUP BY ee.exercise_id, canonical.id
ON CONFLICT (exercise_id, equipment_id) DO UPDATE
SET required = exercise_equipment.required OR EXCLUDED.required;

INSERT INTO gym_equipment (gym_id, equipment_id, quantity, added_at)
SELECT ge.gym_id, canonical.id, max(ge.quantity), min(ge.added_at)
FROM gym_equipment ge
JOIN equipment legacy ON legacy.id = ge.equipment_id
JOIN _smith_alias alias ON alias.legacy_slug = legacy.slug
CROSS JOIN equipment canonical
WHERE canonical.slug = 'smith-machine'
GROUP BY ge.gym_id, canonical.id
ON CONFLICT (gym_id, equipment_id) DO UPDATE
SET quantity = GREATEST(gym_equipment.quantity, EXCLUDED.quantity),
    added_at = LEAST(gym_equipment.added_at, EXCLUDED.added_at);

INSERT INTO profile_equipment (profile_id, equipment_id, created_at)
SELECT pe.profile_id, canonical.id, min(pe.created_at)
FROM profile_equipment pe
JOIN equipment legacy ON legacy.id = pe.equipment_id
JOIN _smith_alias alias ON alias.legacy_slug = legacy.slug
CROSS JOIN equipment canonical
WHERE canonical.slug = 'smith-machine'
GROUP BY pe.profile_id, canonical.id
ON CONFLICT (profile_id, equipment_id) DO NOTHING;

DELETE FROM exercise_equipment ee
USING equipment legacy, _smith_alias alias
WHERE ee.equipment_id = legacy.id
  AND legacy.slug = alias.legacy_slug;

DELETE FROM gym_equipment ge
USING equipment legacy, _smith_alias alias
WHERE ge.equipment_id = legacy.id
  AND legacy.slug = alias.legacy_slug;

DELETE FROM profile_equipment pe
USING equipment legacy, _smith_alias alias
WHERE pe.equipment_id = legacy.id
  AND legacy.slug = alias.legacy_slug;

DELETE FROM equipment legacy
USING _smith_alias alias
WHERE legacy.slug = alias.legacy_slug;

DO $$
DECLARE
  smith_count INTEGER;
  smith_variant_count INTEGER;
BEGIN
  SELECT count(*) INTO smith_count
  FROM equipment
  WHERE slug = 'smith-machine'
    AND name_vi = 'Máy Smith'
    AND category = 'machine';

  SELECT count(*) INTO smith_variant_count
  FROM equipment
  WHERE slug <> 'smith-machine'
    AND (slug LIKE '%smith%' OR lower(coalesce(name_vi, '')) LIKE '%smith%');

  IF smith_count <> 1 OR smith_variant_count <> 0 THEN
    RAISE EXCEPTION
      'Smith merge incomplete: canonical=%, remaining variants=%',
      smith_count,
      smith_variant_count;
  END IF;
END
$$;

COMMIT;
