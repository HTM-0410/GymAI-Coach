# TIP-MR-UI-21: Exact Trace Muscle Fatigue Map

## Header

- TIP-ID: TIP-MR-UI-21
- Supersedes visual geometry from: TIP-MR-UI-19 and TIP-MR-UI-20
- Priority: P0
- Source of truth: two latest dark front/back screenshots and `pasted-text.txt` supplied by the user

## Goal

Build an inline SVG anatomy map that visually overlays the supplied screenshots. Do not invent another silhouette or reuse the coarse atlas preview.

## Architecture Boundary

- Add a reusable `MuscleFatigueMap` React TypeScript component with the exact low-level left/right muscle IDs.
- Keep `MuscleBody` as the compatibility adapter used by the current app.
- Convert current readiness to fatigue with `fatigue = clamp(1 - readiness / 100, 0, 1)`.
- Both left and right regions initially inherit the same canonical readiness score because the current backend is group-level.
- Clicking a left/right region selects its canonical group for the existing one-group popup.
- No backend, API or database change.

## SVG Geometry Contract

- Inline SVG only.
- `viewBox="0 0 240 560"`.
- One SVG element per exact muscle ID.
- `fillRule="evenodd"`.
- True 2 to 3 px gaps between neighboring regions. Do not fake gaps with white overlapping strokes.
- Flat geometric shapes and thin dark outline.
- No gradients, texture, glow, raster body, CSS-div person, Canvas, 3D or generated image.
- Six-pack is exactly 6 separate regions.
- Each quadriceps side has exactly 3 regions.
- SVG is responsive with width 100%, height auto and `preserveAspectRatio="xMidYMid meet"`.

## Exact IDs

### Front

`head`, `neck`, `trap_l`, `trap_r`, `delt_l`, `delt_r`, `pec_l`, `pec_r`, `biceps_l`, `biceps_r`, `forearm_l`, `forearm_r`, `hand_l`, `hand_r`, `abs_upper_l`, `abs_upper_r`, `abs_mid_l`, `abs_mid_r`, `abs_lower_l`, `abs_lower_r`, `oblique_l`, `oblique_r`, `quad_outer_l`, `quad_mid_l`, `quad_inner_l`, `quad_outer_r`, `quad_mid_r`, `quad_inner_r`, `shin_outer_l`, `shin_inner_l`, `shin_outer_r`, `shin_inner_r`, `foot_l`, `foot_r`.

### Back

`head_back`, `neck_back`, `trap_back_l`, `trap_back_r`, `rear_delt_l`, `rear_delt_r`, `lat_l`, `lat_r`, `triceps_l`, `triceps_r`, `lower_back_l`, `lower_back_r`, `glute_l`, `glute_r`, `hamstring_outer_l`, `hamstring_inner_l`, `hamstring_outer_r`, `hamstring_inner_r`, `calf_l`, `calf_r`, `foot_back_l`, `foot_back_r`, `forearm_back_l`, `forearm_back_r`, `hand_back_l`, `hand_back_r`.

Do not merge or add muscle IDs.

## Interaction Contract

- Every fatigue-enabled region has `id`, `data-muscle`, `role="button"`, `tabIndex={0}` and an accessible Vietnamese label.
- Enter and Space select.
- `onSelect(id)` receives the exact left/right ID in `MuscleFatigueMap`.
- The compatibility adapter maps the ID to the canonical group and forwards the concrete trigger element for popup focus restore.
- `head`, all `hand_*` and all `foot_*` regions are non-interactive and always base gray.
- Fill transition: 150 ms.
- Selected region keeps fill and uses light stroke width 2.
- Hover is 12% brighter.
- Rotate swaps front/back without page remount or route change.

## Dark Heatmap Colors

- Background: `#1A1A24` where the map owns its background.
- Fresh fatigue 0 to 0.25: `#3A3A4A` band.
- Recovering fatigue 0.25 to 0.70: `#8E7097` band.
- Fatigued fatigue 0.70 to 1: `#D14D6B` band.
- Interpolate inside each band.
- Selected stroke: `#F5F5F5`, width 2.
- No hardcoded chest red. All interactive fill comes from fatigue data.

## Light Reference Colors

For the no-data light reference preview only:

- Pec and deltoid: `#EF4444`.
- Abs, oblique and forearm: `#60A5FA`.
- Arms and legs: `#10B981`.
- Head, neck, traps, hands and feet: `#6B7280`.
- Background: `#E8EEF4`.

The live recovery page uses the dark heatmap mapping.

## Visual Acceptance

- Front geometry must match the latest front screenshot, including head shape, sloped neck, rounded shoulder caps, curved pec lower edge, six-pack, obliques, natural arm taper, three quad regions, calves and feet.
- Back geometry must match the latest back screenshot, including trapezius diamond, wide curved lats, lower back, two rounded glutes, two hamstring regions per leg, calves and feet.
- The body must not look like a robot, stick figure, medical realism image or rounded blob person.
- Create 50% opacity overlay artifacts for front and back against the exact supplied screenshots.
- Fix paths until major outer silhouette and region boundaries align.

## Current App Integration

- Preserve the existing `/recovery` stats and front/back tabs unless the exact visual contract requires a label adjustment.
- Preserve the existing popup and group detail behavior.
- Update the body-map legend if necessary so its colors do not contradict the new dark fatigue palette.
- Do not add sample data to live user state.

## Acceptance Criteria

- [ ] All exact IDs exist once on the required face.
- [ ] No extra muscle ID exists.
- [ ] Six abs and three quad regions per side are present.
- [ ] Decorative head, hands and feet cannot be selected.
- [ ] Fatigue interpolation and readiness adapter have unit tests at band boundaries.
- [ ] Front and back overlay artifacts exist and show alignment at 50% opacity.
- [ ] Visual QA confirms no robot geometry.
- [ ] Ngực and Lưng still open the correct one-group popup without URL change.
- [ ] Focus restore works after closing the popup.
- [ ] Mobile 390 x 844 and desktop 1440 x 900 have no horizontal overflow or SVG clipping.
- [ ] Focused tests, TypeScript and production build pass.

## Constraints

- No gstack.
- No raster body committed or embedded. Overlay screenshots are QA artifacts only.
- No new dependency.
- No migration, live write, deploy, commit or push.
- Preserve unrelated dirty work.
- No em dash.

## Report

Create `docs/reports/TIP-MR-UI-21-COMPLETION.md` with exact ID inventory, overlay artifact paths, requirement mapping, test counts and any remaining visual gap.
