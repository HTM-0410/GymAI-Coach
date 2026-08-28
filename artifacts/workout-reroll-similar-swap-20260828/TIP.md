# TIP: Reliable workout reroll and similar exercise swap

- ID: TIP-WORKOUT-REROLL-SWAP
- Priority: P0
- Scope: Workout draft generation, picker interaction, and focused tests

## Requirements

- REQ-01: Full reroll excludes every exercise in the visible draft before AI and fallback selection.
- REQ-02: Phase reroll excludes exercises from the selected phase while preserving other phases.
- REQ-03: Each draft exercise exposes a quick action to choose a replacement from the same phase and primary muscle.
- REQ-04: Replacement preserves the exercise position and compatible prescription settings.
- REQ-05: Existing draft duplicates cannot be selected as replacements or additions.
- REQ-06: Prompt-based regeneration excludes the visible draft and exposes whether Gemini or fallback produced the result.
- REQ-07: Known Gemini ref/phase mistakes are repaired by dropping invalid placements and filling only missing phases from the safe fallback.
- REQ-08: The exact machine-first, no-free-weight prompt is enforced by deterministic candidate filtering.

## Decisions

- Reroll exclusions are enforced by server code, not prompt wording.
- Similarity means same primary muscle, ranked by exercise type and equipment overlap.
- No database schema or persistence changes are required.
- A separate blueprint approval is skipped because the request defines the interaction and the change stays inside the existing draft contract.
