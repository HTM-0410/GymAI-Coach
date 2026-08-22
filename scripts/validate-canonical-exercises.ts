#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

async function main() {
  const root = process.cwd();
  const dataDir = path.join(root, 'data', 'exercises');
  const publicDir = path.join(root, 'public');
  const files = (await fs.readdir(dataDir)).filter(
    (file) =>
      file.endsWith('.json') &&
      file !== 'exercise.schema.json' &&
      !file.startsWith('.') &&
      !file.endsWith('.sample.json'),
  );
  const seen = new Set<string>();
  const errors: string[] = [];
  let pending = 0;
  for (const file of files) {
    const record = JSON.parse(await fs.readFile(path.join(dataDir, file), 'utf8')) as any;
    if (!record.slug || seen.has(record.slug)) errors.push(`${file}: duplicate/missing slug`);
    seen.add(record.slug);
    for (const key of ['name', 'name_vi', 'primary_muscle', 'goal_vi', 'safety_vi', 'gallery', 'media_metadata']) {
      if (!record[key]) errors.push(`${file}: missing ${key}`);
    }
    if (!Array.isArray(record.instructions) || record.instructions.length < 3) errors.push(`${file}: instructions < 3`);
    if (record.translation_status !== 'review_required' && record.translation_status !== 'approved') pending++;
    const media = String(record.gallery?.main ?? '');
    if (!media.startsWith('/')) errors.push(`${file}: media path is not local`);
    else {
      try { await fs.access(path.join(publicDir, media.slice(1))); }
      catch { errors.push(`${file}: missing media ${media}`); }
    }
  }
  console.log(JSON.stringify({ records: files.length, unique_slugs: seen.size, pending_translation: pending, errors }, null, 2));
  if (errors.length) process.exit(1);
}
main().catch((error) => { console.error(error); process.exit(1); });
