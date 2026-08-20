#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * scripts/scrape-equipment-images.ts
 *
 * Download a thumbnail image for each equipment row from Unsplash Search API
 * and write it to /public/equipment/{slug}.jpg. Then update equipment.image_url.
 *
 * Idempotent: skips slugs that already have a non-empty local file.
 *
 * Required env vars:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - UNSPLASH_ACCESS_KEY   (https://unsplash.com/developers, free tier 50 req/h)
 *
 * Usage:
 *   npx tsx scripts/scrape-equipment-images.ts             # all
 *   npx tsx scripts/scrape-equipment-images.ts --limit 10  # first 10
 *   npx tsx scripts/scrape-equipment-images.ts --force     # re-download everything
 *   npx tsx scripts/scrape-equipment-images.ts --only barbell,dumbbell
 */

import { readFileSync, existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local inline (no dotenv dep)
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const txt = readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m && !m[1].startsWith('#') && !process.env[m[1]]) {
        let v = m[2];
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        process.env[m[1]] = v;
      }
    }
  } catch {}
}

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
if (!UNSPLASH_KEY) {
  console.error(
    'Missing UNSPLASH_ACCESS_KEY. Get one free at https://unsplash.com/developers\n' +
    'Add it to .env.local as UNSPLASH_ACCESS_KEY=...'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// CLI args
const args = new Set(process.argv.slice(2));
const flagForce  = args.has('--force');
const flagLimit  = (() => {
  const i = process.argv.indexOf('--limit');
  return i !== -1 ? Number(process.argv[i + 1]) : Infinity;
})();
const flagOnly   = (() => {
  const i = process.argv.indexOf('--only');
  return i !== -1 ? new Set(process.argv[i + 1].split(',').map(s => s.trim())) : null;
})();

const PUBLIC_DIR = path.join(process.cwd(), 'public', 'equipment');
const DELAY_MS   = 1500; // Unsplash free tier = 50 req/h → throttle

type Equipment = { id: string; slug: string; name: string; name_vi: string | null; image_url: string | null };

async function ensureDir() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
}

async function searchUnsplash(query: string): Promise<string | null> {
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '1');
  url.searchParams.set('orientation', 'squarish');
  url.searchParams.set('content_filter', 'high');

  const res = await fetch(url, { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } });
  if (!res.ok) {
    console.warn(`  unsplash search failed (${res.status}): ${query}`);
    return null;
  }
  const json: any = await res.json();
  return json?.results?.[0]?.urls?.regular ?? null;
}

async function downloadToFile(url: string, dest: string): Promise<number> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
  return buf.length;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  await ensureDir();

  const { data: rows, error } = await supabase
    .from('equipment')
    .select('id,slug,name,name_vi,image_url')
    .order('category', { ascending: true })
    .order('name_vi', { ascending: true });

  if (error) throw error;
  let items: Equipment[] = (rows ?? []) as Equipment[];

  if (flagOnly) items = items.filter((e) => flagOnly!.has(e.slug));
  if (!flagForce) {
    // skip ones already done (we treat destination file presence as the marker)
    const filtered: Equipment[] = [];
    for (const e of items) {
      const dest = path.join(PUBLIC_DIR, `${e.slug}.jpg`);
      try {
        const s = await fs.stat(dest);
        if (s.size > 1024) continue; // already a real image
      } catch { /* missing → fetch */ }
      filtered.push(e);
    }
    items = filtered;
  }
  items = items.slice(0, flagLimit);

  console.log(`To download: ${items.length} equipment images`);
  if (items.length === 0) return;

  let success = 0, skipped = 0;
  for (const e of items) {
    const query = `${e.name_vi ?? e.name} gym equipment`;
    process.stdout.write(`[${success + skipped + 1}/${items.length}] ${e.slug} … `);
    try {
      const imgUrl = await searchUnsplash(query);
      if (!imgUrl) { console.log('NO_RESULT'); skipped++; await sleep(DELAY_MS); continue; }
      const dest = path.join(PUBLIC_DIR, `${e.slug}.jpg`);
      const size = await downloadToFile(imgUrl, dest);
      const imagePath = `/equipment/${e.slug}.jpg`;
      const { error: upErr } = await supabase
        .from('equipment').update({ image_url: imagePath }).eq('id', e.id);
      if (upErr) throw upErr;
      console.log(`OK (${(size / 1024).toFixed(1)}KB) → ${imagePath}`);
      success++;
    } catch (err: any) {
      console.log(`ERR: ${err?.message ?? err}`);
      skipped++;
    }
    await sleep(DELAY_MS);
  }

  console.log(`\nDone. ${success} success, ${skipped} skipped/failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
