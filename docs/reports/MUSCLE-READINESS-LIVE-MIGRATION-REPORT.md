# Muscle Readiness Live Migration Report

## Scope

- Project: `xncmtbenoxqduksxpeee`
- Date: 2026-08-25
- Authorized migrations:
  - `20260824184000_add_perceived_effort_to_workout_sets.sql`
  - `20260824190909_add_muscle_readiness_foundation.sql`
  - `20260824192635_add_muscle_readiness_fk_indexes.sql`
- Backfill: not authorized and not run.
- Exercise sync: not run against live.
- Deploy: not run.

## Application result

- The first two migrations executed together in one transaction.
- The FK index migration executed separately through the connected Supabase project.
- MCP migration history lists all three authorized versions: `20260824184000`, `20260824190909`, and `20260824192635`.
- Live row counts remained 11 workouts and 115 workout sets.
- New recovery tables contained zero rows after migration and verification.
- Dedicated effort rows remained zero because no backfill was run.

## Verification result

| Check | Result |
|---|---|
| `workout_sets.perceived_effort` exists | PASS |
| `exercise_muscles.contribution` exists | PASS |
| Workout processing markers exist | PASS |
| Ledger and state tables exist | PASS |
| RLS enabled and forced on both new tables | PASS |
| Authenticated owner can select own state | PASS |
| Another authenticated user cannot select owner state | PASS |
| Anonymous role has no SELECT grant | PASS |
| Authenticated role has no INSERT/UPDATE/DELETE grant | PASS |
| Authenticated effort save and reload | PASS |
| Verification rows persisted | PASS, zero rows persisted because tests rolled back |

## Advisor result

Security advisors reported no recovery-table RLS finding. Existing project warnings remain for mutable function search paths, public execution of `handle_new_user`, and leaked-password protection configuration.

Performance advisors initially reported five missing recovery-table FK indexes. The applied remediation is:

- `20260824192635_add_muscle_readiness_fk_indexes.sql`

All five target indexes now exist and the corresponding `unindexed_foreign_keys` findings are resolved. `unused_index` INFO notices are expected until recovery data and query traffic exist.

## Overall status

`READY`

The persistence, access-control, and FK index contracts are operational. TIP-MR-02 is DONE.
