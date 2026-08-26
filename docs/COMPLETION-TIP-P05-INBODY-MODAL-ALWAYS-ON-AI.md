# COMPLETION REPORT - TIP-P05 INBODY MODAL AND ALWAYS-ON AI

**STATUS:** BUILDER DONE - awaiting Contractor clean build and authenticated local E2E/VERIFY.

## Outcome

The body-composition page now contains history, insight and exactly one add-data trigger. `Thêm kết quả InBody` opens a Radix modal containing the entire upload/redaction/automatic extraction/review/save workflow and the manual-entry fallback. No scan or manual form is rendered inline on the page, and no AI permission card/toggle remains.

Every confirmed body-composition measurement is now available to planner, coach and weekly report without consulting legacy per-surface consent. The separate external-processing consent/redaction audit for sending the client-redacted derivative to Gemini remains mandatory.

## Files changed

- `src/app/(app)/profile/body-composition/body-composition-client.tsx`
  - single page CTA and responsive accessible modal;
  - automatic redaction/extraction, preview, errors/retry, four-field review, optional details, save and manual fallback inside the modal;
  - successful save refreshes history, closes the modal and restores page feedback;
  - removes AI-toggle state and consent API calls.
- `src/app/(app)/profile/body-composition/page.tsx`
  - removes the legacy AI-consent query and prop.
- `src/app/api/body-composition/route.ts`
  - always persists the three existing `allowed_uses` and stops creating legacy per-surface consent rows.
- `src/app/api/inbody/extract/route.ts`
  - retains shared mandatory external consent/redaction guards and external-processing audit.
- `src/lib/personalization/body-composition.ts`
  - retains one canonical three-surface allowed-use constant; removes P04 toggle-only mapping helpers.
- `src/lib/ai/personalization-context.ts`
  - confirmed measurements are projected to all three AI surfaces independent of legacy consent or stored `allowed_uses` state.
- `src/lib/ai/personalization-context.server.ts`
  - removes the legacy `data_consents` query from the database-backed AI-context path.
- `src/lib/ai/personalization-integration.ts`
  - body composition is no longer filtered by per-surface allowed-use consent during minimal prompt projection.
- `tests/body-composition.test.ts`, `tests/personalization-context.test.ts`, `tests/ai-personalization-integration.test.ts`
  - P05 modal, privacy, always-on save and cross-surface projection regression coverage.
- `src/app/(app)/profile/profile-form.tsx`
  - whitespace-only trailing blank-line cleanup so `git diff --check` remains clean; no behavior changed.

No migration, schema or Gemini prompt/model change was made.

## Requirement mapping

| Requirement | Files | Tests/evidence | Result |
|---|---|---|---|
| P05-REQ-001 One CTA | body-composition client | Static test finds exactly one `Dialog.Trigger`, `Thêm kết quả InBody`, and no inline measurement section. | PASS |
| P05-REQ-002 Upload/extract in modal | body-composition client, extract API | `await extract(blob)` occurs immediately after derivative creation; preview/loading/retry remain in `Dialog.Content`; no consent checkbox/analyze button. | PASS |
| P05-REQ-003 Review/save in modal | body-composition client | Four primary fields, closed optional details, manual fallback, final `reviewed: true`; success refreshes, calls `setModalOpen(false)` and shows page feedback. | PASS |
| P05-REQ-004 Accessible/responsive modal | body-composition client | Radix modal focus trap/restore and scroll lock; semantic dialog, `aria-modal`, labelled title/close, Escape/outside prevention only while busy, internal `max-height` scrolling and `overflow-x-hidden`. | PASS at implementation/static level |
| P05-REQ-005 AI always-on | save API, context builder, projection/integration | Server enforces planner/coach/weekly_report; no legacy consent query; tests prove planner, coach and weekly report all receive confirmed values with no consent rows. | PASS |
| P05-REQ-006 Privacy boundary | client, extract API, AI projection | Client masks first; only derivative plus required flags is posted; external-processing purpose is audited; no Storage/`ai_interactions`/image path write; only confirmed numeric summary enters AI. | PASS |
| P05-REQ-007 Technical limits | tests and changed source | No migration/schema/provider/data mutation; focused tests are pure/static. | PASS |

**Requirement coverage:** 7/7 implemented (100%).

## Test results

- `npx.cmd tsx --test tests/body-composition.test.ts` - PASS: 15 passed, 0 failed.
- `npx.cmd tsx --test tests/body-composition.test.ts tests/personalization-context.test.ts tests/ai-personalization-integration.test.ts` - PASS: 29 passed, 0 failed.
- `npx.cmd tsc --noEmit` - PASS: 0 type errors.
- `npm.cmd run lint` - PASS: 0 errors; one unchanged warning at `src/app/(app)/workouts/[id]/objective-set-tracker.tsx:164` outside P05.
- `git diff --check` - PASS; Windows line-ending notices only.
- `npm.cmd run build` - command was started before the Contractor reported that localhost dev was sharing `.next`; it exited 0 after reporting successful compilation/type validation but did not print the final route table. This is not claimed as a clean build gate. Contractor must stop dev and rerun once.

## Issues and limitations

- Authenticated local visual E2E remains a Contractor VERIFY gate because the Builder was instructed not to write real Supabase data or call Gemini.
- Modal focus, Escape/backdrop behavior and 390 px layout have implementation/static evidence but still require browser confirmation in the authenticated local session.
- The exported legacy consent helper and historical consent table remain for compatibility/audit, but neither the database-backed context nor prompt projection uses them to gate confirmed body composition.
- The legacy `/api/body-composition/consent` route remains present for compatibility but the new page never calls it, and its stored state cannot disable always-on confirmed measurement projection.

## Deviations

- No product or architecture deviation.
- One whitespace-only EOF cleanup was made in the related Profile entry file to satisfy `git diff --check`; no runtime behavior changed.

## Contractor VERIFY

1. Run the production build with an isolated artifact directory while IDE-managed dev servers retain `.next`: `$env:NEXT_DIST_DIR='.next-build-verify'; npm.cmd run build`. The default remains `.next` when the variable is absent.
2. Restart local dev and use the authenticated session to verify trigger focus → modal focus, Escape/backdrop/close, body scroll lock and focus return.
3. At 390 px and desktop width, intercept `/api/inbody/extract` with a typed fixture: select one image, assert exactly one extract request, review/edit, save fixture response, and confirm modal closes/history refreshes.
4. Exercise planner, coach and weekly report with a confirmed measurement and no legacy body-composition consent; verify all three receive only numeric confirmed context.

## External mutation statement

No migration was applied, no Supabase row was written, no image/provider request was made, and no Git stage/commit/push was performed by the Builder.

## REFINE - isolated verification build directory

- Blocker: Antigravity language-server processes respawn both `npm run dev` and `npx next dev`; those processes mutate `.next` while Contractor VERIFY runs `next build`, which can remove or replace the manifest/chunks used by the active dev server.
- Minimal fix: `next.config.mjs` now sets `distDir: process.env.NEXT_DIST_DIR || '.next'`. Normal development and production behavior remains unchanged without the environment variable.
- Focused proof: `npx.cmd tsx --test tests/next-dist-dir.test.ts` statically verifies the opt-in environment override, `.next` fallback and single `distDir` declaration.
- Builder boundary: no build was run after this REFINE, no IDE/dev process was stopped, and no cache directory was modified. Contractor owns the isolated build rerun.
