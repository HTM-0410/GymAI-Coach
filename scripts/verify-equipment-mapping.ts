/**
 * VERIFY EQUIPMENT MAPPING — GymAI Coach
 * ════════════════════════════════════════════════════════════════════════════════
 * Re-check toàn bộ equipment trong data/exercises/*.json so với catalog và
 * cache. Phát hiện:
 *   1. Equipment không tồn tại trong catalog (typos, sai alias)
 *   2. Equipment mismatch với LLM suggestion
 *   3. Coverage stats (bao nhiêu % bài đã được map đúng)
 *
 * Usage:
 *   npx tsx scripts/verify-equipment-mapping.ts
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { EQUIPMENT_CATALOG, buildVietnameseSlugMap } from '../data/equipment/equipment-catalog';

const ROOT = process.cwd();
const CACHE_FILE = path.join(ROOT, 'data/equipment/.llm-mapping-cache.json');
const EXERCISES_DIR = path.join(ROOT, 'data/exercises');

interface CacheEntry {
  slug: string;
  confidence: number;
  reasoning: string;
  is_mismatch: boolean;
}

interface Exercise {
  slug: string;
  name: string;
  name_vi: string;
  equipment: Array<string | { vi?: string; en?: string }>;
}

function equipmentLabels(item: Exercise['equipment'][number]): string[] {
  if (typeof item === 'string') return [item];
  return [item.vi, item.en].filter((value): value is string => typeof value === 'string');
}

function resolveEquipmentItem(
  item: Exercise['equipment'][number] | undefined,
  slugMap: Map<string, string>,
): string | null {
  if (!item) return null;
  for (const label of equipmentLabels(item)) {
    const slug = slugMap.get(label.toLowerCase().trim());
    if (slug) return slug;
  }
  return null;
}

function displayEquipmentItem(item: Exercise['equipment'][number] | undefined): string {
  if (!item) return '∅';
  return typeof item === 'string' ? item : item.vi ?? item.en ?? '∅';
}

async function main() {
  const cache = JSON.parse(
    await fs.readFile(CACHE_FILE, 'utf-8'),
  ) as Record<string, CacheEntry>;

  const slugMap = buildVietnameseSlugMap();

  const files = (await fs.readdir(EXERCISES_DIR)).filter(
    (f) => f.endsWith('.json') && !f.endsWith('.sample.json'),
  );

  let totalExercises = 0;
  let unknownEquipment = 0;
  let matchesCache = 0;
  let mismatchesCache = 0;
  let noCacheEntry = 0;
  const unknownList: Array<{ slug: string; eq: string }> = [];
  const mismatchList: Array<{
    slug: string;
    current: string;
    suggested: string;
    conf: number;
  }> = [];

  for (const file of files) {
    const raw = await fs.readFile(path.join(EXERCISES_DIR, file), 'utf-8');
    const ex = JSON.parse(raw) as Exercise;
    if (!ex.slug || !Array.isArray(ex.equipment)) continue;
    totalExercises++;

    // Check 1: equipment có trong catalog không?
    for (const eq of ex.equipment ?? []) {
      if (!resolveEquipmentItem(eq, slugMap)) {
        unknownEquipment++;
        unknownList.push({ slug: ex.slug, eq: displayEquipmentItem(eq) });
      }
    }

    // Check 2: cache có mismatch còn apply được không?
    const cacheEntry = cache[ex.slug];
    if (!cacheEntry) {
      noCacheEntry++;
      continue;
    }

    const currentSlug = resolveEquipmentItem(ex.equipment?.[0], slugMap);
    const suggestedSlug = slugMap.get(cacheEntry.slug.toLowerCase().trim()) ?? cacheEntry.slug;
    const suggestionIsValid = EQUIPMENT_CATALOG.some((row) => row.slug === suggestedSlug);
    if (suggestionIsValid && cacheEntry.is_mismatch && currentSlug !== suggestedSlug) {
      mismatchesCache++;
      mismatchList.push({
        slug: ex.slug,
        current: displayEquipmentItem(ex.equipment?.[0]),
        suggested: suggestedSlug,
        conf: cacheEntry.confidence,
      });
    } else {
      matchesCache++;
    }
  }

  // ─── DISTRIBUTION BY SLUG ──────────────────────────────────────────────────
  const slugCounts = new Map<string, number>();
  for (const ex of await loadAll()) {
    const slug = resolveEquipmentItem(ex.equipment?.[0], slugMap) ?? 'UNKNOWN';
    slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
  }

  console.log('═'.repeat(70));
  console.log('  EQUIPMENT MAPPING VERIFICATION REPORT');
  console.log('═'.repeat(70));
  console.log(`Total exercises:    ${totalExercises}`);
  console.log(`Total catalog:      ${EQUIPMENT_CATALOG.length} equipment slugs`);
  console.log('');
  console.log('─ Coverage ──────────────────────────────────────────────────────');
  console.log(`  ✓ Matches old cache: ${matchesCache} (${pct(matchesCache, totalExercises)})`);
  console.log(`  · Stale cache diff:  ${mismatchesCache} (${pct(mismatchesCache, totalExercises)})`);
  console.log(`  · No cache entry:   ${noCacheEntry}`);
  console.log(`  ✗ Unknown equipment: ${unknownEquipment}`);
  console.log('');

  // ─── DISTRIBUTION ──────────────────────────────────────────────────────────
  console.log('─ Equipment Distribution (top 15) ──────────────────────────────');
  const sorted = [...slugCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  for (const [slug, count] of sorted) {
    const row = EQUIPMENT_CATALOG.find((r) => r.slug === slug);
    const label = row ? `${row.name_vi} (${row.category})` : slug;
    console.log(`  ${String(count).padStart(4)}  ${label}`);
  }
  console.log('');

  // ─── UNKNOWN EQUIPMENT ─────────────────────────────────────────────────────
  if (unknownList.length > 0) {
    console.log('─ Unknown Equipment (typos / missing aliases) ─────────────────');
    const grouped = new Map<string, string[]>();
    for (const { slug, eq } of unknownList) {
      if (!grouped.has(eq)) grouped.set(eq, []);
      grouped.get(eq)!.push(slug);
    }
    for (const [eq, slugs] of grouped) {
      console.log(`  ✗ "${eq}" — ${slugs.length} bài: ${slugs.slice(0, 3).join(', ')}${slugs.length > 3 ? '...' : ''}`);
    }
    console.log('');
  }

  // ─── STILL MISMATCHED ──────────────────────────────────────────────────────
  if (mismatchList.length > 0) {
    console.log('─ Informational: differences from old LLM cache (top 30) ─────');
    for (const m of mismatchList.slice(0, 30)) {
      console.log(`  · ${m.slug}: [${m.current}] → [${m.suggested}]  (conf ${m.conf})`);
    }
    if (mismatchList.length > 30) {
      console.log(`  ... và ${mismatchList.length - 30} bài khác`);
    }
    console.log('');
  }

  // ─── RECOMMENDATION ────────────────────────────────────────────────────────
  console.log('─ Recommendation ──────────────────────────────────────────────');
  if (unknownEquipment === 0) {
    console.log('  ✓ Tất cả equipment đều resolve về catalog chuẩn.');
    if (mismatchesCache > 0) {
      console.log('  · Cache LLM cũ không còn là ground truth; không chạy lại apply-equipment-fixes.');
    }
  } else {
    console.log(`  ⚠ Còn ${unknownEquipment} equipment chưa resolve.`);
    console.log('    → Thêm alias vào equipment-catalog.ts rồi chuẩn hóa lại.');
  }
}

async function loadAll(): Promise<Exercise[]> {
  const files = (await fs.readdir(EXERCISES_DIR)).filter(
    (f) => f.endsWith('.json') && !f.endsWith('.sample.json'),
  );
  const items: Exercise[] = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(EXERCISES_DIR, file), 'utf-8');
    const item = JSON.parse(raw) as Exercise;
    if (item.slug && Array.isArray(item.equipment)) items.push(item);
  }
  return items;
}

function pct(n: number, total: number): string {
  return `${((n / total) * 100).toFixed(1)}%`;
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
