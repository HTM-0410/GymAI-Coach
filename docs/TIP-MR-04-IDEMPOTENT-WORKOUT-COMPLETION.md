# TIP-MR-04: Idempotent Workout Completion

## Header

- TIP-ID: TIP-MR-04
- Project: GymAI Coach
- Module: Muscle Readiness
- Depends on: TIP-MR-01, TIP-MR-02, TIP-MR-03
- Priority: P0

## Context

- Working directory: `D:\GymAI-Coach`
- Blueprint: `docs/PLAN-MUSCLE-READINESS-CONTRACTOR.md`
- Pure model: `src/lib/recovery/model.ts`
- Existing completion UI: `src/app/(app)/workouts/[id]/workout-logger.tsx`
- Existing server-only Supabase client: `src/lib/supabase/service.ts`

## Task

Move workout completion to an authenticated server route. The server validates ownership, marks the workout completed, builds deterministic muscle-load ledger events from completed sets, rebuilds current recovery state, and records the processing marker. Connect the workout logger to this route.

## Specifications

1. Authenticate with the request-scoped server client before creating or using the service-role client.
2. Return 404 for a missing workout or a workout owned by another user so the endpoint does not disclose existence.
3. Count only completed sets with positive reps. Timed exercises without qualifying sets add no fatigue.
4. Resolve contribution, effort, set type, half-life, confidence, and model version through the approved V1 domain contracts.
5. Keep one ledger row per workout exercise, muscle, and model version. Retry and concurrent requests must not create duplicates.
6. Rebuild recovery state deterministically from the user's model-versioned ledger after ledger insertion. Never increment state blindly.
7. Set `recovery_processed_at` and `recovery_model_version` only after ledger and state processing succeeds.
8. A retry after partial processing must converge to the same ledger and state.
9. The client redirects to the done page only after a successful API response. It remains on the logger and shows a retryable error on failure.
10. Do not expose service-role credentials in client code or response data.

## Acceptance Criteria

- Given an owned workout with completed sets, when completion succeeds, then status, ledger, state, and processing marker are produced from the approved model.
- Given the same completion request twice, when both finish, then fatigue and ledger counts match one successful request.
- Given two concurrent completion requests, when both settle, then no duplicate ledger event exists and state is not double-counted.
- Given an unauthenticated request, when completion is requested, then the route returns 401 and performs no write.
- Given a non-owner workout ID, when completion is requested, then the route returns 404 and performs no write.
- Given processing failure, when the UI receives the error, then it does not navigate to the done page and offers retry feedback.

## Constraints

- No schema changes or migrations.
- No live writes, backfill, exercise sync, deploy, commit, or push.
- Preserve the dirty worktree and unrelated user changes.
- Do not change the approved readiness formulas or architecture.
- Do not use an em dash in source, UI, tests, or documentation.

## Report Format

Create `docs/reports/TIP-MR-04-COMPLETION.md` using the Vibecode Kit Completion Report format with exact test counts and all deviations.
