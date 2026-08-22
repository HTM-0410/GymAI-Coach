#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  WORKOUT_ROLES,
  workoutRoleManifestSchema,
  type WorkoutRoleManifest,
} from '../src/lib/exercises/workout-role';

const root = process.cwd();
const exerciseDir = path.join(root, 'data', 'exercises');
const manifestPath = path.join(
  root,
  'data',
  'exercise-taxonomy',
  'workout-role-classification.json',
);

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function renderSql(manifest: WorkoutRoleManifest): string {
  const values = manifest.reviewed
    .map(
      (entry) =>
        `    (${[
          entry.slug,
          entry.workout_role,
          entry.workout_role_review_status,
          String(entry.workout_role_confidence),
          entry.workout_role_source,
        ]
          .map((value, index) => (index === 3 ? value : sqlLiteral(value)))
          .join(', ')})`,
    )
    .join(',\n');

  return [
    '-- Generated from data/exercise-taxonomy/workout-role-classification.json',
    '-- Review before copying into an additive migration.',
    'UPDATE exercises AS exercise',
    'SET workout_role = seed.workout_role,',
    '    workout_role_review_status = seed.review_status,',
    '    workout_role_confidence = seed.confidence,',
    '    workout_role_source = seed.source',
    'FROM (VALUES',
    values,
    ') AS seed(slug, workout_role, review_status, confidence, source)',
    'WHERE exercise.slug = seed.slug;',
  ].join('\n');
}

async function main() {
  const manifestResult = workoutRoleManifestSchema.safeParse(
    JSON.parse(await fs.readFile(manifestPath, 'utf8')),
  );
  if (!manifestResult.success) {
    console.error(manifestResult.error.format());
    process.exit(1);
  }

  const manifest = manifestResult.data;
  if (process.argv.includes('--sql')) {
    console.log(renderSql(manifest));
    return;
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const allSlugs = new Set<string>();
  const roleCounts = Object.fromEntries(WORKOUT_ROLES.map((role) => [role, 0])) as Record<
    (typeof WORKOUT_ROLES)[number],
    number
  >;
  const coveredSplits = new Set<string>();
  const coveredEquipmentClasses = new Set<string>();

  for (const entry of [...manifest.reviewed, ...manifest.unresolved]) {
    if (allSlugs.has(entry.slug)) errors.push(`Duplicate taxonomy slug: ${entry.slug}`);
    allSlugs.add(entry.slug);

    const exercisePath = path.join(exerciseDir, `${entry.slug}.json`);
    try {
      const exercise = JSON.parse(await fs.readFile(exercisePath, 'utf8')) as { slug?: string };
      if (exercise.slug !== entry.slug) {
        errors.push(`${entry.slug}: manifest slug does not match canonical record slug`);
      }
    } catch {
      errors.push(`${entry.slug}: canonical exercise file is missing or invalid JSON`);
    }
  }

  for (const entry of manifest.reviewed) {
    roleCounts[entry.workout_role] += 1;
    entry.coverage.splits.forEach((split) => coveredSplits.add(split));
    entry.coverage.equipment_classes.forEach((equipmentClass) =>
      coveredEquipmentClasses.add(equipmentClass),
    );
  }

  for (const role of WORKOUT_ROLES) {
    if (roleCounts[role] === 0) errors.push(`No reviewed entry for role: ${role}`);
  }
  for (const split of ['Push', 'Pull', 'Legs', 'Full Body']) {
    if (!coveredSplits.has(split)) errors.push(`Missing split coverage: ${split}`);
  }
  for (const equipmentClass of ['bodyweight', 'common_gym']) {
    if (!coveredEquipmentClasses.has(equipmentClass)) {
      errors.push(`Missing equipment-class coverage: ${equipmentClass}`);
    }
  }

  const exerciseFiles = (await fs.readdir(exerciseDir)).filter(
    (file) =>
      file.endsWith('.json') &&
      file !== 'exercise.schema.json' &&
      !file.startsWith('.') &&
      !file.endsWith('.sample.json'),
  );
  let stringEquipmentRecords = 0;
  let bilingualEquipmentRecords = 0;
  for (const file of exerciseFiles) {
    const exercise = JSON.parse(await fs.readFile(path.join(exerciseDir, file), 'utf8')) as {
      equipment?: unknown;
    };
    if (!Array.isArray(exercise.equipment) || exercise.equipment.length === 0) {
      errors.push(`${file}: equipment must be a non-empty array`);
      continue;
    }
    for (const item of exercise.equipment) {
      if (typeof item === 'string' && item.length > 0) {
        stringEquipmentRecords += 1;
        continue;
      }
      if (
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { vi?: unknown }).vi === 'string' &&
        typeof (item as { en?: unknown }).en === 'string'
      ) {
        bilingualEquipmentRecords += 1;
        continue;
      }
      errors.push(`${file}: unsupported equipment item ${JSON.stringify(item)}`);
    }
  }

  if (manifest.unresolved.length === 0) {
    warnings.push('Unresolved queue is empty; confirm ambiguous records were not silently approved.');
  }

  const result = {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    reviewed: manifest.reviewed.length,
    unresolved: manifest.unresolved.length,
    role_counts: roleCounts,
    split_coverage: [...coveredSplits].sort(),
    equipment_class_coverage: [...coveredEquipmentClasses].sort(),
    catalog_equipment_items: {
      string: stringEquipmentRecords,
      bilingual_object: bilingualEquipmentRecords,
    },
    warnings,
    errors,
  };
  console.log(JSON.stringify(result, null, 2));
  if (errors.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
