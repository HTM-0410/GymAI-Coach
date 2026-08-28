import { z } from 'zod';
import { isPhasePrescriptionValid } from './workout-constraints';
import { normalizeTrackingMode, validateMetricValues } from '@/lib/workouts/metrics';

export const WorkoutPhaseSchema = z.enum(['warmup', 'main', 'cooldown']);
export const TrackingModeSchema = z.enum(['weight_reps', 'reps', 'duration', 'duration_distance']);
export const PrescriptionModeSchema = z.enum(['weight_reps', 'reps', 'duration', 'duration_distance', 'time', 'hold']);
export const DurationStyleSchema = z.enum(['active', 'hold']);

export type WorkoutPhase = z.infer<typeof WorkoutPhaseSchema>;
export type PrescriptionMode = z.infer<typeof PrescriptionModeSchema>;
export type TrackingMode = z.infer<typeof TrackingModeSchema>;

export const WorkoutOptionsSchema = z.object({
  includeWarmup: z.boolean().default(false),
  includeCooldown: z.boolean().default(false),
}).default({ includeWarmup: false, includeCooldown: false });

export const PhaseBudgetsSchema = z.object({
  warmup: z.number().int().min(0).max(240),
  main: z.number().int().min(1).max(240),
  cooldown: z.number().int().min(0).max(240),
});

const nullablePositiveNumber = z.number().positive().nullable().default(null);
const nullablePositiveInt = (max: number) => z.number().int().min(1).max(max).nullable().default(null);

export const WorkoutDraftExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  exerciseSlug: z.string().min(1),
  name: z.string().default(''),
  nameVi: z.string().nullable().default(null),
  difficulty: z.string().nullable().default(null),
  exerciseType: z.string().nullable().default(null),
  animationUrl: z.string().nullable().default(null),
  thumbnailUrl: z.string().nullable().default(null),
  phase: WorkoutPhaseSchema.default('main'),
  prescriptionMode: PrescriptionModeSchema.default('reps'),
  durationStyle: DurationStyleSchema.nullable().default(null),
  targetSets: z.number().int().min(1).max(10),
  targetRepMin: nullablePositiveInt(50),
  targetRepMax: nullablePositiveInt(50),
  targetWeight: nullablePositiveNumber,
  targetRir: z.number().int().min(0).max(10).nullable().default(null),
  restSeconds: z.number().int().min(0).max(600).default(0),
  durationSeconds: nullablePositiveInt(3600),
  holdSeconds: nullablePositiveInt(600),
  targetDurationSeconds: nullablePositiveInt(3600),
  targetDistanceMeters: nullablePositiveNumber,
  perSide: z.boolean().default(false),
  aiReason: z.string().max(500).default(''),
}).superRefine((exercise, ctx) => {
  if (!isPhasePrescriptionValid(exercise.phase, exercise.prescriptionMode)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phase và prescription mode không tương thích' });
  }
  const mode = normalizeTrackingMode(exercise.prescriptionMode, { targetWeight: exercise.targetWeight, targetRir: exercise.targetRir });
  const targetDuration = exercise.targetDurationSeconds
    ?? exercise.durationSeconds
    ?? exercise.holdSeconds;
  const metricErrors = validateMetricValues(mode, {
    weight: exercise.targetWeight,
    reps: exercise.targetRepMin,
    durationSeconds: targetDuration,
    distanceMeters: exercise.targetDistanceMeters,
  }, { allowMissingWeight: true });
  metricErrors.forEach((message) => ctx.addIssue({ code: z.ZodIssueCode.custom, message }));
  if (mode === 'weight_reps' || mode === 'reps') {
    if (exercise.targetRepMin == null || exercise.targetRepMax == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Bài theo reps phải có rep range' });
    } else if (exercise.targetRepMax < exercise.targetRepMin) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'targetRepMax phải lớn hơn hoặc bằng targetRepMin' });
    }
    if (exercise.restSeconds < 30) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Bài theo reps phải nghỉ ít nhất 30 giây' });
    }
    if (exercise.durationSeconds != null || exercise.holdSeconds != null || exercise.targetDurationSeconds != null || exercise.targetDistanceMeters != null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Bài theo reps không dùng duration/hold' });
    }
  }

  if (mode !== 'weight_reps' && exercise.targetRir != null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Chỉ weight_reps dùng target weight hoặc RIR' });
  }
});

export type WorkoutDraftExercise = z.infer<typeof WorkoutDraftExerciseSchema>;

export function estimateDraftExerciseSeconds(exercise: WorkoutDraftExercise) {
  const transition = 20;
  const rest = Math.max(0, exercise.targetSets - 1) * exercise.restSeconds;
  const mode = normalizeTrackingMode(exercise.prescriptionMode, { targetWeight: exercise.targetWeight, targetRir: exercise.targetRir });
  if (mode === 'reps' || mode === 'weight_reps') {
    const averageReps = ((exercise.targetRepMin ?? 8) + (exercise.targetRepMax ?? 12)) / 2;
    return transition + exercise.targetSets * averageReps * 4 + rest;
  }
  if (mode === 'duration' || mode === 'duration_distance') {
    return transition + exercise.targetSets * (exercise.targetDurationSeconds ?? exercise.durationSeconds ?? exercise.holdSeconds ?? 60) * (exercise.perSide ? 2 : 1) + rest;
  }
  return transition + exercise.targetSets * (exercise.holdSeconds ?? 30) * (exercise.perSide ? 2 : 1) + rest;
}

export function allocatePhaseBudgets(
  durationMinutes: number,
  options: z.infer<typeof WorkoutOptionsSchema>,
) {
  const accessory = durationMinutes <= 20
    ? 3
    : durationMinutes <= 45
      ? 5
      : durationMinutes <= 90
        ? 8
        : durationMinutes <= 150
          ? 10
          : 12;
  const warmup = options.includeWarmup ? accessory : 0;
  const cooldown = options.includeCooldown ? Math.max(2, accessory - 1) : 0;
  const main = durationMinutes - warmup - cooldown;

  if (main < 8) {
    throw new Error('Thời lượng còn lại cho phần tập chính phải ít nhất 8 phút.');
  }
  return { warmup, main, cooldown };
}

const DraftBodyBase = z.object({
  programDayId: z.string().uuid(),
  gymId: z.union([z.string().uuid(), z.literal('bodyweight'), z.literal('no_equipment')]).nullable(),
  durationMinutes: z.number().int().min(15).max(240),
  options: WorkoutOptionsSchema.optional(),
  phaseBudgets: PhaseBudgetsSchema.optional(),
  exercises: z.array(WorkoutDraftExerciseSchema).min(1).max(15),
});

export const WorkoutDraftRequestSchema = DraftBodyBase.transform((body, ctx) => {
  const options = WorkoutOptionsSchema.parse(body.options ?? {});
  let expectedBudgets: z.infer<typeof PhaseBudgetsSchema>;
  try {
    expectedBudgets = allocatePhaseBudgets(body.durationMinutes, options);
  } catch (error) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: String((error as Error).message) });
    return z.NEVER;
  }
  const phaseBudgets = body.phaseBudgets ?? expectedBudgets;
  const budgetTotal = phaseBudgets.warmup + phaseBudgets.main + phaseBudgets.cooldown;
  if (budgetTotal > body.durationMinutes) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Tổng phase budget vượt thời lượng buổi tập' });
  }
  if (!options.includeWarmup && phaseBudgets.warmup !== 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Warm-up đang tắt nhưng budget khác 0' });
  }
  if (!options.includeCooldown && phaseBudgets.cooldown !== 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Cooldown đang tắt nhưng budget khác 0' });
  }

  const phases = new Set(body.exercises.map((exercise) => exercise.phase));
  if (!options.includeWarmup && phases.has('warmup')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Draft chứa warm-up dù tùy chọn đang tắt' });
  }
  if (!options.includeCooldown && phases.has('cooldown')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Draft chứa cooldown dù tùy chọn đang tắt' });
  }
  if (options.includeWarmup && !phases.has('warmup')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Draft thiếu phần khởi động' });
  }
  if (options.includeCooldown && !phases.has('cooldown')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Draft thiếu phần giãn cơ' });
  }
  if (!phases.has('main')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Draft thiếu phần tập chính' });
  }

  const ids = body.exercises.map((exercise) => exercise.exerciseId);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Danh sách có bài tập trùng lặp' });
  }
  const order = body.exercises.map((exercise) => exercise.phase);
  const rank: Record<WorkoutPhase, number> = { warmup: 0, main: 1, cooldown: 2 };
  if (order.some((phase, index) => index > 0 && rank[phase] < rank[order[index - 1]])) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Thứ tự phase không hợp lệ' });
  }
  const estimatedByPhase: Record<WorkoutPhase, number> = { warmup: 0, main: 0, cooldown: 0 };
  body.exercises.forEach((exercise) => {
    estimatedByPhase[exercise.phase] += estimateDraftExerciseSeconds(exercise);
  });
  (Object.keys(estimatedByPhase) as WorkoutPhase[]).forEach((phase) => {
    if (estimatedByPhase[phase] > phaseBudgets[phase] * 60) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Phần ${phase} vượt time budget` });
    }
  });

  return { ...body, options, phaseBudgets };
});

export type WorkoutDraftRequest = z.infer<typeof WorkoutDraftRequestSchema>;

export const CurrentDraftExerciseSchema = z.object({
  exerciseSlug: z.string(),
  name: z.string().optional(),
  nameVi: z.string().nullable().optional(),
  phase: WorkoutPhaseSchema.default('main'),
  prescriptionMode: PrescriptionModeSchema.default('reps'),
  durationStyle: DurationStyleSchema.nullable().optional(),
  targetSets: z.number().int().min(1).max(10).optional(),
  targetRepMin: z.number().int().min(1).max(50).nullable().optional(),
  targetRepMax: z.number().int().min(1).max(50).nullable().optional(),
  targetWeight: z.number().positive().nullable().optional(),
  targetRir: z.number().int().min(0).max(10).nullable().optional(),
  restSeconds: z.number().int().min(0).max(600).optional(),
  durationSeconds: z.number().int().min(1).max(3600).nullable().optional(),
  holdSeconds: z.number().int().min(1).max(600).nullable().optional(),
  targetDurationSeconds: z.number().int().min(1).max(3600).nullable().optional(),
  targetDistanceMeters: z.number().positive().nullable().optional(),
  perSide: z.boolean().optional(),
  aiReason: z.string().max(500).optional(),
});

export const WorkoutGenerateRequestSchema = z.object({
  programDayId: z.string().uuid(),
  gymId: z.union([z.string().uuid(), z.literal('bodyweight'), z.literal('no_equipment')]).nullable(),
  durationMinutes: z.number().int().min(15).max(240).default(60),
  options: WorkoutOptionsSchema.optional().transform((value) => WorkoutOptionsSchema.parse(value ?? {})),
  regeneratePhase: WorkoutPhaseSchema.optional(),
  excludedExerciseSlugs: z.array(z.string().min(1).max(160)).max(15).optional().default([]),
  userPrompt: z.string().max(4000).optional().nullable(),
  currentExercises: z.array(CurrentDraftExerciseSchema).max(15).optional().nullable(),
  requestedRecoveryGroups: z.array(z.enum([
    'CHEST', 'SHOULDERS', 'BACK', 'TRICEPS', 'BICEPS', 'FOREARMS', 'ABS', 'LEGS', 'GLUTES', 'CALVES',
  ])).max(10).optional(),
  recoveryDecision: z.enum(['exclude_weak', 'include_weak']).default('exclude_weak'),
});

export type WorkoutGenerateRequest = z.infer<typeof WorkoutGenerateRequestSchema>;
