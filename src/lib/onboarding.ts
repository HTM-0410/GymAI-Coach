export type ProfileOnboardingState = {
  onboarding_step?: number | null;
  experience_level?: string | null;
  goal?: string | null;
  preferred_training_days?: number | null;
  preferred_session_duration?: number | null;
};

export const ONBOARDING_DURATION_OPTIONS = [30, 45, 60, 75, 90, 105, 120] as const;

export function normalizeOnboardingDuration(value: number | null | undefined): number {
  const requested = typeof value === 'number' && Number.isFinite(value) ? value : 60;
  return ONBOARDING_DURATION_OPTIONS.reduce((nearest, option) => (
    Math.abs(option - requested) < Math.abs(nearest - requested) ? option : nearest
  ));
}

/**
 * Checks whether a user profile has completed onboarding.
 *
 * Rules:
 * 1. Standard: `onboarding_step >= 4` marks a fully completed onboarding flow.
 * 2. Backwards compatibility: Legacy profiles that did not have `onboarding_step`
 *    are considered complete if they have all 4 foundational parameters:
 *    `experience_level`, `goal`, `preferred_training_days`, and `preferred_session_duration`.
 * 3. IMPORTANT: `profile_equipment` count is NEVER used to gate onboarding,
 *    because choosing "No equipment / Bodyweight only" (0 equipment rows) is completely valid.
 */
export function isOnboardingComplete(
  profile: ProfileOnboardingState | null | undefined,
): boolean {
  if (!profile) return false;

  // Primary standard: onboarding_step >= 4
  if (typeof profile.onboarding_step === 'number' && profile.onboarding_step >= 4) {
    return true;
  }

  // Legacy fallback: all 4 foundational profile fields are populated
  const hasExperience = Boolean(profile.experience_level);
  const hasGoal = Boolean(profile.goal);
  const hasDays =
    typeof profile.preferred_training_days === 'number' &&
    profile.preferred_training_days > 0;
  const hasDuration =
    typeof profile.preferred_session_duration === 'number' &&
    profile.preferred_session_duration > 0;

  return hasExperience && hasGoal && hasDays && hasDuration;
}

/**
 * Sanitizes a redirect path to prevent open redirect vulnerabilities.
 * Only allows relative paths starting with a single '/' and rejects
 * protocol-relative URLs (//), Windows slashes (/\), and URLs with schemes (http:).
 */
export function getSafeRedirectPath(
  rawNext: string | null | undefined,
  defaultPath = '/dashboard',
): string {
  if (!rawNext || typeof rawNext !== 'string') {
    return defaultPath;
  }

  const trimmed = rawNext.trim();
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.includes('\\') ||
    trimmed.includes('://')
  ) {
    return defaultPath;
  }

  return trimmed;
}

/**
 * Resolves the destination after authentication (OAuth callback, password login, or session check).
 *
 * - Incomplete profile -> Always directed to `/onboarding`.
 * - Completed profile -> Directed to safe `next` path or `/dashboard`.
 *   Crucially, `next=/onboarding` is rejected for completed users so returning users
 *   are never trapped back in onboarding.
 */
export function resolveAuthNextDestination({
  isComplete,
  rawNext,
}: {
  isComplete: boolean;
  rawNext?: string | null;
}): string {
  if (!isComplete) {
    return '/onboarding';
  }

  const safeNext = getSafeRedirectPath(rawNext, '/dashboard');
  if (
    safeNext === '/onboarding' ||
    safeNext.startsWith('/onboarding?') ||
    safeNext.startsWith('/onboarding/')
  ) {
    return '/dashboard';
  }

  return safeNext;
}
