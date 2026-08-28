# TIP: Repair workout generation fallback metric shape

- ID: TIP-WORKOUT-GENERATE-500
- Priority: P0
- Scope: Deterministic fallback and focused regression tests only
- Context: `/api/workout/generate` returns HTTP 500 when a reviewed accessory candidate uses `reps` but the fallback emits duration fields.

## Acceptance criteria

- A reps-based accessory fallback has a positive rep range and no duration, distance, weight, or RIR values.
- A duration-based accessory fallback retains a positive duration target and no rep range.
- Every duration and warmup/cooldown toggle fallback fixture passes the final `WorkoutPlanSchema`.
- Existing user changes in the workout and gym forms remain untouched.

## Decision log

- Keep the candidate's reviewed tracking mode as the source of truth.
- Skip a separate approval checkpoint because this is a local bug fix with no API, schema, or product behavior expansion.
