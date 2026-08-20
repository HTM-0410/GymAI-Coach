/**
 * LLM-ASSISTED EXERCISE NORMALIZATION — GymAI Coach
 * ════════════════════════════════════════════════════════════════════════════════
 * Chuẩn hoá nội dung bài tập tiếng Việt cho 1,324 bài đã sync lên Supabase.
 *
 * Mỗi bài LLM sẽ sinh lại:
 *   - name_vi          (tên tiếng Việt chuẩn, dùng đúng thuật ngữ gym VN)
 *   - subtitle_vi      (mô tả ngắn 1 dòng dưới tên)
 *   - goal_vi          (mục tiêu / tác dụng chính, 1-2 câu)
 *   - instructions     (3-6 bước cách thực hiện, mỗi bước 1 câu)
 *   - tips             (2-4 mẹo kỹ thuật)
 *   - common_mistakes  (2-4 lỗi thường gặp)
 *   - safety_vi        (cảnh báo an toàn 1-2 câu)
 *   - alternatives     (1-3 slug bài thay thế từ danh sách đã chuẩn hoá)
 *
 * Rate limit: 15 req/min. Mỗi request chứa 15 bài → đúng 1 batch/4s.
 *
 * Usage:
 *   npx tsx scripts/llm-normalize-exercises.ts --dry-run            # 30 bài
 *   npx tsx scripts/llm-normalize-exercises.ts --limit 200          # 200 bài
 *   npx tsx scripts/llm-normalize-exercises.ts --slug dumbbell-bench-press
 *   npx tsx scripts/llm-normalize-exercises.ts --all                # tất cả 1,324 bài
 *   npx tsx scripts/llm-normalize-exercises.ts --only-noisy         # bài có nội dung rỗng/sai
 *   npx tsx scripts/llm-normalize-exercises.ts --only-noisy --force # bài có nội dung rỗng/sai + ép re-process (xoá cache rỗng)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient as createSupabase } from '@supabase/supabase-js';

// ─── ENV ─────────────────────────────────────────────────────────────────────
try {
  const txt = readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !m[1].startsWith('#') && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const GEMINI_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const CACHE_PATH = path.join(process.cwd(), 'data', 'exercises', '.llm-normalize-cache.json');

// ─── CLI ARGS ─────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
const ALL = process.argv.includes('--all');
const ONLY_NOISY = process.argv.includes('--only-noisy');
const FORCE = process.argv.includes('--force'); // xử lý lại cả bài đã cache (kể cả cache rỗng)
const BATCH_SIZE = 8; // 4 bài/request — giảm để tránh LLM truncate output
const REQ_INTERVAL_MS = 4000; // ~6.6 req/min — an toàn cho free tier

const _limitArg = process.argv.find((a) => a.startsWith('--limit'));
const LIMIT = _limitArg
  ? Number(_limitArg.includes('=') ? _limitArg.split('=')[1] : process.argv[process.argv.indexOf(_limitArg) + 1])
  : 0;
const _slugIdx = process.argv.indexOf('--slug');
const SLUG_FILTER = _slugIdx >= 0 ? process.argv[_slugIdx + 1] : '';

// ─── TYPES ───────────────────────────────────────────────────────────────────
type RawExercise = {
  id: string;
  slug: string;
  name: string;
  name_vi: string | null;
  subtitle_vi: string | null;
  primary_muscle_vi: string | null;
  secondary_muscles_vi: string[] | null;
  equipment_vi: string[] | null;
  difficulty: string | null;
  exercise_type: string | null;
  movement_pattern: string | null;
  description: string | null;
  instructions: unknown;
  tips: unknown;
  common_mistakes: unknown;
  safety_vi: string | null;
};

type Normalized = {
  name_vi: string;
  subtitle_vi: string;
  goal_vi: string;
  instructions: string[];
  tips: string[];
  common_mistakes: string[];
  safety_vi: string;
  alternatives: string[];
};

const NOISY_DESC_RE = /^undefined|^n\/?a|null$|^xxx+|^\W*$/i;
const MIN_CONTENT_LEN = 30;

function isNoisy(ex: RawExercise): boolean {
  // Bài bị ghi đè rỗng do LLM trả mảng rỗng — phát hiện theo instructions.length
  const insLen = Array.isArray(ex.instructions) ? ex.instructions.length : 0;
  if (insLen < 3) return true;

  const joined = [
    ex.name_vi,
    ex.subtitle_vi,
    ex.description,
    ex.safety_vi,
    asString(ex.instructions),
    asString(ex.tips),
    asString(ex.common_mistakes),
  ]
    .filter(Boolean)
    .join(' ');
  if (!joined || joined.length < MIN_CONTENT_LEN) return true;
  if (NOISY_DESC_RE.test(joined.trim())) return true;
  return false;
}

function asString(v: unknown): string {
  if (Array.isArray(v)) return v.map(String).join(' ');
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed.join(' ') : v;
    } catch {
      return v;
    }
  }
  return '';
}

// ─── CACHE ───────────────────────────────────────────────────────────────────
async function loadCache(): Promise<Map<string, Normalized>> {
  try {
    const raw = readFileSync(CACHE_PATH, 'utf8');
    return new Map(Object.entries(JSON.parse(raw)));
  } catch {
    return new Map();
  }
}

function saveCache(m: Map<string, Normalized>) {
  writeFileSync(CACHE_PATH, JSON.stringify(Object.fromEntries(m), null, 2));
}

// ─── GEMINI ──────────────────────────────────────────────────────────────────
async function callGemini(prompt: string, retries = 3): Promise<string> {
  if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY missing');
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
      response_mime_type: 'application/json',
    },
  };
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${ENDPOINT}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    }
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      const wait = (attempt + 1) * 6;
      console.log(`    Rate limited (${res.status}). Retry in ${wait}s...`);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    const errTxt = await res.text();
    throw new Error(`Gemini ${res.status}: ${errTxt.slice(0, 200)}`);
  }
  throw new Error('Gemini: exhausted retries');
}

// ─── PROMPT ──────────────────────────────────────────────────────────────────
function buildPrompt(batch: RawExercise[], refSlugs: string[]): string {
  const list = batch
    .map(
      (ex, i) =>
        `${i + 1}. idx=${i + 1} | slug="${ex.slug}" | name="${ex.name}" | name_vi="${ex.name_vi ?? ''}" | primary_muscle="${ex.primary_muscle_vi ?? ''}" | equipment=[${(ex.equipment_vi ?? []).join(', ')}] | difficulty="${ex.difficulty ?? ''}" | movement="${ex.movement_pattern ?? ''}"`,
    )
    .join('\n');

  return `Bạn là chuyên gia thể hình Việt Nam. Nhiệm vụ: chuẩn hoá nội dung tiếng Việt cho ${batch.length} bài tập gym, dựa trên tên quốc tế + nhóm cơ + dụng cụ.

QUY TẮC NGÔN NGỮ:
- Viết tiếng Việt tự nhiên, dùng thuật ngữ gym phổ biến tại VN (VD: "tạ đơn", "thanh đòn", "máy tập", "xà đơn", "cầu vai", "vai trước", "đùi trước", "mông", "bụng"…).
- name_vi: tên chuẩn tiếng Việt (3-6 từ), ưu tiên tên được dùng nhiều nhất trong phòng gym VN.
- subtitle_vi: 1 câu ngắn (≤ 60 ký tự) mô tả biến thể/cường độ (VD: "Biến thể hai tay", "Tăng cường vai trước").
- goal_vi: 1-2 câu mô tả mục tiêu/tác dụng chính (30-150 ký tự).
- instructions: 3-6 bước, mỗi bước 1 câu hoàn chỉnh (15-180 ký tự), chia sẻ tư thế → động tác → thở.
- tips: 2-4 mẹo kỹ thuật (15-160 ký tự), giúp tối ưu kích thích cơ.
- common_mistakes: 2-4 lỗi thường gặp (15-160 ký tự), người mới hay mắc.
- safety_vi: cảnh báo an toàn 1-2 câu (30-200 ký tự), nêu rủi ro + cách phòng tránh.
- alternatives: 1-3 slug bài thay thế từ DANH SÁCH SLUG HỢP LỆ ở dưới (chọn bài cùng primary_muscle nhưng khác equipment, hoặc độ khó tương đương). KHÔNG trùng slug hiện tại.

ĐỊNH DẠNG TRẢ VỀ (JSON only, không kèm chú thích):
{
  "results": [
    {
      "idx": 1,
      "name_vi": "...",
      "subtitle_vi": "...",
      "goal_vi": "...",
      "instructions": ["Bước 1...", "Bước 2...", "Bước 3..."],
      "tips": ["Mẹo 1...", "Mẹo 2..."],
      "common_mistakes": ["Lỗi 1...", "Lỗi 2..."],
      "safety_vi": "...",
      "alternatives": ["slug-1", "slug-2"]
    }
  ]
}

DANH SÁCH SLUG HỢP LỆ (chỉ chọn slug trong list này cho alternatives):
${refSlugs.slice(0, 400).join(', ')}

DANH SÁCH BÀI TẬP CẦN CHUẨN HOÁ:
${list}

Trả về JSON:`;
}

function parseResponse(raw: string, expected: number): Normalized[] | null {
  const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

  // Try direct parse first
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (_) {
    // Fallback: extract partial JSON from truncated response
    parsed = extractPartialJson(cleaned);
  }

  const arr = parsed?.results ?? [];
  if (!Array.isArray(arr)) throw new Error('Response không có mảng results');

  // Phát hiện batch rỗng hoàn toàn (LLM trả mảng rỗng/0 phần tử) → trả null để caller skip
  if (arr.length === 0) {
    console.warn(`    ⚠ LLM trả mảng rỗng (0 bài), skip batch này (sẽ retry sau)`);
    return null;
  }

  const out: Normalized[] = [];
  let nonEmptyCount = 0;
  for (let i = 0; i < expected; i++) {
    const r = arr[i] ?? {};
    const item: Normalized = {
      name_vi: String(r.name_vi ?? '').slice(0, 80),
      subtitle_vi: String(r.subtitle_vi ?? '').slice(0, 80),
      goal_vi: String(r.goal_vi ?? '').slice(0, 400),
      instructions: Array.isArray(r.instructions) ? r.instructions.map((s: any) => String(s).slice(0, 220)).slice(0, 20) : [],
      tips: Array.isArray(r.tips) ? r.tips.map((s: any) => String(s).slice(0, 180)).slice(0, 6) : [],
      common_mistakes: Array.isArray(r.common_mistakes) ? r.common_mistakes.map((s: any) => String(s).slice(0, 180)).slice(0, 6) : [],
      safety_vi: String(r.safety_vi ?? '').slice(0, 300),
      alternatives: Array.isArray(r.alternatives) ? r.alternatives.map((s: any) => String(s).slice(0, 60)).slice(0, 3) : [],
    };
    if (item.instructions.length >= 3) nonEmptyCount++;
    out.push(item);
  }

  // Nếu <50% bài trong batch có instructions → nghi ngờ batch bị lỗi, trả null để caller skip
  if (nonEmptyCount < expected * 0.5) {
    console.warn(`    ⚠ Chỉ ${nonEmptyCount}/${expected} bài có instructions hợp lệ — nghi ngờ LLM lỗi, skip batch`);
    return null;
  }

  return out;
}

/** Extract partial JSON when Gemini output is truncated mid-stream. */
function extractPartialJson(text: string): any {
  // Try to find opening brace of results array
  const arrStart = text.indexOf('"results"');
  if (arrStart < 0) return {};

  const brace = text.indexOf('[', arrStart);
  if (brace < 0) return {};

  let depth = 0;
  let end = brace;
  for (let i = brace; i < text.length; i++) {
    const c = text[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  try {
    const partial = `{"results":${text.slice(brace, end)}}`;
    return JSON.parse(partial);
  } catch {
    return {};
  }
}

// ─── DB ──────────────────────────────────────────────────────────────────────
async function loadAllExercises(): Promise<RawExercise[]> {
  const supabase = createSupabase(SUPABASE_URL, SUPABASE_KEY);
  const PAGE = 1000;
  const all: RawExercise[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('exercises')
      .select(
        'id, slug, name, name_vi, subtitle_vi, primary_muscle_vi, secondary_muscles_vi, equipment_vi, difficulty, exercise_type, movement_pattern, description, instructions, tips, common_mistakes, safety_vi',
      )
      .eq('type', 'system')
      .eq('status', 'published')
      .is('owner_user_id', null)
      .order('name_vi', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = (data ?? []) as RawExercise[];
    all.push(...chunk);
    if (chunk.length < PAGE) break;
  }
  return all;
}

async function loadAllSlugs(): Promise<string[]> {
  const supabase = createSupabase(SUPABASE_URL, SUPABASE_KEY);
  const PAGE = 1000;
  const slugs: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('exercises')
      .select('slug')
      .eq('type', 'system')
      .eq('status', 'published')
      .is('owner_user_id', null)
      .order('name_vi', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = (data ?? []) as Array<{ slug: string }>;
    slugs.push(...chunk.map((r) => r.slug));
    if (chunk.length < PAGE) break;
  }
  return slugs;
}

async function applyToDb(exercises: RawExercise[], normalized: Normalized[]): Promise<number> {
  if (DRY_RUN) return 0;
  const supabase = createSupabase(SUPABASE_URL, SUPABASE_KEY);
  let touched = 0;

  // For each exercise, upsert normalized content + replace alternatives.
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const n = normalized[i];
    if (!ex || !n) continue;

    // 1) Update exercises row
    const { error: upErr } = await supabase
      .from('exercises')
      .update({
        name_vi: n.name_vi || ex.name_vi,
        subtitle_vi: n.subtitle_vi || null,
        description: n.goal_vi || ex.description,
        instructions: n.instructions,
        tips: n.tips,
        common_mistakes: n.common_mistakes,
        safety_vi: n.safety_vi || null,
      })
      .eq('id', ex.id);
    if (upErr) {
      console.warn(`  ! update ${ex.slug}: ${upErr.message}`);
      continue;
    }
    touched++;

    // 2) Replace alternatives — delete existing, then insert new.
    const { error: delErr } = await supabase
      .from('exercise_alternatives')
      .delete()
      .eq('exercise_id', ex.id);
    if (delErr) {
      console.warn(`  ! delete alts ${ex.slug}: ${delErr.message}`);
      continue;
    }

    if (n.alternatives.length > 0) {
      const validSlugs = new Set(await loadAllSlugs());
      const rows = n.alternatives
        .filter((s) => s !== ex.slug && validSlugs.has(s))
        .map((slug, idx) => ({
          exercise_id: ex.id,
          alternative_id: undefined, // resolved below if needed
          slug,
          reason: 'Bài thay thế tương đương',
          sort_order: idx,
        }));

      // Resolve slug → id (single batch lookup)
      const { data: idRows } = await supabase
        .from('exercises')
        .select('id, slug')
        .in('slug', rows.map((r) => r.slug));
      const idBySlug = new Map((idRows ?? []).map((r: any) => [r.slug, r.id]));

      const insertRows = rows
        .map((r) => ({ ...r, alternative_id: idBySlug.get(r.slug) }))
        .filter((r) => r.alternative_id)
        .map(({ slug: _s, ...r }) => r);

      if (insertRows.length > 0) {
        const { error: insErr } = await supabase.from('exercise_alternatives').insert(insertRows);
        if (insErr) console.warn(`  ! insert alts ${ex.slug}: ${insErr.message}`);
      }
    }
  }

  return touched;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  if (!GEMINI_KEY) {
    console.error('❌ GEMINI_API_KEY missing');
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Supabase URL/KEY missing');
    process.exit(1);
  }

  console.log('Loading exercises from Supabase...');
  const all = await loadAllExercises();
  console.log(`  total: ${all.length}`);

  const refSlugs = all.map((e) => e.slug);

  // Build target list
  let targets = all;
  if (SLUG_FILTER) {
    targets = targets.filter((e) => e.slug === SLUG_FILTER);
    console.log(`  slug filter "${SLUG_FILTER}": ${targets.length}`);
  }
  if (ONLY_NOISY) {
    targets = targets.filter(isNoisy);
    console.log(`  only-noisy: ${targets.length}`);
  }
  if (LIMIT > 0) {
    targets = targets.slice(0, LIMIT);
    console.log(`  limit: ${targets.length}`);
  }

  // Cache
  const cache = await loadCache();

  // Nếu FORCE, xoá hết cache rỗng (instructions<3) để buộc xử lý lại
  if (FORCE) {
    let dropped = 0;
    for (const [slug, c] of cache.entries()) {
      if (!c.instructions || c.instructions.length < 3) {
        cache.delete(slug);
        dropped++;
      }
    }
    if (dropped > 0) console.log(`  [FORCE] dropped ${dropped} empty cache entries`);
  }

  const toProcess = targets.filter((e) => !cache.has(e.slug));
  const cached = targets.filter((e) => cache.has(e.slug));

  console.log('════════════════════════════════════════════════════════════════════');
  console.log(`  LLM EXERCISE NORMALIZATION ${DRY_RUN ? '(DRY-RUN)' : ''}`);
  console.log('════════════════════════════════════════════════════════════════════');
  console.log(`Total targets: ${targets.length}`);
  console.log(`  Already cached: ${cached.length}`);
  console.log(`  Need processing: ${toProcess.length}`);
  console.log(`Batch size: ${BATCH_SIZE} (~${(60000 / REQ_INTERVAL_MS).toFixed(1)} req/min — 1 batch / ${REQ_INTERVAL_MS / 1000}s)`);
  console.log(`Model: ${GEMINI_MODEL}`);
  console.log('');

  let processed = 0;
  let written = 0;
  let errors = 0;

  const start = Date.now();
  // Mutable index that lets us skip-ahead when a batch is rate-limited
  let pending = toProcess.slice();
  let totalBatches = Math.ceil(toProcess.length / BATCH_SIZE);
  let batchNum = 0;

  while (pending.length > 0) {
    const batch = pending.slice(0, BATCH_SIZE);
    batchNum++;
    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    const eta = processed > 0 ? ((toProcess.length - processed) / BATCH_SIZE) * (REQ_INTERVAL_MS / 1000) : 0;
    console.log(`[Batch ${batchNum}/${totalBatches}] ${batch.length} bài (elapsed ${elapsed}s, ETA ${eta.toFixed(0)}s)`);

    try {
      const prompt = buildPrompt(batch, refSlugs);
      const raw = await callGemini(prompt);
      const normalized = parseResponse(raw, batch.length);

      // Nếu LLM trả batch rỗng/lỗi → skip, không ghi cache/DB, push batch xuống cuối queue
      if (normalized === null) {
        pending = pending.slice(batch.length).concat(batch);
        errors += batch.length;
        const wait = REQ_INTERVAL_MS * 3;
        console.log(`    backoff ${wait / 1000}s before retry (queue=${pending.length})`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      for (let j = 0; j < batch.length; j++) {
        cache.set(batch[j].slug, normalized[j]);
      }

      // Apply to DB (skip in dry-run)
      const touched = await applyToDb(batch, normalized);
      written += touched;

      processed += batch.length;
      console.log(`  ✓ ${batch.length} processed, db updated ${touched}`);

      if (!DRY_RUN) saveCache(cache);

      // Drop the consumed batch
      pending = pending.slice(batch.length);

      // Rate limit
      if (pending.length > 0) {
        await new Promise((r) => setTimeout(r, REQ_INTERVAL_MS));
      }
    } catch (e: any) {
      const is429 = /429/.test(e.message);
      console.error(`  ✗ Batch failed: ${e.message.slice(0, 120)}`);
      // Drop the failed batch from the front, push to end so we cycle other batches first
      pending = pending.slice(batch.length).concat(batch);
      errors += batch.length;
      // Wait longer on failure — exponential-ish backoff, but capped
      const wait = is429 ? 45000 : REQ_INTERVAL_MS * 3;
      console.log(`    backoff ${wait / 1000}s before retry (queue=${pending.length})`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('════════════════════════════════════════════════════════════════════');
  console.log(`Processed: ${processed}`);
  console.log(`Cached:    ${cached.length}`);
  console.log(`DB written: ${written}`);
  console.log(`Errors:    ${errors}`);
  console.log(`Total time: ${((Date.now() - start) / 1000).toFixed(0)}s`);

  if (DRY_RUN) console.log('\n[DRY-RUN] No cache/DB written. Re-run without --dry-run.');
  else console.log(`\nCache saved to: ${CACHE_PATH}`);
}

main().catch((err) => {
  console.error('\n💥 Fatal:', err);
  process.exit(1);
});
