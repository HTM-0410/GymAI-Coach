BEGIN;

UPDATE public.exercises
SET equipment_vi = ARRAY['Trọng Lượng Cơ Thể', 'Thảm Tập'],
    content_json = jsonb_set(content_json, '{equipment}', '["Trọng Lượng Cơ Thể", "Thảm Tập"]'::jsonb)
WHERE slug = 'air-bike' AND type = 'system';

UPDATE public.exercises
SET equipment_vi = ARRAY['Xe Đạp Gió'],
    content_json = jsonb_set(content_json, '{equipment}', '["Xe Đạp Gió"]'::jsonb)
WHERE slug = 'cycle-cross-trainer' AND type = 'system';

COMMIT;
