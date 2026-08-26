# TIP-MR-05: Recovery Read API

## Header

- TIP-ID: TIP-MR-05
- Project: GymAI Coach
- Module: Muscle Readiness
- Depends on: TIP-MR-03, TIP-MR-04
- Priority: P0

## Task

Create authenticated owner-scoped summary and group-detail endpoints. Compute current readiness and projections at read time, preserve Unknown cold start, reject stale model versions, and return deterministic explanations with a bounded history window.

## Specifications

- `GET /api/recovery` returns every presentation group in a stable schema.
- `GET /api/recovery/[group]` returns the selected group plus recent contributing loads from at most the previous 14 days and at most 20 events.
- Use the authenticated Supabase client and existing owner-select RLS. Do not use service role for reads.
- Summary must use one state query, not one query per body group.
- Current score is derived from fatigue at request time and is never persisted as `readiness_now`.
- A state with a non-current model version is Unknown and marked stale.
- Projections expose 60, 80, and 90 thresholds.
- Explanations are deterministic and never claim medical certainty.

## Acceptance Criteria

- Stable response includes all groups and correct cold-start Unknown values.
- Exact clock-controlled decay and 60/80/90 projections pass.
- Stale model state cannot surface a readiness number.
- Summary source has no per-group database query.
- Unauthenticated requests return 401.
- Invalid group returns 400 or 404.
- Detail history is owner-scoped and bounded to 14 days and 20 events.

## Constraints

- No schema migration, live write, backfill, deploy, commit, or push.
- No service-role client in read routes.
- Preserve unrelated dirty-tree changes.
- Do not use an em dash.

## Report Format

Create `docs/reports/TIP-MR-05-COMPLETION.md` after self-test.
