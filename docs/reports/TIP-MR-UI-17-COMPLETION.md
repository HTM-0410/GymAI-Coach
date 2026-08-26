# TIP-MR-UI-17 Completion Report

## Status

`DONE`

## Files Changed

- Added `src/components/recovery/muscle-group-info-dialog.tsx` as the shared single-group Radix Dialog for Overview and List.
- Updated `src/app/(app)/recovery/recovery-dashboard.tsx` so selecting a front or back body region opens the shared dialog without navigation.
- Updated `src/app/(app)/recovery/groups/recovery-groups-page.tsx` so every group row is a button that opens the shared dialog without changing the URL.
- Updated `src/lib/recovery/activity.ts` to export the existing exercise-name formatter for reuse.
- Updated `src/app/(app)/recovery/groups/[group]/recovery-group-detail-page.tsx` to consume the shared activity formatter while preserving the deep-link route.
- Added `tests/muscle-readiness-group-modal.test.ts` with dedicated modal behavior and integration contracts.
- Updated `tests/muscle-readiness-overview.test.ts` and `tests/muscle-readiness-group-list.test.ts` for popup-only selection behavior.
- Added this Completion Report.

## Acceptance Criteria Mapping

1. PASS: Selecting a body region on either active front or back view sets one `selectedGroup` and opens `MuscleGroupInfoDialog`.
2. PASS: Selecting a list row calls the same one-group dialog through a native button.
3. PASS: Neither selection path calls `router.push`, renders a detail-route link or mutates browser history. Opening and closing the dialog therefore preserves the current URL.
4. PASS: The dialog shows the selected group name, API readiness score, `Nhóm cơ này là gì?` and the existing anatomy metadata.
5. PASS: The dialog fetches `/api/recovery/[group]` with `no-store` and renders real recent exercise name, completed sets and relative time.
6. PASS: Recent activity is deduped by the existing `dedupeRecoveryActivities` helper. An empty API list renders a clear empty state and never invents exercise history.
7. PASS: Loading, failure and retry are explicit. The initial render treats `!detail && !error` as loading, preventing an error flash before the effect starts.
8. PASS: Every request uses an `AbortController`, monotonic request ID and response-group equality guard, preventing an old response from replacing the active group.
9. PASS: Radix Dialog supplies modal focus containment, Escape and overlay dismissal. Overview forwards the exact SVG group target and List forwards the exact button target into a shared return-focus ref. Close autofocus focuses that target only while it remains connected, otherwise Radix keeps its safe default path.
10. PASS: Content scrolls inside a bounded 90dvh mobile sheet with safe-area padding. At the small breakpoint it becomes a centered, bounded desktop dialog.
11. PASS: Each dialog instance is scoped to exactly one selected group. It contains no group list, tabs, chips or internal links for switching groups.
12. PASS: The existing `/recovery/groups/[group]` route remains present and production build includes it for direct deep links.

## Focused Test Evidence

- Dedicated and focused Muscle Readiness regression: 95/95 passed, 0 failed.
- Dedicated modal cases: 10/10 passed.
- TypeScript `npm.cmd exec -- tsc --noEmit`: PASS with 0 errors.
- Production `npm.cmd run build`: PASS with 52/52 static pages generated.
- Build route manifest includes `/recovery`, `/recovery/groups`, `/recovery/groups/[group]`, `/api/recovery` and `/api/recovery/[group]`.
- Em dash scan across changed source, tests and report: PASS with 0 matches.

## State And Safety Evidence

- Active modal groups at one time: 1.
- Internal group selectors inside modal: 0.
- Detail API requests per selected group: 1 plus an explicit retry when requested by the user.
- Stale-response guards: abort signal, monotonic request ID and response-group equality.
- Duplicate activity key: `workout_exercise_id`.
- Minimum explicit close target: 44 x 44 px.
- Database, migration, live write, deploy, commit or push operations: 0.

## Issues Discovered

- FIXED: The first local render branch could briefly show the failure state before `useEffect` set loading. The dialog now treats missing detail without an error as loading, and the dedicated test requires this condition.
- FIRST CONTRACTOR BROWSER FAIL AND INTERMEDIATE ATTEMPT: Escape initially returned focus to `BODY` because a custom `onOpenAutoFocus` captured focus after it had moved. Removing the custom handlers did not solve the controlled-dialog case because there was still no `Dialog.Trigger` for Radix to infer.
- SECOND CONTRACTOR BROWSER FAIL FIXED: A controlled Dialog without `Dialog.Trigger` still returned focus to `BODY` after the first fix. `MuscleBody` now forwards its concrete SVG event target as an optional backward-compatible callback argument, List forwards its concrete button target, and both pages pass that ref to the shared dialog. Close autofocus prevents default only when the exact target is still connected, then focuses it. No `onOpenAutoFocus` or `document.activeElement` capture remains.

## Deviations From Spec

- None.

## Limits Not Verified

- The Builder did not repeat authenticated browser QA after the focus fix. Contractor should re-run Escape from both a body muscle region and a list row to confirm the active element returns to the exact opener.

## Suggestions For Chủ thầu

- In authenticated browser verification, record the URL before and after opening and closing one body group and one list row.
- Rapidly close one group and open another while throttling `/api/recovery/[group]`; verify only the newest selected group is ever shown.
- Verify Escape, overlay click and the close button return focus to the exact body region or list row that opened the dialog.
- At 320 px and desktop width, confirm only dialog content scrolls and no group switcher appears inside the popup.
