# TIP-P02: Adaptive Profile and InBody UX

## HEADER

- TIP-ID: TIP-P02
- Project: GymAI Coach
- Module: Profile, body composition, secure extraction API
- Depends on: TIP-P01 contracts/schema
- Priority: P0

## CONTEXT

- Reuse current chassis/neumorphic/orange/mono design system, profile route, responsive cards and server auth patterns.
- Raw InBody image must not be stored. External Gemini processing requires explicit consent and only receives a client-redacted derivative.

## TASK

Build a complete, mobile-first Adaptive Profile and optional InBody flow: constraints/readiness/preferences controls, image privacy gate/redacted preview, typed extraction, human review, confirmed save, timeline/details and delete/withdraw controls.

## SPECIFICATIONS

1. Add Profile entry points and an IA that does not turn onboarding into a long health form.
2. Add body-composition page/route with empty state, manual-entry fallback, confirmed history and detail/insight hierarchy.
3. Client-side redaction must cover the identifying header by default before upload and show the exact derivative preview. User must check consent immediately before external processing.
4. `/api/inbody/extract` authenticates, validates MIME/size/consent, records consent, sends only redacted image data to Gemini with untrusted-document instructions and strict schema, and returns typed extraction. It never logs or persists image bytes.
5. Save/delete/consent APIs require auth/ownership and validate ranges/units with Zod.
6. All extracted fields remain editable; low-confidence/missing fields are visually identified without medical red/green judgement.
7. Copy states clearly: baseline/trend, information-not-diagnosis, and how each AI may use the data.
8. Add loading/error/retry/manual fallback, keyboard labels and no color-only state.

## ACCEPTANCE CRITERIA

- User can complete manual baseline without Gemini.
- Raw selected image never leaves the browser; only the shown redacted derivative is posted after consent.
- Extraction cannot be saved until user reviews/confirms.
- User can delete a measurement and withdraw future AI-use consent.
- One measurement renders baseline; two comparable measurements render change without claiming diagnosis.
- Mobile and desktop layouts reuse the current system style.
- Typecheck/lint/build pass for touched paths.

## CONSTRAINTS

- Do not persist images in storage or `ai_interactions`.
- Do not add trainer sharing, nutrition prescription or under-18 flow.
- Do not modify AI planner/coach prompts; TIP-P03 owns those.

## REPORT FORMAT

Create `docs/COMPLETION-TIP-P02-PERSONALIZATION-INBODY-UX.md`.

