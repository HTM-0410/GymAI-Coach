# TIP-MR-UI-23 Stage 01 Chest Report

## Status

**READY FOR CONTRACTOR REVIEW**

This report does not self-approve the visual result. Stage 02 remains closed until the Contractor explicitly passes and locks Stage 01.

## Target IDs Changed

- `pec_l`
- `pec_r`

No other `FRONT_REGIONS` or `BACK_REGIONS` path was modified during Stage 01.

## Locked IDs Preserved

- Every non-chest low-level region ID and path remained untouched during this stage.
- The outer silhouette, palette, stroke, layout sizing, canonical group map, fatigue adapter, accessibility handlers, URL behavior and focus restoration were preserved.

## Reference Landmarks Used

- Main chest fan measured in the SVG coordinate system at approximately `x=69-119`, `y=101-142` on the left, then mirrored around `x=120`.
- Upper boundary rises gently from the sternum toward the clavicle and transitions below the deltoid.
- Outer insertion uses cubic curves through the front axillary fold instead of a pointed polygon corner.
- Lower border uses a shallow curved sweep, with the outer half one unit lower than the sternum edge.
- Sternum separator is two SVG units before stroke contribution, consistent from top to bottom.
- Reduced axillary slips occupy approximately `x=74-84`, `y=143-163` on the left and mirror on the right, leaving the oblique and upper abs clear.

## Evidence

- `docs/reports/artifacts/TIP-MR-UI-23-STAGE-01-CHEST-ISOLATED.png`: 1202 x 770, 194,137 bytes. Chest is highlighted and every other region is neutral gray.
- `docs/reports/artifacts/TIP-MR-UI-23-STAGE-01-CHEST-OVERLAY-50.png`: 649 x 433, 82,089 bytes. Exact front reference with the Stage 01 render at 50 percent opacity.
- `docs/reports/artifacts/TIP-MR-UI-23-STAGE-01-CHEST-CONTEXT.png`: 236 x 551, 33,504 bytes. Complete front map at the approved live route proportion.

## Target Test Results

- Inventory and interaction target suite: 28 passed, 0 failed, 0 skipped, 28 total.
- TypeScript: PASS, `npx tsc --noEmit`, 0 errors.
- Evidence generation: PASS, 3/3 required Stage 01 artifacts regenerated after the Contractor refinement request.
- No target test file required modification.

## Contractor Fail Corrections Applied

- Narrowed the central sternum gap from four SVG units to two.
- Replaced the pointed axillary corner with connected cubic curves.
- Added a shallow organic lower border with a softer outer half.
- Reduced both compound axillary slips in width and depth so they do not intrude into the oblique or serratus neighbors.

## Remaining Chest Deltas For Review

- The target keeps one compound axillary slip per side because the reference contains a small readiness-colored lateral chest contribution. Contractor should confirm whether its final size is acceptable.
- The upper fan boundary is intentionally smooth and simplified within one path per side. It does not include additional clavicular subdivisions.
- Stroke antialiasing at 236 px can make the two-unit sternum geometry read slightly narrower than it appears in the isolated 2x crop. Contractor should judge the context image for the live proportion.

## Constraints Confirmed

- No shoulder or later-stage muscle path was edited.
- No palette, silhouette or live layout size was changed.
- No backend, API, database, migration, dependency, live write, deploy, commit or push action occurred.
- No em dash was added.
