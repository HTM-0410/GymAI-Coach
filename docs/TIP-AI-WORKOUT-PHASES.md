# TIP-AI-WORKOUT-PHASES — Vibecode Kit v6.1

## Header

- Project: GymAI Coach
- Module: AI Workout Generator
- Working directory: `D:\GymAI-Coach`
- Scope: TIP-001 through TIP-005
- Priority: P0/P1
- Approved by Homeowner: 2026-08-21

## Approved decisions

- UI exposes independent warm-up and cooldown switches, both enabled by default.
- Warm-up/main/cooldown share the selected total duration.
- Legacy API requests that omit options default both optional phases to false.
- Workout phases are `warmup | main | cooldown`.
- Prescription modes are `reps | time | hold`.
- `workout_sets.set_type` remains a lifting-set classification and never represents a session phase.
- Existing rows behave as `main + reps`.
- Profile preferences are outside MVP scope.
- Only reviewed exercise taxonomy may enter warm-up/cooldown pools.

## Requirements

| ID | Requirement | Priority |
|---|---|---|
| REQ-001 | Two independent accessible switches | P1 |
| REQ-002 | Phase time budget never exceeds total duration | P0 |
| REQ-003 | Structured phase and prescription contract | P0 |
| REQ-004 | Backward-compatible additive migration | P0 |
| REQ-005 | Audited reviewed exercise taxonomy | P0 |
| REQ-006 | Separate candidate pools per phase | P0 |
| REQ-007 | Free prompt cannot override safety/access/time/catalog constraints | P0 |
| REQ-008 | Deterministic fallback for Gemini/JSON/validation failure | P0 |
| REQ-009 | Draft review grouped into three semantic sections | P1 |
| REQ-010 | Logger supports reps/time/hold and phase transitions | P0 |
| REQ-011 | Only main/reps affects working volume, PR and progression | P0 |
| REQ-012 | Automated tests cover four toggle combinations and duration boundaries | P0 |
| REQ-013 | Preserve the existing dirty worktree | P0 |

## Task graph

1. TIP-001 — shared Zod/types and additive migration.
2. TIP-002 — canonical taxonomy, reviewed manifest and local validator.
3. TIP-003 — deterministic budgets, phase pools, structured Gemini output, fallback, generate/confirm persistence.
4. TIP-004 — switches, live budgets, phase review, phase-aware picker/regeneration.
5. TIP-005 — active logger, analytics isolation, tests and technical verification.

## Acceptance criteria

- Given a legacy generate request without options, when parsed, then warm-up and cooldown are both false.
- Given an existing workout row without new values, when loaded, then it behaves as main/reps.
- Given any 15/30/60/120/240-minute duration and toggle combination, when budgets are allocated, then the main phase remains viable and the sum does not exceed the selected duration.
- Given an invalid phase, prescription shape, duplicate exercise or phase order, when validated, then the request is rejected.
- Given Gemini failure, invalid JSON, empty output or an invalid selection, when main and requested accessory candidates exist, then a deterministic valid draft is returned.
- Given an enabled accessory phase, when candidates are built, then only reviewed taxonomy records with compatible equipment/access are eligible.
- Given a generated draft, when passed to confirm validation, then it is accepted without contract divergence.
- Given the review UI, when a phase is disabled, then that section is absent and cannot be manually populated.
- Given a time/hold prescription, when rendered, then weight and RIR are absent.
- Given a completed accessory exercise, when reports/progression/performance/social/coach metrics are calculated, then it is excluded from main working volume.
- Given a dirty worktree, when implementation completes, then no reset, clean, staging, commit, push, remote migration or external data mutation has occurred.

## Constraints

- Use additive migrations only; do not edit the initial migration.
- Reuse existing chassis/card/accent UI tokens and ObjectiveSetTracker for reps.
- Do not call Gemini, Supabase writes, or any other external mutation during local implementation/verification.
- Preserve unrelated modified, deleted and untracked user-owned files.
- Builder must return `docs/COMPLETION-AI-WORKOUT-PHASES.md`; Contractor performs VERIFY and Homeowner reviews before ship.
