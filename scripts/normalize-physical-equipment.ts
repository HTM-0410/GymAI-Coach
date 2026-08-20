/**
 * Normalize exercise equipment to canonical physical hardware.
 *
 * - Canonicalizes every bilingual equipment object through the catalog.
 * - Collapses aliases that describe another exercise on the same machine.
 * - Applies explicit corrections where an exercise name was previously
 *   mistaken for a new piece of hardware.
 *
 * Usage:
 *   npx tsx scripts/normalize-physical-equipment.ts --dry-run
 *   npx tsx scripts/normalize-physical-equipment.ts --apply
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { EQUIPMENT_CATALOG } from '../data/equipment/equipment-catalog';
import { resolveEquipment } from '../data/equipment/equipment-resolver';

const ROOT = process.cwd();
const EXERCISES_DIR = path.join(ROOT, 'data', 'exercises');
const APPLY = process.argv.includes('--apply');

const OVERRIDES: Record<string, string | string[]> = {
  'hack-calf-raise': 'hack-squat',
  'hack-one-leg-calf-raise': 'hack-squat',
  'lever-calf-press': 'lever-calf-press',
  'lever-donkey-calf-raise': 'calf-machine',
  'lever-rotary-calf': 'calf-machine',
  'lever-seated-calf-press': 'lever-calf-press',
  'lever-seated-calf-raise': 'lever-calf-raise',
  'lever-standing-calf-raise': 'lever-calf-raise',
  'lever-assisted-chin-up': 'assisted-pull-up-machine',
  'lever-back-extension': 'lever-back-extension',
  // The source GIF for air-bike is a floor bicycle crunch, not an Air Bike.
  'air-bike': ['bodyweight', 'exercise-mat'],
  'run-equipment': 'treadmill',
  // The source GIF/instructions show a bike; catalog policy maps it to the
  // existing Stationary Bike instead of maintaining a duplicate Air Bike row.
  'cycle-cross-trainer': 'stationary-bike',
};

const BY_SLUG = new Map(EQUIPMENT_CATALOG.map((row) => [row.slug, row]));

type EquipmentValue = string | { vi?: string; en?: string };

function resolveValue(value: EquipmentValue): string | null {
  const labels = typeof value === 'string' ? [value] : [value.vi, value.en];
  for (const label of labels) {
    if (typeof label !== 'string') continue;
    const resolved = resolveEquipment(label);
    if (resolved) return resolved.slug;
  }
  return null;
}

function bilingual(slug: string) {
  const row = BY_SLUG.get(slug);
  if (!row) throw new Error(`Canonical equipment slug is missing: ${slug}`);
  return { vi: row.name_vi, en: row.name };
}

async function main() {
  const files = (await fs.readdir(EXERCISES_DIR)).filter((file) => file.endsWith('.json'));
  let changed = 0;
  let unchanged = 0;
  const unresolved: Array<{ exercise: string; value: EquipmentValue }> = [];

  for (const file of files) {
    const filePath = path.join(EXERCISES_DIR, file);
    const exercise = JSON.parse(await fs.readFile(filePath, 'utf8'));
    if (!exercise.slug || !Array.isArray(exercise.equipment)) continue;

    const override = OVERRIDES[exercise.slug];
    const slugs = override
      ? (Array.isArray(override) ? override : [override])
      : exercise.equipment.flatMap((value: EquipmentValue) => {
          const slug = resolveValue(value);
          if (!slug) unresolved.push({ exercise: exercise.slug, value });
          return slug ? [slug] : [];
        });

    const canonicalSlugs = [...new Set(slugs)];
    const nextEquipment = canonicalSlugs.map(bilingual);
    if (JSON.stringify(exercise.equipment) === JSON.stringify(nextEquipment)) {
      unchanged++;
      continue;
    }

    changed++;
    console.log(`${APPLY ? '✓' : '○'} ${exercise.slug}: ${JSON.stringify(exercise.equipment)} -> ${JSON.stringify(nextEquipment)}`);
    if (APPLY) {
      exercise.equipment = nextEquipment;
      await fs.writeFile(filePath, `${JSON.stringify(exercise, null, 2)}\n`, 'utf8');
    }
  }

  console.log(`\nChanged: ${changed}; unchanged: ${unchanged}; unresolved: ${unresolved.length}`);
  if (unresolved.length) {
    for (const item of unresolved.slice(0, 20)) console.log(`! ${item.exercise}: ${JSON.stringify(item.value)}`);
    process.exitCode = 1;
  }
  if (!APPLY) console.log('Dry run only. Re-run with --apply to write changes.');
}

main().catch((error) => {
  console.error('FATAL:', error);
  process.exit(1);
});
