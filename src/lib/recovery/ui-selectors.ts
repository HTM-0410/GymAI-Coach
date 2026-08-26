import { READINESS_THRESHOLDS } from '@/lib/recovery/constants';
import { BODY_MUSCLE_GROUPS } from '@/lib/recovery/muscle-groups';
import type { MuscleReadinessGroup, RecoveryStatus } from '@/lib/recovery/read-model';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const STATUS_ORDER: Readonly<Record<RecoveryStatus, number>> = {
  ready: 0,
  trainable: 1,
  light_only: 2,
  recovering: 3,
  unknown: 4,
};

const CANONICAL_ORDER = new Map(BODY_MUSCLE_GROUPS.map((group, index) => [group, index]));

function isCurrentScore(group: MuscleReadinessGroup): group is MuscleReadinessGroup & { readiness: number } {
  return !group.stale && group.readiness !== null;
}

export function selectFreshRecoveryGroups(
  groups: readonly MuscleReadinessGroup[],
): MuscleReadinessGroup[] {
  return groups.filter((group) => (
    isCurrentScore(group) && group.readiness >= READINESS_THRESHOLDS.ready
  ));
}

export function selectWorkoutEligibleRecoveryGroups(
  groups: readonly MuscleReadinessGroup[],
): MuscleReadinessGroup[] {
  return groups.filter((group) => (
    isCurrentScore(group) && group.readiness >= READINESS_THRESHOLDS.trainable
  ));
}

export function daysSinceCompletedWorkout(
  completedAt: string | null,
  now: string | number | Date = new Date(),
): number | null {
  if (!completedAt) return null;
  const completedMs = Date.parse(completedAt);
  const nowMs = now instanceof Date
    ? now.getTime()
    : typeof now === 'number'
      ? now
      : Date.parse(now);
  if (!Number.isFinite(completedMs) || !Number.isFinite(nowMs)) return null;
  return Math.max(0, Math.floor((nowMs - completedMs) / MS_PER_DAY));
}

export function sortRecoveryGroupsByStatus(
  groups: readonly MuscleReadinessGroup[],
): MuscleReadinessGroup[] {
  return [...groups].sort((left, right) => {
    const leftStatus = left.stale ? 'unknown' : left.status;
    const rightStatus = right.stale ? 'unknown' : right.status;
    return STATUS_ORDER[leftStatus] - STATUS_ORDER[rightStatus]
      || (CANONICAL_ORDER.get(left.group) ?? Number.MAX_SAFE_INTEGER)
        - (CANONICAL_ORDER.get(right.group) ?? Number.MAX_SAFE_INTEGER);
  });
}
