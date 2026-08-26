# TIP-MR-07: Readiness Recommendation Integration

## Header

- TIP-ID: TIP-MR-07
- Project: GymAI Coach
- Module: Muscle Readiness Recommendations
- Depends on: TIP-MR-05, TIP-MR-06
- Priority: P0

## Task

Integrate muscle readiness into workout generation as a server-verified, conservative constraint. Add a confirmation CTA that explains selected and skipped groups before handing off to workout generation.

## Acceptance Criteria

- The browser sends group identifiers only. The server reloads the authenticated user's current recovery state.
- Readiness can narrow candidates or hold load, but can never cause a load increase.
- Pain, movement limitations, exercise exclusions, ownership, equipment, and phase rules remain higher priority.
- Unknown or stale readiness preserves the existing generation behavior.
- The CTA confirmation lists selected and skipped groups with deterministic reasons.
- The generated plan and AI audit contain readiness reason codes.
- The handoff is consumed once and remains retryable.

## Constraints

- No live write, backfill, deploy, commit, or push.
- Do not treat recovery estimates as medical clearance.
- Do not use an em dash.

## Report Format

Create `docs/reports/TIP-MR-07-COMPLETION.md` after focused tests and type checking.
