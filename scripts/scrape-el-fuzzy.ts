#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * scripts/scrape-el-fuzzy.ts
 *
 * For exercises NOT in the EL slug map, try fuzzy matching by:
 *   1. Reading the exercise name (english) from data/exercises/{slug}.json
 *   2. Extracting keywords (equipment + movement + modifiers)
 *   3. Searching EL slug map for partial matches
 *   4. Downloading the matched image
 *
 * Usage:
 *   npx tsx scripts/scrape-el-fuzzy.ts --limit 50
 */

import { promises as fs, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const DATA_DIR  = path.join(process.cwd(), 'data', 'exercises');
const OUT_DIR   = path.join(process.cwd(), 'public', 'exercises');
const MAP_PATH  = path.join(process.cwd(), 'scripts', '.exerciselibrary-slug-map.json');
const THUMB_CDN = 'https://pub-51593a4f184f42908b6377b56bf19486.r2.dev/thumbs/male';
const CONCURRENCY = 4;
const DELAY_MS   = 200;

const args = new Set(process.argv.slice(2));
const flagLimit = (() => {
  const i = process.argv.indexOf('--limit');
  return i !== -1 ? Number(process.argv[i + 1]) : Infinity;
})();

// Load EL slug map
function loadElMap(): Map<string, string> {
  const raw = JSON.parse(readFileSync(MAP_PATH, 'utf-8')) as Record<string, string>;
  const map = new Map<string, string>();
  for (const [slug, id] of Object.entries(raw)) map.set(slug, id);
  return map;
}

// Load all our exercises (that still need images)
function loadNeedsImages(): Array<{ slug: string; name: string; keywords: string[] }> {
  const files = require('fs').readdirSync(DATA_DIR)
    .filter((f: string) => f.endsWith('.json') && !f.endsWith('.sample.json') && f !== 'exercise.schema.json');

  const results: Array<{ slug: string; name: string; keywords: string[] }> = [];

  for (const file of files) {
    const slug = file.replace(/\.json$/, '');
    const filePath = path.join(DATA_DIR, file);
    const json = JSON.parse(readFileSync(filePath, 'utf-8'));

    // Skip if already has local image
    if (json?.gallery?.main?.startsWith('/exercises/')) continue;
    if (json?.gallery?.main?.startsWith('http')) continue;

    const name = json?.name?.en ?? json?.name ?? slug;
    const parts = slug.split('-').filter(w => w.length > 1);

    results.push({ slug, name, keywords: parts });
  }

  return results.slice(0, flagLimit);
}

// Find best EL match for our exercise
function findMatch(ourSlug: string, keywords: string[], elMap: Map<string, string>): string | null {
  const slugLower = ourSlug.toLowerCase();
  const keywordSet = new Set(keywords.map(k => k.toLowerCase()));

  let best: { score: number; id: string } | null = null;

  for (const [elSlug, id] of elMap.entries()) {
    const elLower = elSlug.toLowerCase();
    const elParts = elSlug.split('-').filter(w => w.length > 1);
    const elSet = new Set(elParts);

    let score = 0;

    // Exact slug match (after stripping common prefixes)
    if (elLower === slugLower) return id;

    // Direct partial: our slug is substring of EL slug or vice versa
    if (elLower.includes(slugLower) || slugLower.includes(elLower)) {
      score = 30;
    }

    // Equipment keyword match
    const equipWords = ['barbell', 'dumbbell', 'kettlebell', 'cable', 'smith', 'machine', 'lever',
                         'bodyweight', 'band', 'landmine', 'sled', 'medicine-ball', 'ez-bar'];
    for (const eq of equipWords) {
      if (slugLower.includes(eq) && elLower.includes(eq)) score += 10;
      if (slugLower.includes(eq) && !elLower.includes(eq)) score -= 5;
      if (!slugLower.includes(eq) && elLower.includes(eq)) score -= 3;
    }

    // Movement keyword match
    const movWords = ['curl', 'press', 'squat', 'deadlift', 'row', 'fly', 'raise', 'extension',
                      'kickback', 'crunch', 'pushup', 'pullup', 'dip', 'shrug', 'thrust',
                      'bridge', 'lunge', 'calf', 'hip', 'abduction', 'adduction', 'plank',
                      'pullover', 'rdl', 'romanian', 'snatch', 'clean', 'jerk', 'press',
                      'face-pull', 'lat-pulldown', 'upright-row', 'bicep', 'tricep', 'chest'];
    for (const mv of movWords) {
      if (keywordSet.has(mv) && elSet.has(mv)) score += 5;
    }

    // Exact last-part match (e.g. "curl" in both)
    const ourLast = keywords[keywords.length - 1]?.toLowerCase();
    const elLast = elParts[elParts.length - 1]?.toLowerCase();
    if (ourLast && elLast) {
      if (ourLast === elLast) score += 20;
      else if (ourLast.length > 3 && elLast.includes(ourLast)) score += 10;
    }

    if (score > 25 && (!best || score > best.score)) {
      best = { score, id };
    }
  }

  return best?.id ?? null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadImage(url: string, dest: string): Promise<number> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) throw new Error('file too small');
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, buf);
  return buf.length;
}

async function patchGallery(slug: string, mainPath: string) {
  const file = path.join(DATA_DIR, `${slug}.json`);
  const raw = readFileSync(file, 'utf-8');
  const json = JSON.parse(raw);
  json.gallery ??= { main: null, views: [], caption_vi: '' };
  json.gallery.main = mainPath;
  await fs.writeFile(file, JSON.stringify(json, null, 2) + '\n', 'utf-8');
}

async function main() {
  const elMap = loadElMap();
  const needs = loadNeedsImages();

  console.log(`EL map: ${elMap.size} entries`);
  console.log(`Needs images: ${needs.length} exercises\n`);

  let ok = 0, miss = 0, fail = 0;

  for (let i = 0; i < needs.length; i++) {
    const { slug, name, keywords } = needs[i];
    const elId = findMatch(slug, keywords, elMap);

    if (!elId) {
      console.log(`[${i + 1}/${needs.length}] ${slug} … NO_MATCH`);
      miss++;
      continue;
    }

    const paddedId = String(elId).padStart(6, '0');
    const url = `${THUMB_CDN}/${paddedId}01_1.jpg`;
    const dest = path.join(OUT_DIR, `${slug}.jpg`);

    try {
      const size = await downloadImage(url, dest);
      await patchGallery(slug, `/exercises/${slug}.jpg`);
      console.log(`[${i + 1}/${needs.length}] ${slug} (${name}) → EL:${elId} OK ${size}b → ${slug}.jpg`);
      ok++;
    } catch (err: any) {
      console.log(`[${i + 1}/${needs.length}] ${slug} (${name}) → EL:${elId} FAIL: ${err.message}`);
      fail++;
    }

    if (i < needs.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nDone. ${ok} ok, ${miss} no match, ${fail} failed.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
