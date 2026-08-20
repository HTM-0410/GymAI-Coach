/**
 * SEED EXERCISES — GymAI Coach
 * Populates the database with a complete exercise library.
 *
 * Usage:
 *   npx tsx scripts/seed-exercises.ts
 *
 * Flow:
 *   1. Insert equipment + muscles (lookup by slug)
 *   2. For each exercise: call Gemini → generate description/instructions/tips/mistakes
 *   3. Insert exercise + exercise_muscles + exercise_equipment join rows
 *
 * Tổng: ~90 exercises × ~1.5s = ~2-3 phút.
 * Gemini cost: ~90 × 200 tokens ≈ 18k tokens ≈ $0.006
 */

import { createClient } from '@supabase/supabase-js';
import { callGemini } from '../src/lib/ai/gemini';
import {
  EQUIPMENT_SEED,
  MUSCLES_SEED,
  EXERCISES_SEED,
  type ExerciseSeed,
} from './seed-exercises-data';

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';
const BATCH_SIZE = 5; // exercises per Gemini call (group related)
const DRY_RUN = process.argv.includes('--dry-run');

// ─── GEMINI PROMPT ───────────────────────────────────────────────────────────

function buildPrompt(exercises: ExerciseSeed[]): string {
  const list = exercises.map((e, i) =>
    `${i + 1}. "${e.name}" (${e.equipment.join(', ')}) — ${e.exercise_type}, ${e.difficulty}`
  ).join('\n');

  return `Bạn là huấn luyện viên thể hình chuyên nghiệp. Với mỗi bài tập bên dưới, tạo nội dung chi tiết.

Danh sách bài tập:
${list}

Trả về JSON array (tiếng Việt, đầy đủ dấu tiếng Việt):
[
  {
    "slug": "...",          // slug đã cho
    "description": "...",    // 2-3 câu mô tả bài tập (dùng cho trang chi tiết)
    "instructions": [...],   // 5-8 bước thực hiện (đánh số 1. 2. ...)
    "tips": [...],          // 3-5 tips cho người mới tập
    "common_mistakes": [...],// 3-5 lỗi sai phổ biến cần tránh
    "default_rest_seconds": số giây nghỉ giữa các set (${exercises.map(e => `bài "${e.name}": ${e.default_rest_seconds}s`).join(', ')}),
    "default_rir": số RIR (${exercises.map(e => `bài "${e.name}": ${e.default_rir}`).join(', ')})
  },
  ...
]

QUAN TRỌNG:
- Chỉ trả về JSON array, không có markdown code block, không có giải thích
- Mỗi phần tử phải có slug khớp chính xác với danh sách
- instructions: mỗi bước là 1 câu hoàn chỉnh, bắt đầu bằng động từ (VD: "Hít sâu...")
- tips và common_mistakes: câu ngắn gọn, 1 dòng
- default_rest_seconds và default_rir: dùng đúng giá trị đã cho ở trên
- Độ khó: beginner = mới tập, intermediate = đã tập 6+ tháng, advanced = trên 2 năm`;
}

// ─── SLUG → CONTENT ─────────────────────────────────────────────────────────

async function generateContents(exercises: ExerciseSeed[]): Promise<Map<string, {
  description: string;
  instructions: string[];
  tips: string[];
  common_mistakes: string[];
  default_rest_seconds: number;
  default_rir: number;
}>> {
  const results = new Map<string, any>();
  const errors: string[] = [];

  for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
    const batch = exercises.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(exercises.length / BATCH_SIZE);

    process.stdout.write(`\n[${batchNum}/${totalBatches}] Generating: ${batch.map(e => e.name).join(', ')}`);

    try {
      const prompt = buildPrompt(batch);
      const raw = await callGemini({
        prompt,
        jsonSchema: true,
        temperature: 0.4,
        maxOutputTokens: 2000,
      });

      // Strip markdown code block if present
      const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      const parsed = JSON.parse(cleaned) as any[];

      for (const item of parsed) {
        results.set(item.slug, item);
      }
      process.stdout.write(' ✓');
    } catch (err: any) {
      process.stdout.write(` ✗ (${err.message})`);
      errors.push(`Batch ${batchNum}: ${err.message}`);
      // Fallback: use empty content, user can re-generate
      for (const ex of batch) {
        results.set(ex.slug, {
          description: '',
          instructions: [],
          tips: [],
          common_mistakes: [],
          default_rest_seconds: ex.default_rest_seconds,
          default_rir: ex.default_rir,
        });
      }
    }

    // Rate limit protection
    if (i + BATCH_SIZE < exercises.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  if (errors.length > 0) {
    console.warn(`\n⚠️  ${errors.length} batches failed — will insert with empty content, re-generate later`);
  }

  return results;
}

// ─── UPSERT HELPER ────────────────────────────────────────────────────────────

async function upsertOrGet(table: string, rows: Record<string, any>[], matchKey: string) {
  if (DRY_RUN) return new Map(rows.map(r => [r[matchKey], r]));

  const { data, error } = await supabase
    .from(table)
    .upsert(rows, { onConflict: matchKey })
    .select();

  if (error) throw new Error(`upsert ${table}: ${error.message}`);

  return new Map((data ?? []).map(r => [r[matchKey], r]));
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🏋️  GymAI Coach — Exercise Library Seeder');
  console.log('─'.repeat(50));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no DB writes)' : 'LIVE'}`);
  console.log(`Exercises: ${EXERCISES_SEED.length}`);
  console.log(`Equipment: ${EQUIPMENT_SEED.length}`);
  console.log(`Muscles: ${MUSCLES_SEED.length}`);
  console.log('');

  // 1. Seed equipment
  console.log('📦 Seeding equipment...');
  const eqMap = await upsertOrGet(
    'equipment',
    EQUIPMENT_SEED.map(e => ({
      slug: e.slug,
      name: e.name,
      name_vi: e.name_vi,
      category: e.category,
    })),
    'slug',
  );
  console.log(`  ✓ ${eqMap.size} equipment rows`);

  // 2. Seed muscles
  console.log('📦 Seeding muscles...');
  const muscleMap = await upsertOrGet(
    'muscles',
    MUSCLES_SEED.map(m => ({
      slug: m.slug,
      name: m.name,
      name_vi: m.name_vi,
      body_region: m.body_region,
    })),
    'slug',
  );
  console.log(`  ✓ ${muscleMap.size} muscle rows`);

  // 3. Generate AI content
  console.log('\n🤖 Generating exercise content with Gemini...');
  const contents = await generateContents(EXERCISES_SEED);
  console.log(`\n  ✓ Generated ${contents.size} content entries`);

  // 4. Seed exercises
  console.log('\n📦 Seeding exercises...');
  const exerciseRows = EXERCISES_SEED.map(ex => ({
    type: 'system' as const,
    name: ex.name,
    name_vi: ex.name_vi,
    slug: ex.slug,
    difficulty: ex.difficulty,
    exercise_type: ex.exercise_type,
    status: 'published' as const,
    default_rest_seconds: ex.default_rest_seconds,
    default_rir: ex.default_rir,
    ...(contents.get(ex.slug) ? {
      description: contents.get(ex.slug)?.description ?? null,
      instructions: JSON.stringify(contents.get(ex.slug)?.instructions ?? []),
      tips: JSON.stringify(contents.get(ex.slug)?.tips ?? []),
      common_mistakes: JSON.stringify(contents.get(ex.slug)?.common_mistakes ?? []),
    } : {}),
  }));

  const exMap = await upsertOrGet(
    'exercises',
    exerciseRows,
    'slug',
  );
  console.log(`  ✓ ${exMap.size} exercise rows`);

  // 5. Seed exercise_muscles joins
  console.log('\n📦 Seeding exercise_muscles joins...');
  const muscleJoins = EXERCISES_SEED.flatMap(ex => {
    const exId = (exMap.get(ex.slug) as any)?.id;
    if (!exId) return [];

    const rows = [];
    for (const mSlug of ex.primary_muscles) {
      const mId = (muscleMap.get(mSlug) as any)?.id;
      if (mId) rows.push({ exercise_id: exId, muscle_id: mId, role: 'primary' });
    }
    for (const mSlug of ex.secondary_muscles) {
      const mId = (muscleMap.get(mSlug) as any)?.id;
      if (mId) rows.push({ exercise_id: exId, muscle_id: mId, role: 'secondary' });
    }
    return rows;
  });

  if (!DRY_RUN && muscleJoins.length > 0) {
    const { error } = await supabase.from('exercise_muscles').upsert(muscleJoins, {
      onConflict: 'exercise_id,muscle_id',
    });
    if (error) console.warn(`  ⚠️  exercise_muscles: ${error.message}`);
    else console.log(`  ✓ ${muscleJoins.length} exercise_muscles rows`);
  } else {
    console.log(`  ✓ ${muscleJoins.length} exercise_muscles rows (dry run)`);
  }

  // 6. Seed exercise_equipment joins
  console.log('\n📦 Seeding exercise_equipment joins...');
  const equipJoins = EXERCISES_SEED.flatMap(ex => {
    const exId = (exMap.get(ex.slug) as any)?.id;
    if (!exId) return [];

    return ex.equipment
      .map(eSlug => ({ exercise_id: exId, equipment_id: (eqMap.get(eSlug) as any)?.id }))
      .filter(j => j.equipment_id)
      .map(j => ({ exercise_id: j.exercise_id, equipment_id: j.equipment_id }));
  });

  if (!DRY_RUN && equipJoins.length > 0) {
    const { error } = await supabase.from('exercise_equipment').upsert(equipJoins, {
      onConflict: 'exercise_id,equipment_id',
    });
    if (error) console.warn(`  ⚠️  exercise_equipment: ${error.message}`);
    else console.log(`  ✓ ${equipJoins.length} exercise_equipment rows`);
  } else {
    console.log(`  ✓ ${equipJoins.length} exercise_equipment rows (dry run)`);
  }

  console.log('\n✅ Seed complete!');
  console.log(`   ${exMap.size} exercises`);
  console.log(`   ${muscleJoins.length} muscle associations`);
  console.log(`   ${equipJoins.length} equipment associations`);
}

main().catch(err => {
  console.error('\n❌ Seed failed:', err);
  process.exit(1);
});
