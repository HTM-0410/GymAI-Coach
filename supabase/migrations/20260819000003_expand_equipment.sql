-- =====================================================================
-- Migration: 20260819000003_expand_equipment.sql
-- Purpose:  (1) Expand equipment catalog from 9 → 28 rows (Fitly-inspired)
--          (2) Add image_url column to equipment
--          (3) Add onboarding_step column to profiles
--          (4) Create profile_equipment N-N join table
-- =====================================================================

-- =====================================================================
-- 1. Add image_url column to equipment
-- =====================================================================
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS image_url TEXT;

-- =====================================================================
-- 2. Expand equipment catalog (idempotent - ON CONFLICT DO NOTHING)
-- 9 existing rows are preserved; 19 new rows are added below.
-- =====================================================================
INSERT INTO equipment (slug, name, name_vi, category) VALUES
  -- Free weight (additions: kettlebell, ez-bar, trap-bar)
  ('kettlebell',       'Kettlebell',       'Tạ chuông',   'free_weight'),
  ('ez-bar',           'EZ Bar',           'Thanh EZ',    'free_weight'),
  ('trap-bar',         'Trap Bar',         'Thanh lục giác','free_weight'),
  -- Furniture (additions: incline-bench, ab-bench, preacher-bench)
  ('incline-bench',    'Incline Bench',    'Ghế nghiêng', 'furniture'),
  ('ab-bench',         'Ab Bench',         'Ghế tập bụng','furniture'),
  ('preacher-bench',   'Preacher Bench',   'Ghế preacher','furniture'),
  -- Machine (additions: smith-machine, leg-curl, leg-extension, calf-raise,
  -- rowing-machine, chest-fly-machine, shoulder-press-machine, pec-deck)
  ('smith-machine',        'Smith Machine',         'Máy Smith',        'machine'),
  ('leg-curl',             'Leg Curl',              'Máy cuốn đùi sau','machine'),
  ('leg-extension',        'Leg Extension',         'Máy duỗi đùi',    'machine'),
  ('calf-raise',           'Calf Raise Machine',    'Máy nhón bắp chân','machine'),
  ('rowing-machine',       'Rowing Machine',        'Máy kéo rowing',  'machine'),
  ('chest-fly-machine',    'Chest Fly Machine',     'Máy fly ngực',    'machine'),
  ('shoulder-press-machine','Shoulder Press Machine','Máy đẩy vai',     'machine'),
  ('pec-deck',             'Pec Deck',              'Máy pec deck',     'machine'),
  -- Cardio
  ('treadmill',        'Treadmill',        'Máy chạy bộ',         'cardio'),
  ('stationary-bike',  'Stationary Bike',  'Xe đạp tập',          'cardio'),
  ('elliptical',       'Elliptical',       'Máy elliptical',      'cardio'),
  -- Accessory
  ('resistance-band',  'Resistance Band',  'Dây kháng lực',       'accessory'),
  ('foam-roller',      'Foam Roller',      'Con lăn xốp',         'accessory'),
  ('medicine-ball',    'Medicine Ball',    'Bóng y tế',           'accessory'),
  ('jump-rope',        'Jump Rope',        'Dây nhảy',            'accessory')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================================
-- 3. Add onboarding_step column to profiles
--    Values: 0 = not started, 1..4 = current step, 5 = completed
-- =====================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER NOT NULL DEFAULT 0
  CHECK (onboarding_step BETWEEN 0 AND 5);

-- =====================================================================
-- 4. Create profile_equipment N-N table
-- =====================================================================
CREATE TABLE IF NOT EXISTS profile_equipment (
  profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, equipment_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_equipment_equipment
  ON profile_equipment(equipment_id);

ALTER TABLE profile_equipment ENABLE ROW LEVEL SECURITY;

-- User can only see/modify their own equipment preferences.
CREATE POLICY "profile_equip_owner_select" ON profile_equipment FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));

CREATE POLICY "profile_equip_owner_write" ON profile_equipment FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
