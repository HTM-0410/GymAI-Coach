/**
 * Upload tất cả exercise media (1324 JPG + 1324 GIF) từ
 * public/exercise-media/gymvisual/ lên Supabase Storage.
 *
 * Strategy:
 *   - Match filename (basename) với `gallery.main` URL trong JSON files
 *     để build map: basename → slug
 *   - Upload từng file với key = `<slug>.jpg` / `<slug>.gif`
 *   - Sau khi upload, ghi đè gallery URL trong JSON files thành Storage URL
 *     (để sync DB sẽ pick up Storage URL thay vì local path)
 *
 * Usage:
 *   pnpm tsx scripts/upload-exercise-media.ts             # upload all
 *   pnpm tsx scripts/upload-exercise-media.ts --dry-run  # chỉ verify, không upload
 *   pnpm tsx scripts/upload-exercise-media.ts --slug=push-up   # upload 1 bài
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// dotenv is optional. Use Node's built-in --env-file=.env.local (Node 20+).
// tsx 4.x forwards argv flags. Run via:
//   pnpm tsx --env-file=.env.local scripts/upload-exercise-media.ts

const ROOT = process.cwd();
const MEDIA_DIR = path.join(ROOT, 'public', 'exercise-media', 'gymvisual');
const DATA_DIR = path.join(ROOT, 'data', 'exercises');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const BUCKET_JPG = 'exercise-images';
const BUCKET_GIF = 'exercise-animations';

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const slugArg = [...args].find((a) => a.startsWith('--slug='))?.split('=')[1];

interface JsonFile {
  file: string;
  slug: string;
  galleryMain: string;
  views: { src: string; label: string }[];
}

async function loadJsonFiles(): Promise<JsonFile[]> {
  const entries = await fs.readdir(DATA_DIR);
  const files = entries.filter(
    (f) => f.endsWith('.json') && f !== 'exercise.schema.json' && !f.endsWith('.sample.json'),
  );
  const out: JsonFile[] = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
    const data = JSON.parse(raw);
    if (!data.slug || !data.gallery?.main) continue;
    out.push({
      file,
      slug: data.slug,
      galleryMain: data.gallery.main,
      views: data.gallery.views ?? [],
    });
  }
  return out;
}

async function uploadOne(
  bucket: string,
  storageKey: string,
  absPath: string,
  contentType: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (DRY_RUN) return { ok: true };
  const buf = await fs.readFile(absPath);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(storageKey, buf, { contentType, upsert: true, cacheControl: '31536000' });
  if (error) return { ok: false, error: error.message };
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(storageKey);
  return { ok: true, url: pub.publicUrl };
}

function publicUrl(bucket: string, key: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${key}`;
}

async function main() {
  console.log(`[upload-media] ${DRY_RUN ? 'DRY-RUN' : 'LIVE'} mode`);
  console.log(`[upload-media] Media dir: ${MEDIA_DIR}`);

  const jsonFiles = await loadJsonFiles();
  if (slugArg) {
    const filtered = jsonFiles.filter((j) => j.slug === slugArg);
    if (filtered.length === 0) {
      console.error(`Slug "${slugArg}" not found in data/exercises/`);
      process.exit(1);
    }
    console.log(`[upload-media] Single-slug mode: ${slugArg}`);
  }
  const targets = slugArg ? jsonFiles.filter((j) => j.slug === slugArg) : jsonFiles;
  console.log(`[upload-media] ${targets.length} exercise(s) to process`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of targets) {
    const basename = path.basename(item.galleryMain); // e.g. "0662-I4hDWkc.gif"
    const stem = basename.replace(/\.(jpg|gif)$/i, '');

    // The JPG file has the same stem. Verify it exists.
    const gifAbs = path.join(MEDIA_DIR, basename);
    const jpgBasename = `${stem}.jpg`;
    const jpgAbs = path.join(MEDIA_DIR, jpgBasename);

    try {
      await fs.access(gifAbs);
    } catch {
      console.warn(`[skip] ${item.slug}: GIF not found (${basename})`);
      skipped++;
      continue;
    }
    try {
      await fs.access(jpgAbs);
    } catch {
      console.warn(`[skip] ${item.slug}: JPG not found (${jpgBasename})`);
      skipped++;
      continue;
    }

    // Upload JPG
    const jpgRes = await uploadOne(BUCKET_JPG, `${item.slug}.jpg`, jpgAbs, 'image/jpeg');
    if (!jpgRes.ok) {
      console.error(`[fail] ${item.slug} jpg: ${jpgRes.error}`);
      failed++;
      continue;
    }

    // Upload GIF
    const gifRes = await uploadOne(BUCKET_GIF, `${item.slug}.gif`, gifAbs, 'image/gif');
    if (!gifRes.ok) {
      console.error(`[fail] ${item.slug} gif: ${gifRes.error}`);
      failed++;
      continue;
    }

    // Patch JSON file with Storage URLs
    if (!DRY_RUN) {
      const jsonPath = path.join(DATA_DIR, item.file);
      const raw = await fs.readFile(jsonPath, 'utf8');
      const data = JSON.parse(raw);
      const jpgUrl = publicUrl(BUCKET_JPG, `${item.slug}.jpg`);
      const gifUrl = publicUrl(BUCKET_GIF, `${item.slug}.gif`);
      data.gallery.main = jpgUrl;
      data.gallery.animation = gifUrl; // new field — GIF URL for lazy-load
      data.gallery.views = [{ src: gifUrl, label: data.gallery.views?.[0]?.label ?? 'Animation' }];
      await fs.writeFile(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    }

    success++;
    if (success % 100 === 0) {
      console.log(`[progress] ${success}/${targets.length}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Success: ${success}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed:  ${failed}`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
