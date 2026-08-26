/**
 * SYNC EXERCISES → Supabase
 * ═════════════════════════════════════════════════════════════════════
 * Đọc mọi file JSON trong data/exercises/, map muscle/equipment name_vi
 * về slug (dựa vào seed-exercises-data.ts), upsert lên:
 *   1. exercises (full payload: 29 cols + JSONB)
 *   2. exercise_muscles (primary + secondary)
 *   3. exercise_equipment
 *   4. exercise_media (placeholder SVG từ gallery)
 *   5. exercise_alternatives
 *
 * Idempotent: chạy nhiều lần OK. Dùng SERVICE_ROLE_KEY để bypass RLS.
 */

import { promises as fs, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { z } from 'zod';
import { EXERCISES_SEED, EQUIPMENT_SEED, MUSCLES_SEED } from './seed-exercises-data';
import {
  WORKOUT_ROLES,
  WORKOUT_ROLE_REVIEW_STATUSES,
  workoutRoleManifestSchema,
} from '../src/lib/exercises/workout-role';
import { reviewedWorkoutMetric } from '../src/lib/exercises/workout-metrics-taxonomy';

// ─── ENV ─────────────────────────────────────────────────────────────────────
import { randomUUID } from 'node:crypto';
try {
  const txt = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !m[1].startsWith('#') && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';
const DATA_DIR = join(process.cwd(), 'data', 'exercises');
const WORKOUT_ROLE_MANIFEST = join(
  process.cwd(),
  'data',
  'exercise-taxonomy',
  'workout-role-classification.json',
);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY missing');
  process.exit(1);
}

// ─── SCHEMA ──────────────────────────────────────────────────────────────────
const ExerciseSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(2),
  name_vi: z.string().min(2),
  subtitle_vi: z.string().max(80),
  tags: z.array(z.string().min(1).max(24)).min(1).max(8),
  movement_pattern: z.enum(['squat', 'hinge', 'push', 'pull', 'lunge', 'carry', 'rotation', 'isolation']),
  exercise_type: z.enum(['compound', 'isolation']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  primary_muscle: z.string().min(1),
  secondary_muscles: z.array(z.string()).max(6),
  equipment: z
    .array(z.union([z.string(), z.object({ vi: z.string(), en: z.string() })]))
    .min(1)
    .transform((arr) => arr.map((e) => (typeof e === 'string' ? e : e.vi))),
  gallery: z
    .object({
      main: z.string().nullable(),
      views: z.array(z.object({ src: z.string(), label: z.string().max(32) })).min(1).max(5),
      caption_vi: z.string().max(120),
      // Preserve optional animation/media URLs that upload script adds.
      animation: z.string().optional(),
    })
    .passthrough(),
  goal_vi: z.string().min(20).max(400),
  instructions: z.array(z.string().min(10).max(220)).min(3).max(20),
  tips: z.array(z.string().min(10).max(180)).min(1).max(6),
  common_mistakes: z.array(z.string().min(10).max(180)).min(1).max(6),
  setup: z.object({
    sets: z.string(),
    reps: z.string(),
    rir: z.string(),
    rest_seconds: z.number().int().min(0).max(600),
    tempo: z.string(),
  }),
  safety_vi: z.string().min(20).max(300),
  performance_metrics: z.object({
    current_weight_kg: z.number().min(0),
    rep_range: z.string(),
    estimated_1rm_kg: z.number().min(0),
  }),
  performance_chart: z.object({
    labels: z.array(z.string().max(16)).min(3).max(12),
    values_kg: z.array(z.number().min(0)).min(3).max(12),
    goal_kg: z.number().min(0),
    min: z.number(),
    max: z.number(),
  }),
  ai_coach: z.object({
    next_session_vi: z.string().min(5).max(120),
    rationale_vi: z.string().min(20).max(300),
  }),
  alternatives: z.array(z.object({ slug: z.string(), name_vi: z.string() })).max(3),
  workout_role: z.enum(WORKOUT_ROLES).optional(),
  workout_role_review_status: z.enum(WORKOUT_ROLE_REVIEW_STATUSES).optional(),
  workout_role_confidence: z.number().min(0).max(1).optional(),
  workout_role_source: z.string().min(1).optional(),
  default_tracking_mode: z.enum(['weight_reps', 'reps', 'duration', 'duration_distance']).default('reps'),
  allowed_tracking_modes: z.array(z.enum(['weight_reps', 'reps', 'duration', 'duration_distance'])).min(1).default(['reps']),
  tracking_mode_review_status: z.enum(['reviewed', 'needs_review']).default('needs_review'),
  tracking_mode_source: z.string().min(1).default('safe_fallback'),
  load_basis: z.enum(['external_total', 'per_implement', 'assistance', 'none']).default('none'),
  media_metadata: z.object({
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    last_updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    source: z.string(),
    language: z.literal('vi'),
  }),
});

type ExerciseRow = z.infer<typeof ExerciseSchema>;

// ─── MAPS ────────────────────────────────────────────────────────────────────
// Build slug → name_vi map for both muscle + equipment (dùng cho fallback).
const MUSCLE_NAME_TO_SLUG = new Map<string, string>();
for (const m of MUSCLES_SEED) {
  MUSCLE_NAME_TO_SLUG.set(m.name_vi.toLowerCase().trim(), m.slug);
  MUSCLE_NAME_TO_SLUG.set(m.name.toLowerCase().trim(), m.slug);
  MUSCLE_NAME_TO_SLUG.set(m.slug, m.slug);
}
// Fallback aliases (Gemini translate sai 1 số tên)
const MUSCLE_ALIASES: Record<string, string> = {
  'bắp đùi trước': 'quads',
  'bắp đùi sau': 'hamstrings',
  'bụng xiên': 'obliques',
  'bụng dưới': 'lower_abs',
  'cơ bụng dưới': 'lower_abs',
  'cơ bụng thẳng': 'abs',
  'cơ bụng': 'abs',
  'cơ delta sau': 'rear_delts',
  'cơ dạng đùi': 'adductors',
  'cơ dạng đùi ngoài': 'abductors',
  'cơ vai': 'shoulders',
  'cơ vai trước': 'front_delts',
  'cơ vai sau': 'rear_delts',
  'cơ vai giữa': 'side_delts',
  'cơ vai bên': 'side_delts',
  'cơ delta trước': 'front_delts',
  'cơ delta bên': 'side_delts',
  'cơ delta giữa': 'side_delts',
  'cơ xô': 'rhomboids',
  'cơ lưng xô': 'rhomboids',
  'cơ cầu vai': 'traps',
  'cơ thang': 'traps',
  'cơ tay trước': 'biceps',
  'cơ tay sau': 'triceps',
  'cơ cẳng tay': 'forearms',
  'cơ liên sườn': 'serratus',
  'cơ răng cưa': 'serratus',
  'serratus anterior': 'serratus-anterior',
  'cơ lõi': 'core',
  'cơ gập hông': 'hip_flexors',
  // Non-muscle "muscle" labels in JSON - map to nearest existing muscle
  'cardiovascular system': 'cardiovascular-system',
  'upper back': 'upper-back',
  'spine': 'spine',
  'cơ đùi trước': 'quads',
  'cơ đùi sau': 'hamstrings',
  'cơ mông': 'glutes',
  'cơ ngực': 'chest',
  'cơ lưng dưới': 'lower_back',
  'cơ lưng giữa': 'middle_back',
  'cơ lưng trên': 'lats',
  'cơ lưng xòe': 'lats',
  'bắp tay trước': 'biceps',
  'bắp tay sau': 'triceps',
  'ngực trong': 'inner_chest',
  'lưng rộng': 'lats',
  'lưng xòe': 'lats',
  'lưng dưới & mông': 'hamstrings',
  'lưng dưới và mông': 'hamstrings',
  'lưng dưới': 'lower_back',
  'đùi trước': 'quads',
  'đùi sau': 'hamstrings',
  'mông': 'glutes',
  'bắp chân': 'calves',
  'bụng': 'abs',
  'ngực': 'chest',
  'ngực trên': 'upper_chest',
  'ngực dưới': 'lower_chest',
  'vai': 'shoulders',
  'vai trước': 'front_delts',
  'vai sau': 'rear_delts',
  'vai giữa': 'side_delts',
  'vai bên': 'side_delts',
};
// Apply aliases LAST so they override partial matches
for (const [k, v] of Object.entries(MUSCLE_ALIASES)) MUSCLE_NAME_TO_SLUG.set(k, v);

const EQUIPMENT_NAME_TO_SLUG = new Map<string, string>();
for (const e of EQUIPMENT_SEED) {
  EQUIPMENT_NAME_TO_SLUG.set(e.name_vi.toLowerCase().trim(), e.slug);
  EQUIPMENT_NAME_TO_SLUG.set(e.name.toLowerCase().trim(), e.slug);
  EQUIPMENT_NAME_TO_SLUG.set(e.slug, e.slug);
}
// Normalize: kebab-case ↔ snake_case
for (const e of EQUIPMENT_SEED) {
  EQUIPMENT_NAME_TO_SLUG.set(e.slug.replace(/-/g, '_'), e.slug);
}
const EQUIPMENT_ALIASES: Record<string, string> = {
  // Vietnamese surface forms (Vietnamese display names seen in exercise JSON files)
  'ghế tập': 'bench',
  'ghế nghiêng': 'incline-bench',
  'ghế phẳng': 'bench',
  'ghế dài': 'bench',
  'ghế tập tạ': 'bench',
  'ghế preacher': 'bench',
  'xà đơn': 'pull-up-bar',
  'khung hít đất': 'dip-station',
  'xà kép': 'dip-station',
  'máy cáp': 'cable',
  'cáp': 'cable',
  'máy đạp đùi': 'leg-press',
  'máy đạp chân': 'leg-press',
  'máy kéo xà': 'lat-pulldown',
  'máy kéo xà ngang': 'lat-pulldown',
  'máy kéo': 'rowing-machine',
  'máy tập': 'machine',
  'máy tập lưng': 'rowing-machine',
  'máy tập đa năng': 'machine',
  'máy đòn bẩy': 'machine',
  'máy smith': 'smith-machine',
  'tạ smith': 'smith-machine',
  'smith': 'smith-machine',
  'smith machine': 'smith-machine',
  'trọng lượng cơ thể': 'bodyweight',
  'dây kháng lực': 'resistance-band',
  'dải kháng lực': 'resistance-band',
  'resistance band': 'resistance-band',
  'bánh lăn bụng': 'ab-wheel',
  'bánh xe ab': 'ab-wheel',
  'con lăn tập bụng': 'ab-wheel',
  'wheel roller': 'ab-wheel',
  'thanh đòn': 'barbell',
  'tạ đòn': 'barbell',
  'thanh tạ đòn': 'barbell',
  'olympic barbell': 'barbell',
  'tạ đôi': 'dumbbell',
  'tạ đơn': 'dumbbell',
  'tạ ấm': 'kettlebell',
  'quả tạ tròn': 'kettlebell',
  'giá đỡ': 'squat-rack',
  'khung squat': 'squat-rack',
  'đĩa tạ': 'weight-plate',
  'đĩa tạ đòn': 'weight-plate',
  'bóng y tế': 'medicine-ball',
  'bóng tạ': 'medicine-ball',
  'medicine ball': 'medicine-ball',
  'xe kéo': 'sled',
  'xe đẩy tạ': 'sled',
  'xe kéo tạ': 'sled',
  'sled machine': 'sled',
  'máy pec deck': 'pec-deck',
  'đập ngực máy': 'pec-deck',
  'máy ép ngực': 'pec-deck',
  'máy gập đùi': 'leg-curl',
  'máy duỗi đùi': 'leg-curl',
  'cuộn/duỗi chân': 'leg-curl',
  'máy hack': 'hack-squat',
  'hack squat': 'hack-squat',
  'máy ghr': 'ghd',
  'máy giật hông': 'hip-thrust-machine',
  'thanh đứng': 'landmine',
  'thanh đứng landmine': 'landmine',
  'tạ trap': 'trap-bar',
  'trap bar': 'trap-bar',
  'máy nâng gót': 'calf-machine',
  'máy tập khớp chân': 'machine',
  'máy tập chuyển động': 'machine',
  // English surface forms
  'ez barbell': 'ez-bar',
  'ez-barbell': 'ez-bar',
  'tạ ez': 'ez-bar',
  'bosu ball': 'bosu',
  'stability ball': 'stability-ball',
  'rope': 'jump-rope',
  'roller': 'foam-roller',
  'hammer': 'sledgehammer',
  'tire': 'tire',
  'elliptical machine': 'elliptical',
  'stationary bike': 'stationary-bike',
  'stepmill machine': 'stepmill',
  'skierg machine': 'skierg',
  'upper body ergometer': 'upper-body-ergometer',
  // Newly added equipment aliases
  'rings': 'gymnastic-rings',
  'gymnastic rings': 'gymnastic-rings',
  'vòng thể dục': 'gymnastic-rings',
  'reverse hyper': 'reverse-hyper',
  'reverse-hyper': 'reverse-hyper',
  'máy reverse hyper': 'reverse-hyper',
  'ghr': 'ghd',
  'glute ham raise': 'ghd',
  'glute-ham raise': 'ghd',
  'máy ghr': 'ghd',
  'ghd': 'ghd',
  'cambered bar': 'cambered-bar',
  'camber bar': 'cambered-bar',
  'tricep rope': 'tricep-rope',
  'triceps rope': 'tricep-rope',
  'dây kéo cáp tricep': 'tricep-rope',
  'ankle strap': 'ankle-strap',
  'ankle cuff': 'ankle-strap',
  'dây đeo cổ chân': 'ankle-strap',
  'wrist roller': 'wrist-roller',
  'con lăn cổ tay': 'wrist-roller',
  'ankle weight': 'ankle-weight',
  'ankle weights': 'ankle-weight',
  'tạ đeo cổ chân': 'ankle-weight',
  'weight vest': 'weight-vest',
  'weighted vest': 'weight-vest',
  'áo tạ': 'weight-vest',
  'dip belt': 'dip-belt',
  'weight belt': 'dip-belt',
  'đai đeo tạ': 'dip-belt',
  'chains': 'chain',
  'xích tạ': 'chain',
  'battle rope': 'battle-rope',
  'battling rope': 'battle-rope',
  'battling ropes': 'battle-rope',
  'battle ropes': 'battle-rope',
  'dây đập battle rope': 'battle-rope',
  'parallettes': 'parallettes',
  'parallette': 'parallettes',
  'paralettes': 'parallettes',
  'thanh parallettes': 'parallettes',
  'trx': 'suspension-trainer',
  'suspension trainer': 'suspension-trainer',
  'dây treo trx': 'suspension-trainer',
  'sissy squat': 'sissy-squat-machine',
  'sissy squat machine': 'sissy-squat-machine',
  'máy sissy squat': 'sissy-squat-machine',
  'decline bench': 'decline-bench',
  'ghế tập nghiêng dưới': 'decline-bench',
  'preacher curl bench': 'preacher-curl-bench',
  'preacher bench': 'preacher-curl-bench',
  'ghế preacher curl': 'preacher-curl-bench',
  'ab bench': 'ab-bench',
  'sit-up bench': 'ab-bench',
  'ghế tập bụng': 'ab-bench',
  'hyperextension bench': 'hyperextension-bench',
  'back extension bench': 'hyperextension-bench',
  'ghế hyperextension': 'hyperextension-bench',
  // Common variants not in seed (slug derived from JSON name_vi)
  'thảm tập': 'exercise-mat',
  'bóng tập': 'stability-ball',
  'bóng bosu': 'bosu',
  'xà song song': 'parallel-bars',
  'dây treo trx': 'suspension-trainer',
  'lốp xe tập': 'tire',
  'máy hack squat': 'hack-squat',
  'ghế tập nghiêng dưới': 'decline-bench',
  'đai đeo tạ': 'dip-belt',
  'áo tạ': 'weight-vest',
  'tạ đeo cổ chân': 'ankle-weight',
  'máy sissy squat': 'sissy-squat-machine',
  'máy leo cầu thang': 'stepmill',
  'máy trượt tuyết': 'skierg',
  'búa tạ': 'sledgehammer',
  'vòng thể dục': 'gymnastic-rings',
  'con lăn cổ tay': 'wrist-roller',
  'thanh tạ cambered': 'cambered-bar',
  'máy reverse hyper': 'reverse-hyper',
  'máy đạp tay': 'upper-body-ergometer',
  'ghế tập nghiêng dưới': 'decline-bench',
  'máy đẩy vai đòn bẩy': 'lever-shoulder-press',
  'máy pec deck': 'pec-deck',
  'máy ép ngực': 'pec-deck',
  'máy fly ngực': 'chest-fly-machine',
  'máy đẩy vai': 'shoulder-press-machine',
  'máy kéo xà': 'lat-pulldown',
  'máy kéo xà ngang': 'lat-pulldown',
  'máy đạp đùi': 'leg-press',
  'máy đạp chân': 'leg-press',
  'máy cuốn đùi sau': 'leg-curl',
  'máy duỗi đùi': 'leg-extension',
  'máy nhón bắp chân': 'calf-machine',
  'máy giật hông': 'hip-thrust-machine',
  'máy chèo thuyền': 'rowing-machine',
  'máy chèo rowing': 'rowing-machine',
  'dụng cụ tập grip': 'grip-strengthener',
  'máy elliptical': 'elliptical',
  'xe đạp tập': 'stationary-bike',
  'máy chạy bộ': 'treadmill',
  'xe kéo tạ': 'sled',
  'khung squat': 'squat-rack',
  'giá squat': 'squat-rack',
  'ghế tập phẳng': 'bench',
  'ghế tập': 'bench',
  'ghế nghiêng': 'incline-bench',
  'đĩa tạ': 'weight-plate',
  'bóng tạ': 'medicine-ball',
  'thanh đứng': 'landmine',
  'thanh tạ đòn': 'barbell',
  'tạ đơn': 'dumbbell',
  'tạ đôi': 'dumbbell',
  'tạ ez': 'ez-bar',
  'tạ ấm': 'kettlebell',
  'tạ trap': 'trap-bar',
  'dây kháng lực': 'resistance-band',
  'bánh lăn bụng': 'ab-wheel',
  'con lăn bụng': 'ab-wheel',
  'con lăn xốp': 'foam-roller',
  'dây nhảy': 'jump-rope',
  'xà đơn': 'pull-up-bar',
  'xà kép': 'dip-station',
  'khung hít đất': 'dip-station',
  'trọng lượng cơ thể': 'bodyweight',
  'máy tạ': 'machine',
  'máy smith': 'smith-machine',
  'máy ghr': 'ghd',
  'máy ghđ': 'ghd',
  'máy hỗ trợ kéo xà': 'assisted-pull-up-machine',
  'máy hỗ trợ kéo xà ngược': 'assisted-pull-up-machine',
  'máy hỗ trợ dip': 'assisted-pull-up-machine',
  'dây đập battle rope': 'battle-rope',
  'dây kéo cáp tricep': 'tricep-rope',
  'dây đeo cổ chân': 'ankle-strap',
  'áo tạ trọng lượng': 'weight-vest',
};
for (const [k, v] of Object.entries(EQUIPMENT_ALIASES)) EQUIPMENT_NAME_TO_SLUG.set(k, v);

// Build slug → seed row (dùng cho secondary muscles nếu Gemini đặt tên lung tung)
const SEED_BY_SLUG = new Map(EXERCISES_SEED.map((e) => [e.slug, e]));

function resolveMuscleSlug(name: string | undefined): string | null {
  if (!name) return null;
  const k = name.toLowerCase().trim();
  return MUSCLE_NAME_TO_SLUG.get(k) ?? null;
}

function resolveEquipmentSlug(name: string | undefined): string | null {
  if (!name) return null;
  const k = name.toLowerCase().trim();
  return EQUIPMENT_NAME_TO_SLUG.get(k) ?? null;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  const supa = createSupabase(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  console.log(`DRY_RUN: ${DRY_RUN}`);
  console.log(`Reading JSON from ${DATA_DIR}`);

  const taxonomyManifest = workoutRoleManifestSchema.parse(
    JSON.parse(await fs.readFile(WORKOUT_ROLE_MANIFEST, 'utf-8')),
  );
  const taxonomyBySlug = new Map(
    taxonomyManifest.reviewed.map((entry) => [entry.slug, entry] as const),
  );

  // 1. Load all JSON
  const files = (await fs.readdir(DATA_DIR)).filter(
    (file) =>
      file.endsWith('.json') &&
      file !== 'exercise.schema.json' &&
      !file.startsWith('.') &&
      !file.endsWith('.sample.json'),
  );
  const exercises: ExerciseRow[] = [];
  const skipped: string[] = [];
  for (const file of files) {
    const slug = file.replace(/\.json$/, '');
    if (slug === 'back-squat.sample') continue;
    try {
      const txt = await fs.readFile(join(DATA_DIR, file), 'utf-8');
      const parsed = JSON.parse(txt);
      const taxonomy = taxonomyBySlug.get(slug);
      const r = ExerciseSchema.safeParse(
        taxonomy
          ? {
              ...parsed,
              workout_role: taxonomy.workout_role,
              workout_role_review_status: taxonomy.workout_role_review_status,
              workout_role_confidence: taxonomy.workout_role_confidence,
              workout_role_source: taxonomy.workout_role_source,
            }
          : parsed,
      );
      if (!r.success) {
        const issue = r.error.issues[0];
        console.warn(`  ⚠️ ${slug}: ${issue.path.join('.')}: ${issue.message}`);
        skipped.push(slug);
        continue;
      }
      exercises.push(r.data);
    } catch (e: any) {
      console.warn(`  ⚠️ ${slug}: ${e.message}`);
      skipped.push(slug);
    }
  }
  console.log(`Loaded ${exercises.length} valid exercises (${skipped.length} skipped).`);

  // 2. Fetch all muscles + equipment + existing exercises (for ID lookup)
  const [{ data: muscles }, { data: equipment }, { data: existingExs }] = await Promise.all([
    supa.from('muscles').select('id, slug, name_vi'),
    supa.from('equipment').select('id, slug, name_vi'),
    supa.from('exercises').select('id, slug').eq('type', 'system').eq('status', 'published').is('owner_user_id', null),
  ]);

  const MUSCLE_ID_BY_SLUG = new Map<string, string>((muscles ?? []).map((m: any) => [m.slug, m.id]));
  const EQUIP_ID_BY_SLUG = new Map<string, string>((equipment ?? []).map((e: any) => [e.slug, e.id]));
  const EX_ID_BY_SLUG = new Map<string, string>((existingExs ?? []).map((e: any) => [e.slug, e.id]));

  // Inject DB-discovered name_vi → slug aliases so JSON's exact Vietnamese/English
  // labels resolve even if they aren't in the curated alias map.
  for (const m of muscles ?? []) {
    if (m.name_vi) MUSCLE_NAME_TO_SLUG.set(m.name_vi.toLowerCase().trim(), m.slug);
    if (m.slug) MUSCLE_NAME_TO_SLUG.set(m.slug.toLowerCase().trim(), m.slug);
  }
  for (const e of equipment ?? []) {
    if (e.name_vi) EQUIPMENT_NAME_TO_SLUG.set(e.name_vi.toLowerCase().trim(), e.slug);
    if (e.slug) EQUIPMENT_NAME_TO_SLUG.set(e.slug.toLowerCase().trim(), e.slug);
  }

  console.log(`DB: ${MUSCLE_ID_BY_SLUG.size} muscles, ${EQUIP_ID_BY_SLUG.size} equipment, ${EX_ID_BY_SLUG.size} existing exercises`);

  // 2.5. Auto-create missing muscles + equipment referenced in JSON.
  //     Collect all muscle/equipment names referenced by valid exercises,
  //     then upsert any that don't yet exist in DB.

  // Muscles not in seed - collected from JSON (slug derived from name_vi).
  function slugify(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Normalize a Vietnamese/English label into a comparable key for fuzzy matching.
  // Examples:
  //   "Bóng BOSU"   → "bong bosu"
  //   "Bóng tập"    → "bong tap"
  //   "exercise-mat"→ "exercise mat"
  function normalizeKey(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Build a secondary lookup: normalized(name_vi|slug) → slug for fuzzy match.
  const EQUIP_NORM_TO_SLUG = new Map<string, string>();
  const MUSCLE_NORM_TO_SLUG = new Map<string, string>();
  for (const e of equipment ?? []) {
    if (e.name_vi) EQUIP_NORM_TO_SLUG.set(normalizeKey(e.name_vi), e.slug);
    if (e.slug) EQUIP_NORM_TO_SLUG.set(normalizeKey(e.slug), e.slug);
  }
  for (const m of muscles ?? []) {
    if (m.name_vi) MUSCLE_NORM_TO_SLUG.set(normalizeKey(m.name_vi), m.slug);
    if (m.slug) MUSCLE_NORM_TO_SLUG.set(normalizeKey(m.slug), m.slug);
  }

  const newMuscles: any[] = [];
  const unresolvedEquipment: Array<{ exercise: string; equipment: string }> = [];
  const seenNewMuscleSlugs = new Set<string>();

  for (const ex of exercises) {
    const seed = SEED_BY_SLUG.get(ex.slug);
    const primaryName = ex.primary_muscle;
    const allMuscleNames = [primaryName, ...ex.secondary_muscles];
    for (const n of allMuscleNames) {
      const slug = resolveMuscleSlug(n);
      if (slug || !n) continue;
      // Try seed fallback
      const seedIdx = [primaryName, ...ex.secondary_muscles].indexOf(n);
      const seedFallback = seed?.primary_muscles?.[0] ?? seed?.secondary_muscles?.[seedIdx];
      if (seedFallback && MUSCLE_ID_BY_SLUG.has(seedFallback)) continue;
      // Fuzzy match against DB (normalized key)
      const norm = normalizeKey(n);
      const existing = MUSCLE_NORM_TO_SLUG.get(norm);
      if (existing) {
        MUSCLE_NAME_TO_SLUG.set(n.toLowerCase().trim(), existing);
        MUSCLE_ID_BY_SLUG.set(existing, MUSCLE_ID_BY_SLUG.get(existing)!);
        continue;
      }
      // Auto-create
      const newSlug = slugify(n);
      if (!newSlug || MUSCLE_ID_BY_SLUG.has(newSlug) || seenNewMuscleSlugs.has(newSlug)) continue;
      seenNewMuscleSlugs.add(newSlug);
      newMuscles.push({ slug: newSlug, name: newSlug.replace(/-/g, ' '), name_vi: n, body_region: null });
    }

    for (const eq of ex.equipment) {
      const slug = resolveEquipmentSlug(eq);
      if (slug) continue;
      // Fuzzy match against DB (normalized key)
      const norm = normalizeKey(eq);
      const existing = EQUIP_NORM_TO_SLUG.get(norm);
      if (existing) {
        EQUIPMENT_NAME_TO_SLUG.set(eq.toLowerCase().trim(), existing);
        EQUIP_ID_BY_SLUG.set(existing, EQUIP_ID_BY_SLUG.get(existing)!);
        continue;
      }
      unresolvedEquipment.push({ exercise: ex.slug, equipment: eq });
    }
  }

  // Equipment là taxonomy đóng. Không tự tạo category=null vì sẽ làm bẩn
  // catalog và đẩy thiết bị sang nhóm "Khác". Hãy thêm thiết bị/alias vào
  // equipment-catalog.ts rồi chạy lại.
  if (unresolvedEquipment.length > 0) {
    const preview = unresolvedEquipment
      .slice(0, 10)
      .map((item) => `${item.exercise}: ${item.equipment}`)
      .join(', ');
    throw new Error(
      `Unresolved equipment (${unresolvedEquipment.length}). Update canonical catalog/aliases first: ${preview}`,
    );
  }

  if (newMuscles.length > 0) {
    if (DRY_RUN) {
      console.log(`[DRY-RUN] Would create ${newMuscles.length} missing muscles.`);
    } else {
      console.log(`Creating ${newMuscles.length} missing muscles...`);
      const { data, error } = await supa
        .from('muscles')
        .upsert(newMuscles, { onConflict: 'slug', ignoreDuplicates: false })
        .select('id, slug');
      if (error) console.error('  ✗ muscle upsert:', error.message);
      else {
        for (const m of data ?? []) {
          MUSCLE_ID_BY_SLUG.set(m.slug, m.id);
          // Also add aliases so resolveMuscleSlug picks up the original name_vi
          const orig = newMuscles.find((x) => x.slug === m.slug);
          if (orig) MUSCLE_NAME_TO_SLUG.set(orig.name_vi.toLowerCase().trim(), m.slug);
        }
      }
    }
  }
  // 3. Upsert exercises
  let upsertOk = 0;
  const resolveErrors: { slug: string; issue: string }[] = [];
  const newRows: any[] = [];
  for (const ex of exercises) {
    const seed = SEED_BY_SLUG.get(ex.slug);

    // Resolve primary_muscle slug - fallback seed nếu JSON resolve fail
    let primarySlug = resolveMuscleSlug(ex.primary_muscle);
    if (!primarySlug && seed?.primary_muscles?.[0]) primarySlug = seed.primary_muscles[0];
    if (!primarySlug || !MUSCLE_ID_BY_SLUG.has(primarySlug)) {
      resolveErrors.push({ slug: ex.slug, issue: `primary_muscle unresolved: ${ex.primary_muscle}` });
      continue;
    }

    // Resolve secondary muscles (ưu tiên JSON, fallback seed)
    const secondaryNames = ex.secondary_muscles.length > 0 ? ex.secondary_muscles : seed?.secondary_muscles ?? [];
    const secondarySlugs: string[] = [];
    for (const n of secondaryNames) {
      let s = resolveMuscleSlug(n);
      if (!s && seed) {
        // Try matching seed.secondary_muscles by index
        const idx = secondaryNames.indexOf(n);
        s = seed.secondary_muscles[idx] ?? null;
      }
      if (s && s !== primarySlug && MUSCLE_ID_BY_SLUG.has(s)) secondarySlugs.push(s);
    }

    // Resolve equipment - ưu tiên JSON; fallback về seed.equipment nếu resolve fail
    const equipmentSlugs: string[] = [];
    for (const eq of ex.equipment) {
      let s = resolveEquipmentSlug(eq);
      if (!s && seed) {
        const idx = ex.equipment.indexOf(eq);
        s = seed.equipment[idx] ?? null;
      }
      if (s && EQUIP_ID_BY_SLUG.has(s) && !equipmentSlugs.includes(s)) equipmentSlugs.push(s);
    }
    // Nếu vẫn rỗng → dùng toàn bộ seed.equipment
    if (equipmentSlugs.length === 0 && seed) {
      for (const s of seed.equipment) {
        if (EQUIP_ID_BY_SLUG.has(s) && !equipmentSlugs.includes(s)) equipmentSlugs.push(s);
      }
    }
    if (equipmentSlugs.length === 0) {
      resolveErrors.push({ slug: ex.slug, issue: `equipment unresolved: ${ex.equipment.join(', ')}` });
      continue;
    }

    const rirNum = Number(ex.setup.rir.split(/[–-]/)[0]) || 2;

    // Use existing id if present (for stable upsert), else generate UUID
    const existingId = EX_ID_BY_SLUG.get(ex.slug);
    const metricReview = reviewedWorkoutMetric(ex.slug);
    newRows.push({
      ...(existingId ? { id: existingId } : { id: randomUUID() }),
      slug: ex.slug,
      type: 'system',
      name: ex.name,
      name_vi: ex.name_vi,
      description: ex.goal_vi,
      difficulty: ex.difficulty,
      exercise_type: ex.exercise_type,
      status: 'published',
      instructions: JSON.stringify(ex.instructions),
      tips: JSON.stringify(ex.tips),
      common_mistakes: JSON.stringify(ex.common_mistakes),
      default_rest_seconds: ex.setup.rest_seconds,
      default_rir: rirNum,
      subtitle_vi: ex.subtitle_vi,
      tags: ex.tags,
      movement_pattern: ex.movement_pattern,
      primary_muscle_vi: ex.primary_muscle,
      secondary_muscles_vi: ex.secondary_muscles,
      equipment_vi: ex.equipment,
      safety_vi: ex.safety_vi,
      setup_json: ex.setup,
      performance_metrics_json: ex.performance_metrics,
      performance_chart_json: ex.performance_chart,
      ai_coach_json: ex.ai_coach,
      content_json: ex,
      ...(ex.workout_role
        ? {
            workout_role: ex.workout_role,
            workout_role_review_status: ex.workout_role_review_status,
            workout_role_confidence: ex.workout_role_confidence,
            workout_role_source: ex.workout_role_source,
          }
        : {}),
      default_tracking_mode: metricReview?.defaultTrackingMode ?? ex.default_tracking_mode,
      allowed_tracking_modes: metricReview?.allowedTrackingModes ?? ex.allowed_tracking_modes,
      tracking_mode_review_status: metricReview ? 'reviewed' : ex.tracking_mode_review_status,
      tracking_mode_source: metricReview?.source ?? ex.tracking_mode_source,
      load_basis: metricReview?.loadBasis ?? ex.load_basis,
      // Storage URLs override local paths. After upload-exercise-media.ts ran,
      // gallery.main is the JPG public URL and gallery.animation is the GIF URL.
      gallery_json: ex.gallery,
    });
  }

  if (resolveErrors.length > 0) {
    console.log(`\n⚠️ ${resolveErrors.length} lỗi resolve (skip):`);
    for (const e of resolveErrors) console.log(`  ${e.slug}: ${e.issue}`);
  }

  console.log(`\n${newRows.length} bài sẵn sàng sync.`);

  if (DRY_RUN) {
    console.log('[DRY-RUN] Dừng trước khi ghi DB.');
    return;
  }

  // 4. Upsert exercises (chunk 50)
  const upsertStart = Date.now();
  const CHUNK = 50;
  for (let i = 0; i < newRows.length; i += CHUNK) {
    const chunk = newRows.slice(i, i + CHUNK);
    const { data, error } = await supa
      .from('exercises')
      .upsert(chunk, { onConflict: 'id', ignoreDuplicates: false })
      .select('id, slug');
    if (error) {
      console.error(`  ✗ Upsert chunk ${i}: ${error.message}`);
      continue;
    }
    upsertOk += data?.length ?? 0;
    for (const r of data ?? []) EX_ID_BY_SLUG.set(r.slug, r.id);
  }
  console.log(`✓ Upserted ${upsertOk} exercises (${((Date.now() - upsertStart) / 1000).toFixed(1)}s).`);

  // 5. Re-fetch all system exercises for fresh IDs
  const { data: allExs } = await supa.from('exercises').select('id, slug').eq('type', 'system').is('owner_user_id', null);
  for (const e of allExs ?? []) EX_ID_BY_SLUG.set(e.slug, e.id);

  // 6. exercise_muscles (preserve curated contribution, then rebuild mappings)
  console.log(`\nSyncing exercise_muscles...`);
  const { data: existingMuscleRows, error: existingMuscleError } = await supa
    .from('exercise_muscles')
    .select('exercise_id, muscle_id, role, contribution');
  if (existingMuscleError) {
    throw new Error(`Không thể đọc contribution hiện tại: ${existingMuscleError.message}`);
  }
  const existingContributions = new Map(
    (existingMuscleRows ?? [])
      .filter((row) => row.contribution != null)
      .map((row) => [
        `${row.exercise_id}:${row.muscle_id}:${row.role}`,
        Number(row.contribution),
      ]),
  );
  const { error: deleteMuscleError } = await supa
    .from('exercise_muscles')
    .delete()
    .neq('exercise_id', '00000000-0000-0000-0000-000000000000');
  if (deleteMuscleError) {
    throw new Error(`Không thể xóa mapping cơ cũ: ${deleteMuscleError.message}`);
  }
  const muscleRows: any[] = [];
  for (const ex of exercises) {
    const seed = SEED_BY_SLUG.get(ex.slug);
    const eid = EX_ID_BY_SLUG.get(ex.slug);
    if (!eid) continue;

    let primarySlug = resolveMuscleSlug(ex.primary_muscle) ?? seed?.primary_muscles?.[0];
    if (primarySlug && MUSCLE_ID_BY_SLUG.has(primarySlug)) {
      const muscleId = MUSCLE_ID_BY_SLUG.get(primarySlug)!;
      const key = `${eid}:${muscleId}:primary`;
      muscleRows.push({
        exercise_id: eid,
        muscle_id: muscleId,
        role: 'primary',
        contribution: existingContributions.get(key) ?? 1,
        sort_order: 0,
      });
    }

    const secondaryNames = ex.secondary_muscles.length > 0 ? ex.secondary_muscles : seed?.secondary_muscles ?? [];
    const seen = new Set<string>();
    let order = 1;
    for (const n of secondaryNames) {
      let s = resolveMuscleSlug(n);
      if (!s && seed) {
        const idx = secondaryNames.indexOf(n);
        s = seed.secondary_muscles[idx] ?? null;
      }
      if (s && s !== primarySlug && MUSCLE_ID_BY_SLUG.has(s) && !seen.has(s)) {
        seen.add(s);
        const muscleId = MUSCLE_ID_BY_SLUG.get(s)!;
        const key = `${eid}:${muscleId}:secondary`;
        muscleRows.push({
          exercise_id: eid,
          muscle_id: muscleId,
          role: 'secondary',
          contribution: existingContributions.get(key) ?? 0.5,
          sort_order: order++,
        });
      }
    }
  }
  // Chunk insert 200 rows
  let mOk = 0;
  for (let i = 0; i < muscleRows.length; i += 200) {
    const chunk = muscleRows.slice(i, i + 200);
    const { error, count } = await supa.from('exercise_muscles').insert(chunk, { count: 'exact' });
    if (error) {
      console.error(`  ✗ muscle chunk ${i}: ${error.message}`);
    } else {
      mOk += count ?? chunk.length;
    }
  }
  console.log(`✓ exercise_muscles: ${mOk} rows`);

  // 7. exercise_equipment
  console.log(`\nSyncing exercise_equipment...`);
  await supa.from('exercise_equipment').delete().neq('exercise_id', '00000000-0000-0000-0000-000000000000');
  const equipRows: any[] = [];
  for (const ex of exercises) {
    const seed = SEED_BY_SLUG.get(ex.slug);
    const eid = EX_ID_BY_SLUG.get(ex.slug);
    if (!eid) continue;
    const seen = new Set<string>();
    for (const eq of ex.equipment) {
      let s = resolveEquipmentSlug(eq);
      if (!s && seed) {
        const idx = ex.equipment.indexOf(eq);
        s = seed.equipment[idx] ?? null;
      }
      if (s && EQUIP_ID_BY_SLUG.has(s) && !seen.has(s)) {
        seen.add(s);
        equipRows.push({ exercise_id: eid, equipment_id: EQUIP_ID_BY_SLUG.get(s)!, required: true });
      }
    }
  }
  let eOk = 0;
  for (let i = 0; i < equipRows.length; i += 200) {
    const chunk = equipRows.slice(i, i + 200);
    const { error, count } = await supa.from('exercise_equipment').insert(chunk, { count: 'exact' });
    if (error) console.error(`  ✗ equip chunk ${i}: ${error.message}`);
    else eOk += count ?? chunk.length;
  }
  console.log(`✓ exercise_equipment: ${eOk} rows`);

  // 8. exercise_media - SKIPPED.
  //    Media URLs are now stored in exercises.gallery_json (Storage URLs).
  //    See scripts/upload-exercise-media.ts + src/lib/exercises-db.ts.
  console.log(`\nSkipping exercise_media (Storage URLs in gallery_json).`);

  // 9. exercise_alternatives
  console.log(`\nSyncing exercise_alternatives...`);
  await supa.from('exercise_alternatives').delete().neq('exercise_id', '00000000-0000-0000-0000-000000000000');
  const altRows: any[] = [];
  for (const ex of exercises) {
    const eid = EX_ID_BY_SLUG.get(ex.slug);
    if (!eid) continue;
    let order = 0;
    for (const a of ex.alternatives) {
      const aid = EX_ID_BY_SLUG.get(a.slug);
      if (aid && aid !== eid) altRows.push({ exercise_id: eid, alternative_id: aid, reason: a.name_vi, sort_order: order++ });
    }
  }
  let aOk = 0;
  for (let i = 0; i < altRows.length; i += 200) {
    const chunk = altRows.slice(i, i + 200);
    const { error, count } = await supa.from('exercise_alternatives').insert(chunk, { count: 'exact' });
    if (error) console.error(`  ✗ alt chunk ${i}: ${error.message}`);
    else aOk += count ?? chunk.length;
  }
  console.log(`✓ exercise_alternatives: ${aOk} rows`);

  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`✅ Done. ${upsertOk} exercises | ${mOk} muscles | ${eOk} equipment | ${aOk} alternatives`);
}

main().catch((err) => {
  console.error('\n💥 Fatal:', err);
  process.exit(1);
});
