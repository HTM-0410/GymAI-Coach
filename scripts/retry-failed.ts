/**
 * RETRY FAILED EXERCISES — GymAI Coach
 * ═════════════════════════════════════════════════════════════
 * Đọc log `run-resume.log` + `run-full.log`, extract slug lỗi,
 * gọi lại Gemini với maxOutputTokens cao hơn.
 */

import { promises as fs, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { EXERCISES_SEED } from './seed-exercises-data';

// ─── ENV ─────────────────────────────────────────────────────────────────────
try {
  const txt = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !m[1].startsWith('#') && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const GEMINI_KEY = process.env.GEMINI_API_KEY ?? '';
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';
const BATCH_SIZE = 8; // batch nhỏ hơn cho retry → ít bị cắt output
const DELAY_MS = 4000;
const DATA_DIR = join(process.cwd(), 'data', 'exercises');
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// ─── SCHEMA ──────────────────────────────────────────────────────────────────
const SetupSchema = z.object({
  sets: z.string(),
  reps: z.string(),
  rir: z.string(),
  rest_seconds: z.number().int().min(0).max(600),
  tempo: z.string(),
});
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
  equipment: z.array(z.string().min(1)).min(1),
  gallery: z.object({
    main: z.string().nullable(),
    views: z.array(z.object({ src: z.string(), label: z.string().max(32) })).min(1).max(5),
    caption_vi: z.string().max(120),
  }),
  goal_vi: z.string().min(20).max(400),
  instructions: z.array(z.string().min(10).max(220)).min(3).max(10),
  tips: z.array(z.string().min(10).max(180)).min(1).max(6),
  common_mistakes: z.array(z.string().min(10).max(180)).min(1).max(6),
  setup: SetupSchema,
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
  }).refine((c) => c.labels.length === c.values_kg.length, { message: 'labels.length must equal values_kg.length' }),
  ai_coach: z.object({
    next_session_vi: z.string().min(5).max(120),
    rationale_vi: z.string().min(20).max(300),
  }),
  alternatives: z.array(z.object({ slug: z.string(), name_vi: z.string() })).max(3),
  media_metadata: z.object({
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    last_updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    source: z.string(),
    language: z.literal('vi'),
    reviewer_notes: z.string().optional(),
  }),
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildPrompt(batch: typeof EXERCISES_SEED): string {
  const list = batch
    .map((e, i) =>
      `${i + 1}. name="${e.name}" | name_vi="${e.name_vi}" | slug="${e.slug}" | type=${e.exercise_type} | difficulty=${e.difficulty} | rest=${e.default_rest_seconds}s | rir=${e.default_rir}`
    )
    .join('\n');

  return `Bạn là HLV thể hình. Sinh JSON array ${batch.length} phần tử, MỖI phần tử đủ 22 field schema dưới đây (tiếng Việt có dấu). CHỈ trả JSON — KHÔNG markdown, KHÔNG giải thích.

# LIST (${batch.length} bài)
${list}

# SCHEMA (mỗi phần tử)
{
  "slug": "<copy từ input>",
  "name": "English",
  "name_vi": "Tiếng Việt",
  "subtitle_vi": "<=80 chars>",
  "tags": [string, 1..8],
  "movement_pattern": "squat|hinge|push|pull|lunge|carry|rotation|isolation",
  "exercise_type": "compound|isolation",
  "difficulty": "beginner|intermediate|advanced",
  "primary_muscle": "Tên tiếng Việt",
  "secondary_muscles": ["Tên tiếng Việt", 0..6],
  "equipment": ["Tên tiếng Việt", 1..],
  "gallery": {
    "main": null,
    "views": [
      {"src": "/exercises/demo/PLACEHOLDER.svg", "label": "Front"},
      {"src": "/exercises/demo/PLACEHOLDER.svg", "label": "Side"},
      {"src": "/exercises/demo/PLACEHOLDER.svg", "label": "Top"}
    ],
    "caption_vi": "<=120 chars>"
  },
  "goal_vi": "20-400 chars",
  "instructions": [string, 3..10],   // mỗi bước <=220 chars, bắt đầu bằng động từ
  "tips": [string, 1..6],            // 10-180 chars
  "common_mistakes": [string, 1..6], // 10-180 chars
  "setup": { "sets": str, "reps": str, "rir": str, "rest_seconds": <number>, "tempo": str },
  "safety_vi": "20-300 chars",
  "performance_metrics": { "current_weight_kg": num, "rep_range": str, "estimated_1rm_kg": num },
  "performance_chart": {
    "labels": [str, 3..12],
    "values_kg": [num, 3..12],       // cùng độ dài, tăng dần
    "goal_kg": num, "min": num, "max": num
  },
  "ai_coach": { "next_session_vi": "5-120 chars", "rationale_vi": "20-300 chars" },
  "alternatives": [{ "slug": str, "name_vi": str }, 0..3],
  "media_metadata": { "version": "1.0.0", "last_updated": "2026-08-19", "source": str, "language": "vi" }
}

# QUY TẮC QUAN TRỌNG
- subtitle_vi TUYỆT ĐỐI <= 80 chars (1 dòng ngắn gọn).
- instructions.length 3..10 (KHÔNG quá 10).
- common_mistakes.length 1..6 (KHÔNG quá 6).
- performance_chart.labels.length === values_kg.length.
- Tiếng Việt tự nhiên, có dấu.
- JSON phải parseable, KHÔNG ký tự thừa cuối.

OUTPUT = JSON array ${batch.length} phần tử.`;
}

async function callGeminiJSON(prompt: string): Promise<string> {
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 32000,
      response_mime_type: 'application/json',
    },
  };
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'x-goog-api-key': GEMINI_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    if (r.status === 429 || r.status >= 500) throw new Error(`RETRYABLE_${r.status}: ${t.slice(0, 200)}`);
    throw new Error(`Gemini ${r.status}: ${t.slice(0, 400)}`);
  }
  const data = await r.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  let delay = 3000;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const msg = String(err.message);
      if ((!msg.includes('RETRYABLE_') && !msg.includes('429')) || attempt > maxRetries) throw err;
      console.log(`  ⚠️ Retry ${attempt}/${maxRetries} sau ${delay}ms`);
      await sleep(delay);
      delay = Math.min(delay * 2, 30000);
    }
  }
}

async function isValidExisting(slug: string): Promise<boolean> {
  try {
    const txt = await fs.readFile(join(DATA_DIR, `${slug}.json`), 'utf-8');
    return ExerciseSchema.safeParse(JSON.parse(txt)).success;
  } catch {
    return false;
  }
}

function extractFailedSlugs(): string[] {
  const failed = new Set<string>();
  for (const logPath of ['run-resume.log', 'run-full.log']) {
    if (!existsSync(logPath)) continue;
    const buf = readFileSync(logPath);
    const t = buf.toString('utf16le');
    // Match X-marker (could be `✗` or `Γ£ù` if PowerShell mangled). Pattern: any slug before `:`
    const re = /[^\s:]+\s+([a-z0-9][a-z0-9-]+)\s*:\s*(?:batch-parse|gallery\.caption_vi|String must contain|Array must contain|Required|Expected)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t))) failed.add(m[1]);
  }
  return [...failed];
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  if (!GEMINI_KEY) {
    console.error('❌ GEMINI_API_KEY missing');
    process.exit(1);
  }

  console.log(`Model: ${MODEL}, batch size: ${BATCH_SIZE}, delay: ${DELAY_MS}ms`);

  const failedSlugs = extractFailedSlugs();
  console.log(`\nTìm thấy ${failedSlugs.length} slug lỗi trong log.`);

  // Filter: chỉ giữ những slug vẫn invalid
  const stillBad: typeof EXERCISES_SEED = [];
  for (const slug of failedSlugs) {
    if (await isValidExisting(slug)) continue;
    const seed = EXERCISES_SEED.find((e) => e.slug === slug);
    if (seed) stillBad.push(seed);
  }

  if (stillBad.length === 0) {
    console.log('✅ Tất cả slug lỗi đã OK. Nothing to do.');
    return;
  }

  console.log(`Cần retry: ${stillBad.length} bài`);
  console.log(`  ${stillBad.slice(0, 8).map((s) => s.slug).join(', ')}${stillBad.length > 8 ? '...' : ''}`);

  const chunks: typeof EXERCISES_SEED[] = [];
  for (let i = 0; i < stillBad.length; i += BATCH_SIZE) chunks.push(stillBad.slice(i, i + BATCH_SIZE));
  console.log(`Chia thành ${chunks.length} batch.`);

  let totalOk = 0, totalErr = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`\n[Retry ${i + 1}/${chunks.length}] ${chunk.length} bài: ${chunk[0].slug} → ${chunk[chunk.length - 1].slug}`);
    const prompt = buildPrompt(chunk);

    let arr: any[] = [];
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const text = await withRetry(() => callGeminiJSON(prompt));
        const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
        arr = JSON.parse(stripped);
        if (!Array.isArray(arr)) throw new Error('Not array');
        break;
      } catch (e: any) {
        if (attempt === 2) {
          console.error(`  ✗ Parse fail final: ${e.message}`);
          totalErr += chunk.length;
          break;
        }
        console.warn(`  ⚠️ Parse retry ${attempt + 1}/2: ${e.message.slice(0, 80)}`);
        await sleep(2000);
      }
    }
    if (!arr.length) continue;

    let localOk = 0, localErr = 0;
    for (const item of arr) {
      const slug = item?.slug;
      const r = ExerciseSchema.safeParse(item);
      if (!slug || !r.success) {
        const issues = r.success ? 'no slug' : r.error.issues.slice(0, 2).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
        console.log(`  ✗ ${slug ?? '?'}: ${issues}`);
        localErr++;
        continue;
      }
      try {
        await fs.writeFile(join(DATA_DIR, `${slug}.json`), JSON.stringify(r.data, null, 2) + '\n', 'utf-8');
        localOk++;
      } catch (e: any) {
        console.log(`  ✗ ${slug} write: ${e.message}`);
        localErr++;
      }
    }
    console.log(`  ✓ ${localOk} OK, ${localErr} ERR`);
    totalOk += localOk;
    totalErr += localErr;

    if (i + 1 < chunks.length) await sleep(DELAY_MS);
  }

  console.log(`\n${'═'.repeat(60)}\n✅ Retry xong: ${totalOk} OK, ${totalErr} ERR.`);
}

main().catch((err) => {
  console.error('\n💥 Fatal:', err);
  process.exit(1);
});