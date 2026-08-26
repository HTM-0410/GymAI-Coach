# TIP-MR-UI-23 Stage 02 Shoulders Report

## Status

**READY FOR CONTRACTOR REVIEW**

This report does not self-approve the visual result. Stage 03 remains closed until the Contractor explicitly passes and locks Stage 02.

## Target IDs Changed

- `delt_l`
- `delt_r`
- `rear_delt_l`
- `rear_delt_r`

No other `FRONT_REGIONS` or `BACK_REGIONS` path was modified during Stage 02.

## Locked IDs Preserved

- Stage 01 locked IDs `pec_l` and `pec_r` remained unchanged.
- Every non-shoulder low-level path remained untouched during this stage.
- The silhouette, palette, stroke, layout sizing, canonical mapping, fatigue adapter and interaction contracts were preserved.

## Reference Landmarks Used

### Front

- Rounded anterior cap begins below the clavicle near `y=99`.
- Outer contour follows the humeral head from approximately `x=52`, `y=117` to the lower shoulder.
- Lower-inner contour leaves the cap before the axillary fold and tapers through `x=71-84`, `y=124-130`.
- The contour nests against the locked pectoral boundary without crossing it.

### Back

- Posterior cap is broad near the scapular top and remains rounded over the humeral head.
- Outer contour is vertically controlled and ends above the triceps belly.
- Lower border sweeps inward toward the triceps through `x=60-82`, `y=131-142` on the left, then mirrors on the right.
- The cap does not cover the trapezius or lat paths.

## Evidence

- `docs/reports/artifacts/TIP-MR-UI-23-STAGE-02-SHOULDERS-FRONT-ISOLATED.png`: 1278 x 610, 151,095 bytes.
- `docs/reports/artifacts/TIP-MR-UI-23-STAGE-02-SHOULDERS-FRONT-OVERLAY-50.png`: 687 x 353, 63,071 bytes.
- `docs/reports/artifacts/TIP-MR-UI-23-STAGE-02-SHOULDERS-FRONT-CONTEXT.png`: 236 x 551, 33,345 bytes.
- `docs/reports/artifacts/TIP-MR-UI-23-STAGE-02-SHOULDERS-BACK-ISOLATED.png`: 1278 x 610, 160,572 bytes.
- `docs/reports/artifacts/TIP-MR-UI-23-STAGE-02-SHOULDERS-BACK-OVERLAY-50.png`: 687 x 353, 59,811 bytes.
- `docs/reports/artifacts/TIP-MR-UI-23-STAGE-02-SHOULDERS-BACK-CONTEXT.png`: 236 x 551, 32,644 bytes.

The isolated images highlight only the approved shoulder IDs. Every other region uses neutral gray.

## Target Test Results

- Inventory and interaction target suite: 28 passed, 0 failed, 0 skipped, 28 total.
- TypeScript: PASS, `npx tsc --noEmit`, 0 errors.
- Evidence generation: PASS, 6/6 required Stage 02 artifacts generated.
- No target test file required modification.

## Remaining Shoulder Deltas For Review

- The front lower-inner transition remains intentionally smooth within one path per side and does not expose separate deltoid heads.
- The back cap extends slightly lower than the front cap to follow the posterior reference sweep. Contractor should confirm the junction against the currently unlocked triceps linework.
- Context artifacts show the live 236 px body proportion. Contractor should use these to judge whether the cap remains distinct from an oval upper-arm sleeve at mobile size.

## Constraints Confirmed

- Locked chest paths were preserved.
- No abs or later-stage muscle path was edited.
- No palette, silhouette or live layout size was changed.
- No backend, API, database, migration, dependency, live write, deploy, commit or push action occurred.
- No em dash was added.
