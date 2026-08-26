# TIP-MR-UI-14 Completion Report

## Status

`DONE`

## Files Changed

- Added `src/app/(app)/recovery/groups/[group]/page.tsx` with feature gating and canonical group validation before the client mounts.
- Added `src/app/(app)/recovery/groups/[group]/recovery-group-detail-page.tsx` with the full detail UI, chip navigation, guarded fetching, retry, activity, projections, confidence and safety content.
- Added `src/lib/recovery/group-detail-view.ts` for deterministic projection and confidence presentation.
- Added `tests/muscle-readiness-group-detail.test.ts` with dedicated detail-route contract coverage.
- Added this Completion Report.

## Acceptance Results

1. PASS: Valid canonical URL params are normalized on the server and mount the requested group, supporting direct load and refresh.
2. PASS: Invalid params call `notFound()` before the client component mounts, so arbitrary detail paths are never fetched.
3. PASS: The sticky horizontal chip scroller is generated from all 10 canonical metadata entries and exposes its selected page state.
4. PASS: Every request uses an `AbortController` and monotonic request ID. A response is accepted only when its request and returned group still match the active group.
5. PASS: Recent loads are defensively deduped by `workout_exercise_id` before rendering. The empty state is explicit.
6. PASS: The page renders the canonical thumbnail, static anatomy copy, deterministic API explanation, limiting muscle, 60/80/90 projections, confidence and safety note.
7. PASS: UI Back follows browser history and falls back to `/recovery/groups` when no prior history exists. Native chip links preserve browser Back behavior.
8. PASS: Header and chips stay mounted while the detail body shows loading. Request failure shows a group-specific alert and retry action.
9. PASS: Back, retry and all chip controls are native keyboard controls with visible focus styling and minimum 44 px targets.
10. PASS: Dedicated tests, focused recovery regression and TypeScript pass.

## Coverage Evidence

- Canonical route validation: 10 valid keys through one type guard, invalid values rejected before client fetch.
- Chip selector source: 10/10 canonical metadata entries.
- Detail API requests per active group: 1.
- Outdated response guards: abort signal, request ID and response-group equality.
- Projection milestones rendered: 3/3 at 60%, 80% and 90%.
- Confidence labels covered: 4/4 for high, medium, low and Unknown.
- Recent activity dedupe key: `workout_exercise_id`.

## Test Results

- Dedicated TIP focused test: 8/8 passed.
- Detail, list, API and recovery-model regression set: 38/38 passed.
- TypeScript `tsc --noEmit`: PASS with 0 errors.
- Em dash scan across changed source and dedicated test: PASS with 0 matches.
- Legacy `tests/muscle-readiness-ui.test.ts`: 7/8 passed, 1 obsolete static assertion failed because it still requires the removed inline Why bottom sheet.

## Issues Discovered

- LOW: `tests/muscle-readiness-ui.test.ts` still asserts that `recovery-dashboard.tsx` contains `Vì sao` and `Dialog.Content`. The approved redesign moved this information to the new detail route. Per Builder ownership constraints, this shared legacy test was not modified and must be reconciled in TIP-MR-UI-15.
- DEFERRED: Real browser proof for refresh, history, rapid chip switching, viewport overflow and focus order belongs to TIP-MR-UI-15. This report claims the implemented contracts and automated focused checks only.

## Deviations From Spec

- The client performs a second defensive activity dedupe even though the API already returns deduped rows. This preserves one visible row per workout exercise if cached or transitional responses contain duplicates and does not change the API contract.
- UI Back includes a safe list fallback for a direct-load history stack with no prior entry.

## Suggestions for Chủ thầu

- TIP-MR-UI-15 should replace the obsolete Why-sheet assertion with coverage of the new route content, then run the full unit gate.
- Browser QA should throttle the detail API and switch across several chips rapidly to verify there is no old score, explanation or activity under the new title.
- Browser QA should verify that the intentional chip scroller is the only horizontal scrolling surface at 320 px.
