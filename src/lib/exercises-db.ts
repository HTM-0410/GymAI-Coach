/**
 * Loader đọc exercises từ Supabase DB (thay cho JSON files).
 *
 * API surface tương thích hoàn toàn với src/lib/exercises.ts cũ để callers
 * không cần đ�i.
 *
 * Strategy:
 *   - Fetch toàn bộ system exercises (1 round-trip với 3 joins)
 *   - Cache in-memory TTL 60s (refresh trong request tiếp theo)
 *   - ISR revalidate=3600 ở page level cũng cache page-level
 *
 * Migration note:
 *   - instructions/tips/common_mistakes đã là jsonb
 *   - gallery_json chứa full gallery object với Storage URLs
 *   - exercise_muscles join cung cấp primary/secondary muscle slugs
 *   - exercise_alternatives join cung cấp alternative exercises
 */

import { createClient } from '@/lib/supabase/server';
import type {
  Exercise,
  ExerciseSummary,
  MovementPattern,
  Difficulty,
  ExerciseType,
} from './exercises-types';
import { matchExerciseSearch } from './exercises-search';

// ─── Types ────────────────────────────────────────────────────────────────
export type ExerciseFilter = {
  q?: string;
  difficulty?: Difficulty;
  movement_pattern?: MovementPattern;
  muscle?: string;
  equipment?: string;
  exercise_type?: ExerciseType;
};

export type ResolvedAlternative = {
  slug: string;
  name_vi: string;
  image?: string | null;
};

// ─── Cache ────────────────────────────────────────────────────────────────
const TTL_MS = 60_000;

interface CacheEntry {
  data: Exercise[];
  expiresAt: number;
}

let _cache: CacheEntry | null = null;

// ─── Row mapper ──────────────────────────────────────────────────────────
type RawRow = {
  id: string;
  slug: string;
  name: string;
  name_vi: string | null;
  subtitle_vi: string | null;
  tags: string[] | null;
  movement_pattern: string | null;
  exercise_type: string | null;
  difficulty: string | null;
  primary_muscle_vi: string | null;
  secondary_muscles_vi: string[] | null;
  equipment_vi: string[] | null;
  description: string | null;
  instructions: unknown;
  tips: unknown;
  common_mistakes: unknown;
  safety_vi: string | null;
  status: string;
  setup_json: any;
  performance_metrics_json: any;
  performance_chart_json: any;
  ai_coach_json: any;
  gallery_json: any;
  content_json: any;
  exercise_muscles: Array<{
    role: 'primary' | 'secondary';
    sort_order: number;
    muscles: { slug: string; name_vi: string | null } | null;
  }> | null;
  exercise_alternatives: Array<{
    reason: string | null;
    sort_order: number;
    alternative: {
      slug: string;
      name_vi: string | null;
      gallery_json: any;
    } | null;
  }> | null;
};

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function rowToExercise(row: RawRow): Exercise {
  const muscles = row.exercise_muscles ?? [];
  const primaryMuscle =
    muscles.find((m) => m.role === 'primary')?.muscles?.name_vi ??
    row.primary_muscle_vi ??
    '';
  const secondaryMuscles = muscles
    .filter((m) => m.role === 'secondary')
    .map((m) => m.muscles?.name_vi ?? '')
    .filter(Boolean);

  const alternatives =
    row.exercise_alternatives
      ?.map((a) => {
        if (!a.alternative) return null;
        return {
          slug: a.alternative.slug,
          name_vi: a.alternative.name_vi ?? '',
          image:
            (a.alternative.gallery_json?.main as string | undefined) ?? undefined,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null) ?? [];

  const gallery = row.gallery_json ?? {
    main: null,
    views: [],
    caption_vi: '',
  };
  // If gallery_json doesn't include the GIF, synthesize from DB row.
  if (gallery && !gallery.animation && row.content_json?.gallery?.animation) {
    gallery.animation = row.content_json.gallery.animation;
  }

  return {
    slug: row.slug,
    name: row.name,
    name_vi: row.name_vi ?? row.name,
    subtitle_vi: row.subtitle_vi ?? '',
    tags: row.tags ?? [],
    movement_pattern: (row.movement_pattern as MovementPattern) ?? 'isolation',
    exercise_type: (row.exercise_type as ExerciseType) ?? 'isolation',
    difficulty: (row.difficulty as Difficulty) ?? 'beginner',
    primary_muscle: primaryMuscle,
    secondary_muscles:
      secondaryMuscles.length > 0 ? secondaryMuscles : (row.secondary_muscles_vi ?? []),
    equipment: row.equipment_vi ?? [],
    gallery: {
      main: gallery?.main ?? null,
      views: Array.isArray(gallery?.views) ? gallery.views : [],
      caption_vi: gallery?.caption_vi ?? '',
      animation: gallery?.animation,
    },
    goal_vi: row.description ?? '',
    instructions: asStringArray(row.instructions),
    tips: asStringArray(row.tips),
    common_mistakes: asStringArray(row.common_mistakes),
    setup: row.setup_json ?? { sets: '3', reps: '8-12', rir: '2', rest_seconds: 90, tempo: '2-0-2-0' },
    safety_vi: row.safety_vi ?? '',
    performance_metrics: row.performance_metrics_json ?? {
      current_weight_kg: 0,
      rep_range: '8-12',
      estimated_1rm_kg: 0,
    },
    performance_chart: row.performance_chart_json ?? {
      labels: [],
      values_kg: [],
      goal_kg: 0,
      min: 0,
      max: 0,
    },
    ai_coach: row.ai_coach_json ?? { next_session_vi: '', rationale_vi: '' },
    alternatives,
    media_metadata: row.content_json?.media_metadata ?? {
      version: '1.0.0',
      last_updated: '2026-08-19',
      source: 'supabase',
      language: 'vi',
    },
  };
}

// ─── Fetch ────────────────────────────────────────────────────────────────
async function fetchAll(): Promise<Exercise[]> {
  if (_cache && _cache.expiresAt > Date.now()) return _cache.data;

  const supabase = await createClient();
  // PostgREST default limit = 1000; paginate to fetch every published system exercise.
  const PAGE = 1000;
  const allRows: unknown[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('exercises')
      .select(
        `id, slug, name, name_vi, subtitle_vi, tags, movement_pattern,
         exercise_type, difficulty, primary_muscle_vi, secondary_muscles_vi,
         equipment_vi, description, instructions, tips, common_mistakes,
         safety_vi, status, setup_json, performance_metrics_json,
         performance_chart_json, ai_coach_json, gallery_json, content_json,
         exercise_muscles!inner(role, sort_order, muscles!inner(slug, name_vi)),
         exercise_alternatives!exercise_alternatives_exercise_id_fkey(
           reason,
           sort_order,
           alternative:exercises!exercise_alternatives_alternative_id_fkey(
             slug, name_vi, gallery_json
           )
         )`,
      )
      .eq('type', 'system')
      .eq('status', 'published')
      .is('owner_user_id', null)
      .order('name_vi', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw error;

    const chunk = (data ?? []) as unknown[];
    allRows.push(...chunk);
    if (chunk.length < PAGE) break;
  }

  const mapped = (allRows as RawRow[]).map(rowToExercise);
  _cache = { data: mapped, expiresAt: Date.now() + TTL_MS };
  return mapped;
}

// ─── Public API ───────────────────────────────────────────────────────────
export async function getAllExercises(): Promise<Exercise[]> {
  return fetchAll();
}

export async function getExerciseBySlug(slug: string): Promise<Exercise | null> {
  const items = await fetchAll();
  return items.find((e) => e.slug === slug) ?? null;
}

export function toSummary(e: Exercise): ExerciseSummary {
  return {
    slug: e.slug,
    name: e.name,
    name_vi: e.name_vi,
    difficulty: e.difficulty,
    exercise_type: e.exercise_type,
    movement_pattern: e.movement_pattern,
    primary_muscle: e.primary_muscle,
    equipment: e.equipment,
    tags: e.tags,
    gallery_main: e.gallery.main ?? '',
  };
}

export async function getAllExerciseSummaries(): Promise<ExerciseSummary[]> {
  const items = await fetchAll();
  return items.map(toSummary);
}

export async function filterExercises(filter: ExerciseFilter): Promise<ExerciseSummary[]> {
  const all = await getAllExerciseSummaries();
  const q = filter.q?.trim();
  const muscle = filter.muscle?.toLowerCase();
  const equipment = filter.equipment?.toLowerCase();

  return all.filter((e) => {
    if (q && !matchExerciseSearch(q, e)) return false;
    if (filter.difficulty && e.difficulty !== filter.difficulty) return false;
    if (filter.movement_pattern && e.movement_pattern !== filter.movement_pattern) return false;
    if (filter.exercise_type && e.exercise_type !== filter.exercise_type) return false;
    if (muscle && !`${e.primary_muscle} ${e.tags.join(' ')}`.toLowerCase().includes(muscle))
      return false;
    if (equipment && !e.equipment.some((eq) => eq.toLowerCase().includes(equipment))) return false;
    return true;
  });
}

export async function getExerciseFacets(): Promise<{
  muscles: string[];
  equipment: string[];
}> {
  const all = await fetchAll();
  const muscles = new Set<string>();
  const equipment = new Set<string>();
  for (const e of all) {
    muscles.add(e.primary_muscle);
    for (const m of e.secondary_muscles) muscles.add(m);
    for (const eq of e.equipment) equipment.add(eq);
  }
  return {
    muscles: [...muscles].sort((a, b) => a.localeCompare(b, 'vi')),
    equipment: [...equipment].sort((a, b) => a.localeCompare(b, 'vi')),
  };
}

export async function getResolvedAlternatives(slug: string): Promise<ResolvedAlternative[]> {
  const e = await getExerciseBySlug(slug);
  if (!e) return [];
  const all = await fetchAll();
  const map = new Map(all.map((x) => [x.slug, x]));
  return (e.alternatives ?? [])
    .map((a): ResolvedAlternative | null => {
      const target = map.get(a.slug);
      if (!target) return null;
      const img = a.image ?? target.gallery.main ?? null;
      return { slug: a.slug, name_vi: a.name_vi, image: img };
    })
    .filter((x): x is ResolvedAlternative => x !== null);
}

/** Reset cache (dùng trong test/CI nếu data đổi runtime). */
export function resetExerciseCache() {
  _cache = null;
}
