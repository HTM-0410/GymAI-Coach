# TIP-MR-UI-13: Recovery Group List

## HEADER

- TIP-ID: TIP-MR-UI-13
- Depends on: TIP-MR-UI-10, TIP-MR-UI-11
- Priority: P0

## REQUIREMENTS

- REQ-UI-017: `/recovery/groups` displays all 10 canonical groups.
- REQ-UI-018: Rows show thumbnail, label, status, score and latest activity fallback.
- REQ-UI-019: Main and accessory sections use canonical UI metadata only.
- REQ-UI-020: Sorting is stable by status tier and canonical order within each section.
- REQ-UI-021: Every row routes to the correct detail page.

## TASK

Create the group list page and reusable list components. Use `/api/recovery`, shared selectors and metadata. Include Back, fresh count, loading skeleton, error retry, Unknown, stale and no-recent-activity copy. Keep the existing app navigation and theme.

## ACCEPTANCE CRITERIA

1. Exactly 10 canonical groups render with no duplicates.
2. Main section contains 8 approved groups and accessory section contains 2.
3. Unknown displays `--`; stale is not styled as ready.
4. Latest activity shows exercise and relative time or a clear fallback.
5. Stable sort does not jump groups within one status tier.
6. The whole row is a link with at least 72 px height and an accessible name.
7. Back and deep linking work.
8. Loading and network error states are explicit.
9. No uncontrolled horizontal overflow.
10. Focused tests and TypeScript pass.

## CONSTRAINTS

- Do not query detail once per row.
- Do not invent groups from the reference app.
- Do not add dependencies or use gstack.
- No em dash. No live write, commit, push or deploy.

## REPORT

Create `docs/reports/TIP-MR-UI-13-COMPLETION.md`.
