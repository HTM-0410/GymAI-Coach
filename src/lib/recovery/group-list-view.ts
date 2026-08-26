import type { RecoveryLatestActivity } from '@/lib/recovery/activity';
import {
  BODY_MUSCLE_GROUPS,
  BODY_MUSCLE_GROUP_LABELS,
  type BodyMuscleGroup,
} from '@/lib/recovery/muscle-groups';
import type { MuscleReadinessGroup, RecoveryStatus } from '@/lib/recovery/read-model';
import {
  RECOVERY_GROUP_UI_ITEMS,
  type RecoveryGroupSection,
} from '@/lib/recovery/ui-metadata';
import { sortRecoveryGroupsByStatus } from '@/lib/recovery/ui-selectors';

export type RecoverySummaryGroup = MuscleReadinessGroup & {
  latestActivity: RecoveryLatestActivity | null;
};

export type RecoveryGroupStatusPresentation = {
  label: string;
  textClass: string;
  dotClass: string;
};

const STATUS_PRESENTATION: Readonly<Record<RecoveryStatus, RecoveryGroupStatusPresentation>> = {
  ready: {
    label: 'Sẵn sàng',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    dotClass: 'bg-emerald-500',
  },
  trainable: {
    label: 'Có thể tập',
    textClass: 'text-sky-600 dark:text-sky-400',
    dotClass: 'bg-sky-500',
  },
  light_only: {
    label: 'Tập nhẹ',
    textClass: 'text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-500',
  },
  recovering: {
    label: 'Đang phục hồi',
    textClass: 'text-rose-600 dark:text-rose-400',
    dotClass: 'bg-rose-500',
  },
  unknown: {
    label: 'Chưa đủ dữ liệu',
    textClass: 'text-ink-muted',
    dotClass: 'bg-ink-muted/50',
  },
};

function missingGroup(group: BodyMuscleGroup): RecoverySummaryGroup {
  return {
    group,
    label: BODY_MUSCLE_GROUP_LABELS[group],
    readiness: 100,
    readinessSource: 'default',
    status: 'ready',
    confidence: 'unknown',
    stale: false,
    limitingMuscle: null,
    projectedAt: { r60: null, r80: null, r90: null },
    lastTrainedAt: null,
    explanation: '100% là mức mặc định khi chưa có tải cơ hiện hành được xử lý.',
    latestActivity: null,
  };
}

export function normalizeRecoverySummaryGroups(
  groups: readonly RecoverySummaryGroup[],
): RecoverySummaryGroup[] {
  const byGroup = new Map<BodyMuscleGroup, RecoverySummaryGroup>();
  for (const group of groups) {
    if (!byGroup.has(group.group)) byGroup.set(group.group, group);
  }
  return BODY_MUSCLE_GROUPS.map((group) => byGroup.get(group) ?? missingGroup(group));
}

export function selectRecoveryGroupsForSection(
  groups: readonly RecoverySummaryGroup[],
  section: RecoveryGroupSection,
): RecoverySummaryGroup[] {
  const normalized = normalizeRecoverySummaryGroups(groups);
  const sectionGroups = new Set(
    RECOVERY_GROUP_UI_ITEMS
      .filter((item) => item.section === section)
      .map((item) => item.group),
  );
  return sortRecoveryGroupsByStatus(
    normalized.filter((group) => sectionGroups.has(group.group)),
  ) as RecoverySummaryGroup[];
}

export function recoveryGroupStatusPresentation(
  group: Pick<MuscleReadinessGroup, 'status' | 'stale'>,
): RecoveryGroupStatusPresentation {
  if (group.stale) {
    return {
      ...STATUS_PRESENTATION.unknown,
      label: 'Dữ liệu cũ',
    };
  }
  return STATUS_PRESENTATION[group.status];
}

export function formatActivityRecency(
  occurredAt: string,
  now: string | number | Date = new Date(),
): string {
  const occurredMs = Date.parse(occurredAt);
  const nowMs = now instanceof Date
    ? now.getTime()
    : typeof now === 'number'
      ? now
      : Date.parse(now);
  if (!Number.isFinite(occurredMs) || !Number.isFinite(nowMs)) return 'gần đây';

  const elapsedMinutes = Math.max(0, Math.floor((nowMs - occurredMs) / 60_000));
  if (elapsedMinutes < 1) return 'vừa xong';
  if (elapsedMinutes < 60) return `${elapsedMinutes} phút trước`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} giờ trước`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays} ngày trước`;
}
