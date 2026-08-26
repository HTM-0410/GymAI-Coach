# COMPLETION REPORT - TIP-P01 PERSONALIZATION FOUNDATION

**STATUS:** BUILDER COMPLETE - awaiting Contractor VERIFY and authorized local migration/E2E.

## Scope delivered

- Added `supabase/migrations/20260822090000_personalization_foundation.sql` with additive persistence for:
  - structured, expiring training constraints;
  - explicit/inferred exercise preferences;
  - expiring readiness check-ins;
  - reviewed body-composition measurements and segment rows;
  - versioned purpose/provider consent history;
  - compact AI factor/provenance records.
- Enabled RLS on all seven new tables with owner-only `FOR ALL` policies using both `USING` and `WITH CHECK`.
- Added a composite workout/user foreign key for readiness so one user cannot associate a check-in with another user's workout.
- Added local database TypeScript rows, inserts, updates and domain unions in `src/types/database.ts`.
- Added the typed/versioned pure `PersonalizationContextV1` contract and helpers in `src/lib/ai/personalization-context.ts`.
- Added the single database-backed server builder in `src/lib/ai/personalization-context.server.ts`.
- Added focused Node tests and `npm.cmd run test:personalization`.

No UI, AI prompt, existing workout behavior, storage bucket or dependency was added or changed.

## Acceptance results

| Acceptance criterion | Builder result | Evidence |
|---|---|---|
| Owner-only CRUD for different users | PASS at migration/contract level | Seven tables enable RLS; every policy checks `auth.uid() = user_id` for read/write; segment ownership is tied to its parent measurement and readiness to its workout through composite user FKs. Static regression test covers every table. Authenticated two-user DB proof is deferred until Contractor-authorized local apply. |
| Expired constraints/readiness excluded | PASS | Pure fixed-clock test confirms expired records are omitted and current records retained. |
| Missing/withdrawn purpose consent excludes body composition | PASS | Surface-specific consent intersection test covers planner allowed, coach withdrawn and weekly report missing. |
| One confirmed measurement is baseline without trend | PASS | Focused baseline test. |
| Two comparable confirmed measurements expose trend | PASS | Focused test verifies Weight/SMM/PBF deltas; low-comparability and different-device tests fail closed. |
| Minimal AI projection excludes raw image and direct PII | PASS | Projection only maps reviewed numeric summary/provenance; regression rejects image/path/email/phone/birthday keys. Migration contains no image bytes, URL or path column. |
| Existing workout phase tests remain passing | PASS | 16/16 tests passed. |

## Verification evidence

- `npm.cmd run test:personalization` - PASS: 7 passed, 0 failed.
- `npm.cmd run test:workout-phases` - PASS: 16 passed, 0 failed.
- `npx.cmd tsc --noEmit` - PASS: 0 type errors.
- `npm.cmd run lint` - PASS: 0 errors; one unchanged pre-existing `react-hooks/exhaustive-deps` warning at `src/app/(app)/workouts/[id]/objective-set-tracker.tsx:164`.
- `git diff --check` - PASS; only Windows LF-to-CRLF notices.

## Safety and privacy properties

- Body-composition rows are unavailable to an AI surface unless both the measurement's `allowed_uses` and the latest active purpose consent permit that surface.
- Only confirmed measurements enter context.
- A single scan cannot create a trend; current measurement comparability and device identity must permit comparison.
- The minimal AI projection omits device score, device target values, preparation/extraction metadata and location as well as direct identity/image fields.
- `ai_decision_contexts` stores typed factor keys and record UUIDs, not a free-form raw request/context blob.
- No public/private image bucket and no raw/redacted image persistence field was created.

## Deviations and remaining verification

- No approved architecture or scope deviation was made.
- The migration was deliberately **not applied** to any local or remote database in the Builder phase, as required by TIP-P01 and Contractor instructions.
- Consequently, SQL execution and authenticated two-user RLS CRUD remain Contractor VERIFY gates after authorized local migration apply.
- The existing full-repo lint warning is unrelated and was not modified.

## External mutation statement

No Supabase migration/data mutation, image/OCR/AI provider call, external API write, Git staging, commit or push was performed.

## Contractor handoff

1. Review schema naming, checks, FK ownership and consent semantics.
2. Apply the additive migration to the authorized local Supabase instance.
3. Execute authenticated two-user CRUD/RLS and server-builder smoke tests.
4. Return VERIFY READY/NOT READY before P01 is treated as accepted infrastructure.

---

## REFINE - Supabase RLS initplan and foreign-key indexes

**STATUS:** BUILDER REFINE COMPLETE - awaiting Contractor apply and fresh Advisor VERIFY.

### Contractor findings addressed

| Finding | Fix | Regression evidence |
|---|---|---|
| Seven owner policies triggered `auth_rls_initplan` because `auth.uid()` was evaluated directly per candidate row | Both fresh and post-deploy definitions now use `(select auth.uid())` in `USING` and `WITH CHECK` for all seven policies | Static test checks 7 optimized `USING`, 7 optimized `WITH CHECK`, all policy drop/create pairs, and rejects the old direct-call form |
| `readiness_checkins(workout_id,user_id)` lacked a covering index in FK column order | Added `idx_readiness_checkins_workout_owner(workout_id,user_id)` | Fresh and post-deploy migration assertions |
| `body_composition_segments(measurement_id,user_id)` lacked a covering index in FK column order | Added `idx_body_composition_segments_measurement_owner(measurement_id,user_id)` | Fresh and post-deploy migration assertions |

### Delivery shape

- Updated `20260822090000_personalization_foundation.sql` so future fresh deployments start optimized.
- Added `20260822110000_optimize_personalization_rls_and_fks.sql` for databases where the foundation migration already ran. It only drops/recreates the same seven policies and creates the two missing indexes with `IF NOT EXISTS`; it does not alter or delete user rows.
- No application contract, UI, AI integration or product behavior changed.

### REFINE verification

- `npm.cmd run test:personalization` - PASS: 8 passed, 0 failed.
- `npm.cmd run test:workout-phases` - PASS: 16 passed, 0 failed.
- `npm.cmd run test:ai-personalization` - PASS: 6 passed, 0 failed.
- `npx.cmd tsx --test tests/body-composition.test.ts` - PASS: 9 passed, 0 failed.
- `npx.cmd tsc --noEmit` - PASS: 0 type errors.
- `npm.cmd run lint` - PASS: 0 errors; same unrelated pre-existing hook warning only.
- `git diff --check` - PASS with Windows line-ending notices only.

The Builder did not apply this follow-up migration or call Supabase MCP. Contractor must apply `20260822110000_optimize_personalization_rls_and_fks.sql`, rerun performance/security Advisors, and confirm the three findings are cleared.
