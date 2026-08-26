# TIP-MR-03 Completion Report

## Status

`DONE`

## Scope delivered

- Added the versioned V1 recovery constants and explicit muscle half-life table.
- Added pure fatigue point, saturation, decay, combination, readiness, and projection functions.
- Added conservative confidence resolution and multi-event folding.
- Added canonical body-group mapping with conservative minimum aggregation.
- Preserved cold start as Unknown instead of presenting an assumed 100% readiness.

## Files

- `src/lib/recovery/constants.ts`
- `src/lib/recovery/confidence.ts`
- `src/lib/recovery/model.ts`
- `src/lib/recovery/muscle-groups.ts`
- `tests/muscle-recovery-model.test.ts`

## Acceptance evidence

| Check | Result |
|---|---|
| Zero usable sets produce zero fatigue points | PASS |
| Warmup, effort, drop, and failure factors use locked exact values | PASS |
| Saturation uses `K = 6` and remains within 0-100 | PASS |
| Fatigue halves after exactly one configured half-life | PASS |
| Future clock skew adds no fatigue or reverse decay | PASS |
| Sequential sessions decay then combine conservatively | PASS |
| Readiness projections for 60, 80, and 90 are deterministic | PASS |
| Unknown muscles use the 18-hour fallback and lower confidence | PASS |
| Group aggregation uses the lowest measured child muscle | PASS |
| Cold-start groups remain Unknown | PASS |
| Focused readiness tests | PASS, 20/20 |
| TypeScript | PASS, zero errors |
| Diff whitespace check | PASS |
| Full unit suite | 121/123 pass; two pre-existing onboarding source-assertion failures remain outside this TIP |

## Deviations and decisions

- `CALVES` is an explicit presentation group so calf readiness is not hidden when the body illustration lacks a dedicated region. TIP-MR-06 must provide a text-list fallback.
- `serratus` maps to `CHEST` to cover the dominant live catalog gap without changing the calculation-level muscle slug.
- V1 uses the fixed half-life table from the approved Blueprint. A fatigue-band half-life multiplier remains deferred because no coefficient table was approved.
- Intentionally unmapped slugs remain visible to validation instead of being silently assigned to an unrelated body group.

## Live impact

None. This TIP added pure local domain logic and tests only. It did not write recovery rows, backfill history, sync exercises, or deploy.

## Contractor handoff

Proceed to TIP-MR-04: server-owned, idempotent workout completion processing. Its release gate must prove duplicate and concurrent completion requests cannot apply fatigue twice.
