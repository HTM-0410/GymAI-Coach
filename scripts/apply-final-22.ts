/**
 * APPLY WEIGHTED/ASSISTED MAPPING — GymAI Coach
 * ════════════════════════════════════════════════════════════════════════════════
 * Apply mapping cho 22 entries cuối cùng (weighted + assisted) sau khi đã thêm
 * 3 slugs mới: weight-belt, weight-vest, ankle-weight.
 *
 * Usage:
 *   npx tsx scripts/apply-final-22.ts --dry-run
 *   npx tsx scripts/apply-final-22.ts --apply
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { EQUIPMENT_CATALOG } from '../data/equipment/equipment-catalog';

const ROOT = process.cwd();
const EXERCISES_DIR = path.join(ROOT, 'data/exercises');

const DRY_RUN = process.argv.includes('--dry-run');
const APPLY = process.argv.includes('--apply');

// ─── MAPPING (slug → target catalog slug) ─────────────────────────────────
const MAPPING: Record<string, string> = {
  // weighted (18 bài)
  'otis-up': 'bodyweight',
  'weighted-cossack-squats-male': 'dumbbell',
  'weighted-crunch': 'weight-belt',
  'weighted-donkey-calf-raise': 'ankle-weight',
  'weighted-front-plank': 'weight-belt',
  'weighted-kneeling-step-with-swing': 'kettlebell',
  'weighted-lunge-with-swing': 'kettlebell',
  'weighted-round-arm': 'weight-plate',
  'weighted-russian-twist-legs-up': 'medicine-ball',
  'weighted-russian-twist-v-2': 'medicine-ball',
  'weighted-russian-twist': 'medicine-ball',
  'weighted-seated-twist-on-stability-ball': 'medicine-ball',
  'weighted-side-bend-on-stability-ball': 'weight-belt',
  'weighted-squat': 'weight-vest',
  'weighted-standing-curl': 'dumbbell',
  'weighted-standing-hand-squeeze': 'grip-strengthener',
  'weighted-stretch-lunge': 'weight-vest',
  'weighted-three-bench-dips': 'weight-vest',

  // assisted (4 bài)
  'assisted-lying-leg-raise-with-throw-down': 'bodyweight',
  'assisted-prone-hamstring': 'bodyweight',
  'assisted-sit-up': 'bodyweight',
  'assisted-standing-triceps-extension-with-towel': 'bodyweight',
};

const slugToRow = new Map<string, { name: string; name_vi: string }>();
for (const r of EQUIPMENT_CATALOG) {
  slugToRow.set(r.slug, { name: r.name, name_vi: r.name_vi });
}

async function main() {
  const targets = Object.keys(MAPPING);

  console.log('═'.repeat(70));
  console.log(`  APPLY FINAL 22 MAPPING${DRY_RUN ? ' (DRY RUN)' : APPLY ? ' (APPLY)' : ''}`);
  console.log('═'.repeat(70));
  console.log(`Total targets: ${targets.length}`);
  console.log('');

  if (!DRY_RUN && !APPLY) {
    console.log('  → Chạy --dry-run để preview, hoặc --apply để ghi.');
    return;
  }

  let applied = 0;
  let skipped = 0;
  let errors = 0;
  const errorList: string[] = [];

  for (const exerciseSlug of targets) {
    const targetSlug = MAPPING[exerciseSlug];
    const row = slugToRow.get(targetSlug);
    if (!row) {
      errorList.push(`${exerciseSlug}: target slug "${targetSlug}" không có trong catalog`);
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
      console.log(`  · ${exerciseSlug}: already mapped`);
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
    console.log(`  Chạy --apply để ghi ${applied} thay đổi vào files.`);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});