# TIP-MR-UI-12 Completion Report

## Status

`DONE`

## Files Changed

- Rebuilt `src/app/(app)/recovery/recovery-dashboard.tsx` as the approved body-first Overview.
- Added dedicated coverage in `tests/muscle-readiness-overview.test.ts`.
- Added this Completion Report.

## Acceptance Results

1. PASS: The days KPI renders `--` when `lastCompletedWorkoutAt` is null and preserves a legitimate same-day value of 0.
2. PASS: Fresh count uses `selectFreshRecoveryGroups`. Fixtures prove 89, Unknown and stale are excluded while current 90 is included.
3. PASS: The full Fresh KPI is a focus-visible Next.js Link to `/recovery/groups` with a count-aware accessible label.
4. PASS at component contract: Every readiness group, including `CALVES`, is passed to `MuscleBody`; its selection callback routes to `/recovery/groups/[group]`. End-to-end destination rendering depends on TIP-MR-UI-14 creating the detail route.
5. PASS: Front and back controls expose tablist, tab, selected state, controlled tabpanel, roving tab index and ArrowLeft/ArrowRight focus movement.
6. PASS: The legend visibly names all five statuses: Unknown, recovering, light-only, trainable and ready in Vietnamese.
7. PASS: The confirmation dialog, server recheck copy, session-storage handoff and `/workouts/new` routing remain. Eligibility now uses the shared 80+ selector with no component threshold duplication.
8. PASS: KPI/body loading skeletons, empty guidance, stale exclusion notice, error alert and retry action are explicit.
9. PASS by responsive structure: The page uses a width-bounded container, `overflow-x-hidden`, two min-width-safe KPI columns and a width-bounded body map. Browser measurement at 320, 375, 768 and 1440 remains part of TIP-MR-UI-15.
10. PASS: Dedicated tests and TypeScript pass.

## Test Results

- Dedicated Overview tests: 8/8 passed.
- TypeScript `tsc --noEmit`: PASS with 0 errors.
- Em dash scan across changed source and dedicated test: PASS with 0 matches.
- Additional legacy UI run: 15/16 passed. One obsolete assertion still requires the removed `Vì sao` bottom sheet and is recorded below.

## Issues

- LOW: `tests/muscle-readiness-ui.test.ts` still asserts the old inline Why sheet. TIP-MR-UI-12 intentionally replaces that interaction with the detail route. The dedicated test file was used as instructed to avoid editing a shared test during parallel work. Integration should remove or replace this obsolete assertion before the full suite gate.
- DEFERRED: The detail destination route is owned by TIP-MR-UI-14 and was not present when this Builder report was written. Overview navigation emits the approved URL contract but end-to-end rendering is not claimed here.
- DEFERRED: Real viewport overflow measurement is reserved for browser QA in TIP-MR-UI-15. This report claims only static responsive safeguards.

## Deviations

- None in the approved Overview behavior.
- The old inline list and Why sheet were removed because the List route is present and the approved Detail URL contract is now emitted. The Detail page itself remains a downstream TIP-MR-UI-14 dependency.

## Suggestions for Contractor

- Accept the component implementation now, but keep the cross-route journey deferred until TIP-MR-UI-14 exists.
- Reconcile the obsolete Why-sheet assertion during integration before running the full unit gate.
- Use browser QA to verify the exact 320, 375, 768 and 1440 widths rather than promoting static CSS evidence to visual proof.
