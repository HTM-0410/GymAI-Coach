# TIP-MR-UI-13 Completion Report

## Status

`DONE`

## Files Changed

- Added `src/app/(app)/recovery/groups/page.tsx` as the feature-gated group list route.
- Added `src/app/(app)/recovery/groups/recovery-groups-page.tsx` with the list UI, loading skeleton, retry state, Back link and deep links.
- Added `src/lib/recovery/group-list-view.ts` for canonical normalization, section selection, status presentation and relative activity copy.
- Added `tests/muscle-readiness-group-list.test.ts` with dedicated list contract coverage.
- Added this Completion Report.

## Acceptance Results

1. PASS: Canonical normalization always produces exactly 10 unique groups in the approved taxonomy, even when an API group is missing or duplicated.
2. PASS: The main section contains exactly 8 approved groups and the accessory section contains exactly 2.
3. PASS: Unknown readiness renders `--`. Stale data is forced to `Dữ liệu cũ`, uses neutral styling and also renders `--`.
4. PASS: Latest activity renders exercise name plus Vietnamese relative time. Missing activity renders `Chưa có bài tập gần đây`.
5. PASS: Each section uses the shared status sorter, preserving canonical order inside one status tier.
6. PASS: Every row is one full `Link`, has an accessible name and a minimum height of 88 px.
7. PASS: The header Back link returns to `/recovery`; every group row deep links to `/recovery/groups/[group]`.
8. PASS: Loading uses an explicit skeleton and accessible status. Network failure shows an alert with a retry action.
9. PASS: The page and row content use bounded widths, `min-w-0`, truncation and page-level horizontal overflow containment.
10. PASS: Focused tests and TypeScript pass.

## Coverage Evidence

- Canonical group output: 10/10 with 0 duplicates.
- Main group section: 8/8.
- Accessory group section: 2/2.
- Summary network requests: 1 fixed request to `/api/recovery`.
- Per-row detail requests: 0.
- Row minimum height: 88 px.
- Status tiers exercised: 5/5.
- Relative-time fallbacks exercised: minute, hour, day, just-now and invalid timestamp.

## Test Results

- Dedicated TIP focused test: 8/8 passed.
- Recovery list, API, visual primitives and recovery-model regression set: 38/38 passed.
- TypeScript `tsc --noEmit`: PASS with 0 errors.
- Em dash scan across changed source and tests: PASS with 0 matches.

## Issues Discovered

- None within TIP-MR-UI-13.

## Deviations From Spec

- Row height is 88 px instead of the 72 px minimum to keep thumbnail, status and latest activity readable on touch devices. This exceeds the acceptance minimum without changing behavior.
- Missing or duplicated API groups are normalized against the canonical taxonomy. This keeps the route at exactly 10 unique rows and safely represents a missing item as Unknown.

## Suggestions for Chủ thầu

- TIP-MR-UI-14 should keep the same uppercase canonical route key because the existing detail API normalizes route params and the list already uses that contract.
- Browser acceptance should verify the longest Vietnamese activity label at 320 px and keyboard focus across all 10 row links.
