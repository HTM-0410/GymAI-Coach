# TIP-MR-UI-15 Completion Report

## Status

`PARTIAL`

The implementation and automated acceptance gates are complete. Authenticated browser acceptance remains blocked because the fresh read-only Playwright context is redirected to the login page and no QA credentials or reusable authenticated browser state were available.

## Files Changed

- Updated `src/app/(app)/recovery/recovery-dashboard.tsx` so the workout handoff contains only current, non-stale groups selected by the shared 80% workout policy.
- Updated `src/app/(app)/recovery/groups/recovery-groups-page.tsx` so every list row uses the canonical lowercase detail URL.
- Updated `src/app/api/recovery/route.ts` to remove the global activity row cap while retaining the owner-scoped 14-day query boundary.
- Updated `src/components/ui/MuscleBody.tsx` with a visible SVG path focus state that preserves selected and hover behavior.
- Updated `tests/muscle-readiness-api.test.ts`, `tests/muscle-readiness-group-list.test.ts`, `tests/muscle-readiness-overview.test.ts` and `tests/muscle-readiness-ui.test.ts` with exact regression assertions for the returned defects.
- Added `docs/reports/TIP-MR-UI-15-auth-blocker.png` as read-only browser blocker evidence.
- Added this Completion Report.

## Acceptance Results

1. PASS by automated contract: The old inline Why-sheet assertion now verifies the routed detail explanation `Vì sao có mức này`.
2. PASS by automated contract: Overview, group list and group detail preserve the approved route and data boundaries, including valid canonical groups and fail-fast invalid groups.
3. PASS by automated contract: Full recovery focused coverage, TypeScript and production build all pass.
4. PASS by static accessibility contract: Full-row links, controls, chips and body paths are keyboard accessible. Body paths now have an explicit visible orange focus stroke.
5. PASS by source scan: No em dash exists in the Muscle Readiness implementation, TIP documents, reports or focused tests.
6. BLOCKED in browser: The clean local browser context redirects `/recovery` to `/auth/login`, so the authenticated overview, list and detail views cannot be observed without credentials or an approved stored session.
7. NOT CLAIMED in browser: Valid and invalid detail behavior, browser Back, refresh, chip switching, 320/375/768/1440 widths, light and dark themes, focus order, rendered horizontal overflow and authenticated console behavior remain unverified.

## Returned Defects And Remediation

### P1 - Unsafe workout handoff payload

- Defect: `requestedGroups` previously used every summary group, including Unknown, stale and below-80 groups, while the CTA promised eligible groups only.
- Fix: The payload now uses `readyForWorkout.map((group) => group.group)` from the shared selector.
- Regression: Dedicated overview and shared UI tests require the safe payload and reject `summary.groups.map`.

### P2 - Missing visible focus on body paths

- Defect: Interactive SVG muscle regions were keyboard focusable but did not expose a distinct focused visual.
- Fix: `focusedMuscle`, `onFocus`, `onBlur` and a 1.8 px orange focused stroke were added without removing selected or hover state.
- Regression: The shared UI test requires the focus handlers and focused stroke.

### P3 - Non-canonical list URLs

- Defect: Group list rows emitted enum-cased detail URLs while overview and chips used lowercase canonical URLs.
- Fix: Row links now use `group.group.toLowerCase()`.
- Regression: The dedicated list test requires the lowercase URL expression.

### P2 - Activity starvation from global row cap

- Defect: The summary activity query used a global 100-row cap. A high-volume group could consume the cap and hide valid activity for other groups inside the same 14-day window.
- Fix: The global cap was removed. The query remains one owner-scoped, time-bounded 14-day query, with no RPC, migration or N+1 requests.
- Tradeoff: Response work now scales with the owner's activity inside the fixed 14-day window instead of an arbitrary row count. This guarantees that another group is not excluded solely because the first 100 rows belonged to different groups.
- Regression: The API test requires the 14-day `.gte` boundary and rejects `ACTIVITY_LIMIT`.

## Automated Test Results

- Focused Muscle Readiness regression: 83/83 passed, 0 failed.
- TypeScript `npm.cmd exec -- tsc --noEmit`: PASS with 0 errors.
- Production `npm.cmd run build`: PASS, 52/52 static pages generated. Recovery overview, group list, group detail and both recovery API routes are present in the route manifest.
- Full `npm.cmd run test:unit`: 186 total, 184 passed, 2 failed.
- The 2 full-suite failures are pre-existing onboarding static assertions outside this TIP: the exact injury prompt copy and the removed `DURATION_OPTIONS` symbol.
- Em dash scan across Muscle Readiness source, tests, Blueprint, TIPs and reports: PASS with 0 matches.

## Browser QA Evidence

- The existing server at `http://localhost:3000` returned a stale Next development manifest error reading `clientModules`, so it was not used as product acceptance evidence.
- A clean isolated workspace server was started at `http://localhost:3015` with `NEXT_DIST_DIR=.next-codex-mr-ui-qa15`.
- Fresh Chromium requested `/recovery` and received a 307 redirect to `/auth/login`.
- Final login response status: 200.
- Final page title: `GymAI Coach`.
- Visible heading: `Đăng nhập hệ thống`.
- Console errors on the login result: 0.
- Screenshot: `docs/reports/TIP-MR-UI-15-auth-blocker.png`.
- The isolated server was stopped after evidence capture. No workout, database row or external state was created or modified.

## Issues Discovered

- BLOCKER: Authenticated browser QA requires an approved test account or reusable localhost storage state. Automated and static checks cannot substitute for rendered interaction evidence.
- OUT OF SCOPE: The two full-suite onboarding failures belong to an unrelated dirty-worktree feature and were not changed.
- LOCAL ARTIFACT: `.next-codex-mr-ui-qa15/` remains as generated local Next development output. It contains no user data and is not part of the implementation.

## Deviations From Spec

- Browser coverage is incomplete because authentication blocked all protected recovery routes in the clean read-only context.
- No local login, account creation, workout creation or database mutation was attempted to bypass the blocker.
- Port 3015 was used instead of the stale port 3000 process so the authentication result could be separated from the local development manifest failure.

## Suggestions For Chủ thầu

- Return this TIP for one authenticated, read-only browser acceptance pass using an approved QA account or storage state.
- Re-run overview, list, valid detail, invalid detail, Back, refresh and chip navigation at 320, 375, 768 and 1440 px in both themes.
- Verify visible focus, focus order, horizontal overflow and console output in that authenticated pass before final acceptance.
