/**
 * LIST MISSING SLUGS — bài chưa có file JSON hợp lệ
 */
import { promises as fs, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXERCISES_SEED } from './seed-exercises-data';
import { z } from 'zod';

const SetupSchema = z.object({ sets: z.string(), reps: z.string(), rir: z.string(), rest_seconds: z.number().int().min(0).max(600), tempo: z.string() });
const ExerciseSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(2),
  name_vi: z.string().min(2),
  subtitle_vi: z.string().max(80),
  tags: z.array(z.string().min(1).max(24)).min(1).max(8),
  movement_pattern: z.enum(['squat','hinge','push','pull','lunge','carry','rotation','isolation']),
  exercise_type: z.enum(['compound','isolation']),
  difficulty: z.enum(['beginner','intermediate','advanced']),
  primary_muscle: z.string().min(1),
  secondary_muscles: z.array(z.string()).max(6),
  equipment: z.array(z.string().min(1)).min(1),
  gallery: z.object({ main: z.string().nullable(), views: z.array(z.object({ src: z.string(), label: z.string().max(32) })).min(1).max(5), caption_vi: z.string().max(120) }),
  goal_vi: z.string().min(20).max(400),
  instructions: z.array(z.string().min(10).max(220)).min(3).max(10),
  tips: z.array(z.string().min(10).max(180)).min(1).max(6),
  common_mistakes: z.array(z.string().min(10).max(180)).min(1).max(6),
  setup: SetupSchema,
  safety_vi: z.string().min(20).max(300),
  performance_metrics: z.object({ current_weight_kg: z.number().min(0), rep_range: z.string(), estimated_1rm_kg: z.number().min(0) }),
  performance_chart: z.object({ labels: z.array(z.string().max(16)).min(3).max(12), values_kg: z.array(z.number().min(0)).min(3).max(12), goal_kg: z.number().min(0), min: z.number(), max: z.number() }),
  ai_coach: z.object({ next_session_vi: z.string().min(5).max(120), rationale_vi: z.string().min(20).max(300) }),
  alternatives: z.array(z.object({ slug: z.string(), name_vi: z.string() })).max(3),
  media_metadata: z.object({ version: z.string(), last_updated: z.string(), source: z.string(), language: z.literal('vi'), reviewer_notes: z.string().optional() }),
});

const DATA_DIR = join(process.cwd(), 'data', 'exercises');

async function main() {
  const missing: { slug: string; name: string; name_vi: string }[] = [];
  for (const ex of EXERCISES_SEED) {
    let ok = false;
    try {
      const txt = await fs.readFile(join(DATA_DIR, `${ex.slug}.json`), 'utf-8');
      ok = ExerciseSchema.safeParse(JSON.parse(txt)).success;
    } catch {}
    if (!ok) missing.push({ slug: ex.slug, name: ex.name, name_vi: ex.name_vi });
  }
  console.log(`Total seed: ${EXERCISES_SEED.length}`);
  console.log(`Missing: ${missing.length}`);
  console.log(`---`);
  for (const m of missing) console.log(`${m.slug.padEnd(40)} ${m.name_vi}`);
}

main().catch(console.error);