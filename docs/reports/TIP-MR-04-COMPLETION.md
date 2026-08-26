# TIP-MR-04 Completion Report

## Status

`DONE`

## Files Changed

- Created `docs/TIP-MR-04-IDEMPOTENT-WORKOUT-COMPLETION.md` as the Builder contract.
- Created `src/lib/recovery/process-workout.server.ts` for server-owned deterministic processing.
- Created `src/app/api/workouts/[id]/complete/route.ts` for authenticated completion.
- Modified `src/app/(app)/workouts/[id]/workout-logger.tsx` to call the server route and keep failures retryable.
- Created `tests/muscle-readiness-completion.test.ts` for ownership, retry, concurrency, and failure behavior.

## Test Results

- Acceptance criteria tested: 6/6 passed.
- Focused Muscle Readiness tests: 22/22 passed.
- TypeScript: PASS with zero errors.
- Scoped diff whitespace: PASS. Git emitted only the existing Windows LF-to-CRLF notice.

## Acceptance Details

| Scenario | Result |
|---|---|
| Owned workout produces ledger, state, and processing marker | PASS |
| Same request twice does not add fatigue | PASS |
| Concurrent same-workout requests converge without duplicates | PASS |
| Non-owner receives no workout and causes no writes | PASS |
| Partial failure remains unprocessed and retry converges | PASS |
| UI redirects only after an OK response and exposes retry feedback | PASS |

## Issues Discovered

- Cross-workout concurrency for two different workouts is outside this TIP's same-workout acceptance case. The deterministic rebuild reduces risk, but authenticated integration stress remains a TIP-MR-09 gate.
- PostgREST operations are not one database transaction. Retry convergence and the processing marker cover partial failures, but a future database RPC could provide stronger all-or-nothing semantics if the architecture is revised.

## Deviations From Spec

- The independent Builder agent exhausted its runtime quota before editing. The same session executed the Builder role after the Contractor wrote the TIP, then returned to Contractor verification. No product or architecture contract changed.
- When an exercise contains duplicate mappings for the same muscle, the processor conservatively keeps the highest contribution so the ledger unique key remains deterministic.

## Suggestions for Chủ thầu

- Continue to TIP-MR-05 using owner-readable RLS tables for reads and keep service role out of read endpoints.
- Include a real authenticated duplicate-request and two-user check in TIP-MR-09 before release.

## Live Impact

None. No live data writes, migration, backfill, exercise sync, deploy, commit, or push occurred.
