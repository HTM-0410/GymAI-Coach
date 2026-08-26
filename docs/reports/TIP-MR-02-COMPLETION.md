# COMPLETION REPORT - TIP-MR-02

## Header

- TIP-ID: TIP-MR-02
- Feature: Muscle Readiness / Recovery Estimate
- Role: Builder
- Date: 2026-08-25
- Status: DONE
- Resolution: The foundation, RLS verification, and advisor-driven FK index migration are complete on live Supabase.

## Files changed

- Created: `supabase/migrations/20260824190909_add_muscle_readiness_foundation.sql` - additive recovery schema, indexes, ownership constraints, RLS, and grants.
- Created: `tests/muscle-readiness-migration.test.ts` - static contract and sync safety tests.
- Created: `supabase/migrations/20260824192635_add_muscle_readiness_fk_indexes.sql` - covers five recovery foreign keys reported by performance advisors.
- Modified: `scripts/sync-exercises.ts` - preserves curated contribution values, defaults primary to 1 and secondary to 0.5, checks delete errors, and makes dry-run non-mutating for missing muscles.
- Modified: `src/types/database.ts` - adds mapping contribution, workout processing markers, ledger, and state types.

The migration file was created with `supabase migration new add_muscle_readiness_foundation` as required by the current Supabase workflow.

## Test results

Acceptance criteria: 4 passed.

| AC | Result | Evidence |
|---|---|---|
| Schema contract contains approved columns, tables, checks, owner FKs, unique keys, indexes, grants, and RLS | PASS | Static migration tests 3/3 pass |
| Exercise sync dry-run performs no write and contribution rebuild preserves curated values | PASS | Static safety test passes; real `--dry-run` completed with exit 0 and stopped before writes |
| Migration applies cleanly and database advisors are clear | PASS | All three migrations are live; recovery FK warnings are resolved |
| Authenticated User A/User B and anonymous RLS matrix passes | PASS | Owner visible, cross-user hidden, anonymous denied, authenticated mutations denied; test transaction rolled back |

Additional verification:

- TypeScript: 0 errors.
- Focused effort and migration tests: 9 passed, 0 failed.
- `git diff --check`: pass.
- Added em dash count: 0.

## Schema decisions implemented

- `exercise_muscles.contribution` is nullable and constrained to greater than 0 and at most 1.
- `workouts` receives processing timestamp and model version markers.
- Ledger events are unique by workout exercise, muscle, and model version.
- State stores fatigue at a timestamp, not a drifting readiness score.
- Composite foreign keys prevent a ledger row or last-workout pointer from crossing workout ownership.
- Authenticated users receive SELECT only on recovery tables.
- Mutation remains server-only through `service_role` and must never be exposed to the browser.
- Both recovery tables enable and force RLS.

## Issues discovered

- P0 resolved - The Supabase connector is now attached to the GymAI project.
- P0 resolved - Both approved migrations are present in live migration history.
- P1 resolved - All five recovery foreign keys now have covering indexes. Current `unused_index` INFO notices are expected while both tables are empty.
- P1 - `scripts/sync-exercises.ts --dry-run` loaded 1,323 valid files and skipped `barbell-front-squat` because `alternatives.0` is a string instead of the required object. This is existing dataset drift and should not be silently fixed in this feature.
- P2 - Supabase CLI `2.105.0` reports `2.115.0` available. No upgrade was performed because dependency/tool upgrades are outside this TIP.

## Deviations from spec

- Supabase CLI `db push` was not used because remote migration history contains many versions absent from the local directory. The two approved files were applied atomically through the verified database URL and registered in migration history, then confirmed through MCP.
- No database-generated TypeScript types were fetched because the new schema has not been applied. The existing manual type contract was updated instead.

## Suggestions for Chủ thầu

- Accept TIP-MR-02 as DONE.
- Continue with TIP-MR-03 pure recovery model.

## Builder attestation

- The three explicitly approved migrations are present on live Supabase.
- Schema and migration history changed; no persistent workout or recovery row was inserted, updated, deleted, or backfilled.
- The exercise sync ran only with `--dry-run`.
- No existing data file was edited.
- No file was staged, committed, pushed, or deployed.
