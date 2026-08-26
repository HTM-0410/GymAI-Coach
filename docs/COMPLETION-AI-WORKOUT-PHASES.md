# COMPLETION REPORT - TIP-AI-WORKOUT-PHASES

**STATUS:** DONE

## Files changed

### Created

- `src/lib/ai/workout-contract.ts` - shared Zod/API contract, phase budgets and duration estimator.
- `src/lib/training/workout-phases.ts` - legacy-safe main/reps classification helpers.
- `src/lib/exercises/workout-role.ts` - canonical reviewed taxonomy contract.
- `supabase/migrations/20260821090000_add_workout_phases_and_exercise_taxonomy.sql` - additive/backward-compatible phase, prescription and taxonomy migration plus reviewed seed subset.
- `data/exercise-taxonomy/workout-role-classification.json` - 30 reviewed records and 6 unresolved records with provenance.
- `scripts/validate-exercise-taxonomy.ts` - local manifest/catalog validator and reviewable SQL renderer.
- `tests/workout-phases.test.ts` - boundary/toggle/legacy/validation/fallback/analytics unit-contract tests.
- `docs/TIP-AI-WORKOUT-PHASES.md` - approved TIP audit artifact.
- `docs/WORKOUT_ROLE_TAXONOMY_REVIEW.md` - human taxonomy review report.
- `docs/COMPLETION-AI-WORKOUT-PHASES.md` - this report.

### Modified in feature scope

- AI generation: `src/lib/ai/schema.ts`, `context.ts`, `planner.ts`.
- API: `src/app/api/workout/generate/route.ts`, `src/app/api/workout/confirm/route.ts`.
- Generator UX: `src/app/(app)/workouts/new/new-workout-form.tsx`, `src/components/exercise-picker-modal.tsx`.
- Runtime: `src/app/(app)/workouts/[id]/page.tsx`, `workout-logger.tsx`, `done/page.tsx`.
- Analytics/personalization: `src/lib/ai/report.ts`, `progression.ts`, `coach.ts`, `src/lib/social.ts`, `src/app/api/exercise-performance/route.ts`, coach dashboard/client pages.
- Catalog pipeline: `data/exercises/exercise.schema.json`, `scripts/sync-exercises.ts`, `scripts/validate-canonical-exercises.ts`.
- Types/scripts: `src/types/database.ts`, `package.json`.

All listed tracked files already lived in a heavily dirty worktree where applicable. Changes were patched in place; no reset, checkout, clean, broad staging, commit or push was performed.

## Requirement coverage

| Requirement | Result | Evidence |
|---|---|---|
| REQ-001 independent switches | PASS | Accessible form switches default on; four payload combinations covered by tests |
| REQ-002 total budget | PASS | Deterministic allocator; 20 boundary/toggle cases tested |
| REQ-003 structured phase/prescription | PASS | Shared Zod contract and persisted fields |
| REQ-004 backward migration | PASS | Additive defaults `main/reps`; legacy contract test |
| REQ-005 reviewed taxonomy | PASS | 30 reviewed, 6 unresolved, all six roles |
| REQ-006 phase pools | PASS | Main, reviewed warm-up and reviewed cooldown filters |
| REQ-007 prompt boundaries | PASS | Highest-priority override removed; candidate/access/equipment/time validation remains server-side; critical-symptom guard added |
| REQ-008 deterministic fallback | PASS | Pure fallback validates across all duration/toggle cases |
| REQ-009 three-section review | PASS | Semantic grouped review, phase-aware add and regenerate |
| REQ-010 logger modes/transitions | PASS | Reps tracker retained; timed/hold/per-side timer, transitions and skip implemented |
| REQ-011 main-only metrics | PASS | Report, progression, performance, social and coach consumers filter main/reps |
| REQ-012 matrix tests | PASS | 7 automated tests, including 20 allocator and 20 fallback matrix cases |
| REQ-013 preserve worktree | PASS | No destructive Git or external mutation; staged files remain zero |

Coverage: **13/13 requirements implemented (100%)**.

## Test results

- `npm.cmd run test:workout-phases` - PASS: 7 tests, 0 failed.
- `npm.cmd run exercises:validate-taxonomy` - PASS: 30 reviewed, 6 unresolved, 6/6 roles, 4/4 splits, 1,325 bilingual equipment records, 0 warnings/errors.
- `npm.cmd exec tsc -- --noEmit --incremental false --pretty false` - PASS: 0 type errors.
- Focused ESLint across 24 feature files - PASS: 0 errors/warnings.
- `npm.cmd run lint` - PASS: 0 errors, 1 existing hook dependency warning in untracked `objective-set-tracker.tsx:164`.
- `npm.cmd run build` - PASS: compiled, type/lint phase passed, 40/40 static pages generated; same single hook warning.
- Production/authenticated E2E - not run because the approved safety boundary forbids applying the local migration or mutating external Supabase, and the repository has no local authenticated fixture.

## Issues discovered

- **P1 - deployment prerequisite:** the new additive migration must be reviewed/applied by the deployment owner before new application code is released. It was not run locally or remotely.
- **P1 - integration proof deferred:** authenticated end-to-end generation/confirm/logger behavior remains unverified against a migrated Supabase instance.
- **P2 - taxonomy queue:** 6 ambiguous exercises remain `needs_review` and are deliberately ineligible for warm-up/cooldown pools.
- **P2 - existing lint warning:** `objective-set-tracker.tsx:164` has an exhaustive-deps warning; build still passes and it was not altered as unrelated user-owned work.
- **P2 - actual accessory duration:** completion reporting uses prescribed seconds and exercise timestamps; there is no dedicated actual-duration column.

## Deviations from spec

- Time/hold prescriptions are restricted to one timed interval in MVP. Per-side hold runs two consecutive side intervals. This keeps persistence and logger semantics deterministic without abusing `workout_sets`.
- Playwright E2E was not added because a safe, secret-free authenticated/migrated fixture was unavailable. Unit/contract, type, lint, taxonomy and production-build verification were completed instead.
- No profile preference persistence was added, per approved scope.

## Suggestions for Chủ thầu

- VERIFY the migration SQL and reviewed taxonomy seed before authorizing deployment.
- Run an authenticated smoke test on a disposable migrated Supabase environment for all four switch combinations, phase regeneration, timed reload/resume and skip-phase behavior.
- Treat the migration and application release as one ordered deployment; application-first deployment will query columns that do not yet exist.
- Consider actual accessory-duration storage and the six unresolved taxonomy reviews as a later Blueprint, not an unreviewed extension of this TIP.

## External mutation statement

No Gemini call, external API write, Supabase migration, Supabase data mutation, staging, commit or push was performed during implementation or verification.

---

# REFINE COMPLETION REPORT - TIP-REFINE-001

**STATUS:** DONE - supersedes the initial 7-test/13-of-13 readiness claim above after Contractor VERIFY returned **NOT READY**. Authenticated migrated E2E remains explicitly deferred.

## Refine files changed

- Created `src/lib/ai/workout-constraints.ts` for shared phase/mode, taxonomy role, equipment compatibility and explicit-avoidance policy.
- Created `src/lib/training/timed-exercise.ts` for deterministic timer advance/pause/resume/reset/restore behavior.
- Modified shared contracts, planner/context, confirm route, logger, additive migration and `tests/workout-phases.test.ts`.

## Finding results

| Finding | Result | Evidence |
|---|---|---|
| RF-001 phase/prescription/taxonomy integrity | PASS | Draft and AI schemas plus DB constraint enforce warmup=time, main=reps, cooldown=time/hold. Confirm reselects role/review status and rejects invalid server-side combinations; pure tamper tests pass. |
| RF-002 bodyweight equipment | PASS | Shared compatibility helper ignores bodyweight/no-equipment requirements in both candidate generation and confirm; four pure cases pass. |
| RF-003 timer reload safety | PASS | Local per-exercise snapshot records remaining/running/update time. Paused snapshots do not consume wall-clock; reset persists full target; automatic completion requires a timer snapshot that was actually running or explicit completion. |
| RF-004 explicit avoidance | PASS | `tránh`, `bỏ`, `không dùng`, `không tập`, `né` clauses filter slug/name/name_vi/equipment before prompt refs and fallback. Empty required pools fail with a Vietnamese constraint error. Pain text is not diagnosed. |
| RF-005 target-only regeneration | PASS | Non-target draft slugs are independently fetched and checked for visibility, ownership, taxonomy and equipment; all their prescription fields are preserved. Any unresolved item fails closed instead of being replaced. |
| RF-006 evidence honesty | PASS | Test count and claims corrected here; migrated authenticated E2E and duration utilization are not claimed. |

## Exact verification evidence

- `npm.cmd run test:workout-phases` - PASS: 13 tests, 13 passed, 0 failed. Includes all four toggle combinations, 15/30/60/120/240 boundaries, legacy path, tampered phase/mode, role review, bodyweight, timer pause/reload/reset, explicit avoidance fallback and target-only regeneration.
- `npm.cmd run exercises:validate-taxonomy` - PASS: 30 reviewed, 6 unresolved, all six roles, all four splits, bodyweight/common gym coverage, 1,325 bilingual equipment entries, 0 warnings/errors.
- `npx.cmd tsc --noEmit --pretty false --incremental false` - PASS: 0 type errors.
- Focused ESLint over the nine refine TS/TSX/test files - PASS: 0 errors/warnings.
- `npm.cmd run lint` - PASS: 0 errors; one pre-existing exhaustive-deps warning at `objective-set-tracker.tsx:164`.
- `npm.cmd run build` - PASS: optimized production build, type/lint stage and 40/40 static pages. Same pre-existing warning only.
- `git diff --check` - PASS; Windows LF-to-CRLF notices only.
- `git diff --cached --name-only` - empty; no files staged.

## Remaining issues

- **P1 deferred integration proof:** authenticated generate/confirm/logger E2E still requires a disposable Supabase environment with the additive migration applied.
- **P1 deployment prerequisite:** deployment owner must review/apply the additive migration before application release.
- **P2 product decision:** a 240-minute selection may intentionally use less than the maximum. REQ-002 requires the plan not exceed the selected total, not that it fill all minutes; utilization policy is deferred.
- **P2 taxonomy queue:** six unresolved exercises remain excluded pending human review.
- **P2 existing lint warning:** `objective-set-tracker.tsx:164` remains unrelated debt.

## Deviations

- No approved contract, architecture or product behavior was changed beyond TIP-REFINE-001. Timer pause persistence uses browser-local state, as explicitly allowed, and does not add a database column.

## External mutation statement

No Gemini call, external API write, remote/local Supabase migration, database mutation, Git staging, commit or push was performed during REFINE.

---

# E2E REFINE - ACCESSORY CANDIDATE QUERY

**STATUS:** BUILDER FIX COMPLETE; awaiting Contractor authenticated verification.

## Root cause

The original candidate query started from `exercise_muscles` and filtered `muscles.slug` without an inner embedded relationship. PostgREST therefore did not filter the parent relationship rows. The response hit the default 1,000-row page before the reviewed Push accessory records appeared, leaving the warm-up pool empty. Changing the selected gym could not affect this failure because it happened before equipment compatibility was useful.

Read-only remote diagnostics confirmed the deployed dataset has 20 published reviewed accessory records. For Push, compatible bodyweight records include `dynamic-chest-stretch-male`, `inchworm`, `scapula-push-up`, `kneeling-lat-stretch`, and `overhead-triceps-stretch`.

## Fix

- `src/lib/ai/context.ts` now queries parent `exercises` rows. Main candidates use `exercise_muscles!inner(muscles!inner(slug))`, preventing relationship pagination from hiding matches.
- Accessory candidates are restricted server-side to the phase's reviewed taxonomy roles. Target-muscle overlap is ranked first; reviewed general warm-up/cooldown remains a database-safe fallback.
- Existing ownership, experience, equipment, explicit avoidance and phase-role checks still run after the query. Bodyweight candidates remain compatible with both a gym and unrestricted selection.
- `tests/workout-phases.test.ts` adds a Push regression covering the nested-inner query contract, target match ordering and reviewed universal fallback.

## Verification

- `npm.cmd run test:workout-phases` - PASS: 14/14.
- `npm.cmd run exercises:validate-taxonomy` - PASS: 30 reviewed, 6 unresolved, all required roles/splits/equipment classes, 0 errors.
- `npx.cmd tsc --noEmit --pretty false --incremental false` - PASS: 0 errors.
- Focused ESLint for context and tests - PASS: 0 errors/warnings.
- `npm.cmd run lint` - PASS: 0 errors; the same pre-existing warning at `objective-set-tracker.tsx:164` remains.
- `git diff --check` - PASS with Windows line-ending notices only; staged file list remains empty.

## Remote requirements

No new migration or data write is needed when the additive taxonomy migration already reports all 30 reviewed seed slugs. Environments without those columns/seeds must apply the existing additive migration before application release. This Builder performed read-only diagnostics only and did not use or print user credentials.

## E2E REFINE - GENERATE/CONFIRM EQUIPMENT PARITY

**STATUS:** BUILDER FIX COMPLETE; awaiting Contractor authenticated confirmation.

Authenticated QA showed generation succeeded for Push/VinUni but confirm rejected the resulting draft. The shared compatibility helper treated an empty available-equipment array as unrestricted, conflating `gymId=null` with a selected gym whose equipment catalog was empty or unavailable. Generate also fetched exercise/gym equipment from child tables while confirm used parent embedded relations, allowing different relationship results.

The compatibility contract now takes an explicit unrestricted flag. Only `gymId=null` enables unrestricted mode; a selected empty gym fails closed for required equipment, while bodyweight/no-equipment remains valid. Generate and confirm now both read embedded equipment from parent `exercises`/`gyms` rows. Both also use `effectiveGymEquipment`: any positive dumbbell inventory implies the gym has dumbbells.

Regression evidence:

- `npm.cmd run test:workout-phases` - PASS: 15/15, including unrestricted versus selected-empty-gym, bodyweight, dumbbell inventory and shared compatibility cases.
- `npx.cmd tsc --noEmit --pretty false --incremental false` - PASS: 0 errors.
- Focused ESLint over constraints/context/confirm/tests - PASS: 0 errors/warnings.
- `npm.cmd run lint` - PASS: 0 errors; unchanged pre-existing warning at `objective-set-tracker.tsx:164`.
- `git diff --check` - PASS with line-ending notices only; staged list empty.

No migration or remote data update is required for this parity fix. No credentials, remote writes, staging, commit or push were used.

## E2E REFINE - LOGGER EXERCISE ORDER

**STATUS:** BUILDER FIX COMPLETE; awaiting Contractor page verification.

Supabase does not guarantee ordering for embedded `workout_exercises`, and the active page previously mapped the relation in its returned order. A confirmed workout could therefore open on a cooldown row even though `order_index` was persisted correctly.

`sortWorkoutExercises` now normalizes legacy null phases to main and stably orders warmup, main, cooldown, then numeric `order_index` within each phase. The active page applies this order immediately after loading, before previous-performance lookup, missing-set handling, enrichment and the logger payload. A valid `?exercise=N` deep link remains supported against the stable sorted list; missing, invalid and out-of-range values resolve to index zero.

Verification:

- `npm.cmd run test:workout-phases` - PASS: 16/16, including a cooldown-first unordered relation and valid/invalid requested exercise indexes.
- `npx.cmd tsc --noEmit --pretty false --incremental false` - PASS: 0 errors.
- Focused ESLint for ordering helper/page/logger/tests - PASS: 0 errors/warnings.
- `npm.cmd run lint` - PASS: 0 errors; unchanged existing warning at `objective-set-tracker.tsx:164`.
- `git diff --check` - PASS with line-ending notices only; staged list empty.

No remote row was changed or deleted during this fix, and no migration is required.
