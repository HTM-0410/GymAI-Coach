# TIP-MR-06: Recovery Body Map and Why Sheet

## Header

- TIP-ID: TIP-MR-06
- Project: GymAI Coach
- Module: Muscle Readiness UI
- Depends on: TIP-MR-05
- Priority: P0

## Task

Add the `/recovery` experience with front and back body views, a complete text list, accessible score selection, loading/error/empty/stale states, and a keyboard-safe Why sheet. Extend `MuscleBody` additively and add navigation entry points.

## Acceptance Criteria

- Existing `MuscleBody` consumers render unchanged when new props are omitted.
- Score colors always appear with text status and numeric or Unknown labels.
- Every group, including calves, is available in the text list.
- Interactive SVG regions support pointer, Enter, Space, and accessible labels.
- Why sheet traps focus through Radix Dialog and closes with Escape.
- Loading, error with retry, cold start, stale model, and detail loading states render.
- Layout has no horizontal overflow at 320, 375, 768, and 1440 px.
- Navigation and command palette expose `/recovery`.

## Constraints

- No new SVG calf anatomy in V1.
- No migration, live write, backfill, deploy, commit, or push.
- Preserve old `day-muscle-map` behavior.
- Do not use an em dash.

## Report Format

Create `docs/reports/TIP-MR-06-COMPLETION.md` after browser and static verification.
