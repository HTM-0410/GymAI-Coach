/**
 * REFACTOR STRING → DUAL FORMAT — GymAI Coach
 * ════════════════════════════════════════════════════════════════════════════════
 * Refactor 1194 bài có equipment[] dạng string legacy sang dạng {vi, en} đồng bộ.
 *
 * Strategy:
 *   - Với mỗi string trong equipment[], dùng resolveEquipment() lấy {en, vi}
 *   - Ghi lại file với array [{vi, en}] mới
 *   - Confidence <1.0 vẫn ghi nhưng flag để review
 *   - Resolver null → giữ string nguyên (đã verified 0 unresolvable nên không xảy ra)
 *
 * Usage:
 *   npx tsx scripts/refactor-string-to-dual.ts --dry-run
 *   npx tsx scripts/refactor-string-to-dual.ts --apply
 *   npx tsx scripts/refactor-string-to-dual.ts --only-low-confidence  (refactor riêng low-conf)
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveEquipment } from '../data/equipment/equipment-resolver';

const ROOT = process.cwd();
const EXERCISES_DIR = path.join(ROOT, 'data/exercises');

const DRY_RUN = process.argv.includes('--dry-run');
const APPLY = process.argv.includes('--apply');
const ONLY_LOW_CONF = process.argv.includes('--only-low-confidence');

// ─── Stats ────────────────────────────────────────────────────────────────────
let totalFiles = 0;
let scannedFiles = 0;
let stringFiles = 0;
let refactored = 0;
let skippedAlreadyDual = 0;
let skippedEmpty = 0;
let skippedSchema = 0;
let errorCount = 0;

let entriesTotal = 0;
let entriesHighConf = 0;
let entriesLowConf = 0;
let entriesUnresolvable = 0;

const unresolvableList: Array<{ file: string; str: string }> = [];
const lowConfList: Array<{ file: string; old: string; new: { vi: string; en: string }; conf: number }> = [];

async function main() {
  const files = (await fs.readdir(EXERCISES_DIR)).filter(
    (f) => f.endsWith('.json') && !f.endsWith('.sample.json'),
  );
  totalFiles = files.length;

  console.log('═'.repeat(72));
  console.log(`  REFACTOR STRING → DUAL FORMAT${DRY_RUN ? ' (DRY RUN)' : APPLY ? ' (APPLY)' : ''}`);
  if (ONLY_LOW_CONF) console.log('  MODE: chỉ refactor low-confidence');
  console.log('═'.repeat(72));
  console.log(`Total files: ${totalFiles}`);
  console.log('');

  if (!DRY_RUN && !APPLY) {
    console.log('  → Chạy --dry-run để preview, hoặc --apply để ghi.');
    return;
  }

  for (const file of files) {
    scannedFiles++;

    // Skip schema
    if (file === 'exercise.schema.json') {
      skippedSchema++;
      continue;
    }

    const filePath = path.join(EXERCISES_DIR, file);
    const raw = await fs.readFile(filePath, 'utf-8');

    let ex: any;
    try {
      ex = JSON.parse(raw);
    } catch {
      errorCount++;
      console.log(`  ✗ ${file}: JSON parse error`);
      continue;
    }

    const eq = ex.equipment;

    // Skip nếu không có equipment
    if (!Array.isArray(eq)) {
      skippedEmpty++;
      continue;
    }

    // Skip nếu đã là dual format
    const hasString = eq.some((e: any) => typeof e === 'string');
    const hasDual = eq.some((e: any) => typeof e === 'object' && e !== null);
    if (!hasString) {
      skippedAlreadyDual++;
      continue;
    }
    if (hasDual && hasString) {
      console.log(`  ⚠ ${file}: mixed format, bỏ qua (cần manual fix)`);
      continue;
    }

    stringFiles++;

    // Refactor từng string entry
    const newEq: Array<{ vi: string; en: string }> = [];
    let fileChanged = false;
    let fileUnresolvable = false;

    for (const entry of eq) {
      if (typeof entry !== 'string') {
        // Giữ nguyên dual entry (không xảy ra trong case này)
        newEq.push(entry);
        continue;
      }

      entriesTotal++;

      if (entry.trim() === '') {
        // Empty string → bỏ qua
        continue;
      }

      const resolved = resolveEquipment(entry);

      if (!resolved) {
        entriesUnresolvable++;
        fileUnresolvable = true;
        unresolvableList.push({ file, str: entry });
        // Giữ string nguyên
        newEq.push(entry as any);
        continue;
      }

      const isLowConf = resolved.confidence < 1.0;
      if (isLowConf) {
        entriesLowConf++;
        lowConfList.push({
          file,
          old: entry,
          new: { vi: resolved.vi, en: resolved.en },
          conf: resolved.confidence,
        });
      } else {
        entriesHighConf++;
      }

      newEq.push({ vi: resolved.vi, en: resolved.en });
      fileChanged = true;
    }

    // Bỏ qua nếu không có gì thay đổi
    if (!fileChanged) {
      if (fileUnresolvable) {
        console.log(`  · ${file}: có unresolvable strings, giữ nguyên`);
      }
      continue;
    }

    if (ONLY_LOW_CONF && !fileChanged) continue;

    if (APPLY) {
      ex.equipment = newEq;
      await fs.writeFile(filePath, JSON.stringify(ex, null, 2) + '\n', 'utf-8');
    }

    refactored++;

    if (refactored <= 5 || refactored % 100 === 0) {
      const marker = APPLY ? '✓' : '○';
      console.log(`  ${marker} ${file} (${newEq.length} entries${fileUnresolvable ? ', có unresolvable' : ''})`);
    }
  }

  // ─── Report ─────────────────────────────────────────────────────────────
  console.log('');
  console.log('─'.repeat(72));
  console.log(`  RESULTS${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log('─'.repeat(72));
  console.log(`Files scanned:        ${scannedFiles}`);
  console.log(`Schema skipped:       ${skippedSchema}`);
  console.log(`Already dual:         ${skippedAlreadyDual}`);
  console.log(`Empty/no equipment:   ${skippedEmpty}`);
  console.log(`String files:         ${stringFiles}`);
  console.log(`Refactored:           ${refactored}`);
  console.log(`Errors:               ${errorCount}`);
  console.log('');
  console.log('Entry-level:');
  console.log(`  Total:              ${entriesTotal}`);
  console.log(`  High-conf (1.0):    ${entriesHighConf}`);
  console.log(`  Low-conf (<1.0):    ${entriesLowConf}`);
  console.log(`  Unresolvable:       ${entriesUnresolvable}`);
  console.log('');

  if (unresolvableList.length > 0) {
    console.log('⚠ Unresolvable strings:');
    for (const u of unresolvableList.slice(0, 20)) {
      console.log(`  [${u.file}] "${u.str}"`);
    }
    if (unresolvableList.length > 20) console.log(`  ... và ${unresolvableList.length - 20} nữa`);
    console.log('');
  }

  if (lowConfList.length > 0 && !ONLY_LOW_CONF) {
    console.log(`📋 Low-confidence (${lowConfList.length} entries):`);
    const byString = new Map<string, number>();
    for (const l of lowConfList) {
      const k = `"${l.old}" → "${l.new.en}" (${l.conf})`;
      byString.set(k, (byString.get(k) ?? 0) + 1);
    }
    const sorted = [...byString.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
    for (const [k, c] of sorted) {
      console.log(`  ${String(c).padStart(3)} × ${k}`);
    }
    if (byString.size > 15) console.log(`  ... và ${byString.size - 15} loại khác`);
    console.log('');
  }

  if (DRY_RUN && refactored > 0) {
    console.log(`  → Chạy --apply để ghi ${refactored} thay đổi vào files.`);
  }

  console.log('═'.repeat(72));
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});