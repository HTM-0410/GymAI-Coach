export function stripSessionPrefix(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  // Strip prefixes such as "Buoi 1 - ", "Day 1: ", "Workout A - "
  const stripped = trimmed
    .replace(/^(?:Buổi(?:\s+tập)?|Day|Workout)\s*(?:#?\d+|[A-Za-z])\s*[-:\.\u2013\u2014]*\s*/iu, '')
    .trim();

  return stripped || trimmed;
}

export function getSessionName(nameVi: string | null, fallbackName: string): string {
  const localized = nameVi?.trim();
  if (localized) {
    const stripped = stripSessionPrefix(localized);
    if (stripped && !/^(?:Buổi(?:\s+tập)?|Day|Workout)\s*(?:#?\d+|[A-Za-z])$/iu.test(stripped)) {
      return stripped;
    }
  }

  if (fallbackName?.trim()) {
    const fallbackStripped = stripSessionPrefix(fallbackName.trim());
    if (fallbackStripped && !/^(?:Buổi(?:\s+tập)?|Day|Workout)\s*(?:#?\d+|[A-Za-z])$/iu.test(fallbackStripped)) {
      return fallbackStripped;
    }
  }

  return localized || fallbackName || '';
}

export function getShortSessionName(nameVi: string | null, fallbackName: string): string {
  const name = getSessionName(nameVi, fallbackName);
  return name.replace(/\s*\([^)]*\)\s*$/u, '').trim() || name;
}

export function formatRest(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s ? `${m}m${s}s` : `${m}p`;
  }
  return `${seconds}s`;
}
