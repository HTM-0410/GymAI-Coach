/**
 * MIGRATION VERIFICATION — GymAI Coach
 * ════════════════════════════════════════════════════════════════════════════════
 * Verify migration to dual {vi, en} format đã chu�n chưa:
 *   - Schema đúng (đủ field vi, en, đúng kiểu string)
 *   - Catalog-resolvable (vi/en khớp với catalog rows)
 *   - Không có orphan strings
 *   - Không có missing fields
 *   - Không có mixed-format entries
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { EQUIPMENT_CATALOG } from '../data/equipment/equipment-catalog';
import { resolveEquipment } from '../data/equipment/equipment-resolver';

const ROOT = process.cwd();
const EXERCISES_DIR = path.join(ROOT, 'data/exercises');

interface Exercise {
  slug: string;
  equipment?: unknown;
}

interface DualEntry {
  vi?: unknown;
  en?: unknown;
  slug?: unknown;
}

const issues: Array<{ file: string; kind: string; detail: string }> = [];
let totalFiles = 0;

async function main() {
  const files = (await fs.readdir(EXERCISES_DIR)).filter(
    (f) => f.endsWith('.json') && !f.endsWith('.sample.json') && f !== 'exercise.schema.json',
  );
  totalFiles = files.length;

  // Build catalog lookup maps
  const byVi = new Map<string, string>();
  const byEn = new Map<string, string>();
  const bySlug = new Map<string, { vi: string; en: string }>();

  for (const r of EQUIPMENT_CATALOG) {
    byVi.set(r.name_vi, r.slug);
    byEn.set(r.name, r.slug);
    bySlug.set(r.slug, { vi: r.name_vi, en: r.name });
  }

  // ─── Counters ────────────────────────────────────────────────────────────
  let totalExercises = 0;
  let withDualOnly = 0;
  let withStringOnly = 0;
  let withMixed = 0;
  let withEmpty = 0;
  let withEmptyArray = 0;

  let dualEntriesTotal = 0;
  let stringEntriesTotal = 0;
  let dualValid = 0;
  let dualOrphan = 0;
  let stringValid = 0;
  let stringOrphan = 0;
  let dualMissingVi = 0;
  let dualMissingEn = 0;
  let dualWrongType = 0;
  let stringEmpty = 0;

  for (const file of files) {
    const filePath = path.join(EXERCISES_DIR, file);
    const raw = await fs.readFile(filePath, 'utf-8');
    const ex = JSON.parse(raw) as Exercise;
    totalExercises++;

    const eq = ex.equipment;

    if (eq === undefined || eq === null) {
      withEmpty++;
      issues.push({ file, kind: 'NO_EQUIPMENT_KEY', detail: 'equipment field missing' });
      continue;
    }

    if (!Array.isArray(eq)) {
      issues.push({ file, kind: 'NOT_ARRAY', detail: `equipment is ${typeof eq}` });
      continue;
    }

    if (eq.length === 0) {
      withEmptyArray++;
      continue;
    }

    // Classify each entry
    let hasString = false;
    let hasDual = false;

    for (let i = 0; i < eq.length; i++) {
      const entry = eq[i];
      if (typeof entry === 'string') {
        hasString = true;
        stringEntriesTotal++;

        if (entry.trim() === '') {
          stringEmpty++;
          issues.push({
            file,
            kind: 'EMPTY_STRING',
            detail: `equipment[${i}] is empty string`,
          });
          continue;
        }

        const resolved = resolveEquipment(entry);
        if (resolved) stringValid++;
        else {
          stringOrphan++;
          issues.push({
            file,
            kind: 'ORPHAN_STRING',
            detail: `equipment[${i}]="${entry}" không match catalog`,
          });
        }
      } else if (typeof entry === 'object' && entry !== null) {
        hasDual = true;
        dualEntriesTotal++;

        const d = entry as DualEntry;

        // Type checks
        if (typeof d.vi !== 'string' || (d.vi as string).trim() === '') {
          dualMissingVi++;
          issues.push({
            file,
            kind: 'DUAL_MISSING_VI',
            detail: `equipment[${i}] missing/wrong vi field: ${JSON.stringify(d)}`,
          });
          continue;
        }
        if (typeof d.en !== 'string' || (d.en as string).trim() === '') {
          dualMissingEn++;
          issues.push({
            file,
            kind: 'DUAL_MISSING_EN',
            detail: `equipment[${i}] missing/wrong en field: ${JSON.stringify(d)}`,
          });
          continue;
        }

        const slugVi = byVi.get(d.vi as string);
        const slugEn = byEn.get(d.en as string);

        if (slugVi && slugEn && slugVi === slugEn) {
          dualValid++;
        } else {
          dualOrphan++;
          issues.push({
            file,
            kind: 'DUAL_ORPHAN',
            detail: `equipment[${i}]=${JSON.stringify(d)} vi→${slugVi ?? 'NULL'} en→${slugEn ?? 'NULL'}`,
          });
        }
      } else {
        dualWrongType++;
        issues.push({
          file,
          kind: 'WRONG_TYPE',
          detail: `equipment[${i}] is ${typeof entry}`,
        });
      }
    }

    if (hasString && hasDual) withMixed++;
    else if (hasString) withStringOnly++;
    else if (hasDual) withDualOnly++;
  }

  // ─── Print report ────────────────────────────────────────────────────────
  console.log('═'.repeat(72));
  console.log('  MIGRATION VERIFICATION REPORT — Equipment Dual-Format');
  console.log('═'.repeat(72));
  console.log('');
  console.log('─ Files scanned ────────────────────────────────────────────────────');
  console.log(`  Tổng files:        ${totalFiles}`);
  console.log(`  Exercises parsed:  ${totalExercises}`);
  console.log('');
  console.log('─ Format distribution ──────────────────────────────────────────────');
  console.log(`  ✓ Dual {vi, en} only:   ${withDualOnly}  (${pct(withDualOnly, totalExercises)})`);
  console.log(`  · String only:          ${withStringOnly}  (${pct(withStringOnly, totalExercises)})`);
  console.log(`  ⚠ Mixed (string+dual):  ${withMixed}  (${pct(withMixed, totalExercises)})`);
  console.log(`  ✗ Empty:                ${withEmpty}  (${pct(withEmpty, totalExercises)})`);
  console.log(`  ✗ Empty array:          ${withEmptyArray}  (${pct(withEmptyArray, totalExercises)})`);
  console.log('');
  console.log('─ Entry-level stats ────────────────────────────────────────────────');
  console.log(`  Total dual entries:    ${dualEntriesTotal}`);
  console.log(`    ✓ Valid (vi+en match catalog):  ${dualValid}`);
  console.log(`    ✗ Orphan:                       ${dualOrphan}`);
  console.log(`    ✗ Missing vi field:             ${dualMissingVi}`);
  console.log(`    ✗ Missing en field:             ${dualMissingEn}`);
  console.log(`    � Wrong type:                   ${dualWrongType}`);
  console.log('');
  console.log(`  Total string entries:  ${stringEntriesTotal}`);
  console.log(`    ✓ Resolvable:                  ${stringValid}`);
  console.log(`    ✗ Orphan:                      ${stringOrphan}`);
  console.log(`    ✗ Empty:                       ${stringEmpty}`);
  console.log('');

  // ─── Verdict ─────────────────────────────────────────────────────────────
  const totalIssues = issues.length;
  const totalValid = dualValid + stringValid;
  const totalAll = dualEntriesTotal + stringEntriesTotal;

  console.log('─ Migration verdict ────────────────────────────────────────────────');
  console.log(`  Total valid mappings:   ${totalValid}/${totalAll}  (${pct(totalValid, totalAll)})`);
  console.log(`  Total issues:           ${totalIssues}`);
  console.log('');

  if (totalIssues === 0) {
    console.log('  ✅ Migration PASS — không có orphan/missing fields.');
  } else {
    console.log('  ⚠ Migration có issues — xem chi tiết bên dưới.');
  }

  console.log('');
  console.log('─ Coverage breakdown ───────────────────────────────────────────────');
  const migratedPct = (withDualOnly / totalExercises) * 100;
  console.log(`  Migrated (dual only):  ${migratedPct.toFixed(1)}%`);
  console.log(`  Legacy (string only):  ${((withStringOnly / totalExercises) * 100).toFixed(1)}%`);
  console.log(`  Migration rate:        ${migratedPct.toFixed(1)}% (target: 100%)`);
  console.log('');

  // ─── Issues detail ───────────────────────────────────────────────────────
  if (issues.length > 0) {
    console.log('─ Issues (first 30) ────────────────────────────────────────────────');
    const grouped = new Map<string, number>();
    for (const i of issues) {
      const k = `${i.kind}: ${i.detail.split('=')[0].split(':')[0]}`;
      grouped.set(k, (grouped.get(k) ?? 0) + 1);
    }

    for (const [k, count] of [...grouped.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(count).padStart(3)} × ${k}`);
    }
    console.log('');

    if (issues.length <= 30) {
      console.log('─ All issues ───────────────────────────────────────────────────────');
      for (const i of issues.slice(0, 30)) {
        console.log(`  [${i.file}] ${i.kind}: ${i.detail}`);
      }
    } else {
      console.log(`  (Còn ${issues.length - 30} issues, xem file issues.json để biết chi tiết)`);
      // Save full
      await fs.writeFile(
        path.join(ROOT, 'agent-tools/migration-issues.json'),
        JSON.stringify(issues, null, 2),
      );
    }
    console.log('');
  }

  // ─── Recommendation ─────────────────────────────────────────────────────
  console.log('═'.repeat(72));
  console.log('  📋 K�T LUẬN');
  console.log('═'.repeat(72));
  if (withStringOnly > 0) {
    console.log(`  Migration STATUS:  ${withDualOnly}/${totalExercises} (${migratedPct.toFixed(1)}%)`);
    console.log(`  Còn ${withStringOnly} bài string legacy cần migrate.`);
  }
  if (totalIssues === 0 && withStringOnly === 0) {
    console.log('  ✅ MIGRATION CHUẨN 100%');
  } else if (totalIssues === 0) {
    console.log('  ✓ Format consistency: PASS');
    console.log('  ⚠ Coverage: còn ' + withStringOnly + ' bài string legacy.');
  } else {
    console.log('  ⚠ Có issues cần fix — xem phía trên.');
  }
  console.log('═'.repeat(72));
}

function pct(n: number, total: number): string {
  if (total === 0) return '0.0%';
  return `${((n / total) * 100).toFixed(1)}%`;
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});