import type { PerceivedEffortSource } from '@/lib/workouts/perceived-effort';

export type RecoveryInputQuality = 'low' | 'medium' | 'high';
export type ContributionSource = 'curated' | 'role_fallback';
export type HalfLifeSource = 'configured' | 'default';

const QUALITY_RANK: Readonly<Record<RecoveryInputQuality, number>> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function resolveRecoveryInputQuality(input: {
  contributionSource: ContributionSource;
  effortSource: PerceivedEffortSource;
  halfLifeSource: HalfLifeSource;
}): RecoveryInputQuality {
  if (input.effortSource === 'fallback' || input.halfLifeSource === 'default') {
    return 'low';
  }
  if (input.contributionSource === 'curated' && input.effortSource === 'column') {
    return 'high';
  }
  return 'medium';
}

export function lowestRecoveryInputQuality(
  qualities: readonly RecoveryInputQuality[],
): RecoveryInputQuality {
  if (qualities.length === 0) return 'low';
  return qualities.reduce((lowest, quality) => (
    QUALITY_RANK[quality] < QUALITY_RANK[lowest] ? quality : lowest
  ), 'high');
}
