# COMPLETION REPORT - TIP-MR-00

## Header

- TIP-ID: TIP-MR-00
- Feature: Muscle Readiness / Recovery Estimate
- Role: Builder
- Date: 2026-08-25
- Status: DONE
- Mutation policy: Read-only preflight. No migration, backfill, deploy, or live write was performed.

## Files changed

- Created: `docs/reports/TIP-MR-00-COMPLETION.md` - audit artifact for the source-truth preflight.
- Modified: none.

## Test results

Acceptance criteria tested: 5/5 passed.

| AC | Result | Evidence |
|---|---|---|
| Record branch, HEAD, worktree state, and migration inventory | PASS | Branch `main`, HEAD `4f1060a8438fcd2036ce6e80409607d513cbb95e`, 172 dirty entries: 92 modified and 80 untracked |
| Identify the live GymAI Supabase project without exposing credentials | PASS | `.env.local`, Supabase CLI, and database host resolve to project ref `xncmtbenoxqduksxpeee` |
| Inspect live schema, RLS, grants, indexes, and migration state without mutation | PASS | Queries executed inside `BEGIN TRANSACTION READ ONLY` and ended with `ROLLBACK` |
| Measure live exercise-muscle and effort coverage | PASS | Counts and gaps recorded below |
| Define the rollout flag contract | PASS | Server-only flag contract recorded below |

## Source-truth findings

### Repository state

- The worktree is heavily dirty and belongs to the homeowner.
- The approved master plan is an untracked new file.
- No existing dirty file was edited, staged, reset, or overwritten during this TIP.
- Local Supabase CLI version is `2.105.0`.
- The repo is not linked through `supabase link`.

### Supabase access paths

- Supabase CLI authentication can see the GymAI project.
- The active Supabase connector is authenticated to a different account and only lists two unrelated projects.
- The live GymAI database was inspected through the existing `DATABASE_URL` using `psql` in a read-only transaction.
- No secret value was printed.

Before a future live migration, the preferred path is to reconnect the Supabase connector to the GymAI account/project. A direct database write is not authorized by Blueprint approval.

### Migration drift

- Local migration `20260824184000_add_perceived_effort_to_workout_sets.sql` is not present in live migration history.
- Live `workout_sets` has `rir`, `set_type`, `note`, and `completed_at` but no `perceived_effort` column.
- Live has no `exercise_muscles.contribution`.
- Live has no `muscle_training_loads` or `muscle_recovery_states` table.
- Live `workouts` has no recovery processing marker.

Conclusion: TIP-MR-01 must preserve legacy note/RIR reads. It cannot assume the new effort column exists in live until a separately approved migration is applied.

### Live data counts

| Entity | Count |
|---|---:|
| Exercises | 1,324 |
| Muscles | 55 |
| Exercise-muscle mappings | 3,887 |
| Primary mappings | 1,324 |
| Secondary mappings | 2,563 |
| Workouts | 11 |
| Workout sets | 115 |
| Completed sets | 35 |
| Completed sets with reps greater than zero | 35 |
| Legacy effort markers | 10 |
| Sets with RIR | 13 |
| Completed sets without direct or RIR effort signal | 1 |

Live data contains five completed workouts across three users.

### Body-map mapping coverage

Using the proposed display mapping:

- 3,777 of 3,887 mapping rows map to a planned UI group.
- 110 rows do not map, across 108 exercises.
- Unmapped rows are `serratus` 72, `cardiovascular-system` 29, `serratus-anterior` 5, `levator-scapulae` 2, and `sternocleidomastoid` 2.

The 2.83% unmapped-row rate is acceptable only if the UI reports it honestly. `serratus` should be curated before broad rollout because it is the dominant gap. Cardiovascular mappings should remain outside the skeletal-muscle body map by design.

### Taxonomy drift

The live table contains 55 muscle slugs, including duplicate concepts and formatting variants:

- `upper_back` and `upper-back`.
- `front_delts` and `shoulder_front`.
- `rear_delts` and `shoulder_rear`.
- `lats` and `lung` for Vietnamese back/lats naming.
- Detailed slugs with zero current mappings alongside coarse slugs with high coverage.

TIP-MR-02 must add an explicit canonical presentation map and coverage test. It must not rename or merge live slugs destructively in V1.

### RLS and grants

- RLS is enabled on the inspected public tables.
- `FORCE ROW LEVEL SECURITY` is not enabled on those tables.
- Existing policies mostly target the implicit `public` role rather than `TO authenticated`.
- `workouts_owner_all` still uses direct `auth.uid()` rather than `(select auth.uid())`.
- `anon` and `authenticated` currently have broad table-level grants, while row policies provide the effective data boundary.
- Existing indexes cover workout ownership, exercise order, completed set lookup, and readiness checkin ownership.

For new recovery tables, use explicit least-privilege grants plus owner-scoped policies with `TO authenticated` and `(select auth.uid()) = user_id`. RLS and grants must both be tested because they solve different layers of access control.

## Feature flag contract

No feature-flag pattern currently exists in the app. V1 will introduce a server-only contract:

- `MUSCLE_READINESS_V1_ENABLED=false` by default.
- `MUSCLE_READINESS_V1_ALLOWED_USER_IDS=` as an optional comma-separated internal allowlist.
- The server decides access. No service key, rollout list, or authorization decision is exposed through a `NEXT_PUBLIC_` variable.
- When disabled, new recovery routes return not found or the UI omits entry points. Existing workout logging continues unchanged.

This flag contract is additive and does not require a database mutation.

## Issues discovered

- P0 - Effort migration drift: local code planning references a column that is absent live. Recommendation: implement dual-read code and keep live rollout disabled until migration approval.
- P0 - Connector identity mismatch: the installed Supabase connector cannot see the GymAI project. Recommendation: reconnect it before TIP-MR-02 live verification or migration.
- P1 - Muscle taxonomy duplication: multiple slugs represent similar anatomical groups. Recommendation: canonical presentation mapping plus coverage fixtures, no destructive rename in V1.
- P1 - Existing RLS style is inconsistent with current recommended policy patterns. Recommendation: use modern explicit policies for new tables and test with two authenticated users.
- P2 - No current feature-flag facility. Recommendation: add the small server-only contract above rather than introducing a third-party flag service.

## Deviations from spec

- The Supabase connector could not inspect GymAI because it is authenticated to a different account. Read-only inspection used the existing database connection instead. Impact: TIP-MR-00 source truth is complete, but future MCP-based mutation remains blocked until the connector is corrected.
- `rg` returned exit code 1 when no feature-flag references were found. This means zero matches, not a scan failure.

## Suggestions for Chủ thầu

- Accept TIP-MR-00 as DONE with 5/5 acceptance criteria.
- Allow TIP-MR-01 local implementation now because it is additive, testable, and does not require a live write.
- Keep TIP-MR-02 live migration behind a separate homeowner checkpoint.
- Add `serratus` to the CHEST or a dedicated rib-cage presentation decision during TIP-MR-02; recommendation is CHEST with an explicit explanation label for V1.

## Builder attestation

- Live queries were read-only and rolled back.
- No production data changed.
- No existing source file changed.
- No secret was included in this report.
