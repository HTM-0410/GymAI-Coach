# TIP-MR-UI-10 Completion Report

## Status

`DONE`

## Files Changed

- Added `src/lib/recovery/ui-selectors.ts` for fresh, workout-eligible, days-since and stable status selectors.
- Added `src/lib/recovery/activity.ts` for activity normalization, group reduction and detail deduplication.
- Extended `src/app/api/recovery/route.ts` additively with `lastCompletedWorkoutAt` and `latestActivity` on every group.
- Updated `src/app/api/recovery/[group]/route.ts` to return one row per `workout_exercise_id`.
- Expanded `tests/muscle-readiness-api.test.ts` with selector, sorting, activity and query-shape coverage.
- Added this Completion Report.

## Acceptance Results

1. PASS: Fresh excludes readiness 89.
2. PASS: Fresh includes readiness 90 when data is current.
3. PASS: Both selectors exclude Unknown and stale readiness.
4. PASS: Workout-eligible includes readiness 80.
5. PASS: Detail activity deduplicates multiple child muscle rows by `workout_exercise_id` and keeps the maximum completed set count.
6. PASS: Existing authentication guard remains before all summary and detail data queries. Anonymous behavior remains 401.
7. PASS: Summary uses three fixed owner-scoped queries with `Promise.all`: one state query, one latest completed workout query and one bounded activity query. No query runs inside a per-group loop.
8. PASS: Existing `modelVersion`, `generatedAt`, group fields and detail fields remain unchanged. New summary fields are additive.
9. PASS: Focused tests and TypeScript pass.

## Query Evidence

- Summary recovery states: 1 query, filtered by `user_id`.
- Latest completed workout: 1 query, filtered by `user_id` and completed status, ordered descending, limited to 1.
- Recent training loads: 1 query, filtered by `user_id` and a 14-day lower bound, ordered descending, limited to 100.
- Summary network query count: fixed at 3 after authentication, independent of the 10 presentation groups.
- Detail network query count: 1 state query plus at most 1 bounded load query after authentication.

## Test Results

- Exact TIP focused test: 11/11 passed.
- Muscle Readiness API, UI and recommendation regression set: 23/23 passed.
- TypeScript `tsc --noEmit`: PASS with 0 errors.
- Em dash scan across changed source, tests and report input set: PASS with 0 matches before report creation. This report also uses standard hyphens only.

Boundary fixtures covered:

- Readiness: 79, 80, 89, 90, 100 and null.
- Stale readiness: 100 marked stale.
- Completion time: null, invalid, timezone offset and future clock skew.
- Stable ordering: ready, trainable, recovering and unknown/stale with canonical tie order.
- Dedupe: two child muscles for one workout exercise.
- Cross-group activity: one workout exercise remains visible in each affected presentation group.

## Issues

- None within TIP-MR-UI-10.

## Deviations

- None. The bounded summary activity window is 14 days with a maximum of 100 load rows, matching the existing detail history window while avoiding N+1 queries.

## Suggestions for Contractor

- TIP-MR-UI-12 and TIP-MR-UI-13 should import these selectors directly instead of reproducing readiness thresholds in components.
- UI consumers should render `lastCompletedWorkoutAt: null` as `--` and `latestActivity: null` as a clear no-recent-activity fallback.
