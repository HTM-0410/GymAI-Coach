# TIP-P03: AI Personalization Integration

## HEADER

- TIP-ID: TIP-P03
- Project: GymAI Coach
- Module: Planner, progression, substitute, coach, weekly report
- Depends on: TIP-P01 context builder
- Priority: P0

## CONTEXT

Current AI surfaces independently query profile/history. Candidate allowlists, phase/time budgets and deterministic progression rules already exist and must remain authoritative.

## TASK

Integrate the shared minimal personalization context into relevant AI surfaces with deterministic constraints, per-surface consent and explainable factors.

## SPECIFICATIONS

1. Planner: enforce active explicit exercise exclusions before candidate refs/fallback; include minimal goal/readiness/preferences/body-composition context only when allowed. Body composition cannot set load.
2. Substitute: enforce exclusions and equipment; movement limitation is context, not a diagnosis.
3. Progression: objective rule remains authoritative; readiness can conservatively cap a progress recommendation but InBody cannot change it.
4. Coach: use minimal shared context, source-attributed language and medical boundary; do not include raw measurement extraction or identifiers.
5. Weekly report: calculated facts first; consented comparable body-composition trend may be narrated, a single scan only called baseline.
6. Each output/interaction exposes or records compact `factors_used` and context version without sensitive raw payload.
7. Preserve fallback behavior for users with zero personalization/InBody data.
8. Add focused tests for precedence, exclusions, consent and no-data fallback.

## ACCEPTANCE CRITERIA

- Conflicting user prompt cannot re-add an excluded exercise.
- Withdrawn body-composition consent removes it from planner/coach/report projections.
- Low readiness never increases prescribed work.
- Progression result never changes solely because of InBody.
- Coach/report distinguish verified log, baseline and inference.
- Existing workout phase and progression behavior remain passing.

## CONSTRAINTS

- No schema/UI changes.
- No LLM authority over hard constraints or medical diagnosis.
- Keep external payload minimal and server-side.

## REPORT FORMAT

Create `docs/COMPLETION-TIP-P03-AI-PERSONALIZATION-INTEGRATION.md`.

