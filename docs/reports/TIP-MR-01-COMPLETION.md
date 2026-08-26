# COMPLETION REPORT - TIP-MR-01

## Header

- TIP-ID: TIP-MR-01
- Feature: Muscle Readiness / Recovery Estimate
- Role: Builder
- Date: 2026-08-25
- Status: DONE
- Resolution: The approved migration is live and authenticated save/reload was verified inside a transaction that was rolled back.

## Files changed

- Created: `src/lib/workouts/perceived-effort.ts` - canonical effort validation, legacy parsing, RIR fallback, source tracking, and note cleanup.
- Created: `tests/perceived-effort.test.ts` - exact contract tests.
- Modified: `src/types/database.ts` - adds the `PerceivedEffort` type and `workout_sets.perceived_effort`.
- Modified: `src/app/(app)/workouts/[id]/objective-set-tracker.tsx` - writes effort to the dedicated column and stops creating legacy effort markers in `note`.
- Modified: `src/app/(app)/workouts/[id]/page.tsx` - selects the dedicated column and resolves column, legacy note, RIR, and fallback through one helper.
- Modified: `src/app/(app)/workouts/[id]/done/page.tsx` - includes effort in the completed workout projection.

The modified workout files already contained homeowner changes. Nothing was staged or reset.

## Test results

Acceptance criteria: 3 passed.

| AC | Result | Evidence |
|---|---|---|
| Legacy note and RIR data remain readable with correct precedence | PASS | `tests/perceived-effort.test.ts`, 5/5 tests pass |
| Typecheck and focused tests pass | PASS | TypeScript 0 errors, focused tests 5 passed and 0 failed |
| Save and reload preserves dedicated effort column | PASS | Authenticated update and read returned `hard`; transaction was rolled back afterward |

Additional regression suite:

- 108 total tests.
- 106 passed.
- 2 failed in `tests/onboarding-ui.test.ts` because current homeowner onboarding UI text/options do not match existing assertions.
- The two failures do not touch any TIP-MR-01 file or effort behavior.

## Issues discovered

- P0 resolved - Deployment ordering: `perceived_effort` is now present live before application rollout.
- P1 - Supabase clients are not parameterized with the local `Database` type, so query column drift is not caught automatically. Recommendation: treat typed clients as a separate DevEx improvement because enabling them may expose broad existing type debt.
- P2 - Existing onboarding tests have two unrelated failures in the dirty worktree. Recommendation: the owner of those changes should reconcile copy/options with the tests; do not mix that repair into Muscle Readiness.

## Deviations from spec

- Runtime save/reload verification ran only after explicit approval and left no workout-row change because the test transaction was rolled back.
- The full unit suite is not fully green due to two pre-existing onboarding assertion failures. Focused effort tests and TypeScript are green.

## Suggestions for Chủ thầu

- Accept TIP-MR-01 as DONE.
- Continue with the remaining recovery model tasks only after TIP-MR-02 advisor remediation is complete.

## Builder attestation

- The approved effort migration was applied to live Supabase.
- The verification update was rolled back, so no live workout row changed.
- No dependency was installed.
- No file was staged or committed.
