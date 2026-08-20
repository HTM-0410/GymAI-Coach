/**
 * BENCH DETECTION VIA VISION — GymAI Coach
 * Scan exercises without "Ghế tập" tag, use Gemini Vision to find bench.
 * Run: npx tsx scripts/detect-bench-via-vision.ts [--dry-run] [--all] [--limit N] [--batch N]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient as createSupabase } from '@supabase/supabase-js';

// ENV
try {
  const txt = readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !m[1].startsWith('#') && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const GEMINI_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_MODEL = process.env.GEMINI_VISION_MODEL ?? 'gemini-3.5-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const CACHE_PATH = path.join(process.cwd(), 'data', 'equipment', '.bench-detect-cache.json');

// CLI
const DRY_RUN = process.argv.includes('--dry-run');
const ALL = process.argv.includes('--all');
const APPLY = process.argv.includes('--apply');
const APPLY_ONLY = process.argv.includes('--apply-only');
const _limitArg = process.argv.find((a) => a.startsWith('--limit'));
const LIMIT = _limitArg
  ? Number(_limitArg.includes('=') ? _limitArg.split('=')[1] : process.argv[process.argv.indexOf(_limitArg) + 1])
  : 0;
const _batchArg = process.argv.find((a) => a.startsWith('--batch'));
const BATCH_SIZE = _batchArg
  ? Number(_batchArg.includes('=') ? _batchArg.split('=')[1] : process.argv[process.argv.indexOf(_batchArg) + 1])
  : 20;
const REQ_INTERVAL_MS = 4000;

// TYPES
type Candidate = {
  slug: string;
  name: string;
  name_vi: string;
  equipment_vi: string[];
  gallery_json: { main?: string };
};

// DB
async function fetchCandidates(): Promise<Candidate[]> {
  const supabase = createSupabase(SUPABASE_URL, SUPABASE_KEY);
  const all: Candidate[] = [];
  const PAGE = 500;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('exercises')
      .select('slug, name, name_vi, equipment_vi, gallery_json')
      .eq('type', 'system')
      .eq('status', 'published')
      .is('owner_user_id', null)
      .not('gallery_json->>main', 'is', null)
      .order('slug', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = ((data ?? []) as Candidate[]).map((c) => ({
      slug: c.slug,
      name: c.name,
      name_vi: c.name_vi,
      equipment_vi: c.equipment_vi ?? [],
      gallery_json:
        typeof c.gallery_json === 'string'
          ? JSON.parse(c.gallery_json)
          : c.gallery_json ?? {},
    }));
    const filtered = chunk.filter((c) => {
      const eqs = c.equipment_vi ?? [];
      return !eqs.some(
        (e) =>
          e.toLowerCase().includes('ghế tập') ||
          e.toLowerCase().includes('ghế hyperextension') ||
          e.toLowerCase().includes('ghế tập bụng'),
      );
    });
    all.push(...filtered);
    if (chunk.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// CACHE
type CacheEntry = { has_bench: true; bench_type?: string; reason?: string };
async function loadCache(): Promise<Map<string, CacheEntry>> {
  try {
    const raw = readFileSync(CACHE_PATH, 'utf8');
    return new Map(Object.entries(JSON.parse(raw) as Record<string, CacheEntry>));
  } catch {
    return new Map();
  }
}

function saveCache(m: Map<string, CacheEntry>) {
  writeFileSync(CACHE_PATH, JSON.stringify(Object.fromEntries(m), null, 2));
}

// IMAGE FETCH
async function fetchAsBase64(url: string): Promise<{ data: string; mime: string } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get('content-type') ?? 'image/jpeg';
    return { data: buf.toString('base64'), mime };
  } catch {
    return null;
  }
}

// GEMINI
async function callGeminiVision(
  images: Array<{ data: string; mime: string; slug: string }>,
): Promise<Record<string, { has_bench: boolean; bench_type?: string; reason?: string }>> {
  if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY missing');

  const prompt = `For each image below, identify whether the exercise uses a gym bench (flat bench, incline bench, decline bench, preacher bench, hyperextension bench, ab bench). Return ONLY JSON: {"results":[{"idx":N,"slug":"<slug>","has_bench":true|false,"bench_type":"flat"|"incline"|"decline"|"ab"|"preacher"|"hyperextension"|"other","reason":"<one short sentence>"}]}`;

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    parts.push({ text: `idx=${i + 1} slug=${img.slug}` });
    parts.push({ inline_data: { mime_type: img.mime, data: img.data } });
  }

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
      response_mime_type: 'application/json',
    },
  };

  const res = await fetch(`${ENDPOINT}?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

  try {
    const parsed = JSON.parse(text);
    const out: Record<string, { has_bench: boolean; bench_type?: string; reason?: string }> = {};
    for (const r of parsed.results ?? []) {
      out[r.slug] = {
        has_bench: !!r.has_bench,
        bench_type: r.bench_type,
        reason: r.reason,
      };
    }
    return out;
  } catch (e) {
    console.error('  [parse-error]', text.slice(0, 200));
    return {};
  }
}

// MAIN
async function main() {
  // ─── APPLY-ONLY mode: apply from cache without re-scanning ───
  if (APPLY_ONLY) {
    const cache = await loadCache();
    const candidates = await fetchCandidates();
    const benchEntries = [...cache.entries()].filter(([, v]) => v.has_bench);
    console.log(`[apply-only] ${benchEntries.length} bench detections in cache`);

    const typeToVN: Record<string, string> = {
      flat: 'Ghế tập phẳng',
      incline: 'Ghế tập nghiêng',
      decline: 'Ghế tập nghiêng dưới',
      ab: 'Ghế tập bụng',
      preacher: 'Ghế preacher',
      hyperextension: 'Ghế hyperextension',
      other: 'Ghế tập phẳng',
    };

    const supabase = createSupabase(SUPABASE_URL, SUPABASE_KEY);
    let ok = 0, fail = 0, skip = 0;
    for (const [slug, entry] of benchEntries) {
      const c = candidates.find((x) => x.slug === slug);
      if (!c) { skip++; continue; }
      const vnType = typeToVN[entry.bench_type ?? 'other'] ?? 'Ghế tập phẳng';
      const newEq = Array.from(new Set([...(c.equipment_vi ?? []), vnType]));
      const { error } = await supabase
        .from('exercises')
        .update({ equipment_vi: newEq })
        .eq('slug', slug)
        .eq('type', 'system');
      if (error) {
        console.log(`  FAIL ${slug}: ${error.message}`);
        fail++;
      } else {
        ok++;
      }
    }
    console.log(`[apply-only] done. ${ok} updated, ${fail} failed, ${skip} skipped (not in current candidates)`);
    return;
  }

  console.log('[bench-vision] start');
  const candidates = await fetchCandidates();
  console.log(`[bench-vision] ${candidates.length} candidates (no bench tag yet)`);

  const limit = LIMIT > 0 ? LIMIT : ALL ? candidates.length : Math.min(30, candidates.length);
  const subset = candidates.slice(0, limit);
  console.log(`[bench-vision] processing ${subset.length} (batch=${BATCH_SIZE})`);

  const cache = await loadCache();
  const newDetections = new Map<string, CacheEntry>();

  let processed = 0;
  for (let i = 0; i < subset.length; i += BATCH_SIZE) {
    const batch = subset.slice(i, i + BATCH_SIZE);
    process.stdout.write(`[batch ${i + 1}-${i + batch.length}] `);

    const imgs = await Promise.all(
      batch.map(async (c) => {
        const url = c.gallery_json?.main;
        if (!url) return null;
        const r = await fetchAsBase64(url);
        return r ? { ...r, slug: c.slug } : null;
      }),
    );
    const valid = imgs.filter((x): x is NonNullable<typeof x> => x !== null);
    console.log(`loaded ${valid.length}/${batch.length}`);

    if (valid.length === 0) continue;

    try {
      const result = await callGeminiVision(valid);
      for (const [slug, info] of Object.entries(result)) {
        if (info.has_bench) {
          const entry: CacheEntry = {
            has_bench: true,
            bench_type: info.bench_type,
            reason: info.reason,
          };
          newDetections.set(slug, entry);
          cache.set(slug, entry);
        }
      }
      processed += valid.length;
      saveCache(cache);
      console.log(`  ok (${processed}/${subset.length}) — bench total: ${newDetections.size}`);
    } catch (e) {
      console.log(`  ERR: ${(e as Error).message}`);
    }

    if (i + BATCH_SIZE < subset.length) {
      await new Promise((r) => setTimeout(r, REQ_INTERVAL_MS));
    }
  }

  console.log('\n[bench-vision] DONE');
  console.log(`  Detected ${newDetections.size} exercises with bench in this run`);
  console.log(`  Cache total: ${cache.size} slugs`);

  if (newDetections.size > 0) {
    console.log('\n[bench-vision] newly detected:');
    for (const slug of newDetections.keys()) {
      const ex = candidates.find((c) => c.slug === slug);
      console.log(`  - ${slug} | ${ex?.name ?? ''} | ${ex?.name_vi ?? ''}`);
    }
  }

  // ─── APPLY ─────────────────────────────────────────────────────────────────
  if (APPLY || APPLY_ONLY) {
    // Use cache (covers all previous detections including from this run).
    const benchEntries = [...cache.entries()].filter(([, v]) => v.has_bench);
    if (benchEntries.length === 0) {
      console.log('\n[apply] nothing to apply (cache empty or no bench detected)');
      return;
    }

    const typeToVN: Record<string, string> = {
      flat: 'Ghế tập phẳng',
      incline: 'Ghế tập nghiêng',
      decline: 'Ghế tập nghiêng dưới',
      ab: 'Ghế tập bụng',
      preacher: 'Ghế preacher',
      hyperextension: 'Ghế hyperextension',
      other: 'Ghế tập phẳng',
    };

    console.log(`\n[apply] updating ${benchEntries.length} exercises...`);
    const supabase = createSupabase(SUPABASE_URL, SUPABASE_KEY);
    let ok = 0, fail = 0, skip = 0;
    for (const [slug, entry] of benchEntries) {
      const c = candidates.find((x) => x.slug === slug);
      if (!c) { skip++; continue; }
      const vnType = typeToVN[entry.bench_type ?? 'other'] ?? 'Ghế tập phẳng';
      const newEq = Array.from(new Set([...(c.equipment_vi ?? []), vnType]));
      const { error } = await supabase
        .from('exercises')
        .update({ equipment_vi: newEq })
        .eq('slug', slug)
        .eq('type', 'system');
      if (error) {
        console.log(`  FAIL ${slug}: ${error.message}`);
        fail++;
      } else {
        ok++;
      }
    }
    console.log(`[apply] done. ${ok} updated, ${fail} failed, ${skip} skipped`);
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});