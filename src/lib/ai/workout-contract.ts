import { z } from 'zod';
import { isPhasePrescriptionValid } from './workout-constraints';

export const WorkoutPhaseSchema = z.enum(['warmup', 'main', 'cooldown']);
export const PrescriptionModeSchema = z.enum(['reps', 'time', 'hold']);

export type WorkoutPhase = z.infer<typeof WorkoutPhaseSchema>;
export type PrescriptionMode = z.infer<typeof PrescriptionModeSchema>;

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
  targetSets: z.number().int().min(1).max(10),
  targetRepMin: nullablePositiveInt(50),
  targetRepMax: nullablePositiveInt(50),
  targetWeight: nullablePositiveNumber,
  targetRir: z.number().int().min(0).max(10).nullable().default(null),
  restSeconds: z.number().int().min(0).max(600).default(0),
  durationSeconds: nullablePositiveInt(3600),
  holdSeconds: nullablePositiveInt(600),
  perSide: z.boolean().default(false),
  aiReason: z.string().max(500).default(''),
}).superRefine((exercise, ctx) => {
  if (!isPhasePrescriptionValid(exercise.phase, exercise.prescriptionMode)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phase và prescription mode không tương thích' });
  }
  if (exercise.prescriptionMode === 'reps') {
    if (exercise.targetRepMin == null || exercise.targetRepMax == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Bài theo reps phải có rep range' });
    } else if (exercise.targetRepMax < exercise.targetRepMin) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'targetRepMax phải lớn hơn hoặc bằng targetRepMin' });
    }
    if (exercise.restSeconds < 30) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Bài theo reps phải nghỉ ít nhất 30 giây' });
    }
    if (exercise.durationSeconds != null || exercise.holdSeconds != null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Bài theo reps không dùng duration/hold' });
    }
  }

  if (exercise.prescriptionMode === 'time') {
    if (exercise.targetSets !== 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Bài time MVP dùng đúng 1 hiệp' });
    }
    if (exercise.durationSeconds == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Bài theo thời gian phải có durationSeconds' });
    }
    if (exercise.targetRepMin != null || exercise.targetRepMax != null || exercise.holdSeconds != null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Prescription time không dùng reps/hold' });
    }
  }

  if (exercise.prescriptionMode === 'hold') {
    if (exercise.targetSets !== 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Bài hold MVP dùng đúng 1 hiệp' });
    }
    if (exercise.holdSeconds == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Bài giữ tư thế phải có holdSeconds' });
    }
    if (exercise.targetRepMin != null || exercise.targetRepMax != null || exercise.durationSeconds != null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Prescription hold không dùng reps/duration' });
    }
  }

  if (exercise.prescriptionMode !== 'reps' && (exercise.targetWeight != null || exercise.targetRir != null)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Bài time/hold không dùng target weight hoặc RIR' });
  }
});

export type WorkoutDraftExercise = z.infer<typeof WorkoutDraftExerciseSchema>;

export function estimateDraftExerciseSeconds(exercise: WorkoutDraftExercise) {
  const transition = 20;
  const rest = Math.max(0, exercise.targetSets - 1) * exercise.restSeconds;
  if (exercise.prescriptionMode === 'reps') {
    const averageReps = ((exercise.targetRepMin ?? 8) + (exercise.targetRepMax ?? 12)) / 2;
    return transition + exercise.targetSets * averageReps * 4 + rest;
  }
  if (exercise.prescriptionMode === 'time') {
    return transition + exercise.targetSets * (exercise.durationSeconds ?? 60) + rest;
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
  gymId: z.string().uuid().nullable(),
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
  targetSets: z.number().int().min(1).max(10).optional(),
  targetRepMin: z.number().int().min(1).max(50).nullable().optional(),
  targetRepMax: z.number().int().min(1).max(50).nullable().optional(),
  targetWeight: z.number().positive().nullable().optional(),
  targetRir: z.number().int().min(0).max(10).nullable().optional(),
  restSeconds: z.number().int().min(0).max(600).optional(),
  durationSeconds: z.number().int().min(1).max(3600).nullable().optional(),
  holdSeconds: z.number().int().min(1).max(600).nullable().optional(),
  perSide: z.boolean().optional(),
  aiReason: z.string().max(500).optional(),
});

export const WorkoutGenerateRequestSchema = z.object({
  programDayId: z.string().uuid(),
  gymId: z.string().uuid().nullable(),
  durationMinutes: z.number().int().min(15).max(240).default(60),
  options: WorkoutOptionsSchema.optional().transform((value) => WorkoutOptionsSchema.parse(value ?? {})),
  regeneratePhase: WorkoutPhaseSchema.optional(),
  userPrompt: z.string().max(1000).optional().nullable(),
  currentExercises: z.array(CurrentDraftExerciseSchema).max(15).optional().nullable(),
});

export type WorkoutGenerateRequest = z.infer<typeof WorkoutGenerateRequestSchema>;
