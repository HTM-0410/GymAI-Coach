export type EquipmentScope =
  | { kind: 'profile'; revision?: string }
  | { kind: 'gym'; gymId: string; revision?: string }
  | { kind: 'unrestricted'; confirmedAt?: string };

export type EffectiveTrainingPlanSnapshotV1 = {
  declared: {
    daysPerWeek: number;
    minutesPerSession: number;
  };
  effective: {
    daysPerWeek: number;
    minutesPerSession: number;
  };
  equipment: EquipmentScope;
  source: 'profile' | 'active_program' | 'explicit_override';
  revision: string;
  overrideReason: string | null;
};

export function resolveEffectiveTrainingPlan(
  profile?: {
    preferred_training_days?: number | null;
    preferred_session_duration?: number | null;
    updated_at?: string | null;
  } | null,
  activeProgram?: {
    training_programs?: {
      training_program_days?: Array<{ id: string }> | null;
    } | null;
  } | null,
  explicitScope?: EquipmentScope,
): EffectiveTrainingPlanSnapshotV1 {
  const declaredDays = profile?.preferred_training_days ?? 2;
  const declaredDuration = profile?.preferred_session_duration ?? 30;

  const programDaysCount = activeProgram?.training_programs?.training_program_days?.length;
  const hasActiveProgram = Boolean(programDaysCount && programDaysCount > 0);

  const effectiveDays = hasActiveProgram ? programDaysCount! : declaredDays;
  const effectiveDuration = declaredDuration;

  const equipment: EquipmentScope = explicitScope ?? { kind: 'profile' };
  const source = hasActiveProgram ? 'active_program' : 'profile';
  const revision = profile?.updated_at ?? new Date().toISOString().slice(0, 10);

  return {
    declared: {
      daysPerWeek: declaredDays,
      minutesPerSession: declaredDuration,
    },
    effective: {
      daysPerWeek: effectiveDays,
      minutesPerSession: effectiveDuration,
    },
    equipment,
    source,
    revision,
    overrideReason: null,
  };
}
