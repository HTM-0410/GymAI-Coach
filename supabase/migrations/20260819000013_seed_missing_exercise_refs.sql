-- =====================================================================
-- Seed missing equipment + muscles referenced by exercise JSON files
-- Migration: 20260819000013_seed_missing_exercise_refs.sql
-- =====================================================================
-- Idempotent: uses ON CONFLICT (slug) DO NOTHING.
-- These cover equipment/muscle names that appear in data/exercises/*.json
-- but aren't in seed-exercises-data.ts.
-- =====================================================================

-- ─── Equipment ────────────────────────────────────────────────────────
INSERT INTO equipment (slug, name, name_vi, category) VALUES
  ('exercise-mat',        'Exercise Mat',         'Thảm tập',                    'furniture'),
  ('stability-ball',      'Stability Ball',       'Bóng tập',                    'furniture'),
  ('bosu',                'BOSU Ball',            'Bóng BOSU',                   'furniture'),
  ('parallel-bars',       'Parallel Bars',        'Xà song song',                'bodyweight'),
  ('suspension-trainer',  'Suspension Trainer (TRX)', 'Dây treo TRX',           'accessory'),
  ('tire',                'Training Tire',        'Lốp xe tập',                  'accessory'),
  ('hack-squat',          'Hack Squat Machine',   'Máy Hack Squat',              'machine'),
  ('decline-bench',       'Decline Bench',        'Ghế tập nghiêng dưới',       'furniture'),
  ('dip-belt',            'Dip Belt',             'Đai đeo tạ',                  'accessory'),
  ('weight-vest',         'Weight Vest',          'Áo tạ',                       'accessory'),
  ('ankle-weight',        'Ankle Weight',         'Tạ đeo cổ chân',              'accessory'),
  ('sissy-squat-machine', 'Sissy Squat Machine',  'Máy Sissy Squat',             'machine'),
  ('stepmill',            'StepMill',             'Máy leo cầu thang',           'cardio'),
  ('skierg',              'SkiErg',               'Máy trượt tuyết',             'cardio'),
  ('sledgehammer',        'Sledgehammer',         'Búa tạ',                      'accessory'),
  ('gymnastic-rings',     'Gymnastic Rings',      'Vòng thể dục',                'bodyweight'),
  ('wrist-roller',        'Wrist Roller',         'Con lăn cổ tay',              'accessory'),
  ('cambered-bar',        'Cambered Bar',         'Thanh tạ cambered',           'free_weight'),
  ('reverse-hyper',       'Reverse Hyper',        'Máy Reverse Hyper',           'machine'),
  ('upper-body-ergometer','Upper Body Ergometer', 'Máy đạp tay',                 'cardio'),
  ('battle-rope',         'Battle Rope',          'Dây đập battle rope',         'accessory'),
  ('tricep-rope',         'Tricep Rope',          'Dây kéo cáp tricep',          'accessory'),
  ('ankle-strap',         'Ankle Strap',          'Dây đeo cổ chân',             'accessory'),
  ('hyperextension-bench','Hyperextension Bench', 'Ghế hyperextension',          'furniture'),
  ('glute-ham-raise',     'Glute-Ham Raise',      'Máy GHR',                     'machine'),
  ('ghd',                 'Glute Ham Developer',  'Máy GHD',                     'machine'),
  ('parallettes',         'Parallettes',          'Thanh Parallettes',           'accessory'),
  ('chain',               'Chain',                'Xích tạ',                     'accessory'),
  ('ab-bench',            'Ab Bench',             'Ghế tập bụng',                'furniture'),
  ('preacher-curl-bench', 'Preacher Curl Bench',  'Ghế Preacher Curl',           'furniture')
ON CONFLICT (slug) DO NOTHING;

-- ─── Muscles ──────────────────────────────────────────────────────────
INSERT INTO muscles (slug, name, name_vi, body_region) VALUES
  ('cardiovascular-system','Cardiovascular System','cardiovascular system','cardio'),
  ('spine',               'Spine',                'spine',               'torso_back'),
  ('upper-back',          'Upper Back',           'upper back',          'torso_back'),
  ('serratus-anterior',   'Serratus Anterior',    'serratus anterior',   'torso_front')
ON CONFLICT (slug) DO NOTHING;
