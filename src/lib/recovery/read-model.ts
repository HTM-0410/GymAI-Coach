import { READINESS_THRESHOLDS, RECOVERY_MODEL_VERSION } from '@/lib/recovery/constants';
import {
  BODY_MUSCLE_GROUPS,
  BODY_MUSCLE_GROUP_LABELS,
  aggregateMuscleReadiness,
  type BodyMuscleGroup,
  type MuscleReadinessValue,
} from '@/lib/recovery/muscle-groups';
import { calculateReadinessAt, projectReadinessAt } from '@/lib/recovery/model';
import type { RecoveryInputQuality } from '@/lib/recovery/confidence';

export type RecoveryStateReadRow = {
  user_id: string;
  muscle_id: string;
  fatigue_score: number;
  fatigue_at: string;
  half_life_hours: number;
  confidence: RecoveryInputQuality;
  last_workout_id: string | null;
  model_version: string;
  muscles: { id: string; slug: string; name: string; name_vi: string | null }
    | { id: string; slug: string; name: string; name_vi: string | null }[]
    | null;
};

export type RecoveryStatus = 'unknown' | 'recovering' | 'light_only' | 'trainable' | 'ready';

export type MuscleReadinessGroup = {
  group: BodyMuscleGroup;
  label: string;
  readiness: number | null;
  readinessSource: 'default' | 'model';
  status: RecoveryStatus;
  confidence: 'unknown' | RecoveryInputQuality;
  stale: boolean;
  limitingMuscle: { id: string; slug: string; nameVi: string } | null;
  projectedAt: { r60: string | null; r80: string | null; r90: string | null };
  lastTrainedAt: string | null;
  explanation: string;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function readinessStatus(readiness: number | null): RecoveryStatus {
  if (readiness === null) return 'unknown';
  if (readiness < READINESS_THRESHOLDS.lightOnly) return 'recovering';
  if (readiness < READINESS_THRESHOLDS.trainable) return 'light_only';
  if (readiness < READINESS_THRESHOLDS.ready) return 'trainable';
  return 'ready';
}

function defaultReadyGroup(group: BodyMuscleGroup, at: string): MuscleReadinessGroup {
  return {
    group,
    label: BODY_MUSCLE_GROUP_LABELS[group],
    readiness: 100,
    readinessSource: 'default',
    status: 'ready',
    confidence: 'unknown',
    stale: false,
    limitingMuscle: null,
    projectedAt: { r60: at, r80: at, r90: at },
    lastTrainedAt: null,
    explanation: '100% là mức mặc định khi chưa có tải cơ hiện hành được xử lý. Điểm sẽ tự cập nhật sau khi một buổi tập hoàn thành được xử lý.',
  };
}

export function buildRecoverySummary(
  rows: readonly RecoveryStateReadRow[],
  at: string,
): MuscleReadinessGroup[] {
  const currentRows = rows.filter((row) => row.model_version === RECOVERY_MODEL_VERSION);
  const stateByMuscleId = new Map(currentRows.map((row) => [row.muscle_id, row]));
  const values: MuscleReadinessValue[] = currentRows.flatMap((row) => {
    const muscle = one(row.muscles);
    if (!muscle) return [];
    return [{
      id: muscle.id,
      slug: muscle.slug,
      nameVi: muscle.name_vi ?? muscle.name,
      readiness: calculateReadinessAt({
        fatigueScore: row.fatigue_score,
        fatigueAt: row.fatigue_at,
        halfLifeHours: row.half_life_hours,
      }, at),
      confidence: row.confidence,
    }];
  });
  const aggregated = aggregateMuscleReadiness(values);

  return BODY_MUSCLE_GROUPS.map((group) => {
    const aggregate = aggregated.find((item) => item.group === group);
    if (!aggregate || aggregate.readiness === null || !aggregate.limitingMuscle) {
      return defaultReadyGroup(group, at);
    }
    const state = stateByMuscleId.get(aggregate.limitingMuscle.id);
    if (!state) return defaultReadyGroup(group, at);
    const stateInput = {
      fatigueScore: state.fatigue_score,
      fatigueAt: state.fatigue_at,
      halfLifeHours: state.half_life_hours,
    };
    const readiness = Math.round(aggregate.readiness);
    return {
      group,
      label: BODY_MUSCLE_GROUP_LABELS[group],
      readiness,
      readinessSource: 'model' as const,
      status: readinessStatus(readiness),
      confidence: aggregate.confidence,
      stale: false,
      limitingMuscle: {
        id: aggregate.limitingMuscle.id,
        slug: aggregate.limitingMuscle.slug,
        nameVi: aggregate.limitingMuscle.nameVi,
      },
      projectedAt: {
        r60: projectReadinessAt(stateInput, 60, at),
        r80: projectReadinessAt(stateInput, 80, at),
        r90: projectReadinessAt(stateInput, 90, at),
      },
      lastTrainedAt: state.fatigue_at,
      explanation: `${aggregate.limitingMuscle.nameVi} đang giới hạn nhóm ở mức ${readiness}%. Đây là ước tính từ nhật ký tập.`,
    };
  });
}

export function isBodyMuscleGroup(value: string): value is BodyMuscleGroup {
  return BODY_MUSCLE_GROUPS.includes(value as BodyMuscleGroup);
}
