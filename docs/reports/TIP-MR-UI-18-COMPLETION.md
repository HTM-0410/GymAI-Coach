# TIP-MR-UI-18 Completion Report

## Status

`DONE`

## Root Cause

At 1280 x 720, Contractor browser QA measured the dialog below the document content with computed `position: relative`. The Radix portal children are direct children of the `.noise-overlay` host, and `.noise-overlay > * { position: relative; z-index: 1; }` overrode the Tailwind `fixed` utility.

The fix gives both portal children inline positioning, which has higher cascade priority than the global selector. Overlay receives inline `position: fixed`, `inset: 0` and `zIndex: 50`. Dialog Content receives inline `position: fixed` and `zIndex: 51`.

## Files Changed

- Updated `src/components/recovery/muscle-group-info-dialog.tsx` with guaranteed viewport positioning, responsive centering and translucent glass surfaces.
- Updated `tests/muscle-readiness-group-modal.test.ts` with a focused portal-position and glass regression contract.
- Added this Completion Report.

## Acceptance Criteria Mapping

1. PASS by deterministic style contract: Dialog Content has inline `position: fixed`, so `.noise-overlay > *` cannot change its computed position to relative.
2. PASS by responsive layout contract: Desktop uses `left: 50%`, `top: 50%`, explicit width, auto right inset and negative 50% transforms on both axes.
3. PASS by deterministic style contract: Position is fixed to the viewport and no longer participates in document flow or page scroll position.
4. PASS: Panel uses `bg-chassis-hi/90`, an alpha of 0.90, plus `backdrop-blur-md`.
5. PASS: Overlay uses inline viewport inset, `bg-black/45` and a light 2 px backdrop blur.
6. PASS: Mobile retains `inset-x-0 bottom-0`, max height 90dvh, internal scrolling and safe-area bottom padding.
7. PASS: One-group rendering, URL behavior, detail API, stale-response protection and explicit return-focus ref were not changed.
8. PASS: Focused tests, TypeScript and production build pass.

## Reproducible Regression Contract

`tests/muscle-readiness-group-modal.test.ts` verifies:

- Overlay inline style is exactly fixed with viewport inset and z-index 50.
- Content inline style is fixed with z-index 51.
- Overlay alpha is 0.45 with non-zero backdrop blur.
- Panel alpha is 0.90 with medium backdrop blur.
- Desktop has both 50% coordinates and both negative 50% transforms.
- Mobile bottom-sheet, internal-scroll and safe-area classes remain present.

## Test Results

- Focused Muscle Readiness regression: 96/96 passed, 0 failed.
- Dedicated modal cases: 11/11 passed.
- TypeScript `npm.cmd exec -- tsc --noEmit`: PASS with 0 errors.
- Production `npm.cmd run build`: PASS with 52/52 static pages generated.
- Recovery overview, list, deep-link detail and both API routes remain in the route manifest.
- Em dash scan across changed source, test and report: PASS with 0 matches.

## Issues Discovered

- FIXED: Desktop width inherited `right: 0` from mobile `inset-x-0`. The desktop contract now explicitly applies `sm:right-auto` and `sm:w-full`, allowing the 50% coordinate and negative translation to center a max-width panel exactly.

## Deviations From Spec

- None.

## Limits Not Verified

- Builder did not run authenticated browser measurement in this pass. Contractor should re-measure computed position, panel rectangle and backdrop properties at 1280 x 720 and a mobile viewport.
- Static contract proves cascade priority and centering rules, but the final numeric center offset must come from rendered browser geometry.

## Suggestions For Chủ thầu

- At 1280 x 720, assert computed Content position is `fixed` and each center-axis offset is no more than 8 px.
- Scroll the underlying page before opening the dialog and verify its rectangle is unchanged relative to the viewport.
- At 320 x 720, verify the panel bottom equals the viewport bottom and its top remains non-negative.
- Recheck Escape focus restoration for one SVG muscle region and one list button after the visual change.
