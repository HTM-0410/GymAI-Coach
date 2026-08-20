/**
 * APPLY MACHINE SUBTYPE — GymAI Coach
 * ════════════════════════════════════════════════════════════════════════════════
 * Apply LLM-classified machine subtype vào data/exercises/*.json.
 *
 * Replace `equipment: ["Máy tập"]` bằng `equipment: [{ vi: "<name_vi>", en: "<name>" }]`
 * của sub-type tương ứng.
 *
 * Usage:
 *   npx tsx scripts/apply-machine-subtype.ts --dry-run
 *   npx tsx scripts/apply-machine-subtype.ts --apply
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { EQUIPMENT_CATALOG } from '../data/equipment/equipment-catalog';

const ROOT = process.cwd();
const CACHE_FILE = path.join(ROOT, 'data/equipment/.llm-machine-subtype-cache.json');
const EXERCISES_DIR = path.join(ROOT, 'data/exercises');

const DRY_RUN = process.argv.includes('--dry-run');
const APPLY = process.argv.includes('--apply');

interface SubtypeCacheEntry {
  slug: string;
  subtype: string;
  confidence: number;
  reasoning: string;
  source: 'llm' | 'manual';
}

// Build slug → catalog row
const slugToRow = new Map<string, EquipmentCatalogRow>();
for (const row of EQUIPMENT_CATALOG) {
  slugToRow.set(row.slug, row);
}

interface EquipmentCatalogRow {
  slug: string;
  name: string;
  name_vi: string;
  category: string;
  description_vi: string;
  aliases_vi?: string[];
  aliases_en?: string[];
}

async function main() {
  // 1. Load subtype cache
  const raw = await fs.readFile(CACHE_FILE, 'utf-8');
  const cache = JSON.parse(raw) as Record<string, SubtypeCacheEntry>;

  console.log('═'.repeat(70));
  console.log(`  APPLY MACHINE SUBTYPE${DRY_RUN ? ' (DRY RUN)' : APPLY ? ' (APPLY)' : ''}`);
  console.log('═'.repeat(70));
  console.log(`Cache entries: ${Object.keys(cache).length}`);
  console.log('');

  if (!DRY_RUN && !APPLY) {
    console.log('  → Chạy --dry-run để preview, hoặc --apply để ghi.');
    return;
  }

  let applied = 0;
  let skipped = 0;
  let errors = 0;
  const errorList: string[] = [];

  for (const [exerciseSlug, entry] of Object.entries(cache)) {
    // Chuẩn hoá theo thiết bị vật lý, không theo tên bài tập/movement.
    const canonicalSubtype = entry.subtype.startsWith('smith-')
      ? 'smith-machine'
      : ['assisted-pull-up-machine', 'assisted-chin-up-machine', 'assisted-dip-machine'].includes(entry.subtype)
        ? 'assisted-pull-up-machine'
        : entry.subtype === 'glute-ham-raise'
          ? 'ghd'
          : entry.subtype;
    const row = slugToRow.get(canonicalSubtype);
    if (!row) {
      errorList.push(`${exerciseSlug}: sub-type "${entry.subtype}" không có trong catalog`);
      errors++;
      continue;
    }

    const filePath = path.join(EXERCISES_DIR, `${exerciseSlug}.json`);
    let fileContent: string;
    try {
      fileContent = await fs.readFile(filePath, 'utf-8');
    } catch {
      errorList.push(`${exerciseSlug}: file không tồn tại`);
      errors++;
      continue;
    }

    const exercise = JSON.parse(fileContent);
    const oldEquipment = exercise.equipment as string[];
    const newEquipment = [{ vi: row.name_vi, en: row.name }];

    // Skip nếu đã đúng
    if (
      Array.isArray(oldEquipment) &&
      oldEquipment.length === 1 &&
      typeof oldEquipment[0] === 'object' &&
      (oldEquipment[0] as any).en === row.name
    ) {
      skipped++;
      continue;
    }

    console.log(
      `  ${DRY_RUN ? '○' : '✓'} ${exerciseSlug}: ${JSON.stringify(oldEquipment)} → ${JSON.stringify(newEquipment)}`,
    );

    if (APPLY) {
      exercise.equipment = newEquipment;
      const updated = JSON.stringify(exercise, null, 2) + '\n';
      await fs.writeFile(filePath, updated, 'utf-8');
      applied++;
    } else {
      applied++;
    }
  }

  // ─── REPORT ────────────────────────────────────────────────────────────────
  console.log('');
  console.log('─'.repeat(70));
  console.log(`  RESULTS${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log('─'.repeat(70));
  console.log(`Applied:  ${applied}`);
  console.log(`Skipped:  ${skipped} (đã đúng)`);
  console.log(`Errors:   ${errors}`);

  if (errors > 0) {
    console.log('');
    console.log('Errors:');
    for (const e of errorList) console.log(`  ✗ ${e}`);
  }

  if (DRY_RUN && applied > 0) {
    console.log('');
    console.log(`  Chạy với --apply để ghi ${applied} thay đổi vào files.`);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
