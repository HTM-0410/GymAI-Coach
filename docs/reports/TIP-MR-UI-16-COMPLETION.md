# TIP-MR-UI-16 Completion Report

## Status

`DONE`

## Files Changed

- Updated `src/lib/recovery/read-model.ts` with the single cold-start and old-model fallback contract: 100%, ready, non-stale and `readinessSource: 'default'`.
- Updated `src/lib/recovery/group-list-view.ts` so defensive canonical normalization uses the same default-ready contract.
- Updated `src/app/(app)/recovery/recovery-dashboard.tsx` to disclose default readiness and consume API provenance without creating a UI-only score.
- Updated `src/app/(app)/recovery/groups/[group]/recovery-group-detail-page.tsx` to display default versus model provenance explicitly.
- Updated focused API, Overview, List, Detail, recommendation and shared UI tests for the new contract.
- Added this Completion Report.

## Acceptance Results

1. PASS: `buildRecoverySummary([], at)` returns exactly 10 canonical groups. Every group is 100%, `ready`, non-stale and `readinessSource: 'default'`.
2. PASS: Default groups expose 60%, 80% and 90% milestones at the generated timestamp, so every milestone formats as already reached.
3. PASS: Default explanation identifies the score as a default and states that it updates after a completed workout is processed. It does not contain `Chưa đủ dữ liệu`.
4. PASS: A current recovery state immediately replaces the default with the calculated score and `readinessSource: 'model'`.
5. PASS: An old-model-only group returns the disclosed 100% default baseline, non-stale and ready.
6. PASS: Overview receives 10 default scores from the API read model, renders all body regions green and selects all 10 as fresh.
7. PASS: List normalization and list rows receive 100%, ready default groups, so cold-start muscle rows never render `--`.
8. PASS: Detail receives 100%, ready, reached milestones and the default explanation from the same API read model. It also displays the provenance label.
9. PASS: Workout handoff accepts default-ready groups through the existing shared 80% selector. Pain and contraindication still force the higher-priority deload safety result.
10. PASS: Focused Muscle Readiness tests, TypeScript and production build pass.
11. PASS: No em dash exists in changed source, tests or this report.
12. PASS: Overview renders exactly four user-visible legend states. Backward-compatible `unknown` remains internal and is not rendered in the Overview legend.

## Contract Evidence

- Canonical cold-start groups: 10/10.
- Cold-start readiness: 100% for 10/10 groups.
- Cold-start status: `ready` for 10/10 groups.
- Cold-start provenance: `default` for 10/10 groups.
- Cold-start stale groups: 0.
- Overview visible legend states: 4/4, with 0 unknown entries.
- Default milestones at generated timestamp: 3/3 per group.
- Current-state provenance: `model`.
- Database fields or migrations added: 0.
- UI-only score fallbacks added: 0.

## Test Results

- Focused Muscle Readiness regression: 85/85 passed, 0 failed.
- TypeScript `npm.cmd exec -- tsc --noEmit`: PASS with 0 errors.
- Production `npm.cmd run build`: PASS with 52/52 static pages generated.
- Build route manifest includes `/recovery`, `/recovery/groups`, `/recovery/groups/[group]`, `/api/recovery` and `/api/recovery/[group]`.
- Em dash scan across changed source, tests and report: PASS with 0 matches.

## Safety And Provenance

- `readinessSource` is an additive API field with values `default` and `model`; no confidence inference is used.
- Default confidence remains `unknown` because 100% is an initial planning assumption, not a measured recovery result.
- The default explanation and detail provenance make that assumption visible to the user.
- Existing pain and contraindication logic was not weakened. Its explicit override test remains passing.

## Issues Discovered

- RETURNED AND FIXED: The first Builder pass retained an `unknown` entry in the always-visible Overview legend. Although the read model no longer emitted that state for cold start, the legend still exposed an obsolete fifth state.
- Remediation: Overview now maps an explicit four-item `VISIBLE_RECOVERY_STATUSES` list containing only recovering, light-only, trainable and ready. `unknown` remains internal for backward-compatible parsing only.
- Regression evidence: Overview and shared UI tests reject `Chưa đủ dữ liệu`, reject the replacement `Không xác định`, reject `Object.entries(STATUS_COPY)` and require the four-column legend contract.
- Visible `Chưa đủ dữ liệu` matches across Overview, List and Detail components: 0.

## Deviations From Spec

- None.

## Suggestions For Chủ thầu

- Independently verify the API payload for an account with no recovery state and an account containing only an old model row.
- In authenticated browser acceptance, confirm all 10 overview regions and list rows are green at 100%, then complete a workout and verify affected groups switch to `readinessSource: model`.
- Confirm the default provenance sentence remains visible in Detail while the general pain and contraindication safety note remains unchanged.
