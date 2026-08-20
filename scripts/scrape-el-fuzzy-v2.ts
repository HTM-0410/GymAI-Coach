#!/usr/bin/env node
/**
 * scripts/scrape-el-fuzzy-v2.ts
 *
 * Improved fuzzy matching for remaining 175 exercises using:
 * 1. EL full list (186 exercises scraped)
 * 2. EL slug map (602 entries)
 * 3. Levenshtein distance + keyword scoring
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const DATA_DIR    = path.join(process.cwd(), 'data', 'exercises');
const OUT_DIR    = path.join(process.cwd(), 'public', 'exercises');
const EL_LIST    = path.join(process.cwd(), 'scripts', '.el-full-list.json');
const SLUG_MAP   = path.join(process.cwd(), 'scripts', '.exerciselibrary-slug-map.json');
const THUMB_CDN  = 'https://pub-51593a4f184f42908b6377b56bf19486.r2.dev/thumbs/male';
const CONCURRENCY = 6;
const DELAY_MS    = 150;

interface ELEx {
  id: string; name: string; exercise_type: string; gender: string;
  body_part: string; equipment: string; target: string | null; synergist: string | null;
}

// ── Levenshtein ──────────────────────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ── Slugify ──────────────────────────────────────────────────────────────────
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Score match ──────────────────────────────────────────────────────────────
function scoreMatch(ourSlug: string, elSlug: string): number {
  const ours = ourSlug.toLowerCase();
  const els = elSlug.toLowerCase();

  if (ours === els) return 100;
  if (ours.includes(els) || els.includes(ours)) return 80;

  const ourParts = new Set(ours.split('-').filter(w => w.length > 2));
  const elParts = new Set(els.split('-').filter(w => w.length > 2));

  let score = 0;
  const equipWords = ['barbell', 'dumbbell', 'kettlebell', 'cable', 'smith', 'machine',
    'bodyweight', 'band', 'landmine', 'ez-bar', 'trap-bar', 'calf-raise', 'chest-press',
    'leg-press', 'hack-squat', 'pulldown', 'seated', 'standing', 'incline', 'bench',
    'pull-up', 'pullup', 'chin-up', 'dip', 'push-up'];
  for (const eq of equipWords) {
    if (ours.includes(eq) && els.includes(eq)) score += 15;
    if (ours.includes(eq) && !els.includes(eq)) score -= 5;
    if (!ours.includes(eq) && els.includes(eq)) score -= 3;
  }

  const movWords = ['curl', 'press', 'squat', 'deadlift', 'row', 'fly', 'raise',
    'extension', 'kickback', 'crunch', 'shrug', 'thrust', 'bridge', 'lunge',
    'calf', 'hip', 'abduction', 'adduction', 'plank', 'pullover', 'rdl', 'romanian',
    'snatch', 'clean', 'jerk', 'face-pull', 'lat-pulldown', 'upright-row', 'lateral'];
  for (const mv of movWords) {
    if (ourParts.has(mv) && elParts.has(mv)) score += 8;
  }

  const ourLast = Array.from(ourParts).pop() ?? '';
  const elLast = Array.from(elParts).pop() ?? '';
  if (ourLast && elLast && ourLast === elLast) score += 25;
  if (ourLast && elLast && ourLast.length > 3 && (elLast.includes(ourLast) || ourLast.includes(elLast))) score += 12;

  const name1 = ours.replace(/-/g, '');
  const name2 = els.replace(/-/g, '');
  if (name1 === name2) score += 60;
  const sim = 1 - levenshtein(name1, name2) / Math.max(name1.length, name2.length, 1);
  if (sim > 0.7) score += Math.round(sim * 20);

  return score;
}

// ── Download ─────────────────────────────────────────────────────────────────
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
  const raw = await fs.readFile(file, 'utf-8');
  const json = JSON.parse(raw);
  json.gallery ??= { main: null, views: [], caption_vi: '' };
  json.gallery.main = mainPath;
  await fs.writeFile(file, JSON.stringify(json, null, 2) + '\n', 'utf-8');
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── Batch runner ──────────────────────────────────────────────────────────────
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

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const elList: ELEx[] = JSON.parse(await fs.readFile(EL_LIST, 'utf-8'));
  const slugMap: Record<string, string> = JSON.parse(await fs.readFile(SLUG_MAP, 'utf-8'));

  // Build reverse lookup maps
  const elNameToId = new Map<string, string>();
  const elNameNormToId = new Map<string, string>();
  const elSlugNormToId = new Map<string, string>();

  for (const ex of elList) {
    elNameToId.set(ex.name.toLowerCase(), ex.id);
    elNameNormToId.set(ex.name.toLowerCase().replace(/[^a-z0-9]/g, ''), ex.id);
    const slug = slugify(ex.name);
    elSlugNormToId.set(slug, ex.id);
  }

  const slugNormToId = new Map<string, string>();
  for (const [elSlug, id] of Object.entries(slugMap)) {
    slugNormToId.set(elSlug.replace(/-/g, ''), id);
  }

  // Find exercises missing images
  const files = await fs.readdir(DATA_DIR);
  const needsImage: Array<{ slug: string; name: string }> = [];

  for (const file of files) {
    if (!file.endsWith('.json') || file.endsWith('.sample.json') || file === 'exercise.schema.json') continue;
    const slug = file.replace('.json', '');
    const raw = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
    const json = JSON.parse(raw);
    const main = json?.gallery?.main;
    if (!main || (!main.startsWith('/exercises/') && !main.startsWith('http'))) {
      needsImage.push({ slug, name: json?.name?.en ?? json?.name ?? slug });
    }
  }

  console.log(`Needs images: ${needsImage.length} | EL list: ${elList.length} | Slug map: ${Object.keys(slugMap).length}\n`);

  // Match function
  function findBestMatch(ourSlug: string, ourName: string): string | null {
    const candidates: Array<{ id: string; score: number }> = [];

    for (const ex of elList) {
      const elSlug = slugify(ex.name);
      candidates.push({ id: ex.id, score: scoreMatch(ourSlug, elSlug) });
    }
    for (const [elSlug, id] of Object.entries(slugMap)) {
      candidates.push({ id, score: scoreMatch(ourSlug, elSlug) });
    }
    candidates.sort((a, b) => b.score - a.score);

    const best = candidates[0];
    if (best && best.score >= 30) return best.id;

    // Name-based fallback
    const norm = ourName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return elNameNormToId.get(norm)
      ?? slugNormToId.get(norm.replace(/-/g, ''))
      ?? elNameToId.get(ourName.toLowerCase())
      ?? null;
  }

  let ok = 0, miss = 0, fail = 0;
  const unmatched: string[] = [];

  await runBatches(
    needsImage,
    CONCURRENCY,
    async ({ slug, name }) => {
      const elId = findBestMatch(slug, name);
      if (!elId) return { ok: false, reason: 'NO_MATCH', slug, elId: null };
      const paddedId = String(elId).padStart(6, '0');
      const url = `${THUMB_CDN}/${paddedId}01_1.jpg`;
      const dest = path.join(OUT_DIR, `${slug}.jpg`);
      try {
        const size = await downloadImage(url, dest);
        await patchGallery(slug, `/exercises/${slug}.jpg`);
        return { ok: true, reason: 'OK', slug, elId, size };
      } catch (err: any) {
        return { ok: false, reason: 'FAIL:' + err.message, slug, elId };
      }
    },
    async ({ slug, name }, result) => {
      if (!result.ok) {
        console.log(`  ${slug} (${name}) → ${result.elId ? `EL:${result.elId} ` : ''}${result.reason}`);
        if (!result.elId) { miss++; unmatched.push(slug); }
        else fail++;
      } else {
        console.log(`  ${slug} → OK ${result.size}b`);
        ok++;
      }
    },
  );

  console.log(`\nDone. ${ok} ok, ${miss} no match, ${fail} failed.`);
  if (unmatched.length > 0) {
    await fs.writeFile(
      path.join(process.cwd(), 'scripts', '.unmatched-slugs.json'),
      JSON.stringify(unmatched, null, 2),
      'utf-8'
    );
    console.log(`Saved unmatched (${unmatched.length}) → scripts/.unmatched-slugs.json`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
