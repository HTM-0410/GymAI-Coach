# COMPLETION REPORT - TIP-P02 ADAPTIVE PROFILE AND INBODY UX

**STATUS:** DONE - awaiting Contractor VERIFY, authorized Supabase migration and authenticated local E2E.

## Files changed

### Created

- `src/lib/personalization/body-composition.ts` - shared Zod contracts, field metadata, range validation, strict extraction schema/prompt, default header-mask geometry, database mapping and comparable-trend helper.
- `src/app/api/personalization/profile/route.ts` - authenticated owner-scoped constraint, preference and readiness read/write/delete API.
- `src/app/api/body-composition/route.ts` - authenticated confirmed-measurement history/save API with reviewed-data consent recording.
- `src/app/api/body-composition/[id]/route.ts` - authenticated owner-scoped measurement deletion.
- `src/app/api/body-composition/consent/route.ts` - grant/withdraw future AI-use purposes and fail-closed measurement use update.
- `src/app/api/inbody/extract/route.ts` - authenticated MIME/size/redaction/consent gate, purpose recording and strict Gemini extraction with no image persistence/logging.
- `src/app/(app)/profile/adaptive-profile-panel.tsx` - collapsible constraint/preference/readiness controls that keep optional personalization outside onboarding.
- `src/app/(app)/profile/body-composition/page.tsx` - authenticated mobile-first body-composition route and system-aligned page shell.
- `src/app/(app)/profile/body-composition/body-composition-client.tsx` - manual baseline, client redaction/exact preview, consent, extraction review, editable fields, history/detail, trend, delete and AI-use controls.
- `tests/body-composition.test.ts` - focused validation/privacy/trend tests.

### Modified

- `src/app/(app)/profile/page.tsx` - adds Adaptive Profile without changing onboarding.
- `src/app/(app)/profile/profile-form.tsx` - adds the Body Composition/InBody entry point.

## Acceptance criteria results

| Acceptance criterion | Result | Evidence |
|---|---|---|
| User can complete manual baseline without Gemini | PASS | Manual mode uses only the confirmed save API; focused schema test accepts a reviewed manual baseline. |
| Raw image never leaves browser; only shown redacted derivative is posted after consent | PASS | The file exists only inside the selection handler; canvas creates a JPEG derivative with the full-width top 26% mask, the preview URL and upload use that same Blob, and the request is disabled until the adjacent consent checkbox is selected. Server requires `redactedImage`, `consent=true` and `header_masked_v1`. |
| Extraction cannot be saved until review/confirmation | PASS | Extraction populates editable draft values, resets `reviewed`, labels missing/low-confidence fields and disables save until explicit review; API requires literal `reviewed: true`. |
| User can delete measurement and withdraw future AI-use consent | PASS | Owner-filtered DELETE route plus timeline action; purpose consent UI can remove any/all surfaces and records `withdrawn_at` while removing those uses from measurements. |
| One measurement renders baseline; two comparable measurements render non-diagnostic change | PASS | Pure trend helper and tests require two confirmed same-device, non-low-comparability rows; UI uses neutral deltas and explicitly avoids good/bad or diagnosis claims. |
| Mobile and desktop reuse current design system | PASS | Responsive chassis/neumorphic/orange/mono cards, recessed bays, existing button/input classes and mobile-first grids are reused. |
| Typecheck/lint/build pass for touched paths | PASS | `npx.cmd tsc --noEmit`, `npm.cmd run lint` and `npm.cmd run build` all pass. Lint reports only one unchanged warning in `objective-set-tracker.tsx:164`; P02 paths are clean. |

**Acceptance criteria tested:** 7/7 passed at implementation/static/pure-test level.

## Test results

- `npx.cmd tsx --test tests/body-composition.test.ts tests/personalization-context.test.ts` - PASS: 16 passed, 0 failed.
- `npm.cmd run test:workout-phases` - PASS: 16 passed, 0 failed.
- `npx.cmd tsc --noEmit` - PASS: 0 type errors.
- `npm.cmd run lint` - PASS: 0 errors; one unrelated pre-existing hook-dependency warning.
- `npm.cmd run build` - PASS: production compilation and type validation succeeded.
- `git diff --check` - PASS; line-ending notices only.

## Privacy and failure behavior

- No raw or redacted image bytes, URL or path are inserted into Supabase, Storage or `ai_interactions`.
- The extraction API inserts external-processing consent before calling Gemini and returns a generic provider failure without logging model output or image data.
- The image prompt treats the sheet as an untrusted document, ignores embedded instructions and forbids identity extraction.
- Manual entry remains available before and after an extraction failure.
- Measurement save compensates by deleting the new measurement if its requested AI-use consent rows fail to save.
- AI-use changes fail closed: withdrawn consent excludes use even if a later measurement update fails; a grant without measurement permission also cannot expose the measurement to P01 context.

## Issues discovered

- **LOW / existing:** `src/app/(app)/workouts/[id]/objective-set-tracker.tsx:164` has an unchanged React hooks lint warning. It is outside TIP-P02.
- **VERIFY dependency:** Authenticated API CRUD, RLS ownership and real page behavior require the P01 migration to be applied by the Contractor through the authorized Supabase MCP/local environment.
- **Provider dependency:** A live extraction smoke test needs an authenticated session and configured Gemini key. No real image/provider call was made in Builder tests.

## Deviations from spec

- None. The default identifying-header mask is implemented as a deterministic full-width top 26% region and is visibly burned into the exact derivative preview.

## Suggestions for Chủ thầu

1. Apply P01 migration through Supabase MCP as authorized, then test with two authenticated users: create/read/delete ownership, consent withdrawal and cross-user 404/RLS behavior.
2. Run the local UI at mobile and desktop widths with an authenticated user; verify keyboard navigation, exact preview, manual fallback and a two-measurement trend.
3. If choosing a real Gemini extraction smoke test, use only a synthetic or explicitly consented sheet and inspect Supabase afterward to prove no image artifact or `ai_interactions` row exists.

## External mutation statement

No Supabase migration/data mutation, Storage write, image upload, Gemini call, external API write, Git staging, commit or push was performed by the Builder.
