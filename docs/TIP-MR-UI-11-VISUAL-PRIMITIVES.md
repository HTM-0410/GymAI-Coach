# TIP-MR-UI-11: Visual Primitives and Anatomy Content

## HEADER

- TIP-ID: TIP-MR-UI-11
- Project: GymAI Coach
- Module: Muscle Readiness UI Redesign
- Depends on: TIP-MR-UI-10
- Priority: P0
- Estimated effort: 35 minutes Builder time

## CONTEXT

- Working directory: `D:\GymAI-Coach`
- Blueprint: `docs/PLAN-MUSCLE-READINESS-UI-REDESIGN-CONTRACTOR.md`
- Key files:
  - `src/components/ui/MuscleBody.tsx`
  - `src/lib/recovery/muscle-groups.ts`
  - `public/muscle-groups/`
  - `public/muscle-groups/full/`
  - `src/components/programs/day-muscle-map.tsx`
  - `tests/muscle-readiness-ui.test.ts`

## REQUIREMENTS

- REQ-UI-007: Every canonical recovery group has a reusable thumbnail asset mapping and safe fallback.
- REQ-UI-008: Every canonical recovery group has reviewed static Vietnamese anatomy copy.
- REQ-UI-009: `CALVES` is independently visible, focusable and selectable from the body map.
- REQ-UI-010: Existing `MuscleBody` consumers remain backward compatible.
- REQ-UI-011: Visual state has text and accessible labels, not color alone.

## TASK

1. Add a canonical UI metadata module for all 10 groups with label, section, thumbnail path, preferred view and anatomy description.
2. Reuse assets already under `public/muscle-groups/`; do not create copied image assets.
3. Add a reusable `MuscleGroupThumbnail` component with decorative and meaningful-image modes.
4. Refactor lower-leg SVG paths so `CALVES` is distinct from `LEGS` while keeping paths in one source.
5. Preserve optional props and behavior for all existing `MuscleBody` consumers.
6. Add coverage and regression tests.

## ACCEPTANCE CRITERIA

1. Given the 10 canonical groups, when UI metadata is enumerated, then coverage is exactly 10/10 with no unknown path.
2. Given `CALVES`, when front or back body map is rendered, then the lower-leg region has its own score, label, keyboard focus and selection callback.
3. Given `LEGS`, when rendered after the split, then thigh regions still highlight correctly and do not include calves.
4. Given `day-muscle-map`, when existing usage renders, then no new required prop or behavior regression occurs.
5. Given a missing asset at runtime, when thumbnail renders, then a stable accessible fallback is shown.
6. Given anatomy metadata, when tested, then every description is non-empty Vietnamese static copy and no runtime AI is called.
7. Given focused tests and TypeScript, when run, then both pass with exact counts reported.

## CONSTRAINTS

- Do not change recovery taxonomy or create new model groups.
- Do not change the database or API contract.
- Do not add image-generation or third-party assets.
- Do not add dependencies.
- Do not use gstack.
- Do not use an em dash in source, UI or docs.
- Do not commit, push or deploy.

## REPORT FORMAT

Create `docs/reports/TIP-MR-UI-11-COMPLETION.md` with status, files changed, acceptance results, issues, deviations and suggestions for Chủ thầu.
