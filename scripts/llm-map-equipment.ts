/**
 * LLM-ASSISTED EQUIPMENT MAPPING — GymAI Coach
 * ════════════════════════════════════════════════════════════════════════════════
 * Dùng Gemini để phân loại chính xác equipment cho mỗi bài tập, đặc biệt
 * cho 69 bài "lever/plate-loaded machine" hiện đang catch-all về 'machine'.
 *
 * VÍ DỤ:
 *   Input: { name: "Lever Chest Press", equipment: ["Máy đòn bẩy"] }
 *   LLM:   { slug: "machine", reasoning: "Plate-loaded chest press machine" }
 *   Output: { equipment: ["Máy tập"] } (giữ nguyên vì slug đã đúng)
 *
 *   Input: { name: "Lever Bicep Curl", equipment: ["Máy đòn bẩy"] }
 *   LLM:   { slug: "machine", reasoning: "..." }
 *   Output: { equipment: ["Máy tập"] } (giữ nguyên)
 *
 * LLM CHỈ dùng để:
 *   1. PHÁT HIỆN equipment sai (Gemini dịch sai) — VD walking treadmill bị gán
 *      "Máy đòn bẩy" do nhầm với treadmill — LLM sẽ gợi ý 'treadmill'.
 *   2. CONFIRMATION khi name/slug rõ ràng để có thêm confidence.
 *   3. KHÔNG tự ý thêm equipment mới — chỉ chọn từ catalog.
 *
 * Usage:
 *   npx tsx scripts/llm-map-equipment.ts --dry-run             # 5 bài sample
 *   npx tsx scripts/llm-map-equipment.ts --limit 50            # 50 bài
 *   npx tsx scripts/llm-map-equipment.ts --batch 20            # 20 bài/batch
 *   npx tsx scripts/llm-map-equipment.ts --all                 # tất cả 1,324 bài
 *   npx tsx scripts/llm-map-equipment.ts --only-mismatch       # chỉ bài LLM data có vấn đề
 */

import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';
import { EQUIPMENT_CATALOG, buildVietnameseSlugMap } from '../data/equipment/equipment-catalog';

// ─── ENV ─────────────────────────────────────────────────────────────────────
try {
  const txt = readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !m[1].startsWith('#') && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const GEMINI_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const DRY_RUN = process.argv.includes('--dry-run');
const ALL = process.argv.includes('--all');
const ONLY_MISMATCH = process.argv.includes('--only-mismatch');
const _limitArg = process.argv.find((a) => a.startsWith('--limit'));
const LIMIT = _limitArg ? Number(_limitArg.includes('=') ? _limitArg.split('=')[1] : process.argv[process.argv.indexOf(_limitArg) + 1]) : 0;
const _batchArg = process.argv.find((a) => a.startsWith('--batch'));
const BATCH_SIZE = _batchArg ? Number(_batchArg.includes('=') ? _batchArg.split('=')[1] : process.argv[process.argv.indexOf(_batchArg) + 1]) : 20;
const DATA_DIR = path.join(process.cwd(), 'data', 'exercises');
const CACHE_PATH = path.join(process.cwd(), 'data', 'equipment', '.llm-mapping-cache.json');

// ─── TYPES ───────────────────────────────────────────────────────────────────
type MappingResult = {
  slug: string | null;        // catalog slug, or null if uncertain
  confidence: number;         // 0..1
  reasoning: string;          // short reason
  is_mismatch: boolean;       // true = input equipment is wrong
};

type ExerciseJson = {
  slug: string;
  name: string;
  name_vi: string;
  equipment: string[];
  primary_muscle?: string;
  movement_pattern?: string;
  [k: string]: any;
};

// ─── CATALOG DESCRIPTION ────────────────────────────────────────────────────
const catalogMap = buildVietnameseSlugMap();
const slugByVi = new Map<string, string>();
for (const row of EQUIPMENT_CATALOG) slugByVi.set(row.slug, row.name_vi);

const CATALOG_TEXT = EQUIPMENT_CATALOG
  .map((r) => `- ${r.slug} | ${r.name} (${r.name_vi}) | category=${r.category} | ${r.description_vi}`)
  .join('\n');

// ─── CACHE ───────────────────────────────────────────────────────────────────
async function loadCache(): Promise<Map<string, MappingResult>> {
  try {
    const raw = await fs.readFile(CACHE_PATH, 'utf8');
    const obj = JSON.parse(raw);
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

async function saveCache(m: Map<string, MappingResult>) {
  await fs.writeFile(CACHE_PATH, JSON.stringify(Object.fromEntries(m), null, 2));
}

// ─── GEMINI CALL ─────────────────────────────────────────────────────────────
async function callGemini(prompt: string, retries = 3): Promise<string> {
  if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY missing');
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048,
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

    // Retry on 429 (rate limit) or 5xx
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      const wait = (attempt + 1) * 7; // 7s, 14s, 21s
      console.log(`    Rate limited (${res.status}). Retrying in ${wait}s... (attempt ${attempt + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }

    const errTxt = await res.text();
    throw new Error(`Gemini ${res.status}: ${errTxt.slice(0, 200)}`);
  }
  throw new Error('Gemini: exhausted retries');
}

function buildPrompt(exercises: ExerciseJson[]): string {
  const list = exercises.map((ex, i) => `${i + 1}. slug="${ex.slug}" | name="${ex.name}" | name_vi="${ex.name_vi}" | equipment=[${(ex.equipment ?? []).map((e) => `"${e}"`).join(', ')}] | primary_muscle="${ex.primary_muscle ?? ''}" | movement="${ex.movement_pattern ?? ''}"`).join('\n');

  return `Bạn là chuyên gia thể hình. Nhiệm vụ: xác nhận equipment cho từng bài tập dựa trên tên (EN + VI) + primary muscle + movement pattern.

CATALOG slug hợp lệ (CHỈ được chọn slug trong danh sách này):
${CATALOG_TEXT}

QUY TẮC:
1. Xác định equipment ĐÚNG nhất cho bài tập dựa trên TÊN (slug, name, name_vi), KHÔNG dựa trên field "equipment" hiện tại (vì field này có thể sai).
2. Nếu tên nói rõ là máy gì (chest press, leg press, pulldown, treadmill...) → chọn slug tương ứng trong catalog.
3. Nếu không rõ ràng (chỉ nói "machine" chung chung) → chọn 'machine'.
4. Nếu tên nói rõ dụng cụ không có trong catalog (parallette, trx, gymnastic ring, sissy squat...) → chọn slug gần nhất.
5. Nếu field "equipment" hiện tại đang KHÁC với slug bạn xác định → set is_mismatch=true.
6. Nếu field "equipment" hiện tại KHỚP với slug bạn xác định → set is_mismatch=false.

Cho mỗi bài trả về:
{
  "results": [
    { "idx": 1, "slug": "chest-press" hoặc "machine", "confidence": 0.0..1.0, "reasoning": "ngắn gọn", "is_mismatch": true/false },
    ...
  ]
}

DANH SÁCH BÀI TẬP:
${list}

Trả về JSON:`;
}

async function mapBatch(batch: ExerciseJson[]): Promise<MappingResult[]> {
  const prompt = buildPrompt(batch);
  const raw = await callGemini(prompt);
  try {
    const parsed = JSON.parse(raw);
    const arr = parsed.results ?? [];
    return arr.map((r: any) => ({
      slug: r.slug ?? null,
      confidence: Number(r.confidence ?? 0),
      reasoning: String(r.reasoning ?? ''),
      is_mismatch: Boolean(r.is_mismatch),
    }));
  } catch (e: any) {
    throw new Error(`Parse LLM response: ${(e as Error).message}; raw=${raw.slice(0, 200)}`);
  }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  if (!GEMINI_KEY) {
    console.error('XError: GEMINI_API_KEY missing in .env.local');
    process.exit(1);
  }

  const cache = await loadCache();

  const files = (await fs.readdir(DATA_DIR))
    .filter((f) => f.endsWith('.json') && f !== 'exercise.schema.json')
    .sort();

  let targets: ExerciseJson[] = [];
  for (const f of files) {
    const d = JSON.parse(await fs.readFile(path.join(DATA_DIR, f), 'utf8')) as ExerciseJson;
    targets.push(d);
  }

  // Filter FIRST (only-mismatch), then LIMIT (saves API cost)
  if (ONLY_MISMATCH) {
    targets = targets.filter((ex) => {
      const hasCatchAll = (ex.equipment ?? []).some((e) => /máy đòn bẩy|máy tập/i.test(e));
      const looksWeird = (ex.equipment ?? []).length === 0;
      return hasCatchAll || looksWeird;
    });
    console.log(`After --only-mismatch filter: ${targets.length} candidates`);
  }

  if (LIMIT > 0) {
    targets = targets.slice(0, LIMIT);
    console.log(`After --limit=${LIMIT}: ${targets.length} candidates`);
  }

  // Skip cached
  const toProcess = targets.filter((ex) => !cache.has(ex.slug));
  const cached = targets.filter((ex) => cache.has(ex.slug));

  console.log(`════════════════════════════════════════════════════════════════════`);
  console.log(`  LLM EQUIPMENT MAPPING ${DRY_RUN ? '(DRY-RUN)' : ''}`);
  console.log(`════════════════════════════════════════════════════════════════════`);
  console.log(`Total targets: ${targets.length}`);
  console.log(`  Already cached: ${cached.length}`);
  console.log(`  Need processing: ${toProcess.length}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Model: ${GEMINI_MODEL}`);
  console.log('');

  let processed = 0;
  let mismatch = 0;
  let errors = 0;

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toProcess.length / BATCH_SIZE);
    console.log(`\n[Batch ${batchNum}/${totalBatches}] Processing ${batch.length} exercises...`);

    try {
      const results = await mapBatch(batch);
      for (let j = 0; j < batch.length; j++) {
        const ex = batch[j];
        const r = results[j] ?? { slug: null, confidence: 0, reasoning: 'no-result', is_mismatch: false };
        cache.set(ex.slug, r);
        if (r.is_mismatch) mismatch++;
      }
      processed += batch.length;
      console.log(`  ✓ Done (${results.filter((r) => r.is_mismatch).length} mismatches detected)`);

      // Save cache every batch (skip in dry-run)
      if (!DRY_RUN) await saveCache(cache);

      // Rate limit: 5s between batches (15 RPM = ~4s min, buffer = 5s)
      if (i + BATCH_SIZE < toProcess.length) {
        await new Promise((r) => setTimeout(r, 5000));
      }
    } catch (e: any) {
      console.error(`  ✗ Batch failed: ${e.message}`);
      errors += batch.length;
    }
  }

  // ─── REPORT ──────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('════════════════════════════════════════════════════════════════════');
  console.log(`Processed: ${processed}`);
  console.log(`Cached:    ${cached.length}`);
  console.log(`Errors:    ${errors}`);
  console.log(`Mismatches: ${mismatch}`);

  // Show mismatches
  if (mismatch > 0) {
    console.log('\n─── MISMATCHES (LLM says current equipment is wrong) ───');
    const cachedArr = [...cache.entries()];
    for (const [slug, r] of cachedArr) {
      if (!r.is_mismatch) continue;
      const ex = targets.find((t) => t.slug === slug);
      if (!ex) continue;
      console.log(`\n  ${slug}`);
      console.log(`    name: ${ex.name}`);
      console.log(`    name_vi: ${ex.name_vi}`);
      console.log(`    current equipment: ${JSON.stringify(ex.equipment)}`);
      console.log(`    suggested slug: ${r.slug} (confidence: ${r.confidence})`);
      console.log(`    reasoning: ${r.reasoning}`);
    }
  }

  console.log('\n─── DISTRIBUTION ───');
  const slugCounts = new Map<string, number>();
  for (const [, r] of cache) {
    if (r.slug) slugCounts.set(r.slug, (slugCounts.get(r.slug) ?? 0) + 1);
  }
  for (const [slug, count] of [...slugCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${slug.padEnd(30)} ${count}`);
  }

  console.log('');
  if (!DRY_RUN) console.log(`Cache saved to: ${CACHE_PATH}`);
  if (DRY_RUN) {
    console.log('\n[DRY-RUN] No cache written. Re-run without --dry-run to save.');
  }
}

main().catch((err) => {
  console.error('\n💥 Fatal:', err);
  process.exit(1);
});
