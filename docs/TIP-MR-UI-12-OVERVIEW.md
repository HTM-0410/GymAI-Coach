# TIP-MR-UI-12: Recovery Overview Redesign

## HEADER

- TIP-ID: TIP-MR-UI-12
- Depends on: TIP-MR-UI-10, TIP-MR-UI-11
- Priority: P0

## CONTEXT

- Blueprint: `docs/PLAN-MUSCLE-READINESS-UI-REDESIGN-CONTRACTOR.md`
- Key file: `src/app/(app)/recovery/recovery-dashboard.tsx`
- Reuse selectors, metadata, `MuscleBody`, feature flag and current workout handoff.

## REQUIREMENTS

- REQ-UI-012: Overview shows days since latest completed workout and fresh count.
- REQ-UI-013: Fresh KPI routes to `/recovery/groups`.
- REQ-UI-014: Body selection routes to `/recovery/groups/[group]`.
- REQ-UI-015: Front/back map, legend, safety copy and workout CTA remain usable.
- REQ-UI-016: Loading, empty, stale and error states remain explicit.

## TASK

Redesign `/recovery` into the approved body-first Overview. Remove the inline group list and Why sheet only after equivalent List and Detail routes are available or keep a safe transitional link behavior. Preserve the workout confirmation dialog and use workout-eligible selectors rather than duplicated thresholds.

## ACCEPTANCE CRITERIA

1. KPI days renders `--` for null and never shows a false zero.
2. Fresh count excludes 89, Unknown and stale, includes current 90+.
3. Fresh KPI is a keyboard-accessible link to `/recovery/groups`.
4. Every SVG group routes to its detail page; CALVES is independently selectable.
5. Front/back tabs expose correct tab semantics.
6. Legend communicates all five statuses with text.
7. Existing workout handoff and confirmation remain intact at threshold 80+.
8. Loading, empty, stale and retry states are present.
9. No page overflow at 320, 375, 768 and 1440 CSS widths.
10. Focused tests and TypeScript pass.

## CONSTRAINTS

- No model, schema, RLS or recommendation changes.
- Do not add dependencies or use gstack.
- No em dash. No live write, commit, push or deploy.

## REPORT

Create `docs/reports/TIP-MR-UI-12-COMPLETION.md`.
