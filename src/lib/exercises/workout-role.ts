import { z } from 'zod';

export const WORKOUT_ROLES = [
  'general_warmup',
  'dynamic_mobility',
  'activation',
  'main_strength',
  'cooldown_aerobic',
  'static_stretch',
] as const;

export const WORKOUT_ROLE_REVIEW_STATUSES = ['reviewed', 'needs_review'] as const;

export type WorkoutRole = (typeof WORKOUT_ROLES)[number];
export type WorkoutRoleReviewStatus = (typeof WORKOUT_ROLE_REVIEW_STATUSES)[number];

export const workoutRoleFieldsSchema = z
  .object({
    workout_role: z.enum(WORKOUT_ROLES).optional(),
    workout_role_review_status: z.enum(WORKOUT_ROLE_REVIEW_STATUSES).optional(),
    workout_role_confidence: z.number().min(0).max(1).optional(),
    workout_role_source: z.string().min(1).optional(),
  })
  .superRefine((value, context) => {
    const fields = [
      value.workout_role,
      value.workout_role_review_status,
      value.workout_role_confidence,
      value.workout_role_source,
    ];
    const populated = fields.filter((field) => field !== undefined).length;
    if (populated !== 0 && populated !== fields.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Workout-role taxonomy fields must be omitted or supplied together',
      });
    }
  });

export const reviewedWorkoutRoleSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  workout_role: z.enum(WORKOUT_ROLES),
  workout_role_review_status: z.literal('reviewed'),
  workout_role_confidence: z.number().min(0).max(1),
  workout_role_source: z.string().min(1),
  coverage: z.object({
    splits: z.array(z.enum(['Push', 'Pull', 'Legs', 'Full Body'])),
    equipment_classes: z.array(z.enum(['bodyweight', 'common_gym'])),
  }),
  rationale: z.string().min(1),
});

export const unresolvedWorkoutRoleSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  workout_role_review_status: z.literal('needs_review'),
  candidate_roles: z.array(z.enum(WORKOUT_ROLES)).min(1),
  reason: z.string().min(1),
  next_action: z.string().min(1),
});

export const workoutRoleManifestSchema = z.object({
  schema_version: z.literal('1.0.0'),
  reviewed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  eligibility_policy: z.literal("workout_role_review_status == 'reviewed'"),
  reviewed: z.array(reviewedWorkoutRoleSchema),
  unresolved: z.array(unresolvedWorkoutRoleSchema),
});

export type WorkoutRoleManifest = z.infer<typeof workoutRoleManifestSchema>;
