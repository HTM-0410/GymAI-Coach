# TIP-MR-UI-14: Recovery Group Detail

## HEADER

- TIP-ID: TIP-MR-UI-14
- Depends on: TIP-MR-UI-11, TIP-MR-UI-13
- Priority: P0

## REQUIREMENTS

- REQ-UI-022: `/recovery/groups/[group]` supports direct load, refresh and Back.
- REQ-UI-023: Detail shows thumbnail, anatomy copy, score, status and deterministic explanation.
- REQ-UI-024: Detail shows deduped activity, projections, confidence and safety note.
- REQ-UI-025: A horizontal chip selector changes group and URL without mixed stale content.
- REQ-UI-026: Invalid groups and request failures fail clearly.

## TASK

Create the detail route and client component using `/api/recovery/[group]`, shared group metadata and activity types. Replace the old Why sheet only when the route carries all information. Abort or ignore outdated fetch responses when switching groups quickly.

## ACCEPTANCE CRITERIA

1. Direct URL and refresh render the requested valid group.
2. Invalid group renders not found and does not fetch arbitrary paths.
3. Chips contain all 10 groups, selected state and accessible scroller label.
4. Rapid switching cannot show a prior group's response under the new title.
5. Recent activity has no duplicate workout exercise and shows no-load fallback.
6. Anatomy copy, explanation, 60/80/90 projections, confidence and safety note render.
7. UI Back and browser Back work.
8. Loading keeps header/chips stable; errors offer retry.
9. Keyboard-only navigation works.
10. Focused tests and TypeScript pass.

## CONSTRAINTS

- No runtime AI content.
- No model, DB, RLS or auth changes.
- Do not add dependencies or use gstack.
- No em dash. No live write, commit, push or deploy.

## REPORT

Create `docs/reports/TIP-MR-UI-14-COMPLETION.md`.
