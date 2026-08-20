/**
 * GENERATE SPECIFIC SLUGS — chạy lại cho danh sách slug cụ thể
 */
import { promises as fs, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { EXERCISES_SEED } from './seed-exercises-data';

// ENV
try {
  const txt = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !m[1].startsWith('#') && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const GEMINI_KEY = process.env.GEMINI_API_KEY ?? '';
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';
const BATCH_SIZE = Number(process.env.BATCH_SIZE ?? 8);
const DELAY_MS = Number(process.env.DELAY_MS ?? 4000);
const DATA_DIR = join(process.cwd(), 'data', 'exercises');
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildPrompt(batch: typeof EXERCISES_SEED): string {
  const list = batch
    .map((e, i) => `${i + 1}. name="${e.name}" | name_vi="${e.name_vi}" | slug="${e.slug}" | type=${e.exercise_type} | difficulty=${e.difficulty} | rest=${e.default_rest_seconds}s | rir=${e.default_rir}`)
    .join('\n');

  return `Bạn là HLV thể hình. Sinh JSON array ${batch.length} phần tử, MỖI phần tử đủ 22 field schema (tiếng Việt có dấu). CHỈ trả JSON — KHÔNG markdown, KHÔNG giải thích.

# LIST (${batch.length} bài)
${list}

# SCHEMA
{
  "slug": "<copy>",
  "name": "English",
  "name_vi": "Tiếng Việt",
  "subtitle_vi": "<=70 chars (NGẮN GỌN!)",
  "tags": [str, 1..8],
  "movement_pattern": "squat|hinge|push|pull|lunge|carry|rotation|isolation",
  "exercise_type": "compound|isolation",
  "difficulty": "beginner|intermediate|advanced",
  "primary_muscle": "Tên TV",
  "secondary_muscles": ["Tên TV", 0..6],
  "equipment": ["Tên TV", 1..],
  "gallery": {
    "main": null,
    "views": [{"src": "/exercises/demo/PLACEHOLDER.svg", "label": "Front"}, {"src": "/exercises/demo/PLACEHOLDER.svg", "label": "Side"}, {"src": "/exercises/demo/PLACEHOLDER.svg", "label": "Top"}],
    "caption_vi": "<=120 chars (BẮT BUỘC, không được bỏ trống)"
  },
  "goal_vi": "20-400 chars",
  "instructions": [str, 3..8],   // 3-8 bước, mỗi bước <=220 chars
  "tips": [str, 1..6],
  "common_mistakes": [str, 1..6],
  "setup": { "sets": str, "reps": str, "rir": str, "rest_seconds": num, "tempo": str },
  "safety_vi": "20-300 chars",
  "performance_metrics": { "current_weight_kg": num, "rep_range": str, "estimated_1rm_kg": num },
  "performance_chart": {
    "labels": [str, 6], "values_kg": [num, 6],
    "goal_kg": num, "min": num, "max": num
  },
  "ai_coach": { "next_session_vi": "5-120 chars", "rationale_vi": "20-300 chars" },
  "alternatives": [{ "slug": str, "name_vi": str }, 0..3],
  "media_metadata": { "version": "1.0.0", "last_updated": "2026-08-19", "source": str, "language": "vi" }
}

# QUY TẮC CỨNG
- subtitle_vi TUYỆT ĐỐI <= 70 chars.
- instructions.length 3..8 (giới hạn trên 8).
- common_mistakes.length 1..5.
- gallery.caption_vi BẮT BUỘC có (không bỏ trống, không null).
- movement_pattern chỉ dùng enum trên.
- performance_chart: labels.length === values_kg.length === 6.
- Tiếng Việt tự nhiên.

OUTPUT = JSON array ${batch.length} phần tử.`;
}

async function callGeminiJSON(prompt: string): Promise<string> {
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 32000, response_mime_type: 'application/json' },
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
    try { return await fn(); }
    catch (err: any) {
      attempt++;
      if ((!err.message.includes('RETRYABLE_') && !err.message.includes('429')) || attempt > maxRetries) throw err;
      console.log(`  ⚠️ Retry ${attempt}/${maxRetries} sau ${delay}ms`);
      await sleep(delay);
      delay = Math.min(delay * 2, 30000);
    }
  }
}

async function main() {
  if (!GEMINI_KEY) { console.error('❌ GEMINI_API_KEY missing'); process.exit(1); }

  // Load missing slugs from slugs.txt (UTF-8)
  let slugs: string[] = [];
  if (existsSync('slugs.txt')) {
    const txt = readFileSync('slugs.txt', 'utf-8').replace(/^\uFEFF/, '');
    slugs = txt.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  }
  if (slugs.length === 0) slugs = process.argv.slice(2);

  console.log(`Model: ${MODEL}, batch: ${BATCH_SIZE}, delay: ${DELAY_MS}ms`);
  console.log(`Target: ${slugs.length} slugs`);

  const targets: typeof EXERCISES_SEED = [];
  for (const slug of slugs) {
    const seed = EXERCISES_SEED.find((e) => e.slug === slug);
    if (seed) targets.push(seed);
  }
  console.log(`Resolved ${targets.length} seeds`);

  if (targets.length === 0) { console.log('Nothing to do'); return; }

  const chunks: typeof EXERCISES_SEED[] = [];
  for (let i = 0; i < targets.length; i += BATCH_SIZE) chunks.push(targets.slice(i, i + BATCH_SIZE));

  let totalOk = 0, totalErr = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`\n[${i + 1}/${chunks.length}] ${chunk.length} bài: ${chunk[0].slug} → ${chunk[chunk.length - 1].slug}`);
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
        if (attempt === 2) { console.error(`  ✗ Parse fail: ${e.message.slice(0, 100)}`); totalErr += chunk.length; break; }
        console.warn(`  ⚠️ Retry parse ${attempt + 1}/2`);
        await sleep(2000);
      }
    }
    if (!arr.length) continue;

    let localOk = 0, localErr = 0;
    for (const item of arr) {
      const slug = item?.slug;
      if (!slug) { localErr++; continue; }
      try {
        // Quick fix: clamp subtitle_vi nếu quá dài
        if (item.subtitle_vi && item.subtitle_vi.length > 80) {
          item.subtitle_vi = item.subtitle_vi.slice(0, 77) + '...';
        }
        // Fix caption_vi if missing
        if (!item.gallery?.caption_vi) {
          if (!item.gallery) item.gallery = { main: null, views: [], caption_vi: '' };
          item.gallery.caption_vi = `Minh họa ${item.name_vi}`;
        }
        await fs.writeFile(join(DATA_DIR, `${slug}.json`), JSON.stringify(item, null, 2) + '\n', 'utf-8');
        localOk++;
      } catch (e: any) {
        console.log(`  ✗ ${slug}: ${e.message}`);
        localErr++;
      }
    }
    console.log(`  ✓ ${localOk} OK, ${localErr} ERR`);
    totalOk += localOk;
    totalErr += localErr;
    if (i + 1 < chunks.length) await sleep(DELAY_MS);
  }
  console.log(`\n✅ ${totalOk} OK, ${totalErr} ERR.`);
}

main().catch((e) => { console.error('\n💥', e); process.exit(1); });