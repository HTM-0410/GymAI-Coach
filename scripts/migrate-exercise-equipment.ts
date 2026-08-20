/**
 * MIGRATE EXERCISE EQUIPMENT — GymAI Coach
 * ════════════════════════════════════════════════════════════════════════════════
 * Chuẩn hoá tất cả equipment strings trong data/exercises/*.json về dạng
 * canonical từ data/equipment/equipment-catalog.ts.
 *
 * VÍ DỤ:
 *   Trước:  { "equipment": ["Thanh đòn", "Ghế tập"] }
 *   Sau:    { "equipment": ["Thanh tạ đòn", "Ghế tập phẳng"], "modifiers": [] }
 *
 *   Trước:  { "equipment": ["weighted", "Máy kéo xà"] }
 *   Sau:    { "equipment": ["Máy kéo xà"], "modifiers": ["weighted"] }
 *
 *   Trước:  { "equipment": ["assisted"] }
 *   Sau:    { "equipment": [], "modifiers": ["assisted"] }
 *
 * IDEMPOTENT: chạy nhiều lần OK. Skip file đã ở canonical form.
 *
 * Usage:
 *   npx tsx scripts/migrate-exercise-equipment.ts            # thật
 *   npx tsx scripts/migrate-exercise-equipment.ts --dry-run  # chỉ report
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  EQUIPMENT_CATALOG,
  EQUIPMENT_MODIFIERS,
  type EquipmentModifier,
  buildVietnameseSlugMap,
} from '../data/equipment/equipment-catalog';

const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';
const DATA_DIR = path.join(process.cwd(), 'data', 'exercises');

const slugMap = buildVietnameseSlugMap();
const slugByVi = new Map<string, string>();   // slug → name_vi (canonical)
for (const row of EQUIPMENT_CATALOG) {
  slugByVi.set(row.slug, row.name_vi);
}

type Change = {
  file: string;
  slug: string;
  before: unknown[];
  after: Array<{ vi: string; en: string }>;
  modifiersBefore: string[];
  modifiersAfter: string[];
};

async function main() {
  const files = (await fs.readdir(DATA_DIR))
    .filter((f) => f.endsWith('.json') && f !== 'exercise.schema.json')
    .sort();

  const changes: Change[] = [];
  const skipped: string[] = [];
  const errors: { file: string; err: string }[] = [];

  for (const file of files) {
    const fullPath = path.join(DATA_DIR, file);
    const raw = await fs.readFile(fullPath, 'utf8');
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch (e: any) {
      errors.push({ file, err: `JSON parse: ${e.message}` });
      continue;
    }

    if (!Array.isArray(data.equipment) || data.equipment.length === 0) {
      skipped.push(file);
      continue;
    }

    const before = data.equipment.slice();
    const modifiersBefore: string[] = Array.isArray(data.modifiers) ? data.modifiers.slice() : [];

    // Step 1: split modifiers from equipment
    const newEquipment: Array<{ vi: string; en: string }> = [];
    const newModifiers: string[] = [...modifiersBefore];
    const unresolved: string[] = [];

    for (const item of data.equipment as unknown[]) {
      const vi = typeof item === 'string'
        ? item
        : typeof item === 'object' && item !== null && typeof (item as { vi?: unknown }).vi === 'string'
          ? (item as { vi: string }).vi
          : '';
      const en = typeof item === 'object' && item !== null && typeof (item as { en?: unknown }).en === 'string'
        ? (item as { en: string }).en
        : '';
      const surface = en || vi;
      const k = surface.toLowerCase().trim();
      if (!k) {
        unresolved.push(JSON.stringify(item));
        continue;
      }
      // Is it a modifier?
      if (k === 'weighted' || k === 'assisted') {
        const mod = k as EquipmentModifier;
        if (!newModifiers.includes(mod)) newModifiers.push(mod);
        continue;
      }
      // Resolve via slug map
      const slug = slugMap.get(k) ?? (vi ? slugMap.get(vi.toLowerCase().trim()) : undefined);
      if (!slug) {
        unresolved.push(typeof item === 'string' ? item : JSON.stringify(item));
        // Keep original (don't lose data) — but mark in report
        if (typeof item === 'object' && item !== null && vi && en) {
          newEquipment.push({ vi, en });
        }
        continue;
      }
      // Replace with canonical Vietnamese name
      const canonicalVi = slugByVi.get(slug);
      if (!canonicalVi) {
        unresolved.push(typeof item === 'string' ? item : JSON.stringify(item));
        if (typeof item === 'object' && item !== null && vi && en) {
          newEquipment.push({ vi, en });
        }
        continue;
      }
      const canonical = EQUIPMENT_CATALOG.find((row) => row.slug === slug)!;
      if (!newEquipment.some((entry) => entry.en === canonical.name)) {
        newEquipment.push({ vi: canonicalVi, en: canonical.name });
      }
    }

    // Sort modifiers deterministically
    newModifiers.sort();

    const after = newEquipment;
    const modifiersAfter = newModifiers;

    // Detect change
    const equipmentChanged = JSON.stringify(before) !== JSON.stringify(after);
    const modifiersChanged = JSON.stringify(modifiersBefore) !== JSON.stringify(modifiersAfter);

    if (!equipmentChanged && !modifiersChanged && unresolved.length === 0) {
      skipped.push(file);
      continue;
    }

    changes.push({
      file,
      slug: data.slug ?? file.replace(/\.json$/, ''),
      before,
      after,
      modifiersBefore,
      modifiersAfter,
    });

    if (unresolved.length > 0) {
      errors.push({ file, err: `unresolved: ${unresolved.join(', ')}` });
    }

    if (!DRY_RUN) {
      data.equipment = after;
      data.modifiers = modifiersAfter;
      // bump catalog version + add audit field
      if (!data.media_metadata) data.media_metadata = {};
      data.media_metadata.equipment_catalog_version = '1.0.0';
      data.media_metadata.last_equipment_migration = new Date().toISOString().slice(0, 10);
      await fs.writeFile(fullPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    }
  }

  // ─── REPORT ──────────────────────────────────────────────────────────────
  console.log('════════════════════════════════════════════════════════════════════');
  console.log(`EQUIPMENT MIGRATION ${DRY_RUN ? '(DRY-RUN)' : '(APPLIED)'}`);
  console.log('════════════════════════════════════════════════════════════════════');
  console.log(`Files scanned: ${files.length}`);
  console.log(`  Changed:  ${changes.length}`);
  console.log(`  Skipped:  ${skipped.length}`);
  console.log(`  Errors:   ${errors.length}`);
  console.log('');

  if (changes.length > 0) {
    console.log('─── CHANGES ───');
    for (const c of changes.slice(0, 30)) {
      console.log(`\n${c.slug}`);
      if (JSON.stringify(c.before) !== JSON.stringify(c.after)) {
        console.log(`  equipment: ${JSON.stringify(c.before)}  →  ${JSON.stringify(c.after)}`);
      }
      if (JSON.stringify(c.modifiersBefore) !== JSON.stringify(c.modifiersAfter)) {
        console.log(`  modifiers: ${JSON.stringify(c.modifiersBefore)}  →  ${JSON.stringify(c.modifiersAfter)}`);
      }
    }
    if (changes.length > 30) console.log(`\n... and ${changes.length - 30} more.`);
  }

  if (errors.length > 0) {
    console.log('\n─── ERRORS / UNRESOLVED ───');
    for (const e of errors) console.log(`  ${e.file}: ${e.err}`);
  }

  console.log('\n─── CATALOG SUMMARY ───');
  console.log(`Total catalog rows: ${EQUIPMENT_CATALOG.length}`);
  console.log(`Modifiers: ${Object.keys(EQUIPMENT_MODIFIERS).join(', ')}`);

  if (DRY_RUN) {
    console.log('\n[DRY-RUN] No files written. Re-run without --dry-run to apply.');
  } else {
    console.log('\n✓ Migration applied. Re-run safely — idempotent.');
  }
}

main().catch((err) => {
  console.error('\n💥 Fatal:', err);
  process.exit(1);
});
