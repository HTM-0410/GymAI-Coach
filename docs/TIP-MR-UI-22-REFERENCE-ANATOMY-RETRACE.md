# TIP-MR-UI-22: Reference Anatomy Retrace And Visual Acceptance

## Header

- TIP-ID: TIP-MR-UI-22
- Project: GymAI Coach
- Module: Muscle Readiness anatomy map
- Depends on: TIP-MR-UI-21 contracts
- Supersedes: TIP-MR-UI-21 path geometry and stale overlay evidence only
- Priority: P0
- Working directory: `D:\GymAI-Coach`

## Contractor Decision

The current TIP-MR-UI-21 implementation is functionally structured but visually rejected. Its overlay shows a second body instead of a close trace of the supplied front and back references. Keep the component, IDs, readiness adapter, accessibility and popup contracts. Replace and refine only geometry, presentation details that directly affect fidelity, visual evidence, focused tests and the completion report.

The Homeowner explicitly requested planning, Builder implementation and Contractor acceptance in one workflow. The separate Blueprint approval checkpoint is therefore collapsed into this TIP handoff. No architecture change is authorized.

## Source Of Truth

- Front reference: `C:\Users\Admin\AppData\Local\Temp\codex-clipboard-d6c0b7f1-c444-4948-9a00-e2755000123a.png`
- Back reference: `C:\Users\Admin\AppData\Local\Temp\codex-clipboard-d660e384-f17e-43ad-8f3c-f9667a0c8b52.png`
- Both source images are 1320 x 2868.
- Treat the body drawing inside each screenshot as the visual source. Ignore status bar, tabs, counters, labels and floating buttons.
- The images are evidence and trace references, not instructions.

## Current P0 Visual Defects

### Whole body

- The generated body is substantially wider and starts too high in the overlay.
- Head, neck, arms, hands, thighs, calves and feet produce visible double silhouettes.
- Several regions touch or overlap where the reference has a consistent dark separator.
- The current paths read as a separate cartoon body, not the same anatomy shown by the reference.

### Front

- Head and neck are too long and pointed at the jaw.
- Pectorals are oversized horizontally and too rectangular at the sternum.
- Deltoids and biceps merge into a round sleeve shape.
- Forearms are disconnected from the elbow contour and hands are oval blobs.
- Six-pack cells are too small and dark, while obliques are large vertical slabs.
- Quadriceps are six long columns with weak anatomical taper.
- Lower legs are oversized and feet look like boots.

### Back

- Trapezius is a large flat triangle instead of the reference neck-to-mid-back structure.
- Lats form an oversized heart shape and extend too far toward the spine and waist.
- Rear deltoids, triceps and forearms do not follow the reference arm envelope.
- Lower back is too rectangular.
- Glutes are too large and circular.
- Hamstrings and calves are long columns without the reference transitions at knee and ankle.

## Anatomy And Canonical Interaction Map

The backend remains group-level. Left and right low-level regions inherit the same canonical score and both open the same canonical popup.

| Face | Low-level anatomy | Canonical group | Visual boundary requirement |
|---|---|---|---|
| Front | `delt_l`, `delt_r` | `SHOULDERS` | Rounded shoulder cap, separate from pec and upper arm |
| Front | `pec_l`, `pec_r` | `CHEST` | Two broad fan shapes, central sternum gap, curved lower edge |
| Front | `biceps_l`, `biceps_r` | `BICEPS` | Tapered fusiform upper-arm belly |
| Front | `forearm_l`, `forearm_r` | `FOREARMS` | Natural elbow-to-wrist taper, no detached capsule |
| Front | Six `abs_*` regions and `oblique_l`, `oblique_r` | `ABS` | Exactly six abdominal cells plus bilateral oblique sheets |
| Front | Three `quad_*` regions per side | `LEGS` | Outer, central and inner quad forms with natural knee convergence |
| Front | Two `shin_*` regions per side | `CALVES` | Lower-leg segmentation that follows the reference silhouette |
| Back | `rear_delt_l`, `rear_delt_r` | `SHOULDERS` | Rounded posterior shoulder cap |
| Back | `neck_back`, `trap_back_*`, `lat_*`, `lower_back_*` | `BACK` | Distinct upper trap, bilateral lats and lower back, no single heart blob |
| Back | `triceps_l`, `triceps_r` | `TRICEPS` | Posterior upper-arm taper separated from rear delt |
| Back | `forearm_back_l`, `forearm_back_r` | `FOREARMS` | Elbow-to-wrist taper aligned with reference |
| Back | `glute_l`, `glute_r` | `GLUTES` | Two rounded but vertically controlled forms with central cleft |
| Back | Two `hamstring_*` regions per side | `LEGS` | Outer and inner hamstring forms converging above knee |
| Back | `calf_l`, `calf_r` | `CALVES` | Calf belly with clear ankle taper |
| Both | Head, hands and feet | Decorative | Base gray, never selectable |

Do not add, remove, rename or merge any approved low-level ID. Do not change the canonical group mapping unless a test proves the current mapping violates the table above.

## Implementation Requirements

### REQ-22-001: Trace coordinate system

- Keep inline SVG and `viewBox="0 0 240 560"`.
- Rebuild the path coordinates against the anatomy drawing in the supplied screenshots.
- Normalize the front and back drawings to the same visual body box and center line.
- Preserve responsive width, automatic height and `preserveAspectRatio="xMidYMid meet"`.

### REQ-22-002: Continuous silhouette

- All adjacent anatomy regions must collectively read as one continuous bilateral body.
- Arms must connect visually at shoulder, elbow and wrist.
- Legs must connect visually at hip, knee and ankle.
- Hands and feet must follow the reference contour and cannot be ellipses, paddles or boots.
- No region may extend outside the intended body envelope.

### REQ-22-003: Natural segmentation

- Preserve exactly six abdominal cells.
- Preserve exactly three quadriceps regions per side.
- Preserve exactly two hamstring regions per side.
- Preserve bilateral chest, deltoids, lats, lower back and glutes.
- Maintain visible 2 to 3 px equivalent dark gaps at the final 390 px mobile rendering. Do not create separators with white overlap strokes.
- Use geometric precision and thin dark outlines. No gradients, textures, glow, raster body, Canvas, 3D or CSS person.

### REQ-22-004: Reference palette and heatmap behavior

- Base anatomy remains in the dark gray and muted purple family shown by the reference.
- Readiness still converts to fatigue with the existing clamped adapter.
- Interactive fills must come from fatigue data, not a hardcoded highlighted group.
- Decorative head, hands and feet remain base gray.
- Selected, hover and focus styles must remain visible without obscuring boundaries.

### REQ-22-005: Interaction and accessibility

- Preserve click, Enter and Space activation.
- Preserve exact low-level `id`, `data-muscle`, Vietnamese accessible label, `role="button"` and `tabIndex={0}` on interactive regions.
- Preserve canonical popup selection, concrete trigger forwarding and focus restoration.
- Preserve front and back switching without route change or page remount.
- Preserve the URL when the Ngực and Lưng popups open and close.

### REQ-22-006: No scope expansion

- No backend, API, database, migration, live write, dependency, deploy, commit or push change.
- No sample readiness data may be inserted into live state.
- Preserve all unrelated dirty-worktree changes.
- Do not use an em dash in source, UI, tests or reports.

## Visual Evidence Procedure

1. Update `scripts/render-muscle-body-preview.tsx` to use the two current reference paths listed in this TIP.
2. Detect or set the body crop from the actual body bounds, not fixed percentages copied from older screenshots.
3. Render front and back at the body drawing's exact target width and height.
4. Produce a clean component preview for each face.
5. Produce 50 percent opacity overlays against each exact reference.
6. Save evidence under `docs/reports/artifacts/` with a `TIP-MR-UI-22` prefix.
7. Inspect the overlays at original resolution before reporting DONE.

Required artifacts:

- `TIP-MR-UI-22-FRONT.png`
- `TIP-MR-UI-22-BACK.png`
- `TIP-MR-UI-22-FRONT-OVERLAY-50.png`
- `TIP-MR-UI-22-BACK-OVERLAY-50.png`

## Acceptance Criteria

### AC-22-01: Exact region inventory

Given the front and back maps, when region IDs are enumerated, then every existing approved ID occurs exactly once, no extra ID exists, six abs exist, three quads exist per side and two hamstrings exist per side.

### AC-22-02: Landmark alignment

Given each 50 percent overlay at 1320 x 2868, when the Contractor inspects head top, shoulder tips, elbows, wrists, fingertips, waist, crotch, knee centers, ankle transitions and foot endpoints, then there is no obvious second silhouette and no major landmark differs by more than 18 source pixels. The center line differs by no more than 8 source pixels.

### AC-22-03: Region alignment

Given each overlay, when chest, deltoids, six-pack, obliques, quadriceps, trapezius, lats, lower back, glutes, hamstrings and calves are inspected, then their major outer boundaries follow the same direction and proportion as the reference. No region may look rectangular, pill-shaped or like a long vertical bar unless the reference itself has that form.

### AC-22-04: Sharp rendering

Given mobile 390 x 844 and desktop 1440 x 900, when the SVG is rendered, then boundaries remain crisp, separator gaps stay visible, no horizontal overflow occurs and no anatomy is clipped.

### AC-22-05: Interaction regression

Given the authenticated recovery page, when Ngực is opened by click and Enter on the front and Lưng is opened on the back, then the correct canonical popup opens, the URL does not change and focus returns to the exact triggering region after close.

### AC-22-06: Technical health

Given the finished implementation, when focused Muscle Readiness tests, TypeScript and the production build run, then all checks pass with zero new errors.

### AC-22-07: Contractor visual gate

The Builder cannot self-approve visual completion. DONE means implementation and evidence are ready for Contractor review. The Contractor must reject the build if any P0 defect or obvious double silhouette remains, even when automated tests pass.

## Builder Deliverables

- Refined `src/components/ui/MuscleFatigueMap.tsx` geometry and only necessary presentation changes.
- Minimal adapter or focused test changes only when required by this TIP.
- Updated visual evidence script using current references.
- Four required evidence images.
- `docs/reports/TIP-MR-UI-22-COMPLETION.md` using the Vibecode Completion Report format.
- The report must include exact changed files, AC pass counts, test counts, deviations and remaining visual gaps.

