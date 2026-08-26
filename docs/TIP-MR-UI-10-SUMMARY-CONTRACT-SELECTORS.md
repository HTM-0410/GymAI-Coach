# TIP-MR-UI-10: Summary Contract and Selectors

## HEADER

- TIP-ID: TIP-MR-UI-10
- Project: GymAI Coach
- Module: Muscle Readiness UI Redesign
- Depends on: Approved UI Redesign Blueprint
- Priority: P0
- Estimated effort: 35 minutes Builder time

## CONTEXT

- Working directory: `D:\GymAI-Coach`
- Blueprint: `docs/PLAN-MUSCLE-READINESS-UI-REDESIGN-CONTRACTOR.md`
- Key files:
  - `src/app/api/recovery/route.ts`
  - `src/app/api/recovery/[group]/route.ts`
  - `src/lib/recovery/read-model.ts`
  - `src/lib/recovery/muscle-groups.ts`
  - `tests/muscle-readiness-api.test.ts`
- Preserve dirty worktree and edit only explicit Muscle Readiness paths.

## REQUIREMENTS

- REQ-UI-001: Summary exposes latest completed workout timestamp for the authenticated owner.
- REQ-UI-002: Summary exposes one latest activity per presentation group without N+1.
- REQ-UI-003: Detail recent activity does not duplicate one workout exercise because of multiple child muscles.
- REQ-UI-004: Fresh count uses score 90+, excluding Unknown and stale.
- REQ-UI-005: Workout-eligible count remains score 80+, excluding Unknown and stale.
- REQ-UI-006: Status sorting is stable within canonical group order.

## TASK

1. Add pure UI selectors in `src/lib/recovery/` for fresh groups, workout-eligible groups, days since latest completed workout and stable status sort.
2. Extend `GET /api/recovery` additively with `lastCompletedWorkoutAt` and `latestActivity` per group.
3. Query the latest completed workout owner-scoped.
4. Load bounded recent muscle loads in one owner-scoped query, reduce them to one latest activity per presentation group and avoid N+1.
5. Dedupe detail recent activity by `workout_exercise_id`, combining set count safely rather than returning duplicate exercise rows.
6. Preserve all current response fields and auth behavior.
7. Add exact focused tests for boundaries 79, 80, 89, 90, null, stale, sorting and dedupe.

## ACCEPTANCE CRITERIA

1. Given readiness 89, when fresh groups are selected, then it is excluded.
2. Given readiness 90 and current model data, when fresh groups are selected, then it is included.
3. Given Unknown or stale readiness, when both selectors run, then the group is excluded.
4. Given readiness 80, when workout-eligible groups are selected, then it is included.
5. Given multiple child muscle loads for the same workout exercise, when detail is built, then one activity row is returned with no duplicate.
6. Given an unauthenticated request, when summary or detail is requested, then status is 401.
7. Given a user request, when summary data is loaded, then every query remains filtered by that user and no per-group loop performs network queries.
8. Given old clients, when they consume existing fields, then the response remains backward compatible.
9. Given focused tests and TypeScript, when run, then both pass with exact counts reported.

## CONSTRAINTS

- Do not change recovery formula, thresholds in canonical constants, schema, RLS or migrations.
- Do not write live data or run backfill.
- Do not add dependencies.
- Do not use gstack.
- Do not use an em dash in source, UI or docs.
- Builder may choose implementation details that preserve this contract and must report deviations.

## REPORT FORMAT

Create `docs/reports/TIP-MR-UI-10-COMPLETION.md` with status, files changed, acceptance results, issues, deviations and suggestions for Chủ thầu.
