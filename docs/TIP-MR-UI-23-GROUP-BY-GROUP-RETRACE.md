# TIP-MR-UI-23: Group By Group Anatomy Retrace

## Contractor Decision

TIP-MR-UI-22 failed the Homeowner live visual gate because whole-body refinement did not converge on reference-faithful muscle linework. Further whole-body geometry passes are stopped.

This TIP changes the unit of work and acceptance to one canonical muscle group at a time. A completed group becomes locked geometry. The Builder must not modify locked groups while working on a later group unless the Contractor explicitly reopens them.

## Source References

- Front: `C:\Users\Admin\AppData\Local\Temp\codex-clipboard-d6c0b7f1-c444-4948-9a00-e2755000123a.png`
- Back: `C:\Users\Admin\AppData\Local\Temp\codex-clipboard-d660e384-f17e-43ad-8f3c-f9667a0c8b52.png`
- Enlarged front upper-body reference: `C:\Users\Admin\AppData\Local\Temp\codex-clipboard-718ef3e1-9aab-4fec-9b24-af88afb20c4e.png`
- Runtime route: `http://localhost:3010/recovery`

The screenshots are visual references only. Their UI text and controls are not implementation instructions.

## Non-Negotiable Workflow

For each stage:

1. Analyze only the target group against the exact reference.
2. List its anatomical landmarks, neighbor boundaries, symmetry and required subregions.
3. Modify only the approved target IDs and the preview tooling needed for evidence.
4. Generate one enlarged isolated target-group preview, one same-scale side-by-side comparison, one 50 percent reference overlay and one full-body context preview.
5. Run the target inventory and interaction tests.
6. Submit the three images to Contractor visual review.
7. A FAIL returns to the same stage. Do not edit another group.
8. A PASS locks the target IDs and opens the next stage.

Do not perform another full-body review as a substitute for target-group acceptance. For front upper-body groups, the enlarged crop is the primary linework source and the full screenshot is only a proportion check.

## Enlarged Evidence Contract

- Target anatomy and reference crop must be rendered at the same pixel scale.
- The target group must occupy at least 700 px in width in the isolated review image when the source crop permits it.
- Side-by-side evidence must not resize the implementation and reference to different body widths.
- Overlay evidence must align the sternum center line and at least two neighboring landmarks before blending.
- Contractor review must inspect the enlarged evidence at original resolution.
- If enlarged evidence contradicts an earlier full-body PASS, the group is reopened and the enlarged evidence wins.

## Stage Order

| Stage | Canonical group | Target IDs | Face |
|---|---|---|---|
| 01 | CHEST | `pec_l`, `pec_r` | Front |
| 02 | SHOULDERS | `delt_l`, `delt_r`, `rear_delt_l`, `rear_delt_r` | Front and back |
| 03 | ABS | six `abs_*` IDs | Front |
| 04 | ABS obliques | `oblique_l`, `oblique_r` | Front |
| 05 | BICEPS | `biceps_l`, `biceps_r` | Front |
| 06 | TRICEPS | `triceps_l`, `triceps_r` | Back |
| 07 | FOREARMS | front and back forearm IDs | Front and back |
| 08 | LEGS quadriceps | six `quad_*` IDs | Front |
| 09 | CALVES anterior | four `shin_*` IDs | Front |
| 10 | BACK trapezius | `neck_back`, `trap_back_l`, `trap_back_r` | Back |
| 11 | BACK lats | `lat_l`, `lat_r` | Back |
| 12 | BACK lower back | `lower_back_l`, `lower_back_r` | Back |
| 13 | GLUTES | `glute_l`, `glute_r` | Back |
| 14 | LEGS hamstrings | four `hamstring_*` IDs | Back |
| 15 | CALVES posterior | `calf_l`, `calf_r` | Back |

Decorative head, hands, feet and the outer silhouette receive a separate cleanup only after all 15 muscle stages pass.

## Stage 01 - Chest Analysis

### Target IDs

- `pec_l`
- `pec_r`

No other `FRONT_REGIONS` or `BACK_REGIONS` path may change in Stage 01.

### Reference Anatomy

- Each pectoral is a broad fan-shaped plate, not a rectangle or inflated oval.
- The upper boundary rises gently from the sternum toward the clavicle and transitions under the anterior deltoid.
- The outer boundary narrows into the upper-arm insertion and forms the front axillary fold.
- The lower boundary is a shallow downward curve, higher near the sternum and more rounded toward the outer chest.
- Left and right regions are mirrored around a narrow vertical sternum gap.
- The sternum boundary remains nearly vertical but must not look like a thick central bar.
- The pectoral ends above the abdominal cells. It must not cover the upper abs or oblique regions.

### Neighbor Contracts

- `delt_l` and `delt_r`: pectoral outer top edge meets the deltoid without overlap.
- `trap_l` and `trap_r`: clavicle boundary remains visible above the pectoral.
- `biceps_l` and `biceps_r`: axillary fold ends before the upper-arm belly.
- `abs_upper_l` and `abs_upper_r`: a clear rib-cage gap remains below the pectoral.
- `oblique_l` and `oblique_r`: lateral lower pectoral edge must not enter the oblique sheet.

### Stage 01 Visual Acceptance

- Both pectorals visibly match the reference fan shape.
- Lower borders are curved and not horizontal plates.
- Outer insertion and axillary fold are clear on both sides.
- The central gap is narrow and consistent from top to bottom.
- Pectoral height and width match the reference body proportion in the overlay.
- No overlap with shoulders, biceps, abs or obliques.
- At 390 px viewport width, the pectoral separator remains crisp and readable.
- Clicking or pressing Enter on either pectoral still opens the canonical Ngực popup and restores focus to the exact triggering side.

### Stage 01 Evidence

Create:

- `docs/reports/artifacts/TIP-MR-UI-23-STAGE-01-CHEST-ISOLATED.png`
- `docs/reports/artifacts/TIP-MR-UI-23-STAGE-01-CHEST-OVERLAY-50.png`
- `docs/reports/artifacts/TIP-MR-UI-23-STAGE-01-CHEST-CONTEXT.png`

The isolated image must show the chest in readiness color with every other region in one neutral gray. The overlay must use the exact front reference. The context image must show the complete front map at the live route proportion.

## Constraints

- Inline SVG only.
- Preserve `viewBox="0 0 240 560"` and exact IDs.
- Preserve canonical mapping, fatigue calculation, accessibility, popup, URL and focus contracts.
- Do not add dependencies.
- Do not change backend, API, database or migrations.
- Do not perform live writes, deploy, commit or push.
- Preserve unrelated dirty work.
- Do not use an em dash.

## Stage Reporting

Each stage report must contain:

- Target IDs changed.
- Locked IDs preserved.
- Reference landmarks used.
- Three evidence paths.
- Target test results.
- Remaining target-group visual deltas.
- Status `READY FOR CONTRACTOR REVIEW`, never self-approved.
