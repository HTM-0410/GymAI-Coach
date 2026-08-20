#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * scripts/scrape-exerciselibrary-images.ts
 *
 * Download exercise thumbnails directly from the exerciselibrary.app CDN.
 *
 * URL pattern (discovered via Playwright):
 *   https://pub-51593a4f184f42908b6377b56bf19486.r2.dev/thumbs/male/{ID_6DIGITS}01_1.jpg
 *
 * ID mapping:
 *   - Pre-built slug→ID map lives in scripts/.exerciselibrary-slug-map.json
 *   - Run scripts/dump-exerciselibrary-links.ts first to build/update the map.
 *
 * For each data/exercises/{slug}.json:
 *   1. Look up its numeric ID from the map.
 *   2. Download /thumbs/male/{id}01_1.jpg (the first/main thumbnail).
 *   3. Write to public/exercises/{slug}.jpg.
 *   4. Patch gallery.main = `/exercises/{slug}.jpg`.
 *
 * Also checks for additional views (e.g. _2.jpg, _3.jpg) and patches gallery.views.
 *
 * Idempotent: skips slugs with existing non-placeholder gallery.main (unless --force).
 *
 * Usage:
 *   npx tsx scripts/scrape-exerciselibrary-images.ts               # all (resumable)
 *   npx tsx scripts/scrape-exerciselibrary-images.ts --limit 10    # first 10
 *   npx tsx scripts/scrape-exerciselibrary-images.ts --only squat,plank
 *   npx tsx scripts/scrape-exerciselibrary-images.ts --force      # re-download everything
 *
 * Build/update slug map first:
 *   npx tsx scripts/dump-exerciselibrary-links.ts
 */

import { promises as fs, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const DATA_DIR   = path.join(process.cwd(), 'data', 'exercises');
const OUT_DIR   = path.join(process.cwd(), 'public', 'exercises');
const MAP_PATH  = path.join(process.cwd(), 'scripts', '.exerciselibrary-slug-map.json');
const THUMB_CDN = 'https://pub-51593a4f184f42908b6377b56bf19486.r2.dev/thumbs/male';
const CONCURRENCY = 6;
const DELAY_MS   = 100; // small delay between batches

// ---- CLI flags ----
const args = new Set(process.argv.slice(2));
const flagForce = args.has('--force');
const flagLimit = (() => {
  const i = process.argv.indexOf('--limit');
  return i !== -1 ? Number(process.argv[i + 1]) : Infinity;
})();
const flagOnly = (() => {
  const i = process.argv.indexOf('--only');
  return i !== -1 ? new Set(process.argv[i + 1].split(',').map((s) => s.trim())) : null;
})();

function pad6(id: string): string {
  // ID might already be 6 digits (e.g. "002512") or shorter (e.g. "2512").
  // Zero-pad to exactly 6 digits.
  return String(id).padStart(6, '0');
}

function thumbUrl(id: string, suffix = '01'): string {
  const padded = pad6(id);
  return `${THUMB_CDN}/${padded}${suffix}_1.jpg`;
}

async function loadSlugMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!existsSync(MAP_PATH)) {
    console.error(`Slug map not found: ${MAP_PATH}`);
    console.error('Run: npx tsx scripts/dump-exerciselibrary-links.ts');
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(MAP_PATH, 'utf-8')) as Record<string, string>;
  for (const [slug, id] of Object.entries(raw)) map.set(slug, id);
  return map;
}

async function loadTargets(): Promise<string[]> {
  const files = await fs.readdir(DATA_DIR);
  let slugs = files
    .filter((f) => f.endsWith('.json') && !f.endsWith('.sample.json'))
    .map((f) => f.replace(/\.json$/, ''));

  if (flagOnly) slugs = slugs.filter((s) => flagOnly!.has(s));

  if (!flagForce) {
    slugs = slugs.filter((s) => {
      const file = path.join(DATA_DIR, `${s}.json`);
      try {
        const json = JSON.parse(readFileSync(file, 'utf-8'));
        const main: unknown = json?.gallery?.main;
        // Skip if already has a /exercises/... path (local asset)
        if (typeof main === 'string' && main.startsWith('/exercises/')) return false;
        // Skip if has a remote URL already (Unsplash, etc.)
        if (typeof main === 'string' && main.startsWith('http')) return false;
      } catch { /* skip invalid JSON */ }
      return true;
    });
  }

  return slugs.slice(0, flagLimit);
}

async function download(url: string): Promise<{ data: Buffer; size: number }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ← ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return { data: buf, size: buf.length };
}

async function patchGallery(
  slug: string,
  mainPath: string | null,
  views: string[],
  caption: string | null,
): Promise<void> {
  const file = path.join(DATA_DIR, `${slug}.json`);
  const raw = readFileSync(file, 'utf-8');
  const json = JSON.parse(raw);

  json.gallery ??= { main: null, views: [], caption_vi: '' };
  json.gallery.main = mainPath;
  json.gallery.views = views;
  if (caption && !json.gallery.caption_vi) json.gallery.caption_vi = caption;

  await fs.writeFile(file, JSON.stringify(json, null, 2) + '\n', 'utf-8');
}

async function processOne(
  slug: string,
  id: string,
  onLog: (msg: string) => void,
): Promise<{ ok: boolean; mainPath: string | null; views: string[] }> {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const dest = (suffix: string) => path.join(OUT_DIR, `${slug}${suffix}.jpg`);

  // Try suffixes 01, 02, 03 (main + extra views)
  const results: Array<{ url: string; dest: string } | null> = [null, null, null];

  for (let vi = 0; vi < 3; vi++) {
    const suffix = vi === 0 ? '01' : `0${vi + 1}`;
    const url = thumbUrl(id, suffix);
    try {
      const { data, size } = await download(url);
      if (size < 500) throw new Error('file too small');
      const fileDest = dest(vi === 0 ? '' : `-${vi + 1}`);
      await fs.writeFile(fileDest, data);
      results[vi] = { url, dest: fileDest };
      onLog(`  view${vi + 1}: ${size} bytes → ${path.basename(fileDest)}`);
    } catch {
      // No more views for this exercise
    }
  }

  if (!results[0]) {
    onLog('NO_THUMB');
    return { ok: false, mainPath: null, views: [] };
  }

  const mainPath = `/exercises/${slug}.jpg`;
  const views: string[] = [];
  for (let vi = 1; vi < results.length; vi++) {
    if (results[vi]) views.push(`/exercises/${slug}-${vi + 1}.jpg`);
  }

  return { ok: true, mainPath, views };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Batch executor with concurrency limit
async function runBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
  onDone: (item: T, result: R) => void,
  onLog: (msg: string) => void,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (item) => {
        const result = await fn(item);
        onDone(item, result);
      }),
    );
    if (i + batchSize < items.length) await sleep(DELAY_MS);
  }
}

async function main() {
  const [slugMap, targets] = await Promise.all([loadSlugMap(), loadTargets()]);

  console.log(`Slug map: ${slugMap.size} entries`);
  console.log(`Targets: ${targets.length} exercises\n`);

  let ok = 0, miss = 0, fail = 0;

  const log = (msg: string) => process.stdout.write(msg + '\n');

  await runBatches(
    targets,
    CONCURRENCY,
    async (slug: string) => {
      const id = slugMap.get(slug);
      if (!id) return { ok: false, reason: 'NO_ID', mainPath: null, views: [] };
      return processOne(slug, id, () => {}); // suppress per-view logs in batch
    },
    async (slug, result) => {
      if (!result.ok) {
        log(`[${ok + miss + fail + 1}/${targets.length}] ${slug} … ${result.reason ?? 'NO_THUMB'}`);
        if (result.reason === 'NO_ID') miss++;
        else fail++;
        return;
      }
      try {
        const caption = slug
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        await patchGallery(slug, result.mainPath, result.views, caption);
        log(`[${ok + miss + fail + 1}/${targets.length}] ${slug} … OK → ${result.mainPath}${result.views.length > 0 ? ` +${result.views.length} views` : ''}`);
        ok++;
      } catch (err: any) {
        log(`[${ok + miss + fail + 1}/${targets.length}] ${slug} … PATCH_ERR: ${err.message}`);
        fail++;
      }
    },
    log,
  );

  console.log(`\nDone. ${ok} ok, ${miss} missing, ${fail} failed.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
