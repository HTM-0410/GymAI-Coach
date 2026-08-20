import { z } from 'zod';

export const WorkoutPlanSchema = z.object({
  exercises: z.array(z.object({
    exercise_slug: z.string(),
    target_sets: z.number().int().min(1).max(10),
    target_rep_min: z.number().int().min(1).max(50),
    target_rep_max: z.number().int().min(1).max(50),
    target_weight: z.number().positive().nullable().optional().default(null),
    target_rir: z.number().int().min(0).max(10).default(2),
    rest_seconds: z.number().int().min(30).max(600).default(120),
    ai_reason: z.string().default(''),
  })).min(3).max(12),
});

export type WorkoutPlan = z.infer<typeof WorkoutPlanSchema>;
