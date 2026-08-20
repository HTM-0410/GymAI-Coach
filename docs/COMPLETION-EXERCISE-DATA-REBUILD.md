# Completion Report — Exercise data rebuild (prototype)

STATUS: PARTIAL

## Files/areas changed

- `data/exercises/`: replaced the former 907-record catalog with 1,324 canonical projections.
- `public/exercise-media/gymvisual/`: 1,324 GIF animations and 1,324 thumbnails copied at source resolution.
- `scripts/import-gymvisual-dataset.ts`: repeatable import, duplicate-slug handling, attribution and archive-before-replace.
- `scripts/translate-gymvisual-vietnamese.ts`: exactly 5 records per Gemini request, strict JSON cardinality, cache/resume.
- `scripts/validate-canonical-exercises.ts`: record/slug/media/provenance gate.
- `data/exercise-canonical.schema.json`: canonical contract.
- `docs/TIP-EXERCISE-DATA-REBUILD.md`: contractor/builder TIP and acceptance criteria.

## Verification

- Source records: 1,324
- Source GIFs: 1,324
- Source thumbnails: 1,324
- Canonical records: 1,324
- Unique slugs: 1,324
- Missing local media: 0
- Validator: PASS
- Web `/exercises`: HTTP 200, page rendered with the new catalog
- Web `/exercises/3-4-sit-up`: HTTP 200, Vietnamese pilot content visible
- GIF route: HTTP 200, `image/gif`
- Vietnamese LLM pilot: 1 request for 5 records, applied successfully

## Deferred / not ready for production

- 1,319 records remain `translation_status=machine_pending`; full translation requires 264 additional requests (5 per request, plus one final partial batch handled separately).
- The media terms remain prototype-only until Gym visual grants GymAI Coach its own license. Attribution is preserved in every record.
- `npm run build` is blocked by pre-existing TypeScript global-script collisions in `scripts/_diag.ts`; this is unrelated to the importer but prevents a READY release claim.
- The old catalog is recoverable under the local timestamped archive; archive paths are intentionally ignored by Git.

## Decision

Keep the new catalog available to the web for internal prototype review. Do not publish commercially or mark records `approved` until media rights, Vietnamese review and the existing build failure are resolved.

