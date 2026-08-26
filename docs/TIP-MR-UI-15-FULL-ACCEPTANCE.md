# TIP-MR-UI-15: Muscle Readiness UI Full Acceptance

## HEADER

- TIP-ID: TIP-MR-UI-15
- Depends on: TIP-MR-UI-12, TIP-MR-UI-13, TIP-MR-UI-14
- Priority: P0

## CONTEXT

- Blueprint: `docs/PLAN-MUSCLE-READINESS-UI-REDESIGN-CONTRACTOR.md`
- This task verifies the integrated redesign without changing the recovery model, database, RLS, authentication or recommendation thresholds.
- Existing unrelated failures must be reported separately and must not be hidden by broad cleanup.

## REQUIREMENTS

- REQ-UI-027: Overview, list and detail routes form one complete read-only journey.
- REQ-UI-028: Fresh uses current, non-stale 90+ readiness while workout eligibility remains current, non-stale 80+.
- REQ-UI-029: All 10 canonical groups have consistent metadata, URLs, thumbnails and status presentation.
- REQ-UI-030: Responsive, keyboard, theme, loading, empty, stale, invalid and network-error behavior is verified.
- REQ-UI-031: Existing workout handoff and safety copy remain intact.
- REQ-UI-032: Focused tests, TypeScript, production build and the full unit suite have exact reported results.

## TASK

Perform Contractor acceptance on the integrated Muscle Readiness UI. Inspect implementation and completion reports, run automated checks, then perform read-only browser QA against the local app when an authenticated session is available. Do not alter production data. Return any defect to the responsible Builder and rerun the affected gate before marking READY.

## ACCEPTANCE CRITERIA

1. `/recovery` shows the two KPIs, selectable front/back body, five-status legend and preserved workout CTA.
2. Fresh KPI opens `/recovery/groups`; exactly 10 groups render in the approved 8 main and 2 accessory sections.
3. Every list row and SVG muscle opens the matching `/recovery/groups/[group]` route.
4. Direct load, refresh, UI Back and browser Back work on a valid detail route.
5. Invalid group fails clearly without an arbitrary API request.
6. Rapid chip switching cannot mix one group's title with another group's response.
7. Unknown and stale values are never counted or styled as Fresh or workout eligible.
8. Duplicate workout exercise activity is collapsed and no-activity fallbacks are explicit.
9. Keyboard navigation, focus visibility, accessible names and tab semantics pass inspection.
10. No uncontrolled horizontal overflow at 320, 375, 768 and 1440 CSS widths.
11. Light and dark themes remain legible and use the existing product design language.
12. Focused tests and TypeScript pass with zero failures.
13. Production build passes or any environment blocker is isolated with exact evidence.
14. Full unit suite result is reported with exact pass/fail counts and unrelated baseline failures are separated.
15. Source and rendered copy contain no em dash.

## CONSTRAINTS

- Verification is read-only except for local test/build artifacts and reports.
- Do not add dependencies or use gstack.
- No live writes, migrations, backfills, deploy, commit or push.
- Preserve unrelated dirty work.

## REPORT

Create `docs/reports/TIP-MR-UI-15-COMPLETION.md`. Contractor creates `docs/reports/TIP-MR-UI-15-VERIFY.md` only after independent acceptance.
