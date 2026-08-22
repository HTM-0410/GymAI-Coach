export function getSessionName(nameVi: string | null, fallbackName: string): string {
  const localized = nameVi?.trim();
  if (!localized) return fallbackName;

  const withoutSessionPrefix = localized.replace(
    /^Buổi(?:\s+tập)?\s+(?:#?\d+|[A-Za-z])\s*(?:[—–-]|:)\s*/iu,
    '',
  ).trim();

  if (withoutSessionPrefix !== localized && withoutSessionPrefix) {
    return withoutSessionPrefix;
  }

  if (/^Buổi(?:\s+tập)?\s+(?:#?\d+|[A-Za-z])$/iu.test(localized)) {
    return fallbackName;
  }

  return localized;
}

export function getShortSessionName(nameVi: string | null, fallbackName: string): string {
  return getSessionName(nameVi, fallbackName).replace(/\s*\([^)]*\)\s*$/u, '').trim();
}

export function formatRest(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s ? `${m}m${s}s` : `${m}p`;
  }
  return `${seconds}s`;
}
