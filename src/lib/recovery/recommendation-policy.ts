import type { Verdict } from '@/lib/ai/rules';
import {
  BODY_MUSCLE_GROUP_LABELS,
  getBodyMuscleGroup,
  type BodyMuscleGroup,
} from '@/lib/recovery/muscle-groups';
import type { MuscleReadinessGroup } from '@/lib/recovery/read-model';

export type RecoveryRecommendationReason =
  | 'muscle_readiness.selected'
  | 'muscle_readiness.skipped_recovering'
  | 'muscle_readiness.skipped_light_only'
  | 'muscle_readiness.unknown_neutral'
  | 'muscle_readiness.user_override'
  | 'muscle_readiness.pain_override';

export type RecoveryGenerationDecision = 'exclude_weak' | 'include_weak';

export type RecoveryWorkoutSelection = {
  decision: RecoveryGenerationDecision;
  requestedGroups: BodyMuscleGroup[];
  selectedGroups: BodyMuscleGroup[];
  weakGroups: Array<{
    group: BodyMuscleGroup;
    readiness: number;
  }>;
  skippedGroups: Array<{
    group: BodyMuscleGroup;
    readiness: number | null;
    reason: RecoveryRecommendationReason;
  }>;
  reasonCodes: RecoveryRecommendationReason[];
};

export function buildRecoveryWorkoutSelection(
  groups: readonly MuscleReadinessGroup[],
  requestedGroups: readonly BodyMuscleGroup[],
  decision: RecoveryGenerationDecision = 'exclude_weak',
): RecoveryWorkoutSelection {
  const byGroup = new Map(groups.map((group) => [group.group, group]));
  const requested = [...new Set(requestedGroups)];
  const selectedGroups: BodyMuscleGroup[] = [];
  const weakGroups: RecoveryWorkoutSelection['weakGroups'] = [];
  const skippedGroups: RecoveryWorkoutSelection['skippedGroups'] = [];
  const reasonCodes = new Set<RecoveryRecommendationReason>();

  for (const group of requested) {
    const state = byGroup.get(group);
    if (!state || state.readiness === null || state.stale) {
      skippedGroups.push({ group, readiness: null, reason: 'muscle_readiness.unknown_neutral' });
      reasonCodes.add('muscle_readiness.unknown_neutral');
    } else if (state.readiness < 80) {
      weakGroups.push({ group, readiness: state.readiness });
      if (decision === 'include_weak') {
        selectedGroups.push(group);
        reasonCodes.add('muscle_readiness.user_override');
      } else {
        const reason = state.readiness < 60
          ? 'muscle_readiness.skipped_recovering' as const
          : 'muscle_readiness.skipped_light_only' as const;
        skippedGroups.push({ group, readiness: state.readiness, reason });
        reasonCodes.add(reason);
      }
    } else {
      selectedGroups.push(group);
      reasonCodes.add('muscle_readiness.selected');
    }
  }

  return {
    decision,
    requestedGroups: requested,
    selectedGroups,
    weakGroups,
    skippedGroups,
    reasonCodes: [...reasonCodes],
  };
}

export function filterCandidatesForRecovery<T extends {
  primary_muscle_slug?: string | null;
  muscle_slugs?: readonly string[] | null;
}>(
  candidates: readonly T[],
  selection?: RecoveryWorkoutSelection,
): T[] {
  if (!selection || selection.requestedGroups.length === 0) return [...candidates];
  const blocked = new Set(selection.skippedGroups
    .filter((item) => item.reason !== 'muscle_readiness.unknown_neutral')
    .map((item) => item.group));
  if (blocked.size === 0) return [...candidates];
  return candidates.filter((candidate) => {
    const slugs = candidate.muscle_slugs?.length
      ? candidate.muscle_slugs
      : candidate.primary_muscle_slug
        ? [candidate.primary_muscle_slug]
        : [];
    if (slugs.length === 0) return false;
    return slugs.every((slug) => {
      const group = getBodyMuscleGroup(slug);
      return group === null || !blocked.has(group);
    });
  });
}

export function recoveryPromptContext(selection?: RecoveryWorkoutSelection): string | null {
  if (!selection || selection.requestedGroups.length === 0) return null;
  const selected = selection.selectedGroups.map((group) => BODY_MUSCLE_GROUP_LABELS[group]).join(', ') || 'không có';
  const weak = selection.weakGroups
    .map((item) => `${BODY_MUSCLE_GROUP_LABELS[item.group]}:${item.readiness}%`)
    .join(', ') || 'không có';
  const skipped = selection.skippedGroups
    .map((item) => `${BODY_MUSCLE_GROUP_LABELS[item.group]}:${item.readiness ?? 'không rõ'}%:${item.reason}`)
    .join(', ') || 'không có';
  const action = selection.decision === 'include_weak'
    ? 'Người dùng đã xác nhận vẫn tạo. Giữ nhóm mỏi nhưng giảm cường độ, không tăng tải.'
    : 'Loại nhóm mỏi khỏi buổi tập.';
  return `Quyết định=${selection.decision}; nhóm mỏi/yếu=${weak}; nhóm được chọn=${selected}; nhóm bỏ qua=${skipped}. ${action} Readiness chỉ được giữ hoặc giảm tải, không được dùng để tăng target_weight.`;
}

export function capProgressionByMuscleReadiness(
  verdict: Verdict,
  readiness: number | null,
  options: { painOrContraindication?: boolean } = {},
): Verdict {
  if (options.painOrContraindication) {
    return {
      ...verdict,
      outcome: verdict.outcome === 'substitute' ? verdict.outcome : 'deload',
      weight_delta: Math.min(0, verdict.weight_delta),
      rep_shift: Math.min(0, verdict.rep_shift),
      reason_vi: `${verdict.reason_vi} Đau hoặc chống chỉ định được ưu tiên, không tăng tải.`,
      confidence: Math.min(verdict.confidence, 0.8),
    };
  }
  if (readiness === null || readiness >= 80 || verdict.outcome !== 'progress') return verdict;
  return {
    ...verdict,
    outcome: readiness < 60 ? 'deload' : 'maintain',
    weight_delta: Math.min(0, verdict.weight_delta),
    rep_shift: Math.min(0, verdict.rep_shift),
    reason_vi: `${verdict.reason_vi} Phục hồi cơ bắp chưa đạt 80%, nên không tăng tải.`,
    confidence: Math.min(verdict.confidence, 0.8),
  };
}
