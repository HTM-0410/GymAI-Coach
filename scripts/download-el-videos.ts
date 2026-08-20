#!/usr/bin/env node
/**
 * scripts/download-el-videos.ts
 *
 * Download exercise demonstration videos from ExerciseLibrary CDN.
 *
 * Video URL pattern: https://pub-51593a4f184f42908b6377b56bf19486.r2.dev/male/{ID_6DIGITS}01.mp4
 *
 * Usage:
 *   npx tsx scripts/download-el-videos.ts                 # all exercises (resumable)
 *   npx tsx scripts/download-el-videos.ts --limit 10       # first 10
 *   npx tsx scripts/download-el-videos.ts --only squat    # specific exercise
 *   npx tsx scripts/download-el-videos.ts --force          # re-download everything
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const DATA_DIR   = path.join(process.cwd(), 'data', 'exercises');
const OUT_DIR    = path.join(process.cwd(), 'public', 'videos');
const SLUG_MAP   = path.join(process.cwd(), 'scripts', '.exerciselibrary-slug-map.json');
const VIDEO_CDN  = 'https://pub-51593a4f184f42908b6377b56bf19486.r2.dev/male';
const CONCURRENCY = 3;
const DELAY_MS    = 300;

const args = new Set(process.argv.slice(2));
const flagForce = args.has('--force');
const flagLimit = (() => {
  const i = process.argv.indexOf('--limit');
  return i !== -1 ? Number(process.argv[i + 1]) : Infinity;
})();
const flagOnly = (() => {
  const i = process.argv.indexOf('--only');
  return i !== -1 ? new Set(process.argv[i + 1].split(',').map(s => s.trim())) : null;
})();

function pad6(id: string): string {
  return String(id).padStart(6, '0');
}

function videoUrl(id: string): string {
  return `${VIDEO_CDN}/${pad6(id)}01.mp4`;
}

async function loadSlugMap(): Promise<Map<string, string>> {
  const raw = JSON.parse(await fs.readFile(SLUG_MAP, 'utf-8')) as Record<string, string>;
  const map = new Map<string, string>();
  for (const [slug, id] of Object.entries(raw)) map.set(slug, id);
  return map;
}

async function loadTargets(): Promise<string[]> {
  const files = await fs.readdir(DATA_DIR);
  let slugs = files
    .filter(f => f.endsWith('.json') && !f.endsWith('.sample.json'))
    .map(f => f.replace('.json', ''));

  if (flagOnly) slugs = slugs.filter(s => flagOnly!.has(s));
  if (!flagForce) {
    const pending: string[] = [];
    for (const s of slugs) {
      const raw = await fs.readFile(path.join(DATA_DIR, `${s}.json`), 'utf-8');
      const json = JSON.parse(raw);
      const video: unknown = json?.gallery?.video;
      // Skip if already has local video
      if (!(typeof video === 'string' && (video.startsWith('/videos/') || video.startsWith('http')))) pending.push(s);
    }
    slugs = pending;
  }
  return slugs.slice(0, flagLimit);
}

async function download(url: string, dest: string): Promise<number> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 10000) throw new Error('file too small');
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, buf);
  return buf.length;
}

async function patchVideo(slug: string, videoPath: string | null): Promise<void> {
  const file = path.join(DATA_DIR, `${slug}.json`);
  const raw = await fs.readFile(file, 'utf-8');
  const json = JSON.parse(raw);
  json.gallery ??= { main: null, views: [], caption_vi: '' };
  json.gallery.video = videoPath;
  await fs.writeFile(file, JSON.stringify(json, null, 2) + '\n', 'utf-8');
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function runBatches<T, R>(
  items: T[], batchSize: number,
  fn: (item: T) => Promise<R>,
  onDone: (item: T, result: R) => void,
) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(async item => {
      const result = await fn(item);
      onDone(item, result);
    }));
    if (i + batchSize < items.length) await sleep(DELAY_MS);
  }
}

async function main() {
  const [slugMap, targets] = await Promise.all([loadSlugMap(), loadTargets()]);

  console.log(`Slug map: ${slugMap.size} entries`);
  console.log(`Targets: ${targets.length} exercises\n`);

  let ok = 0, miss = 0, fail = 0;
  let totalBytes = 0;

  const log = (msg: string) => process.stdout.write(msg + '\n');

  await runBatches(
    targets,
    CONCURRENCY,
    async (slug: string) => {
      const id = slugMap.get(slug);
      if (!id) return { ok: false, reason: 'NO_ID', slug, elId: null, size: 0 };
      const url = videoUrl(id);
      const dest = path.join(OUT_DIR, `${slug}.mp4`);
      try {
        const size = await download(url, dest);
        return { ok: true, reason: 'OK', slug, elId: id, size };
      } catch (err: any) {
        return { ok: false, reason: err.message, slug, elId: id, size: 0 };
      }
    },
    async (slug, result) => {
      if (!result.ok) {
        log(`  [${ok + miss + fail + 1}/${targets.length}] ${slug} … ${result.reason}`);
        if (result.reason === 'NO_ID') miss++;
        else fail++;
      } else {
        const mb = (result.size / 1024 / 1024).toFixed(1);
        log(`  [${ok + miss + fail + 1}/${targets.length}] ${slug} → OK ${mb}MB`);
        ok++;
        totalBytes += result.size;
      }
    },
  );

  console.log(`\nDone. ${ok} ok, ${miss} missing ID, ${fail} failed.`);
  console.log(`Total downloaded: ${(totalBytes / 1024 / 1024 / 1024).toFixed(1)} GB`);
}

main().catch(err => { console.error(err); process.exit(1); });
