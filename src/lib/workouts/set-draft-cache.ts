import type { PerceivedEffort } from './perceived-effort';

export const SET_DRAFT_CACHE_VERSION = 1;
export const SET_DRAFT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type SetDraftCache = {
  version: typeof SET_DRAFT_CACHE_VERSION;
  weight: number;
  reps: number;
  effort: PerceivedEffort;
  updatedAt: number;
};

const EFFORT_VALUES: readonly PerceivedEffort[] = ['too_hard', 'hard', 'appropriate', 'easy'];

export function getSetDraftStorageKey(setId: string): string {
  return `gym-ai:workout-set-draft:${setId}`;
}

export function serializeSetDraftCache(
  draft: Omit<SetDraftCache, 'version' | 'updatedAt'>,
  updatedAt = Date.now(),
): string {
  return JSON.stringify({
    ...draft,
    version: SET_DRAFT_CACHE_VERSION,
    updatedAt,
  } satisfies SetDraftCache);
}

export function parseSetDraftCache(raw: string | null, now = Date.now()): SetDraftCache | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SetDraftCache>;
    const weight = Number(parsed.weight);
    const reps = Number(parsed.reps);
    const updatedAt = Number(parsed.updatedAt);
    if (
      parsed.version !== SET_DRAFT_CACHE_VERSION
      || !Number.isFinite(weight)
      || weight < 0
      || !Number.isFinite(reps)
      || reps < 1
      || !EFFORT_VALUES.includes(parsed.effort as PerceivedEffort)
      || !Number.isFinite(updatedAt)
      || now - updatedAt > SET_DRAFT_CACHE_TTL_MS
      || now - updatedAt < -60_000
    ) return null;

    return {
      version: SET_DRAFT_CACHE_VERSION,
      weight,
      reps,
      effort: parsed.effort as PerceivedEffort,
      updatedAt,
    };
  } catch {
    return null;
  }
}
