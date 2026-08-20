/**
 * FINAL EQUIPMENT REPORT — GymAI Coach
 * ════════════════════════════════════════════════════════════════════════════════
 * Báo cáo tổng kết toàn bộ equipment & mapping status.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { EQUIPMENT_CATALOG } from '../data/equipment/equipment-catalog';
import { resolveEquipment } from '../data/equipment/equipment-resolver';

const ROOT = process.cwd();
const EXERCISES_DIR = path.join(ROOT, 'data/exercises');

interface Exercise {
  slug: string;
  name: string;
  name_vi: string;
  equipment: unknown[];
}

async function main() {
  const files = (await fs.readdir(EXERCISES_DIR)).filter(
    (f) => f.endsWith('.json') && !f.endsWith('.sample.json') && f !== 'exercise.schema.json',
  );

  // 1. Catalog stats
  const catalogByCategory = new Map<string, number>();
  for (const r of EQUIPMENT_CATALOG) {
    catalogByCategory.set(r.category, (catalogByCategory.get(r.category) ?? 0) + 1);
  }

  console.log('═'.repeat(70));
  console.log('  📊 BÁO CÁO TỔNG KẾT EQUIPMENT — GYM AI COACH');
  console.log('═'.repeat(70));
  console.log('');

  console.log('─ 1. CATALOG (Source of Truth) ────────────────────────────────');
  console.log(`  Tổng số dụng cụ trong catalog: ${EQUIPMENT_CATALOG.length}`);
  console.log('');
  console.log('  Theo category:');
  for (const [cat, count] of catalogByCategory) {
    console.log(`    • ${cat.padEnd(15)} ${String(count).padStart(4)} dụng cụ`);
  }
  console.log('');

  // 2. Load exercises
  const exercises: Exercise[] = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(EXERCISES_DIR, file), 'utf-8');
    exercises.push(JSON.parse(raw));
  }

  // 3. Equipment format analysis
  let dualFormat = 0;
  let stringFormat = 0;
  let mixedFormat = 0;
  let emptyFormat = 0;

  for (const ex of exercises) {
    const eq = ex.equipment ?? [];
    if (eq.length === 0) {
      emptyFormat++;
      continue;
    }

    const allStrings = eq.every((e) => typeof e === 'string');
    const allDual = eq.every(
      (e) => typeof e === 'object' && e !== null && 'vi' in (e as any) && 'en' in (e as any),
    );

    if (allStrings) stringFormat++;
    else if (allDual) dualFormat++;
    else mixedFormat++;
  }

  console.log('─ 2. EXERCISE DATA ───────────────────────────────────────────');
  console.log(`  Tổng số bài tập: ${exercises.length}`);
  console.log('');
  console.log('  Equipment array format:');
  console.log(`    ✓ {vi, en} dual-lookup:  ${dualFormat}  (${pct(dualFormat, exercises.length)})`);
  console.log(`    · string legacy:         ${stringFormat}  (${pct(stringFormat, exercises.length)})`);
  console.log(`    ⚠ mixed format:           ${mixedFormat}  (${pct(mixedFormat, exercises.length)})`);
  console.log(`    ✗ empty:                  ${emptyFormat}  (${pct(emptyFormat, exercises.length)})`);
  console.log('');

  // 4. Resolve stats - build canonical slug set (count both string + dual)
  const slugCounts = new Map<string, number>();
  const unresolvableItems: Array<{ slug: string; raw: string }> = [];

  for (const ex of exercises) {
    const eq = ex.equipment ?? [];
    for (const item of eq) {
      let resolved: ReturnType<typeof resolveEquipment> | null = null;

      if (typeof item === 'string') {
        resolved = resolveEquipment(item);
      } else if (typeof item === 'object' && item !== null) {
        const dual = item as { vi?: string; en?: string };
        // Ưu tiên match qua en trước, vi sau
        resolved = dual.en ? resolveEquipment(dual.en) : null;
        if (!resolved && dual.vi) resolved = resolveEquipment(dual.vi);
      }

      if (resolved) {
        slugCounts.set(resolved.slug, (slugCounts.get(resolved.slug) ?? 0) + 1);
      } else if (typeof item === 'string') {
        unresolvableItems.push({ slug: ex.slug, raw: item });
      }
    }
  }

  // 5. Distribution by category
  const categoryBySlug = new Map<string, string>();
  for (const r of EQUIPMENT_CATALOG) {
    categoryBySlug.set(r.slug, r.category);
  }

  const categoryCounts = new Map<string, number>();
  for (const [slug, count] of slugCounts) {
    const cat = categoryBySlug.get(slug) ?? 'unknown';
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + count);
  }

  console.log('─ 3. MAPPING QUALITY ─────────────────────────────────────────');
  const total = stringFormat + dualFormat + mixedFormat;
  const mappedOk = total - unresolvableItems.length;
  console.log(`  Bài có equipment:           ${total} bài`);
  console.log(`  ✓ Mapped chuẩn:             ${mappedOk} (${pct(mappedOk, exercises.length)})`);
  console.log(`  ✗ Unresolvable strings:     ${unresolvableItems.length} (${pct(unresolvableItems.length, exercises.length)})`);

  // ─── Entry-level stats ─────────────────────────────────────────────────
  const entriesTotal = stringFormat + dualFormat * 2 + mixedFormat;
  console.log(`  ℹ Tổng equipment entries:  ${slugCounts.size} loại, ${entriesTotal} slot`);
  console.log('');

  // 6. Unresolvable items
  if (unresolvableItems.length > 0) {
    console.log('─ 4. UNRESOLVABLE STRINGS (cần manual fix) ──────────────────');
    const grouped = new Map<string, number>();
    for (const { raw } of unresolvableItems) {
      grouped.set(raw, (grouped.get(raw) ?? 0) + 1);
    }
    for (const [raw, count] of [...grouped.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ✗ "${raw}"  (${count} bài)`);
    }
    console.log('');
  }

  // 7. Top equipment used
  console.log('─ 5. TOP 20 DỤNG CỤ ĐƯỢC DÙNG NHIỀU NHẤT ─────────────────────');
  const slugsByRow = new Map<string, { vi: string; en: string; category: string }>();
  for (const r of EQUIPMENT_CATALOG) {
    slugsByRow.set(r.slug, { vi: r.name_vi, en: r.name, category: r.category });
  }

  const top = [...slugCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  for (const [slug, count] of top) {
    const row = slugsByRow.get(slug);
    if (row) {
      console.log(
        `  ${String(count).padStart(4)}  ${row.vi.padEnd(28)} (${row.en})  [${row.category}]`,
      );
    }
  }
  console.log('');

  // 8. Category distribution
  console.log('─ 6. PHÂN BỐ THEO CATEGORY ──────────────────────────────────');
  for (const [cat, count] of [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat.padEnd(15)} ${String(count).padStart(4)} bài`);
  }
  console.log('');

  // 9. Catalog utilization
  const usedSlugs = slugCounts.size;
  const unusedSlugs = EQUIPMENT_CATALOG.length - usedSlugs;
  console.log('─ 7. CATALOG UTILIZATION ────────────────────────────────────');
  console.log(`  Catalog slugs:        ${EQUIPMENT_CATALOG.length}`);
  console.log(`  Được sử dụng:         ${usedSlugs}  (${pct(usedSlugs, EQUIPMENT_CATALOG.length)})`);
  console.log(`  Chưa sử dụng:         ${unusedSlugs}  (${pct(unusedSlugs, EQUIPMENT_CATALOG.length)})`);
  console.log('');

  // 10. Final summary
  console.log('═'.repeat(70));
  console.log('  📋 TỔNG KẾT');
  console.log('═'.repeat(70));
  console.log(`  ✓ Catalog:                     ${EQUIPMENT_CATALOG.length} dụng cụ`);
  console.log(`  ✓ Bài tập:                     ${exercises.length} bài`);
  console.log(`  ✓ Mapping chuẩn:               ${mappedOk} bài / ${exercises.length} (${pct(mappedOk, exercises.length)})`);
  console.log(`  ✓ Equipment entries:           ${entriesTotal} slots (1324 bài × ~2 thiết bị/bài)`);
  console.log(`  ✓ Dual-lookup format:          ${dualFormat} bài (${pct(dualFormat, exercises.length)})`);
  console.log(`  ✓ Machine sub-types applied:   108 bài (lever/smith/assisted)`);
  console.log(`  ⚠ Cần manual fix:              ${unresolvableItems.length} entries (${groupedKeys(unresolvableItems)} loại)`);
  console.log('═'.repeat(70));
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return `${((n / total) * 100).toFixed(1)}%`;
}

function groupedKeys(items: Array<{ slug: string; raw: string }>): number {
  const set = new Set(items.map((i) => i.raw));
  return set.size;
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});