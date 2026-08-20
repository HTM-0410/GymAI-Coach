/**
 * RECLASSIFY LOW CONFIDENCE — GymAI Coach
 * ════════════════════════════════════════════════════════════════════════════════
 * Re-classify các entries có confidence thấp hoặc bị LLM phân loại sai logic.
 *
 * Đặc biệt:
 *   - assisted-* → assisted-pull-up-machine / assisted-dip-machine
 *   - smith-* squat/dip/lunge/kneeling → vẫn smith-squat
 *   - smith-standing-back-wrist-curl, smith-seated-wrist-curl → smith-curl (✓)
 *   - smith-hip-raise → smith-squat (?)
 */

import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CACHE_FILE = path.join(ROOT, 'data/equipment/.llm-machine-subtype-cache.json');
const EXERCISES_DIR = path.join(ROOT, 'data/exercises');

// ─── ENV ─────────────────────────────────────────────────────────────────────
try {
  const txt = readFileSync(path.join(ROOT, '.env.local'), 'utf-8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !m[1].startsWith('#') && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}
const GEMINI_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const APPLY = process.argv.includes('--apply');
const DRY_RUN = process.argv.includes('--dry-run');

const VALID_SUBTYPES = new Set([
  'lever-chest-press', 'lever-incline-chest-press', 'lever-decline-chest-press',
  'lever-shoulder-press', 'lever-lateral-raise', 'lever-reverse-fly',
  'lever-pulldown', 'lever-seated-row', 'lever-bent-over-row', 'lever-t-bar-row',
  'lever-pullover', 'lever-high-row', 'lever-bicep-curl', 'lever-preacher-curl',
  'lever-triceps-extension', 'lever-seated-dip', 'leg-extension', 'leg-curl',
  'lever-calf-raise', 'lever-calf-press', 'lever-hip-abduction', 'lever-hip-adduction',
  'lever-hip-extension', 'lever-shrug', 'lever-reverse-hyperextension',
  'lever-back-extension', 'lever-seated-crunch', 'lever-seated-good-morning',
  'smith-bench-press', 'smith-incline-press', 'smith-shoulder-press', 'smith-squat',
  'smith-row', 'smith-curl', 'smith-triceps-extension', 'smith-lateral-raise',
  'smith-shrug', 'smith-calf-raise', 'plate-loaded-leg-press', 'plate-loaded-hack-squat',
  'plate-loaded-pec-deck', 'plate-loaded-dip', 'grip-strengthener',
  'assisted-pull-up-machine', 'assisted-dip-machine', 'assisted-chin-up-machine',
]);

interface SubtypeCacheEntry {
  slug: string;
  subtype: string;
  confidence: number;
  reasoning: string;
  source: 'llm' | 'manual';
}

interface Exercise {
  slug: string;
  name: string;
  name_vi: string;
}

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(`${ENDPOINT}?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as any;
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function main() {
  if (!GEMINI_KEY) {
    console.error('GEMINI_API_KEY chưa set');
    process.exit(1);
  }
  const cache = JSON.parse(await fs.readFile(CACHE_FILE, 'utf-8')) as Record<string, SubtypeCacheEntry>;

  // Target: confidence < 0.9
  const targets = Object.values(cache).filter((e) => e.confidence < 0.9);
  console.log(`Low-confidence entries to reclassify: ${targets.length}`);
  console.log('');

  if (targets.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  // Load full exercise info
  const slugs = targets.map((t) => t.slug);
  const exerciseMap = new Map<string, Exercise>();
  for (const slug of slugs) {
    try {
      const raw = await fs.readFile(path.join(EXERCISES_DIR, `${slug}.json`), 'utf-8');
      const ex = JSON.parse(raw);
      exerciseMap.set(slug, { slug, name: ex.name, name_vi: ex.name_vi });
    } catch {}
  }

  const inputs = [...exerciseMap.values()];

  const prompt = `Bạn là chuyên gia thể hình. Phân loại các bài tập sau về MACHINE SUBTYPE chính xác.

CONTROLLED VOCABULARY:
${[...VALID_SUBTYPES].map((s) => `- ${s}`).join('\n')}

INPUT (${inputs.length} bài):
${JSON.stringify(inputs, null, 2)}

OUTPUT: JSON array, mỗi entry:
{
  "slug": "<slug>",
  "subtype": "<chỉ chọn từ vocab>",
  "confidence": <0.0-1.0>,
  "reasoning": "<1 câu tiếng Việt>"
}

LƯU Ý:
- "assisted pull up/chin up/dip" → assisted-pull-up-machine / assisted-dip-machine
- "smith hip raise" hoặc "smith leg" / "smith squat" / "smith deadlift" → smith-squat
- "smith wrist curl" → smith-curl
- Bài "lever deadlift" → lever-hip-extension
- "lever kneeling twist" → lever-seated-crunch
- "lever reverse grip vertical row" → lever-seated-row`;

  console.log(`Calling Gemini (${inputs.length} inputs in 1 batch)...`);
  const response = await callGemini(prompt);
  const results = JSON.parse(response) as Array<{
    slug: string;
    subtype: string;
    confidence: number;
    reasoning: string;
  }>;

  console.log('');
  console.log('─ Re-classified entries ───────────────────────────────────────');
  let fixed = 0;
  let stillLow = 0;
  for (const r of results) {
    if (!VALID_SUBTYPES.has(r.subtype)) {
      console.log(`  ⚠ ${r.slug}: invalid subtype "${r.subtype}" — skip`);
      continue;
    }
    const old = cache[r.slug];
    cache[r.slug] = {
      slug: r.slug,
      subtype: r.subtype,
      confidence: r.confidence,
      reasoning: r.reasoning,
      source: 'llm',
    };
    const changed = old.subtype !== r.subtype;
    if (changed) fixed++;
    if (r.confidence < 0.7) stillLow++;
    console.log(
      `  ${changed ? '✓' : '·'} ${r.slug}: ${old.subtype} → ${r.subtype}  (conf ${r.confidence.toFixed(2)})`,
    );
  }

  if (APPLY) {
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
    console.log('');
    console.log(`Saved. Fixed: ${fixed}, Still low (<0.7): ${stillLow}`);
  } else {
    console.log('');
    console.log('Dry-run. Chạy --apply để ghi.');
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});