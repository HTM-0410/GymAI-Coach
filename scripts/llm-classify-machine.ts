/**
 * LLM CLASSIFY MACHINE SUBTYPE — GymAI Coach
 * ════════════════════════════════════════════════════════════════════════════════
 * Phân loại chi tiết các bài tập hiện đang gán chung "Máy tập" / "Máy đòn bẩy" /
 * "Smith machine" về machine sub-type cụ thể.
 *
 * Controlled vocabulary (controlled vocab — hằng số):
 *   lever-chest-press | lever-shoulder-press | lever-seated-row | lever-pulldown
 *   lever-bicep-curl | lever-triceps-extension | lever-lateral-raise | ...
 *
 * Workflow:
 *   1. Thu thập exercises có equipment là Máy tập / Máy đòn bẩy / Smith / Plate
 *   2. Batch gửi Gemini (~20 bài/batch) kèm controlled vocab
 *   3. Cache vào data/equipment/.llm-machine-subtype-cache.json
 *   4. Dry-run preview trước khi apply
 *
 * Usage:
 *   npx tsx scripts/llm-classify-machine.ts --dry-run
 *   npx tsx scripts/llm-classify-machine.ts --limit 20
 *   npx tsx scripts/llm-classify-machine.ts --apply
 */

import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';
import { EQUIPMENT_CATALOG } from '../data/equipment/equipment-catalog';

const ROOT = process.cwd();
const EXERCISES_DIR = path.join(ROOT, 'data/exercises');
const CACHE_FILE = path.join(ROOT, 'data/equipment/.llm-machine-subtype-cache.json');

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

// ─── ARGS ────────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
const APPLY = process.argv.includes('--apply');
const _limitArg = process.argv.find((a) => a.startsWith('--limit'));
const LIMIT = _limitArg ? parseInt(_limitArg.split('=')[1] ?? '0', 10) : Infinity;

// ─── CONTROLLED VOCABULARY ───────────────────────────────────────────────────
export const MACHINE_SUBTYPES = [
  // Lever plate-loaded
  'lever-chest-press',
  'lever-incline-chest-press',
  'lever-decline-chest-press',
  'lever-shoulder-press',
  'lever-lateral-raise',
  'lever-reverse-fly',
  'lever-pulldown',
  'lever-seated-row',
  'lever-bent-over-row',
  'lever-t-bar-row',
  'lever-pullover',
  'lever-high-row',
  'lever-bicep-curl',
  'lever-preacher-curl',
  'lever-triceps-extension',
  'lever-seated-dip',
  'leg-extension',
  'leg-curl',
  'lever-calf-raise',
  'lever-calf-press',
  'lever-hip-abduction',
  'lever-hip-adduction',
  'lever-hip-extension',
  'lever-shrug',
  'lever-back-extension',
  'lever-seated-crunch',
  'lever-seated-good-morning',
  // Một Smith Machine vật lý hỗ trợ nhiều bài tập; không tách theo movement.
  'smith-machine',
  'grip-strengthener',
  'assisted-pull-up-machine',
  // Cardio machines
  'treadmill',
  'stationary-bike',
  'elliptical',
  'stepmill',
  'rowing-machine',
  'ski-erg',
  'stair-climber',
  'upper-body-ergometer',
  'assault-airbike',
] as const;

type MachineSubtype = (typeof MACHINE_SUBTYPES)[number];
const VALID_SUBTYPES = new Set<string>(MACHINE_SUBTYPES);

// ─── COLLECT TARGETS ─────────────────────────────────────────────────────────
interface TargetExercise {
  slug: string;
  name: string;
  name_vi: string;
  primary_muscle: string;
  currentEquipment: string;
}

async function collectTargets(): Promise<TargetExercise[]> {
  const files = (await fs.readdir(EXERCISES_DIR)).filter(
    (f) => f.endsWith('.json') && !f.endsWith('.sample.json'),
  );
  const targets: TargetExercise[] = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(EXERCISES_DIR, file), 'utf-8');
    const ex = JSON.parse(raw);
    const eq = (ex.equipment ?? []).flatMap((item: unknown) => {
      if (typeof item === 'string') return [item];
      if (item && typeof item === 'object') {
        const value = item as { vi?: unknown; en?: unknown };
        return [value.vi, value.en].filter((x): x is string => typeof x === 'string');
      }
      return [];
    });

    // Chỉ target những bài hiện đang ở "Máy tập" / "Máy đòn bẩy" / "Smith" / etc.
    const machineTerms = ['máy tập', 'máy đòn bẩy', 'máy smith', 'smith machine'];
    const isMachine = eq.some((e) =>
      machineTerms.some((term) => e.toLowerCase().includes(term)),
    );
    if (!isMachine) continue;

    targets.push({
      slug: ex.slug,
      name: ex.name,
      name_vi: ex.name_vi,
      primary_muscle: ex.primary_muscle ?? '',
      currentEquipment: eq.join(', '),
    });
  }
  return targets;
}

// ─── LLM CALL ────────────────────────────────────────────────────────────────
async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(`${ENDPOINT}?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
interface SubtypeCacheEntry {
  slug: string;
  subtype: string;
  confidence: number;
  reasoning: string;
  source: 'llm' | 'fallback';
}

async function main() {
  if (!GEMINI_KEY) {
    console.error('GEMINI_API_KEY chưa set trong .env.local');
    process.exit(1);
  }

  // 1. Load existing cache
  let cache: Record<string, SubtypeCacheEntry> = {};
  try {
    cache = JSON.parse(await fs.readFile(CACHE_FILE, 'utf-8'));
  } catch {}

  // 2. Collect targets
  const targets = await collectTargets();
  const todo = targets.filter((t) => !cache[t.slug]).slice(0, LIMIT);

  console.log('Total existing cache:', Object.keys(cache).length);

  console.log('═'.repeat(70));
  console.log(`  LLM MACHINE SUBTYPE CLASSIFIER${DRY_RUN ? ' (DRY RUN)' : APPLY ? ' (APPLY)' : ''}`);
  console.log('═'.repeat(70));
  console.log(`Total machine exercises: ${targets.length}`);
  console.log(`Already cached:          ${targets.length - todo.length}`);
  console.log(`To classify this run:    ${todo.length}`);
  console.log('');

  if (!DRY_RUN && todo.length > 0 && !APPLY) {
    console.log('  → Chạy --dry-run để preview, hoặc --apply để ghi cache.');
    return;
  }

  const BATCH_SIZE = 20;
  const batches: TargetExercise[][] = [];
  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    batches.push(todo.slice(i, i + BATCH_SIZE));
  }

  console.log(`Total batches: ${batches.length} (size ${BATCH_SIZE})`);
  console.log('');

  // 3. Process each batch
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`[Batch ${i + 1}/${batches.length}] ${batch.length} bài...`);

    const prompt = buildPrompt(batch);
    try {
      const response = await callGemini(prompt);
      const results = JSON.parse(response) as Array<{
        slug: string;
        subtype: string;
        confidence: number;
        reasoning: string;
      }>;

      for (const r of results) {
        if (!VALID_SUBTYPES.has(r.subtype)) {
          console.warn(`  ⚠ ${r.slug}: invalid subtype "${r.subtype}" → skip`);
          continue;
        }
        cache[r.slug] = {
          slug: r.slug,
          subtype: r.subtype,
          confidence: r.confidence,
          reasoning: r.reasoning,
          source: 'llm',
        };
      }
    } catch (err) {
      console.error(`  ✗ Batch failed: ${(err as Error).message}`);
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 1000));
  }

  // 4. Save cache
  if (APPLY) {
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
    console.log(`\nCache saved: ${CACHE_FILE}`);
  }

  // 5. Stats
  const subtypeCounts = new Map<string, number>();
  for (const entry of Object.values(cache)) {
    subtypeCounts.set(entry.subtype, (subtypeCounts.get(entry.subtype) ?? 0) + 1);
  }
  console.log('\n─ Subtype Distribution ────────────────────────────────────────');
  for (const [st, count] of [...subtypeCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(4)}  ${st}`);
  }
}

function buildPrompt(batch: TargetExercise[]): string {
  const input = batch.map((t) => ({
    slug: t.slug,
    name: t.name,
    name_vi: t.name_vi,
    primary_muscle: t.primary_muscle,
  }));

  return `Bạn là chuyên gia thể hình. Phân loại các bài tập về MACHINE SUBTYPE cụ thể.

CONTROLLED VOCABULARY (chỉ chọn từ đây):
${MACHINE_SUBTYPES.map((s) => `- ${s}`).join('\n')}

INPUT (${input.length} bài):
${JSON.stringify(input, null, 2)}

OUTPUT: JSON array, mỗi entry có schema:
{
  "slug": "<exercise slug>",
  "subtype": "<chỉ chọn từ controlled vocabulary>",
  "confidence": <0.0-1.0>,
  "reasoning": "<1 câu tiếng Việt ngắn>"
}

LƯU Ý:
- Phân loại theo THIẾT BỊ VẬT LÝ, không biến tên bài tập thành thiết bị mới.
- slug bắt đầu "lever-" → chỉ chọn lever-* khi đó thực sự là một máy đòn bẩy chuyên dụng.
- mọi bài chứa "smith" → luôn dùng smith-machine.
- assisted pull-up, chin-up và dip → cùng dùng assisted-pull-up-machine.
- cardio machines → dùng cardio subtype
- Không chắc thiết bị vật lý nào → không được tự chế subtype; chọn phần cứng gần nhất trong vocab với confidence thấp.
- Tất cả bài "lever triceps extension", "lever bicep curl", etc. → dùng đúng subtype tương ứng trong vocab`;
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
