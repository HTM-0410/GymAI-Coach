import { z } from 'zod';
import {
  PhaseBudgetsSchema,
  PrescriptionModeSchema,
  WorkoutOptionsSchema,
  WorkoutPhaseSchema,
} from './workout-contract';
import { isPhasePrescriptionValid } from './workout-constraints';
import { normalizeTrackingMode, validateMetricValues } from '@/lib/workouts/metrics';

export const PlannedExerciseSchema = z.object({
  exercise_slug: z.string(),
  phase: WorkoutPhaseSchema,
  prescription_mode: PrescriptionModeSchema,
  duration_style: z.enum(['active', 'hold']).nullable().optional(),
  target_sets: z.number().int().min(1).max(10),
  target_rep_min: z.number().int().min(1).max(50).nullable().default(null),
  target_rep_max: z.number().int().min(1).max(50).nullable().default(null),
  target_weight: z.number().positive().nullable().default(null),
  target_rir: z.number().int().min(0).max(10).nullable().default(null),
  rest_seconds: z.number().int().min(0).max(600).default(0),
  duration_seconds: z.number().int().min(1).max(3600).nullable().default(null),
  hold_seconds: z.number().int().min(1).max(600).nullable().default(null),
  target_duration_seconds: z.number().int().min(1).max(3600).nullable().optional(),
  target_distance_meters: z.number().positive().nullable().optional(),
  per_side: z.boolean().default(false),
  ai_reason: z.string().max(500).default(''),
}).superRefine((exercise, ctx) => {
  if (!isPhasePrescriptionValid(exercise.phase, exercise.prescription_mode)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'phase/prescription mismatch' });
  }
  const mode = normalizeTrackingMode(exercise.prescription_mode, { targetWeight: exercise.target_weight, targetRir: exercise.target_rir });
  const targetDuration = exercise.target_duration_seconds ?? exercise.duration_seconds ?? exercise.hold_seconds;
  validateMetricValues(mode, {
    weight: exercise.target_weight,
    reps: exercise.target_rep_min,
    durationSeconds: targetDuration,
    distanceMeters: exercise.target_distance_meters,
  }, { allowMissingWeight: true }).forEach((message) => ctx.addIssue({ code: z.ZodIssueCode.custom, message }));
  if (mode === 'weight_reps' || mode === 'reps') {
    if (exercise.target_rep_min == null || exercise.target_rep_max == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'reps prescription requires a rep range' });
    } else if (exercise.target_rep_max < exercise.target_rep_min) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'target_rep_max must be >= target_rep_min' });
    }
    if (exercise.rest_seconds < 30 || exercise.duration_seconds != null || exercise.hold_seconds != null || exercise.target_duration_seconds != null || exercise.target_distance_meters != null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'invalid reps prescription' });
    }
  }
  if (mode !== 'weight_reps' && exercise.target_rir != null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'time/hold cannot use weight or RIR' });
  }
});

const AiPhaseSchema = z.object({
  phase: WorkoutPhaseSchema,
  exercises: z.array(PlannedExerciseSchema).min(1).max(10),
});

export const AiWorkoutPlanSchema = z.object({
  phases: z.array(AiPhaseSchema).min(1).max(3),
}).superRefine((plan, ctx) => {
  const rank = { warmup: 0, main: 1, cooldown: 2 } as const;
  const names = plan.phases.map((phase) => phase.phase);
  if (new Set(names).size !== names.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'duplicate phase' });
  }
  plan.phases.forEach((phase, index) => {
    if (index > 0 && rank[phase.phase] < rank[plan.phases[index - 1].phase]) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'invalid phase order' });
    }
    if (phase.exercises.some((exercise) => exercise.phase !== phase.phase)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'exercise phase does not match its group' });
    }
  });
});

export const WorkoutPlanSchema = z.object({
  options: WorkoutOptionsSchema,
  phase_budgets: PhaseBudgetsSchema,
  exercises: z.array(PlannedExerciseSchema).min(1).max(15),
});

export type PlannedExercise = z.infer<typeof PlannedExerciseSchema>;
export type WorkoutPlan = z.infer<typeof WorkoutPlanSchema>;
