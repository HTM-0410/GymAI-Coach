# TIP: Runtime gym-aware exercise substitution

- ID: TIP-RUNTIME-SUBSTITUTE
- Priority: P0
- Scope: Active workout logger, workout-scoped API, substitution resolver, and database migration

## Requirements

- REQ-01: The active exercise exposes a clear action for a busy machine.
- REQ-02: Alternatives share the current primary muscle and phase role.
- REQ-03: Alternatives support the current tracking mode and are not already in the workout.
- REQ-04: Equipment compatibility is derived from the workout's selected gym, never from a client-supplied gym ID.
- REQ-05: Personal exclusions and movement limitations remain enforced.
- REQ-06: Swap is rejected after any completed set or after workout completion.
- REQ-07: Swap updates exercise identity and clears stale target load atomically.
- REQ-08: The API is owner-scoped and the privileged RPC is executable only by service role.
- REQ-09: The logger refreshes exercise media, instructions, and set state after swap.

## Decisions

- Runtime substitution uses deterministic ranking to avoid unnecessary LLM latency and health-context transfer while the user is training.
- Legacy workouts with a null gym and no equipment scope fail safe to bodyweight alternatives.
- The new migration is created locally but is not applied to Supabase without explicit approval.
- Blueprint approval is skipped because the user specified the workflow and the implementation reuses the existing substitute resolver and logger contracts.
