BEGIN;

UPDATE public.equipment AS e
SET image_url = '/equipment/' || e.slug || '.webp'
WHERE e.slug IN (
  'air-bike',
  'arc-trainer',
  'lever-calf-raise',
  'lever-calf-press',
  'lever-back-extension'
);

COMMIT;
