/**
 * REFACTOR EQUIPMENT → DUAL LOOKUP — GymAI Coach
 * �═══════════════════════════════════════════════════════════════════════════════
 * Refactor `equipment: string[]` thành `equipment: [{ vi, en }[]` cho tất cả bài
 * tập đã resolve được.
 *
 * Skip:
 *   - Equipment không resolve được (sẽ giữ string cũ + flag trong report)
 *   - Equipment đã ở dạng {vi, en} (idempotent)
 *
 * Usage:
 *   npx tsx scripts/refactor-equipment-dual.ts --dry-run    # xem trước
 *   npx tsx scripts/refactor-equipment-dual.ts               # apply thật
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveEquipment, getCanonical } from '../data/equipment/equipment-resolver';

const ROOT = process.cwd();
const EXERCISES_DIR = path.join(ROOT, 'data/exercises');
const REPORT_PATH = path.join(ROOT, 'agent-tools/refactor-equipment-report.json');

const DRY_RUN = process.argv.includes('--dry-run');

interface DualEquipment {
  vi: string;
  en: string;
}

async function main() {
  const files = (await fs.readdir(EXERCISES_DIR)).filter(
    (f) => f.endsWith('.json') && !f.endsWith('.sample.json'),
  );

  let total = 0;
  let refactored = 0;
  let skippedAlreadyDual = 0;
  let unresolved = 0;
  const unresolvedList: Array<{ slug: string; equipment: string }> = [];

  for (const file of files) {
    const filePath = path.join(EXERCISES_DIR, file);
    const raw = await fs.readFile(filePath, 'utf-8');
    const ex = JSON.parse(raw);
    total++;

    const current = (ex.equipment as unknown[]) ?? [];
    if (current.length === 0) continue;

    // Check nếu đã là dual format
    const isDual = current.every(
      (e) => typeof e === 'object' && e !== null && 'vi' in e && 'en' in e,
    );
    if (isDual) {
      skippedAlreadyDual++;
      continue;
    }

    // Refactor từng string → dual
    const newEquipment: DualEquipment[] = [];
    let fileUnresolved = 0;
    for (const item of current) {
      if (typeof item !== 'string') {
        // Edge case: không phải string, không phải object → skip
        fileUnresolved++;
        continue;
      }
      const resolved = resolveEquipment(item);
      if (resolved) {
        newEquipment.push({ vi: resolved.vi, en: resolved.en });
      } else {
        // Không resolve được → giữ string cũ + flag
        fileUnresolved++;
        unresolvedList.push({ slug: ex.slug, equipment: item });
      }
    }

    if (fileUnresolved > 0) unresolved++;
    if (newEquipment.length === 0) continue;

    ex.equipment = newEquipment;
    refactored++;

    if (!DRY_RUN) {
      const updated = JSON.stringify(ex, null, 2) + '\n';
      await fs.writeFile(filePath, updated, 'utf-8');
    }
  }

  // ─── REPORT ────────────────────────────────────────────────────────────────
  console.log('═'.repeat(70));
  console.log(`  REFACTOR EQUIPMENT → DUAL LOOKUP${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log('═'.repeat(70));
  console.log(`Total files:           ${total}`);
  console.log(`Refactored:            ${refactored}`);
  console.log(`Skipped (already dual):${skippedAlreadyDual}`);
  console.log(`Unresolved files:      ${unresolved}`);
  console.log('');

  if (unresolved > 0) {
    console.log('─ Unresolved Equipment (cần manual review) ───────────────────');
    const grouped = new Map<string, string[]>();
    for (const { slug, equipment } of unresolvedList) {
      if (!grouped.has(equipment)) grouped.set(equipment, []);
      grouped.get(equipment)!.push(slug);
    }
    for (const [eq, slugs] of grouped) {
      console.log(`  ✗ "${eq}" — ${slugs.length} bài: ${slugs.slice(0, 3).join(', ')}${slugs.length > 3 ? '...' : ''}`);
    }
    console.log('');
  }

  if (DRY_RUN && refactored > 0) {
    console.log(`  Chạy KHÔNG có --dry-run để refactor ${refactored} files.`);
  }

  // Save report
  await fs.writeFile(
    REPORT_PATH,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        dry_run: DRY_RUN,
        total,
        refactored,
        skippedAlreadyDual,
        unresolved,
        unresolvedList,
      },
      null,
      2,
    ),
    'utf-8',
  );
  console.log(`Report saved: ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});