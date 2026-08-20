/**
 * GENERATE EXERCISES BATCH — GymAI Coach
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Dùng Gemini Batch API (50% discount) để sinh nội dung đầy đủ 22 trường
 * cho 300 bài tập trong EXERCISES_SEED, theo đúng `data/exercises/exercise.schema.json`.
 *
 * Output (ghi đồng thời):
 *   1. data/exercises/<slug>.json         — full schema-compliant content
 *   2. Supabase `exercises` table          — UPSERT qua service role key
 *
 * Cost:
 *   - Gemini Batch API giảm 50% giá input/output tokens so với call thường.
 *   - 300 bài × ~1.5k tokens input + ~2k tokens output ≈ ~$0.05–0.15 / 1 lần chạy.
 *
 * Flow (chạy thủ công 1 lần):
 *   1. Chia EXERCISES_SEED thành 30 batch × 10 bài (cấu hình được ở BATCH_SIZE).
 *   2. Với mỗi batch: build prompt → upload JSONL → tạo batch job → poll tới DONE.
 *      (Mỗi batch file chứa 10 request riêng, Gemini chạy async xử lý 1 lần.)
 *   3. Download kết quả → parse JSON từng response → validate bằng Zod.
 *   4. Ghi file JSON + UPSERT Supabase.
 *
 * Lưu ý:
 *   - Batch API có thể mất từ vài phút tới vài giờ tùy queue (xem quota).
 *   - Không nên chạy 30 batch song song — sẽ vượt quota. Mặc định chạy tuần tự
 *     nhưng vẫn có tuỳ chọn --parallel N (chạy tối đa N batch cùng lúc).
 *   - Batch API giới hạn input/output token per request, nên giữ prompt gọn.
 *   - File JSONB Supabase: instructions/tips/common_mistakes/alternatives lưu JSON string.
 *
 * Usage:
 *   npx tsx scripts/generate-exercises-batch.ts               # Run all 30 batches sequential
 *   npx tsx scripts/generate-exercises-batch.ts --parallel 5 # 5 batches concurrent
 *   npx tsx scripts/generate-exercises-batch.ts --dry-run     # Build batches, don't call API
 *   npx tsx scripts/generate-exercises-batch.ts --limit 50    # Only first 50 exercises
 *   npx tsx scripts/generate-exercises-batch.ts --resume      # Pickup from where left off (skips done slugs)
 */

import { createClient as createSupabase } from '@supabase/supabase-js';
import { promises as fs } from 'node:fs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

// ─── Load .env.local manually (tsx doesn't auto-load) ───────────────────────
function loadEnvLocal(): void {
  try {
    const path = join(process.cwd(), '.env.local');
    const txt = readFileSync(path, 'utf-8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m && !m[1].startsWith('#') && !process.env[m[1]]) {
        process.env[m[1]] = m[2];
      }
    }
  } catch {
    // no .env.local — fallback to existing process.env
  }
}
loadEnvLocal();
import {
  EXERCISES_SEED,
  MUSCLES_SEED,
  EQUIPMENT_SEED,
  type ExerciseSeed,
} from './seed-exercises-data';

// ──────────────────────────────────────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const GEMINI_KEY = process.env.GEMINI_API_KEY ?? '';

// Gemini Batch API (gaudi — genai batch mode 50% discount)
// Docs: https://ai.google.dev/gemini-api/docs/batch-mode
const GEMINI_MODEL = process.env.GEMINI_MODEL_BATCH ?? 'gemini-2.5-flash-lite';
// Inline requests (≤20MB) — gọn hơn, không cần File API, ít round-trip → ít rate-limit
const BATCH_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:batchGenerateContent`;
const BATCH_JOB_POLL_INTERVAL_MS = 20_000;
const BATCH_JOB_TIMEOUT_MS = 60 * 60 * 1000; // 1h max wait per batch

// ⚙ Script runtime config
const BATCH_SIZE = Number(process.env.BATCH_SIZE ?? 10); // 10 bài / batch như bạn yêu cầu
const MAX_PARALLEL = Number(process.env.MAX_PARALLEL ?? 1); // 1 = sequential an toàn
const SUBMIT_DELAY_MS = Number(process.env.SUBMIT_DELAY_MS ?? 5000); // nghỉ giữa các lần submit
const DRY_RUN = process.argv.includes('--dry-run');
const RESUME = process.argv.includes('--resume');

const limitArgIdx = process.argv.indexOf('--limit');
const LIMIT = limitArgIdx > -1 ? Number(process.argv[limitArgIdx + 1]) : Infinity;

const DATA_DIR = join(process.cwd(), 'data', 'exercises');
const CACHE_DIR = join(process.cwd(), '.cache', 'gemini-batches');

// ──────────────────────────────────────────────────────────────────────────────
// ZOD SCHEMA (MIRRORS exercise.schema.json)
// ──────────────────────────────────────────────────────────────────────────────

const MuscleSchema = z.object({
  slug: z.string(),
  name_vi: z.string(),
});

const EquipmentSchema = z.object({
  slug: z.string(),
  name_vi: z.string(),
});

const GallerySchema = z.object({
  main: z.string().nullable(),
  views: z
    .array(
      z.object({
        src: z.string(),
        label: z.string().max(32),
      })
    )
    .min(1)
    .max(5),
  caption_vi: z.string().max(120),
});

const SetupSchema = z.object({
  sets: z.string(),
  reps: z.string(),
  rir: z.string(),
  rest_seconds: z.number().int().min(0).max(600),
  tempo: z.string(),
});

const PerformanceMetricsSchema = z.object({
  current_weight_kg: z.number().min(0),
  rep_range: z.string(),
  estimated_1rm_kg: z.number().min(0),
});

const PerformanceChartSchema = z.object({
  labels: z.array(z.string().max(16)).min(3).max(12),
  values_kg: z.array(z.number().min(0)).min(3).max(12),
  goal_kg: z.number().min(0),
  min: z.number(),
  max: z.number(),
}).refine((c) => c.labels.length === c.values_kg.length, {
  message: 'labels and values_kg must have equal length',
});

const AICoachSchema = z.object({
  next_session_vi: z.string().min(5).max(120),
  rationale_vi: z.string().min(20).max(300),
});

const MediaMetadataSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  last_updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.string(),
  language: z.literal('vi'),
  reviewer_notes: z.string().optional(),
});

export const ExerciseSchema = z.object({
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
  equipment: z.array(z.string().min(1)).min(1),
  gallery: GallerySchema,
  goal_vi: z.string().min(20).max(400),
  instructions: z.array(z.string().min(10).max(220)).min(3).max(10),
  tips: z.array(z.string().min(10).max(180)).min(1).max(6),
  common_mistakes: z.array(z.string().min(10).max(180)).min(1).max(6),
  setup: SetupSchema,
  safety_vi: z.string().min(20).max(300),
  performance_metrics: PerformanceMetricsSchema,
  performance_chart: PerformanceChartSchema,
  ai_coach: AICoachSchema,
  alternatives: z
    .array(
      z.object({
        slug: z.string(),
        name_vi: z.string(),
        image: z.string().optional(),
      })
    )
    .max(3),
  media_metadata: MediaMetadataSchema,
});

// ──────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDER
// ──────────────────────────────────────────────────────────────────────────────

function buildPrompt(batch: ExerciseSeed[]): string {
  const list = batch
    .map(
      (e, i) =>
        `${i + 1}. name="${e.name}" | name_vi="${e.name_vi}" | slug="${e.slug}" | equipment=[${e.equipment.join(', ')}] | primary_muscles=[${e.primary_muscles.join(', ')}] | secondary_muscles=[${e.secondary_muscles.join(', ')}] | type=${e.exercise_type} | difficulty=${e.difficulty} | movement_pattern=${e.movement_pattern ?? 'isolation'} | rest=${e.default_rest_seconds}s | rir=${e.default_rir}`
    )
    .join('\n');

  const muscleLookup = MUSCLES_SEED.map((m) => `${m.slug}="${m.name_vi}"`).join(', ');
  const equipmentLookup = EQUIPMENT_SEED.map((e) => `${e.slug}="${e.name_vi}"`).join(', ');

  return `Bạn là huấn luyện viên thể hình chuyên nghiệp. Với MỖI bài tập trong danh sách dưới đây, hãy sinh nội dung đầy đủ theo schema JSON bắt buộc (tiếng Việt, có dấu tiếng Việt đầy đủ).

# DANH SÁCH BÀI TẬP (10 bài)
${list}

# TRA CỨU TÊN TIẾNG VIỆT
- Muscle slugs → name_vi: ${muscleLookup}
- Equipment slugs → name_vi: ${equipmentLookup}

# SCHEMA BẮT BUỘC (mỗi phần tử array phải đủ các trường này)
{
  "slug": string,                    // COPY nguyên từ input
  "name": string,                    // Tiếng Anh chuẩn (VD: "Barbell Bench Press")
  "name_vi": string,                 // Tiếng Việt (VD: "Đẩy tạ đòn nằm ngang")
  "subtitle_vi": string,             // 1 dòng mô tả ngắn ≤80 ký tự
  "tags": string[1..8],              // VD: ["Ngực","Compound","Barbell","Intermediate"]
  "movement_pattern": "squat"|"hinge"|"push"|"pull"|"lunge"|"carry"|"rotation"|"isolation",
  "exercise_type": "compound"|"isolation",
  "difficulty": "beginner"|"intermediate"|"advanced",
  "primary_muscle": string,          // Dùng name_vi từ bảng tra cứu
  "secondary_muscles": string[0..6],
  "equipment": string[1..],          // Dùng name_vi từ bảng tra cứu
  "gallery": {
    "main": null,                    // LUÔN null — sẽ được team gán ảnh thật sau
    "views": [{"src": "/exercises/demo/PLACEHOLDER.svg", "label": "Front view"},
              {"src": "/exercises/demo/PLACEHOLDER.svg", "label": "Side view"},
              {"src": "/exercises/demo/PLACEHOLDER.svg", "label": "Top view"}],
    "caption_vi": string             // ≤120 ký tự, mô tả tư thế chuẩn
  },
  "goal_vi": string,                 // 20–400 ký tự, giải thích lợi ích + vị trí trong buổi tập
  "instructions": string[3..10],     // Mỗi bước 1 câu, bắt đầu bằng động từ hành động
  "tips": string[1..6],              // Mẹo kỹ thuật (10–180 ký tự/bước)
  "common_mistakes": string[1..6],   // Lỗi thường gặp (10–180 ký tự/lỗi)
  "setup": {
    "sets": string,                  // VD: "3–5"
    "reps": string,                  // VD: "6–10"
    "rir": string,                   // VD: "1–3"
    "rest_seconds": number,          // 0–600, dùng đúng default_rest_seconds đã cho
    "tempo": string                  // VD: "2–0–1–0"
  },
  "safety_vi": string,               // 20–300 ký tự, lưu ý an toàn
  "performance_metrics": {
    "current_weight_kg": number,     // Giá trị hợp lý theo bài advanced/intermediate/beginner
    "rep_range": string,             // Khớp setup.reps
    "estimated_1rm_kg": number       // Lớn hơn current_weight_kg khi bài compound
  },
  "performance_chart": {
    "labels": string[3..12],         // 6 buổi gần nhất, format dd/mm hoặc "Tuần 1"…
    "values_kg": number[3..12],      // Cùng độ dài labels, tăng dần
    "goal_kg": number,               // Mức mục tiêu hợp lý
    "min": number,                   // Min trục Y
    "max": number                    // Max trục Y
  },
  "ai_coach": {
    "next_session_vi": string,       // 5–120 ký tự, đề xuất buổi tới (kg × reps × RIR)
    "rationale_vi": string           // 20–300 ký tự, giải thích
  },
  "alternatives": [{ "slug": string, "name_vi": string }][0..3],   // slug phải tồn tại trong dataset (có thể trùng bài khác trong 300)
  "media_metadata": {
    "version": "1.0.0",
    "last_updated": "2026-08-19",
    "source": string,                // VD: "NSCA Essentials", "ACSM Guidelines", "ExRx.net"
    "language": "vi"
  }
}

# QUY TẮC NGHIÊM NGẶT
1. CHỈ trả về JSON array hợp lệ — KHÔNG markdown, KHÔNG giải thích, KHÔNG text thừa trước/sau.
2. Mỗi phần tử PHẢI đủ 22 trường top-level. Thiếu trường nào = lỗi toàn batch.
3. Dùng name_vi từ BẢNG TRA CỨU cho primary_muscle / secondary_muscles / equipment — KHÔNG tự đặt tên khác.
4. movement_pattern phải khớp với pattern tự nhiên của bài:
   - squat (đứng lên từ ngồi xổm), hinge (gập hông như deadlift/RDL),
   - push (đẩy ra xa người), pull (kéo về phía người),
   - lunge (bước chân dài), carry (bê vác đi), rotation (xoay), isolation (cô lập 1 khớp).
5. Mức rest_seconds TUÂN THỦ default_rest_seconds trong input. RIR trong setup.rir = "${(batch[0].default_rir).toString()}" giữ chuẩn này cho cả batch trừ isolation thì 1–2.
6. goal_vi/instructions/tips/common_mistakes/safety_vi/ai_coach.next_session_vi/ai_coach.rationale_vi PHẢI viết tiếng Việt tự nhiên, có dấu đầy đủ.
7. alternatives.slug phải là 1 slug hợp lệ có trong dataset 300 bài (nếu không chắc, để mảng rỗng []).
8. performance_chart: 6 phần tử, values tăng đều (ví dụ 60 → 65 → 67.5 → 70 → 72.5 → 75); goal_kg cao hơn max value một chút. min = max-15, max = max value + 10.
9. JSON phải parseable — đặc biệt escape ký tự đặc biệt trong string (\\n, \\", …).

OUTPUT = JSON array 10 phần tử, parseable bằng JSON.parse, không có ký tự thừa.`;
}

// ──────────────────────────────────────────────────────────────────────────────
// GEMINI BATCH API (inline requests)
// ──────────────────────────────────────────────────────────────────────────────

type BatchRequest = {
  request: {
    contents: Array<{ role: string; parts: Array<{ text: string }> }>;
    generationConfig: {
      temperature: number;
      maxOutputTokens: number;
      response_mime_type: string;
    };
  };
  metadata: {
    key: string;
  };
};

/**
 * Submit a batch via inline requests (no File API).
 * Body size phải < 20MB — với 10 bài × ~12KB prompt + 8KB payload = ~200KB, OK.
 */
async function submitInlineBatch(
  requests: BatchRequest[],
  displayName: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:batchGenerateContent`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      batch: {
        display_name: displayName,
        input_config: {
          requests: { requests },
        },
      },
    }),
  });
  if (!r.ok) {
    const text = await r.text();
    if (r.status === 429 || r.status >= 500) {
      throw new Error(`RETRYABLE_${r.status}: ${text.slice(0, 200)}`);
    }
    throw new Error(`submitInlineBatch ${r.status}: ${text.slice(0, 400)}`);
  }
  const j = (await r.json()) as { name: string };
  return j.name; // "batches/abc123"
}

async function pollBatchJob(jobName: string): Promise<{ responses?: any[] }> {
  const start = Date.now();
  while (Date.now() - start < BATCH_JOB_TIMEOUT_MS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${jobName}?key=${GEMINI_KEY}`);
    const j = (await r.json()) as {
      state: string;
      output?: { responses?: any[]; file?: string };
      error?: { message: string };
    };

    if (j.state === 'SUCCEEDED') {
      // Inline responses — directly returned in output.responses
      if (j.output?.responses?.length) {
        return { responses: j.output.responses };
      }
      // Fallback: if response is in a file
      if (j.output?.file) {
        const dl = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${j.output.file}:download?key=${GEMINI_KEY}`
        );
        const txt = await dl.text();
        return { responses: parseJsonlResponses(txt) };
      }
      return { responses: [] };
    }
    if (j.state === 'FAILED' || j.state === 'CANCELLED' || j.state === 'EXPIRED') {
      throw new Error(`Batch job ended ${j.state}: ${j.error?.message ?? ''}`);
    }
    process.stdout.write('.');
    await sleep(BATCH_JOB_POLL_INTERVAL_MS);
  }
  throw new Error(`Timeout waiting for batch job ${jobName}`);
}

function parseJsonlResponses(text: string): any[] {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function extractTextFromResponse(resp: any): string {
  // Inline response shape: { response: { candidates: [...] } }
  // File response shape: { response: { ... } } (same structure)
  const cand = resp?.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? resp?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof cand === 'string' ? cand : '';
}

// ──────────────────────────────────────────────────────────────────────────────
// PIPELINE PER BATCH
// ──────────────────────────────────────────────────────────────────────────────

type BatchResult = {
  batchIdx: number;
  exerciseSlugs: string[];
  rawTexts: Map<string, string>;
  parsed: Map<string, z.infer<typeof ExerciseSchema> | { error: string }>;
};

async function runBatch(
  batchIdx: number,
  batch: ExerciseSeed[],
  cacheDir: string
): Promise<BatchResult> {
  const totalBatches = Math.ceil(EXERCISES_SEED.length / BATCH_SIZE);
  console.log(`\n[Batch ${batchIdx}/${totalBatches}] ${batch.map((e) => e.slug).join(', ')}`);

  if (DRY_RUN) {
    const prompt = buildPrompt(batch);
    console.log(`  [DRY-RUN] prompt length=${prompt.length} chars, ${batch.length} requests`);
    return { batchIdx, exerciseSlugs: batch.map((e) => e.slug), rawTexts: new Map(), parsed: new Map() };
  }

  // 1. Build prompt + 10 inline requests (each request gets the same full prompt)
  const prompt = buildPrompt(batch);
  const requests: BatchRequest[] = batch.map((e) => ({
    request: {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 8192,
        response_mime_type: 'application/json',
      },
    },
    metadata: { key: e.slug },
  }));

  // 2. Submit inline batch (with retry on 429)
  const jobName = await withRetry(() => submitInlineBatch(requests, `gymaicoach-batch-${batchIdx}`), 3);
  console.log(`  Job: ${jobName} — polling...`);

  // 3. Poll for completion
  const { responses } = await pollBatchJob(jobName);
  console.log(`  ✓ ${responses?.length ?? 0} responses received.`);

  // 4. Parse & validate
  const rawTexts = new Map<string, string>();
  const parsed = new Map<string, z.infer<typeof ExerciseSchema> | { error: string }>();
  for (const r of responses ?? []) {
    const slug = r.metadata?.key ?? r.key;
    const text = extractTextFromResponse(r);
    rawTexts.set(slug, text);
    try {
      const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      const arr = JSON.parse(stripped);
      const found = Array.isArray(arr)
        ? arr.find((x: any) => x?.slug === slug)
        : arr?.slug === slug
          ? arr
          : null;
      if (!found) {
        parsed.set(slug, { error: `Slug ${slug} not found in response` });
        continue;
      }
      const validated = ExerciseSchema.safeParse(found);
      if (!validated.success) {
        parsed.set(slug, {
          error: validated.error.issues
            .slice(0, 5)
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; '),
        });
      } else {
        parsed.set(slug, validated.data);
      }
    } catch (err: any) {
      parsed.set(slug, { error: `JSON.parse: ${err.message}` });
    }
  }

  // 5. Save raw responses to cache for debugging
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(
    join(cacheDir, `batch-${batchIdx}-responses.json`),
    JSON.stringify({ responses, rawTexts: Object.fromEntries(rawTexts) }, null, 2),
    'utf-8'
  );

  return { batchIdx, exerciseSlugs: batch.map((e) => e.slug), rawTexts, parsed };
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
  let attempt = 0;
  let delay = 2000;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const isRetryable = String(err.message).includes('RETRYABLE_');
      if (!isRetryable || attempt > maxRetries) throw err;
      console.log(`  ⚠️  Retry ${attempt}/${maxRetries} after ${delay}ms (${err.message.slice(0, 80)})`);
      await sleep(delay);
      delay *= 2; // exponential backoff
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// DB + FILE I/O
// ──────────────────────────────────────────────────────────────────────────────

async function writeJsonFile(ex: z.infer<typeof ExerciseSchema>): Promise<void> {
  const path = join(DATA_DIR, `${ex.slug}.json`);
  await fs.writeFile(path, JSON.stringify(ex, null, 2) + '\n', 'utf-8');
}

async function upsertSupabase(ex: z.infer<typeof ExerciseSchema>, seed: ExerciseSeed): Promise<void> {
  const supa = createSupabase(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const row = {
    type: 'system' as const,
    name: ex.name,
    name_vi: ex.name_vi,
    slug: ex.slug,
    difficulty: ex.difficulty,
    exercise_type: ex.exercise_type,
    status: 'published' as const,
    description: ex.goal_vi,
    instructions: JSON.stringify(ex.instructions),
    tips: JSON.stringify(ex.tips),
    common_mistakes: JSON.stringify(ex.common_mistakes),
    default_rest_seconds: ex.setup.rest_seconds,
    default_rir: Number(ex.setup.rir.split(/[–-]/)[0]) || 2,
  };
  const { error } = await supa.from('exercises').upsert(row, { onConflict: 'slug' });
  if (error) throw new Error(`Supabase upsert ${ex.slug}: ${error.message}`);
}

async function isAlreadyDone(slug: string): Promise<boolean> {
  // Heuristic: file exists in data/exercises/ and is parseable + schema-valid.
  const path = join(DATA_DIR, `${slug}.json`);
  try {
    const txt = await fs.readFile(path, 'utf-8');
    const json = JSON.parse(txt);
    return ExerciseSchema.safeParse(json).success;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  // Hard fail-fast on missing env
  if (!GEMINI_KEY) {
    console.error('❌ GEMINI_API_KEY missing — set in .env.local');
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('⚠️  Supabase env missing — JSON files will be written but DB upsert skipped.');
  }

  console.log('🚀 GymAI Coach — Exercise Content Batch Generator (Gemini Batch API)');
  console.log('─'.repeat(70));
  console.log(`Model: ${GEMINI_MODEL}`);
  console.log(`Batch size: ${BATCH_SIZE} exercises/batch`);
  console.log(`Max parallel: ${MAX_PARALLEL}`);
  console.log(`Resume mode: ${RESUME}`);
  console.log(`Dry-run: ${DRY_RUN}`);
  if (Number.isFinite(LIMIT)) console.log(`Limit: first ${LIMIT} exercises`);
  console.log('');

  await fs.mkdir(CACHE_DIR, { recursive: true });

  // Filter & chunk
  let pool = EXERCISES_SEED;
  if (Number.isFinite(LIMIT)) pool = pool.slice(0, LIMIT);
  if (RESUME) {
    const keep: ExerciseSeed[] = [];
    for (const ex of pool) {
      if (!(await isAlreadyDone(ex.slug))) keep.push(ex);
    }
    console.log(`Resume: filtered ${pool.length - keep.length} already-done, ${keep.length} remaining.`);
    pool = keep;
  }

  const chunks: ExerciseSeed[][] = [];
  for (let i = 0; i < pool.length; i += BATCH_SIZE) chunks.push(pool.slice(i, i + BATCH_SIZE));

  console.log(`Total batches: ${chunks.length} (${pool.length} exercises)\n`);

  // Run with bounded parallelism
  const allParsed = new Map<string, z.infer<typeof ExerciseSchema> | { error: string }>();
  let cursor = 0;

  async function worker(workerId: number): Promise<void> {
    while (cursor < chunks.length) {
      const idx = cursor++;
      const chunk = chunks[idx];
      try {
        const result = await runBatch(idx + 1, chunk, CACHE_DIR);
        for (const [slug, parsed] of result.parsed) allParsed.set(slug, parsed);
      } catch (err: any) {
        console.error(`[Batch ${idx + 1}] worker ${workerId} failed: ${err.message}`);
        for (const ex of chunk) allParsed.set(ex.slug, { error: `batch-level: ${err.message}` });
      }
      // Rate-limit safety between batches
      if (cursor < chunks.length) {
        await sleep(SUBMIT_DELAY_MS);
      }
    }
  }

  const workers = Array.from({ length: Math.min(MAX_PARALLEL, chunks.length) }, (_, i) => worker(i));
  await Promise.all(workers);

  // Persist results
  let okCount = 0;
  let errCount = 0;
  const errors: string[] = [];

  console.log('\n\n📦 Persisting results...');
  for (const ex of pool) {
    const parsed = allParsed.get(ex.slug);
    if (!parsed || 'error' in parsed) {
      errCount++;
      errors.push(`${ex.slug}: ${(parsed as any)?.error ?? 'no-response'}`);
      continue;
    }
    try {
      await writeJsonFile(parsed);
      if (!DRY_RUN) await upsertSupabase(parsed, ex);
      okCount++;
    } catch (err: any) {
      errCount++;
      errors.push(`${ex.slug}: ${err.message}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`✅ Done. ${okCount} / ${pool.length} exercises persisted.`);
  if (errors.length) {
    console.log(`❌ ${errors.length} failed:`);
    errors.slice(0, 20).forEach((e) => console.log(`   - ${e}`));
    if (errors.length > 20) console.log(`   ... and ${errors.length - 20} more`);
  }
  console.log(`\nJSON files: ${DATA_DIR}`);
  if (!DRY_RUN) console.log(`Supabase: ${SUPABASE_URL ? '✓ pushed' : '✗ skipped (no URL)'}`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error('\n💥 Fatal:', err);
  process.exit(1);
});
