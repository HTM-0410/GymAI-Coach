export const PERCEIVED_EFFORT_VALUES = [
  'too_hard',
  'hard',
  'appropriate',
  'easy',
] as const;

export type PerceivedEffort = (typeof PERCEIVED_EFFORT_VALUES)[number];
export type PerceivedEffortSource = 'column' | 'legacy_note' | 'rir' | 'fallback';

export type PerceivedEffortResolution = {
  value: PerceivedEffort;
  source: PerceivedEffortSource;
};

const LEGACY_EFFORT_PATTERN = /^effort:(too_hard|hard|appropriate|easy)$/;

export function isPerceivedEffort(value: unknown): value is PerceivedEffort {
  return typeof value === 'string'
    && PERCEIVED_EFFORT_VALUES.includes(value as PerceivedEffort);
}

export function perceivedEffortFromRir(rir: number): PerceivedEffort {
  if (rir <= 0) return 'too_hard';
  if (rir === 1) return 'hard';
  if (rir >= 4) return 'easy';
  return 'appropriate';
}

export function readLegacyPerceivedEffort(note: string | null | undefined): PerceivedEffort | null {
  const match = note?.trim().match(LEGACY_EFFORT_PATTERN);
  return match && isPerceivedEffort(match[1]) ? match[1] : null;
}

export function stripLegacyPerceivedEffortNote(note: string | null | undefined): string | null {
  if (!note) return null;
  return readLegacyPerceivedEffort(note) ? null : note;
}

export function resolvePerceivedEffort(input: {
  perceivedEffort?: unknown;
  note?: string | null;
  rir?: number | null;
}): PerceivedEffortResolution {
  if (isPerceivedEffort(input.perceivedEffort)) {
    return { value: input.perceivedEffort, source: 'column' };
  }

  const legacyEffort = readLegacyPerceivedEffort(input.note);
  if (legacyEffort) {
    return { value: legacyEffort, source: 'legacy_note' };
  }

  if (input.rir !== null && input.rir !== undefined && Number.isFinite(input.rir)) {
    return { value: perceivedEffortFromRir(input.rir), source: 'rir' };
  }

  return { value: 'appropriate', source: 'fallback' };
}
