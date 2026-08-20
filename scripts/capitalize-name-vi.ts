/**
 * CAPITALIZE name_vi CHO 1,324 BÀI TẬP — GymAI Coach
 * ════════════════════════════════════════════════════════════════════════════════
 * Rule: Title Case mọi từ — viết hoa chữ cái đầu của TỪNG từ.
 *   - Giữ nguyên số ("360", "5x5")
 *   - Giữ nguyên acronym toàn chữ in hoa nếu user đã viết ("TNT", "HIIT") — phát hiện bằng >=2 chữ cái liên tiếp IN HOA
 *   - Không động vào cột khác; chỉ update `name_vi`
 *
 * Usage:
 *   npx tsx scripts/capitalize-name-vi.ts --dry-run           # in 30 m�u trước/sau, không ghi DB
 *   npx tsx scripts/capitalize-name-vi.ts --limit 200 --apply # áp dụng 200 bài đầu
 *   npx tsx scripts/capitalize-name-vi.ts --apply             # áp dụng tất cả bài cần đổi
 *   npx tsx scripts/capitalize-name-vi.ts --slug xxx --apply  # chỉ 1 bài
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { capitalizeVi } from './_capitalize-vi-rule';

// ─── ENV ─────────────────────────────────────────────────────────────────────
try {
  const txt = readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !m[1].startsWith('#') && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase URL/KEY missing');
  process.exit(1);
}

// ─── CLI ARGS ─────────────────────────────────────────────────────────────────
const APPLY = process.argv.includes('--apply');
const DRY_RUN = !APPLY || process.argv.includes('--dry-run');
const _limitArg = process.argv.find((a) => a.startsWith('--limit'));
const LIMIT = _limitArg
  ? Number(_limitArg.includes('=') ? _limitArg.split('=')[1] : process.argv[process.argv.indexOf(_limitArg) + 1])
  : 0;
const _slugIdx = process.argv.indexOf('--slug');
const SLUG_FILTER = _slugIdx >= 0 ? process.argv[_slugIdx + 1] : '';

const PREVIEW_N = 30;

// ─── CAPITALIZE RULE ──────────────────────────────────────────────────────────
// Rule imported from _capitalize-vi-rule.ts (testable in isolation).

// ─── DB ──────────────────────────────────────────────────────────────────────
async function fetchAllExercises(): Promise<{ id: string; slug: string; name_vi: string | null }[]> {
  const c = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const PAGE = 1000;
  const all: { id: string; slug: string; name_vi: string | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await c
      .from('exercises')
      .select('id, slug, name_vi')
      .eq('type', 'system')
      .eq('status', 'published')
      .is('owner_user_id', null)
      .order('name_vi', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    all.push(...chunk);
    if (chunk.length < PAGE) break;
  }
  return all;
}

async function updateOne(slug: string, newNameVi: string): Promise<boolean> {
  const c = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { error } = await c.from('exercises').update({ name_vi: newNameVi }).eq('slug', slug);
  return !error;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Loading exercises from Supabase...');
  let rows = await fetchAllExercises();
  console.log(`  total: ${rows.length}`);

  if (SLUG_FILTER) {
    rows = rows.filter((r) => r.slug === SLUG_FILTER);
    console.log(`  slug filter "${SLUG_FILTER}": ${rows.length}`);
  }
  if (LIMIT > 0) {
    rows = rows.slice(0, LIMIT);
    console.log(`  limit: ${rows.length}`);
  }

  // Compute diffs
  type Diff = { id: string; slug: string; from: string | null; to: string };
  const diffs: Diff[] = [];
  let unchangedCount = 0;
  for (const r of rows) {
    if (!r.name_vi) continue;
    const to = capitalizeVi(r.name_vi);
    if (to !== r.name_vi) {
      diffs.push({ id: r.id, slug: r.slug, from: r.name_vi, to });
    } else {
      unchangedCount++;
    }
  }

  console.log(`  will change: ${diffs.length}`);
  console.log(`  unchanged : ${unchangedCount}`);

  // Preview
  console.log('\n────────────── PREVIEW (first 30) ──────────────');
  for (const d of diffs.slice(0, PREVIEW_N)) {
    console.log(`  ${d.slug}`);
    console.log(`    - ${d.from}`);
    console.log(`    + ${d.to}`);
  }
  if (diffs.length > PREVIEW_N) console.log(`  … and ${diffs.length - PREVIEW_N} more`);

  if (DRY_RUN || !APPLY) {
    console.log('\n[DRY-RUN] No changes written to DB.');
    console.log('Re-run with --apply to commit.');
    return;
  }

  console.log('\n────────────── APPLYING TO DB ──────────────');
  let ok = 0;
  let fail = 0;
  const BATCH = 50;
  for (let i = 0; i < diffs.length; i += BATCH) {
    const slice = diffs.slice(i, i + BATCH);
    const results = await Promise.all(slice.map(async (d) => ({ slug: d.slug, ok: await updateOne(d.slug, d.to) })));
    for (const r of results) {
      if (r.ok) ok++;
      else fail++;
    }
    console.log(`  ${Math.min(i + BATCH, diffs.length)}/${diffs.length}  ok=${ok} fail=${fail}`);
  }
  console.log(`\nDone. ok=${ok} fail=${fail}`);
}

main().catch((err) => {
  console.error('\n💥 Fatal:', err);
  process.exit(1);
});
