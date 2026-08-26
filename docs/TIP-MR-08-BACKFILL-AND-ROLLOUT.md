# TIP-MR-08: Backfill and Staged Rollout

## Header

- TIP-ID: TIP-MR-08
- Project: GymAI Coach
- Module: Muscle Readiness Operations
- Depends on: TIP-MR-04
- Priority: P0

## Task

Provide a 14-day, read-only dry-run that reports source coverage, skipped workouts and sets, current-model differences, and before counts. Provide a separately gated retry-safe write path and rollout kill switch without deleting source data.

## Acceptance Criteria

- Dry-run is the default and performs no insert, update, delete, RPC, or status mutation.
- Write mode requires both an explicit command flag and a separate approval token.
- Write processing reuses the idempotent completion service and stable model version.
- Report includes before counts, eligible and skipped workout counts, completed and skipped set counts, mapping coverage, and projected changes.
- Feature flag can disable UI entry points and API integration without dropping additive tables.
- Source workout and set data is never deleted.

## Constraints

- Run live dry-run only. Do not run live write without a separate approval phrase.
- No deploy, commit, or push.
- Do not use an em dash.

## Report Format

Create `docs/reports/TIP-MR-08-COMPLETION.md` with command, measured counts, deviations, and live impact.
