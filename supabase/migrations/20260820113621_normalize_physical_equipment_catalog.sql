-- Normalize the equipment catalog around physical hardware instead of
-- exercise names. All relationship tables are migrated before legacy rows
-- are removed, so user gym selections and exercise mappings remain intact.
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.canonicalize_equipment(
  source_slug TEXT,
  target_slug TEXT,
  target_name TEXT,
  target_name_vi TEXT,
  target_category TEXT,
  target_image_url TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  source_id UUID;
  target_id UUID;
BEGIN
  SELECT id INTO source_id FROM equipment WHERE slug = source_slug;
  SELECT id INTO target_id FROM equipment WHERE slug = target_slug;

  -- Preserve the existing UUID when this is a pure slug canonicalization.
  IF source_id IS NOT NULL AND target_id IS NULL THEN
    UPDATE equipment
    SET slug = target_slug,
        name = target_name,
        name_vi = target_name_vi,
        category = target_category,
        image_url = COALESCE(target_image_url, image_url)
    WHERE id = source_id;
    RETURN;
  END IF;

  IF target_id IS NULL THEN
    INSERT INTO equipment (slug, name, name_vi, category, image_url)
    VALUES (target_slug, target_name, target_name_vi, target_category, target_image_url)
    RETURNING id INTO target_id;
  ELSE
    UPDATE equipment
    SET name = target_name,
        name_vi = target_name_vi,
        category = target_category,
        image_url = COALESCE(target_image_url, image_url)
    WHERE id = target_id;
  END IF;

  IF source_id IS NULL OR source_id = target_id THEN
    RETURN;
  END IF;

  INSERT INTO exercise_equipment (exercise_id, equipment_id, required)
  SELECT exercise_id, target_id, required
  FROM exercise_equipment
  WHERE equipment_id = source_id
  ON CONFLICT (exercise_id, equipment_id) DO UPDATE
  SET required = exercise_equipment.required OR EXCLUDED.required;

  INSERT INTO gym_equipment (gym_id, equipment_id, quantity, added_at)
  SELECT gym_id, target_id, quantity, added_at
  FROM gym_equipment
  WHERE equipment_id = source_id
  ON CONFLICT (gym_id, equipment_id) DO UPDATE
  SET quantity = GREATEST(gym_equipment.quantity, EXCLUDED.quantity),
      added_at = LEAST(gym_equipment.added_at, EXCLUDED.added_at);

  INSERT INTO profile_equipment (profile_id, equipment_id, created_at)
  SELECT profile_id, target_id, created_at
  FROM profile_equipment
  WHERE equipment_id = source_id
  ON CONFLICT (profile_id, equipment_id) DO NOTHING;

  DELETE FROM exercise_equipment WHERE equipment_id = source_id;
  DELETE FROM gym_equipment WHERE equipment_id = source_id;
  DELETE FROM profile_equipment WHERE equipment_id = source_id;
  DELETE FROM equipment WHERE id = source_id;
END;
$$;

-- Exact legacy duplicates: underscore and hyphen represented the same row.
SELECT pg_temp.canonicalize_equipment('incline_bench', 'incline-bench', 'Incline Bench', 'Ghế Tập Nghiêng', 'furniture', '/equipment/incline-bench.webp');
SELECT pg_temp.canonicalize_equipment('dip_station', 'dip-station', 'Dip Station', 'Xà Kép', 'bodyweight', '/equipment/dip-station.webp');
SELECT pg_temp.canonicalize_equipment('pec_deck', 'pec-deck', 'Pec Deck', 'Máy Ép Ngực Pec Deck', 'machine', '/equipment/pec-deck.webp');
SELECT pg_temp.canonicalize_equipment('lat_pulldown', 'lat-pulldown', 'Lat Pulldown', 'Máy Kéo Xô', 'machine', '/equipment/lat-pulldown.webp');
SELECT pg_temp.canonicalize_equipment('leg_extension', 'leg-extension', 'Leg Extension', 'Máy Duỗi Đùi Trước', 'machine', '/equipment/leg-extension.webp');
SELECT pg_temp.canonicalize_equipment('leg_press', 'leg-press', 'Leg Press', 'Máy Đạp Chân', 'machine', '/equipment/leg-press.webp');
SELECT pg_temp.canonicalize_equipment('squat_rack', 'squat-rack', 'Squat Rack', 'Khung Squat', 'accessory', '/equipment/squat-rack.webp');
SELECT pg_temp.canonicalize_equipment('rowing_machine', 'rowing-machine', 'Rowing Machine', 'Máy Chèo Thuyền', 'cardio', '/equipment/rowing-machine.webp');
SELECT pg_temp.canonicalize_equipment('pull_up_bar', 'pull-up-bar', 'Pull-up Bar', 'Xà Đơn', 'bodyweight', '/equipment/pull-up-bar.webp');
SELECT pg_temp.canonicalize_equipment('resistance_band', 'resistance-band', 'Resistance Band', 'Dây Kháng Lực', 'accessory', '/equipment/resistance-band.webp');
SELECT pg_temp.canonicalize_equipment('hack_squat', 'hack-squat', 'Hack Squat Machine', 'Máy Hack Squat', 'machine', '/equipment/hack-squat.webp');
SELECT pg_temp.canonicalize_equipment('leg_curl', 'leg-curl', 'Leg Curl', 'Máy Cuộn Đùi Sau', 'machine', '/equipment/leg-curl.webp');

-- Same hardware with historical or exercise-derived names.
SELECT pg_temp.canonicalize_equipment('calf-raise', 'calf-machine', 'Calf Raise Machine', 'Máy Nâng Gót', 'machine', '/equipment/calf-raise-machine.webp');
SELECT pg_temp.canonicalize_equipment('shoulder_press', 'shoulder-press-machine', 'Shoulder Press Machine', 'Máy Đẩy Vai', 'machine', '/equipment/shoulder-press-machine.webp');
SELECT pg_temp.canonicalize_equipment('preacher-bench', 'preacher-curl-bench', 'Preacher Curl Bench', 'Ghế Preacher Curl', 'furniture', '/equipment/preacher-bench.webp');
SELECT pg_temp.canonicalize_equipment('glute-ham-raise', 'ghd', 'Glute Ham Developer (GHD)', 'Máy GHD', 'machine', '/equipment/ghd.webp');
SELECT pg_temp.canonicalize_equipment('chest-fly-machine', 'pec-deck', 'Pec Deck', 'Máy Ép Ngực Pec Deck', 'machine', '/equipment/pec-deck.webp');
SELECT pg_temp.canonicalize_equipment('assisted-chin-up-machine', 'assisted-pull-up-machine', 'Assisted Pull-Up/Dip Machine', 'Máy Hỗ Trợ Kéo Xà Và Dip', 'bodyweight', '/equipment/assisted-pull-up-machine.webp');
SELECT pg_temp.canonicalize_equipment('assisted-dip-machine', 'assisted-pull-up-machine', 'Assisted Pull-Up/Dip Machine', 'Máy Hỗ Trợ Kéo Xà Và Dip', 'bodyweight', '/equipment/assisted-pull-up-machine.webp');
SELECT pg_temp.canonicalize_equipment('chest_press', 'chest-press-machine', 'Chest Press Machine', 'Máy Đẩy Ngực', 'machine', '/equipment/chest-press.webp');
SELECT pg_temp.canonicalize_equipment('dung-cu-tap-grip', 'grip-strengthener', 'Grip Strengthener', 'Dụng Cụ Tập Grip', 'accessory', '/equipment/grip-trainer.webp');

-- Canonicalize lever rows. The old "-machine" suffix was inconsistent with
-- the source-of-truth catalog; image paths remain on the existing assets.
SELECT pg_temp.canonicalize_equipment('lever-bent-over-row-machine', 'lever-bent-over-row', 'Lever Bent-Over Row', 'Máy Chèo Cúi Đòn Bẩy', 'machine', '/equipment/lever-bent-over-row-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-biceps-curl-machine', 'lever-bicep-curl', 'Lever Bicep Curl', 'Máy Cuốn Tay Trước Đòn Bẩy', 'machine', '/equipment/lever-biceps-curl-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-chest-press-machine', 'lever-chest-press', 'Lever Chest Press', 'Máy Ép Ngực Đòn Bẩy', 'machine', '/equipment/lever-chest-press-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-decline-chest-press-machine', 'lever-decline-chest-press', 'Lever Decline Chest Press', 'Máy Ép Ngực Nghiêng Dưới Đòn Bẩy', 'machine', '/equipment/lever-decline-chest-press-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-high-row-machine', 'lever-high-row', 'Lever High Row', 'Máy Kéo Cao Đòn Bẩy', 'machine', '/equipment/lever-high-row-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-hip-abduction-machine', 'lever-hip-abduction', 'Lever Hip Abduction', 'Máy Dạng Hông Đòn Bẩy', 'machine', '/equipment/lever-hip-abduction-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-hip-adduction-machine', 'lever-hip-adduction', 'Lever Hip Adduction', 'Máy Khép Hông Đòn Bẩy', 'machine', '/equipment/lever-hip-adduction-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-hip-extension-machine', 'lever-hip-extension', 'Lever Hip Extension', 'Máy Duỗi Hông Đòn Bẩy', 'machine', '/equipment/lever-hip-extension-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-incline-chest-press-machine', 'lever-incline-chest-press', 'Lever Incline Chest Press', 'Máy Ép Ngực Nghiêng Đòn Bẩy', 'machine', '/equipment/lever-incline-chest-press-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-lat-pulldown-machine', 'lever-pulldown', 'Lever Pulldown', 'Máy Kéo Xà Đòn Bẩy', 'machine', '/equipment/lever-lat-pulldown-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-lateral-raise-machine', 'lever-lateral-raise', 'Lever Lateral Raise', 'Máy Dang Vai Ngang Đòn Bẩy', 'machine', '/equipment/lever-lateral-raise-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-preacher-curl-machine', 'lever-preacher-curl', 'Lever Preacher Curl', 'Máy Cuốn Tay Ghế Preacher Đòn Bẩy', 'machine', '/equipment/lever-preacher-curl-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-pullover-machine', 'lever-pullover', 'Lever Pullover', 'Máy Pullover Đòn Bẩy', 'machine', '/equipment/lever-pullover-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-reverse-fly-machine', 'lever-reverse-fly', 'Lever Reverse Fly', 'Máy Dang Ngược Đòn Bẩy', 'machine', '/equipment/lever-reverse-fly-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-seated-ab-crunch-machine', 'lever-seated-crunch', 'Lever Seated Crunch', 'Máy Gập Bụng Ngồi Đòn Bẩy', 'machine', '/equipment/lever-seated-ab-crunch-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-seated-dip-machine', 'lever-seated-dip', 'Lever Seated Dip', 'Máy Dip Ngồi Đòn Bẩy', 'machine', '/equipment/lever-seated-dip-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-seated-good-morning-machine', 'lever-seated-good-morning', 'Lever Seated Good Morning', 'Máy Good Morning Ngồi Đòn Bẩy', 'machine', '/equipment/lever-seated-good-morning-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-seated-row-machine', 'lever-seated-row', 'Lever Seated Row', 'Máy Chèo Ngồi Đòn Bẩy', 'machine', '/equipment/lever-seated-row-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-shoulder-press-machine', 'lever-shoulder-press', 'Lever Shoulder Press', 'Máy Đẩy Vai Đòn Bẩy', 'machine', '/equipment/lever-shoulder-press-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-shrug-machine', 'lever-shrug', 'Lever Shrug', 'Máy Nhún Vai Đòn Bẩy', 'machine', '/equipment/lever-shrug-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-t-bar-row-machine', 'lever-t-bar-row', 'Lever T-Bar Row', 'Máy Chèo T-Bar Đòn Bẩy', 'machine', '/equipment/lever-t-bar-row-machine.webp');
SELECT pg_temp.canonicalize_equipment('lever-triceps-extension-machine', 'lever-triceps-extension', 'Lever Triceps Extension', 'Máy Duỗi Tay Sau Đòn Bẩy', 'machine', '/equipment/lever-triceps-extension-machine.webp');

-- Canonical rows required by corrected exercise mappings.
SELECT pg_temp.canonicalize_equipment('lever-calf-raise', 'lever-calf-raise', 'Lever Calf Raise', 'Máy Nâng Gót Đòn Bẩy', 'machine', NULL);
SELECT pg_temp.canonicalize_equipment('lever-calf-press', 'lever-calf-press', 'Lever Calf Press', 'Máy Đạp Bắp Chân Đòn Bẩy', 'machine', NULL);
SELECT pg_temp.canonicalize_equipment('lever-back-extension', 'lever-back-extension', 'Lever Back Extension', 'Máy Siết Lưng Đòn Bẩy', 'machine', NULL);
SELECT pg_temp.canonicalize_equipment('air-bike', 'air-bike', 'Air Bike', 'Xe Đạp Gió', 'cardio', NULL);
SELECT pg_temp.canonicalize_equipment('arc-trainer', 'arc-trainer', 'Arc Trainer', 'Máy Cardio Vòng Cung', 'cardio', NULL);

CREATE OR REPLACE FUNCTION pg_temp.replace_exercise_equipment(
  target_exercise_slug TEXT,
  target_equipment_slug TEXT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  target_exercise_id UUID;
  target_equipment_id UUID;
BEGIN
  SELECT id INTO target_exercise_id
  FROM exercises
  WHERE slug = target_exercise_slug AND owner_user_id IS NULL;

  SELECT id INTO target_equipment_id FROM equipment WHERE slug = target_equipment_slug;
  IF target_exercise_id IS NULL OR target_equipment_id IS NULL THEN
    RAISE EXCEPTION 'Cannot map exercise % to equipment %', target_exercise_slug, target_equipment_slug;
  END IF;

  DELETE FROM exercise_equipment WHERE exercise_id = target_exercise_id;
  INSERT INTO exercise_equipment (exercise_id, equipment_id, required)
  VALUES (target_exercise_id, target_equipment_id, TRUE);
END;
$$;

-- Corrections where the movement name had been mistaken for hardware.
SELECT pg_temp.replace_exercise_equipment('hack-calf-raise', 'hack-squat');
SELECT pg_temp.replace_exercise_equipment('hack-one-leg-calf-raise', 'hack-squat');
SELECT pg_temp.replace_exercise_equipment('lever-assisted-chin-up', 'assisted-pull-up-machine');
SELECT pg_temp.replace_exercise_equipment('lever-back-extension', 'lever-back-extension');
SELECT pg_temp.replace_exercise_equipment('lever-calf-press', 'lever-calf-press');
SELECT pg_temp.replace_exercise_equipment('lever-seated-calf-press', 'lever-calf-press');
SELECT pg_temp.replace_exercise_equipment('lever-seated-calf-raise', 'lever-calf-raise');
SELECT pg_temp.replace_exercise_equipment('lever-standing-calf-raise', 'lever-calf-raise');
SELECT pg_temp.replace_exercise_equipment('air-bike', 'air-bike');
SELECT pg_temp.replace_exercise_equipment('run-equipment', 'treadmill');
SELECT pg_temp.replace_exercise_equipment('cycle-cross-trainer', 'arc-trainer');

-- Final invariants: no underscore aliases, no exercise-named Smith rows, and
-- every exercise-equipment link resolves to exactly one live catalog row.
DO $$
DECLARE
  duplicate_count INTEGER;
  smith_variant_count INTEGER;
BEGIN
  SELECT count(*) INTO duplicate_count
  FROM equipment a
  JOIN equipment b
    ON replace(a.slug, '_', '-') = replace(b.slug, '_', '-')
   AND a.id < b.id;

  SELECT count(*) INTO smith_variant_count
  FROM equipment
  WHERE slug <> 'smith-machine' AND slug LIKE '%smith%';

  IF duplicate_count <> 0 OR smith_variant_count <> 0 THEN
    RAISE EXCEPTION 'Equipment normalization incomplete: duplicate aliases=%, smith variants=%',
      duplicate_count, smith_variant_count;
  END IF;
END;
$$;

COMMIT;
