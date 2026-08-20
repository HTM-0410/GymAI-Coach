/**
 * EQUIPMENT RESOLVER — GymAI Coach
 * ════════════════════════════════════════════════════════════════════════════════
 * Match input string (tiếng Việt hoặc tiếng Anh) về canonical {slug, en, vi}.
 *
 * Source-of-truth: EQUIPMENT_CATALOG trong equipment-catalog.ts.
 *
 * Algorithm:
 *   1. Normalize input (lowercase, trim, strip diacritics optional)
 *   2. Exact match against name, name_vi, aliases_vi, aliases_en
 *   3. Fuzzy match (Levenshtein ≤ 2) cho typos
 *   4. Trả { slug, en, vi, confidence } hoặc null nếu không match
 *
 * Mục tiêu: bất kỳ input nào (EN/VI/typo/abbreviation) đều resolve về 1 canonical.
 *
 * Usage:
 *   import { resolveEquipment, normalizeEquipment } from '@/data/equipment/equipment-resolver';
 *   const r = resolveEquipment('Thanh đòn');
 *   // → { slug: 'barbell', en: 'Barbell', vi: 'Thanh tạ đòn', confidence: 0.95 }
 */

import {
  EQUIPMENT_CATALOG,
  buildVietnameseSlugMap,
  type EquipmentCatalogRow,
} from './equipment-catalog';

// ─── TYPES ────────────────────────────────────────────────────────────────────
export type EquipmentResolution = {
  slug: string;
  en: string;
  vi: string;
  category: EquipmentCatalogRow['category'];
  confidence: number;        // 1.0 = exact match, <1.0 = fuzzy/alias
  matchedBy: 'name' | 'alias_vi' | 'alias_en' | 'fuzzy' | 'none';
};

// ─── NORMALIZATION ───────────────────────────────────────────────────────────
/**
 * Lowercase + trim + collapse spaces + remove common punctuation.
 * Giữ nguyên dấu tiếng Việt — không strip diacritics để tránh collision
 * (vd: "máy" vs "may" là 2 từ khác nhau trong tiếng Việt gym context).
 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[.,;:()\[\]"]/g, '')
    .replace(/\s+/g, ' ');
}

// ─── INDEX ───────────────────────────────────────────────────────────────────
interface IndexEntry {
  slug: string;
  en: string;
  vi: string;
  category: EquipmentCatalogRow['category'];
  matchedBy: EquipmentResolution['matchedBy'];
}

const INDEX: Map<string, IndexEntry> = (() => {
  const map = new Map<string, IndexEntry>();
  for (const row of EQUIPMENT_CATALOG) {
    const entry: IndexEntry = {
      slug: row.slug,
      en: row.name,
      vi: row.name_vi,
      category: row.category,
      matchedBy: 'name',
    };

    // Index canonical names (highest priority)
    map.set(normalize(row.name), { ...entry, matchedBy: 'name' });
    map.set(normalize(row.name_vi), { ...entry, matchedBy: 'name' });
    map.set(normalize(row.slug), { ...entry, matchedBy: 'name' });

    // Index aliases
    for (const a of row.aliases_vi ?? []) {
      const key = normalize(a);
      if (!map.has(key)) {
        map.set(key, { ...entry, matchedBy: 'alias_vi' });
      }
    }
    for (const a of row.aliases_en ?? []) {
      const key = normalize(a);
      if (!map.has(key)) {
        map.set(key, { ...entry, matchedBy: 'alias_en' });
      }
    }
  }
  return map;
})();

// ─── LEVENSHTEIN ─────────────────────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

// ─── MAIN RESOLVER ───────────────────────────────────────────────────────────
/**
 * Resolve input string về canonical equipment.
 * @returns EquipmentResolution hoặc null nếu không match được.
 */
export function resolveEquipment(input: string | null | undefined): EquipmentResolution | null {
  if (!input) return null;
  const key = normalize(input);
  if (!key) return null;

  // 1. Exact match trong index
  const hit = INDEX.get(key);
  if (hit) {
    return {
      slug: hit.slug,
      en: hit.en,
      vi: hit.vi,
      category: hit.category,
      confidence: hit.matchedBy === 'name' ? 1.0 : 0.95,
      matchedBy: hit.matchedBy,
    };
  }

  // 2. Fuzzy match (Levenshtein ≤ 2) cho typos
  let best: { entry: IndexEntry; dist: number } | null = null;
  for (const [k, entry] of INDEX.entries()) {
    const dist = levenshtein(key, k);
    if (dist <= 2 && (!best || dist < best.dist)) {
      best = { entry, dist };
    }
  }
  if (best) {
    const conf = 1 - best.dist * 0.1;   // dist=1 → 0.9, dist=2 → 0.8
    return {
      slug: best.entry.slug,
      en: best.entry.en,
      vi: best.entry.vi,
      category: best.entry.category,
      confidence: Math.max(0.7, conf),
      matchedBy: 'fuzzy',
    };
  }

  return null;
}

// ─── BATCH ────────────────────────────────────────────────────────────────────
/**
 * Resolve nhiều equipment strings cùng lúc.
 * Input: ["Thanh đòn", "cable", "unknown-thing"]
 * Output: [{ slug: 'barbell', ... }, { slug: 'cable', ... }, null]
 */
export function resolveEquipmentList(inputs: string[]): Array<EquipmentResolution | null> {
  return inputs.map(resolveEquipment);
}

// ─── BILINGUAL LOOKUP ────────────────────────────────────────────────────────
/**
 * Trả canonical {en, vi} cho 1 slug.
 */
export function getCanonical(slug: string): { en: string; vi: string } | null {
  const row = EQUIPMENT_CATALOG.find((r) => r.slug === slug);
  if (!row) return null;
  return { en: row.name, vi: row.name_vi };
}

/**
 * Trả canonical array cho 1 list slug.
 * Dùng để ghi equipment vào exercise JSON: luôn có cả EN + VI.
 */
export function getCanonicalList(slugs: string[]): Array<{ en: string; vi: string }> {
  return slugs
    .map(getCanonical)
    .filter((x): x is { en: string; vi: string } => x !== null);
}

// ─── DIAGNOSTICS ─────────────────────────────────────────────────────────────
/**
 * Thống kê coverage: bao nhiêu % inputs có thể resolve được.
 * Dùng để audit catalog: nếu nhiều input fail, cần bổ sung alias.
 */
export function coverageReport(inputs: string[]): {
  total: number;
  resolved: number;
  unresolved: string[];
  byMatchedBy: Record<EquipmentResolution['matchedBy'], number>;
} {
  const unresolved: string[] = [];
  const byMatchedBy: Record<EquipmentResolution['matchedBy'], number> = {
    name: 0,
    alias_vi: 0,
    alias_en: 0,
    fuzzy: 0,
    none: 0,
  };
  let resolved = 0;
  for (const input of inputs) {
    const r = resolveEquipment(input);
    if (r) {
      resolved++;
      byMatchedBy[r.matchedBy]++;
    } else {
      unresolved.push(input);
      byMatchedBy.none++;
    }
  }
  return { total: inputs.length, resolved, unresolved, byMatchedBy };
}

// ─── LEGACY COMPAT ───────────────────────────────────────────────────────────
/** Backward compat — wrap cho buildVietnameseSlugMap (chỉ trả slug). */
export function getSlug(input: string): string | null {
  return resolveEquipment(input)?.slug ?? null;
}

/** Backward compat alias cho buildVietnameseSlugMap(). */
export function buildEquipmentSlugMap(): Map<string, string> {
  return buildVietnameseSlugMap();
}