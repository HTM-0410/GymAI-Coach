/**
 * APPLY EQUIPMENT FIXES — GymAI Coach
 * ════════════════════════════════════════════════════════════════════════════════
 * Apply mismatches detected bởi `llm-map-equipment.ts` vào các file JSON trong
 * data/exercises/.
 *
 * Logic:
 *   - Đọc `.llm-mapping-cache.json` (cache từ LLM mapping)
 *   - Với mỗi entry có `is_mismatch=true`, map slug → name_vi từ catalog
 *   - Replace `equipment: [...]` trong data/exercises/<slug>.json
 *   - Confidence threshold: chỉ apply nếu ≥ MIN_CONFIDENCE (default 0.85)
 *
 * Usage:
 *   npx tsx scripts/apply-equipment-fixes.ts --dry-run          # xem trước, không ghi
 *   npx tsx scripts/apply-equipment-fixes.ts                     # apply thật
 *   npx tsx scripts/apply-equipment-fixes.ts --min-confidence 0.9
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { EQUIPMENT_CATALOG, buildVietnameseSlugMap } from '../data/equipment/equipment-catalog';

const ROOT = process.cwd();
const CACHE_FILE = path.join(ROOT, 'data/equipment/.llm-mapping-cache.json');
const EXERCISES_DIR = path.join(ROOT, 'data/exercises');

// ─── ARGS ────────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
const ALLOW_STALE_CACHE = process.argv.includes('--allow-stale-cache');
const _limitArg = process.argv.find((a) => a.startsWith('--limit'));
const _confArg = process.argv.find((a) => a.startsWith('--min-confidence'));
const MIN_CONFIDENCE = _confArg
  ? parseFloat(_confArg.split('=')[1] ?? '0.85')
  : 0.85;
const LIMIT = _limitArg ? parseInt(_limitArg.split('=')[1] ?? '0', 10) : Infinity;

// ─── SLUG → NAME_VI MAP ─────────────────────────────────────────────────────
const slugToNameVi = new Map<string, string>();
for (const row of EQUIPMENT_CATALOG) {
  slugToNameVi.set(row.slug, row.name_vi);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
interface CacheEntry {
  slug: string;
  confidence: number;
  reasoning: string;
  is_mismatch: boolean;
}

async function main() {
  if (!ALLOW_STALE_CACHE) {
    throw new Error(
      'Cache equipment cũ phân loại theo tên bài tập và có thể hoàn tác catalog vật lý. ' +
        'Hãy tạo cache mới với catalog hiện tại; chỉ dùng --allow-stale-cache khi audit có chủ đích.',
    );
  }
  const raw = await fs.readFile(CACHE_FILE, 'utf-8');
  const cache = JSON.parse(raw) as Record<string, CacheEntry>;

  const mismatches = Object.entries(cache)
    .filter(([_, e]) => e.is_mismatch && e.confidence >= MIN_CONFIDENCE)
    .slice(0, LIMIT);

  console.log('═'.repeat(70));
  console.log(`  APPLY EQUIPMENT FIXES${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log('═'.repeat(70));
  console.log(`Cache file:        ${CACHE_FILE}`);
  console.log(`Exercises dir:     ${EXERCISES_DIR}`);
  console.log(`Min confidence:    ${MIN_CONFIDENCE}`);
  console.log(`Total mismatches:  ${mismatches.length} (filtered from cache)`);
  console.log('');

  let applied = 0;
  let skipped = 0;
  let errors = 0;
  const log: string[] = [];

  for (const [exerciseSlug, entry] of mismatches) {
    const nameVi = slugToNameVi.get(entry.slug);
    if (!nameVi) {
      log.push(`  ✗ ${exerciseSlug}: slug "${entry.slug}" không có trong catalog`);
      errors++;
      continue;
    }

    const filePath = path.join(EXERCISES_DIR, `${exerciseSlug}.json`);
    let fileContent: string;
    try {
      fileContent = await fs.readFile(filePath, 'utf-8');
    } catch (err) {
      log.push(`  ✗ ${exerciseSlug}: file không tồn tại (${(err as Error).message})`);
      errors++;
      continue;
    }

    const exercise = JSON.parse(fileContent);
    const oldEquipment = (exercise.equipment as string[]) ?? [];
    const newEquipment = [nameVi];

    // Skip nếu đã đúng
    if (
      oldEquipment.length === 1 &&
      oldEquipment[0] === nameVi
    ) {
      log.push(`  · ${exerciseSlug}: đã đúng (${nameVi})`);
      skipped++;
      continue;
    }

    // Skip nếu equipment hiện tại chứa slug đề xuất (alias form)
    const aliasMap = buildVietnameseSlugMap();
    const currentSlug = aliasMap.get(oldEquipment[0] ?? '');
    if (currentSlug === entry.slug && oldEquipment.length === 1) {
      log.push(`  · ${exerciseSlug}: alias ok (${oldEquipment[0]} → ${entry.slug})`);
      skipped++;
      continue;
    }

    log.push(
      `  ${DRY_RUN ? '○' : '✓'} ${exerciseSlug}: [${oldEquipment.join(', ')}] → [${newEquipment.join(', ')}]  (conf ${entry.confidence})`,
    );

    if (!DRY_RUN) {
      try {
        exercise.equipment = newEquipment;
        // Cập nhật translation_status nếu cần
        if (exercise.translation_status === 'final') {
          // Giữ nguyên nếu đã final
        }
        const updated = JSON.stringify(exercise, null, 2) + '\n';
        await fs.writeFile(filePath, updated, 'utf-8');
        applied++;
      } catch (err) {
        log.push(`    ✗ Write failed: ${(err as Error).message}`);
        errors++;
      }
    } else {
      applied++;
    }
  }

  // ─── REPORT ───────────────────────────────────────────────────────────────
  console.log(log.join('\n'));
  console.log('');
  console.log('─'.repeat(70));
  console.log(`  RESULTS${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log('─'.repeat(70));
  console.log(`Processed: ${mismatches.length}`);
  console.log(`Applied:   ${applied}`);
  console.log(`Skipped:   ${skipped} (đã đúng / alias)`);
  console.log(`Errors:    ${errors}`);

  if (DRY_RUN && applied > 0) {
    console.log('');
    console.log(`  Chạy KHÔNG có --dry-run để apply ${applied} thay đổi.`);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
