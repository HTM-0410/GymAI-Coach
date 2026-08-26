# TIP-MR-UI-16: Cold Start Default Ready

## HEADER

- TIP-ID: TIP-MR-UI-16
- Project: GymAI Coach
- Module: Muscle Readiness
- Depends on: TIP-MR-UI-15
- Priority: P0

## CONTEXT

- Working directory: `D:\GymAI-Coach`
- Homeowner explicitly replaces the earlier Unknown cold-start rule.
- The read model remains the single source consumed by Overview, List, Detail and workout handoff.
- Current pain and contraindication rules remain higher priority than readiness.

## DECISION DELTA

- When a presentation group has no current recovery state, expose a default readiness baseline of 100% and status `ready`.
- When a current recovery state exists, use the calculated score and status immediately.
- Preserve provenance with an additive `readinessSource: 'default' | 'model'` field.
- Default readiness is an assumption based on no processed muscle load, not a measured recovery result.
- Old-model-only state also falls back to the default baseline instead of showing Unknown.

## REQUIREMENTS

- REQ-UI-033: Cold-start groups render 100%, green and Ready across Overview, List and Detail.
- REQ-UI-034: Cold start never renders `--` or `Chưa đủ dữ liệu`.
- REQ-UI-035: Once model data exists for a group, the calculated readiness replaces the default baseline.
- REQ-UI-036: The API identifies default versus model-derived readiness without adding a database column.
- REQ-UI-037: Fresh count and workout handoff use the same 100% default until real data arrives.
- REQ-UI-038: Detail explanation discloses the default assumption and keeps pain and contraindication safety copy.

## TASK

Update the recovery read-model cold-start contract and all affected presentation helpers/tests. Do not implement a UI-only fake score. Return one coherent API contract so every consumer agrees.

## ACCEPTANCE CRITERIA

1. `buildRecoverySummary([], at)` returns exactly 10 groups, each at 100%, `ready`, non-stale and `readinessSource: 'default'`.
2. Default groups expose projection milestones as already reached at the generated timestamp.
3. Default explanations do not contain `Chưa đủ dữ liệu` and clearly say the score is a default that updates after a completed workout is processed.
4. A group with a current recovery state returns its calculated score and `readinessSource: 'model'`.
5. An old-model-only group falls back to the disclosed default baseline and never renders Unknown.
6. Overview body is fully green for an empty recovery-state response and Fresh count is 10.
7. List rows show 100%, Ready and no `--` for all cold-start groups.
8. Detail shows 100%, Ready, all milestones reached and the default explanation.
9. Workout handoff may include default-ready groups, while pain and contraindication rules remain unchanged and higher priority.
10. Focused Muscle Readiness tests, TypeScript and production build pass.
11. No em dash exists in changed source, tests or reports.

## CONSTRAINTS

- No migration, database write, backfill, deploy, commit or push.
- Do not add dependencies.
- Do not use gstack.
- Preserve unrelated dirty work.
- Use `readinessSource` rather than inferring provenance from confidence.
- Keep `unknown` in the status union for backward-compatible parsing if needed, but it must not be emitted for cold start.

## REPORT FORMAT

Create `docs/reports/TIP-MR-UI-16-COMPLETION.md` using the Vibecode Completion Report format with exact counts.
