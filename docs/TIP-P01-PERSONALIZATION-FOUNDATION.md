# TIP-P01: Personalization Foundation

## HEADER

- TIP-ID: TIP-P01
- Project: GymAI Coach
- Module: Database, privacy, personalization context
- Depends on: approved Personalization/InBody Blueprint
- Priority: P0

## CONTEXT

- Working directory: `D:\GymAI-Coach`
- Key references: initial Supabase schema/RLS migrations, `src/types/database.ts`, `src/lib/ai/context.ts`, existing server/client Supabase helpers.
- Additive migrations only. Preserve current profile/workout contracts and user-owned changes.

## TASK

Implement the minimum production-shaped persistence and server-side context foundation for adaptive personalization and reviewed InBody measurements.

## SPECIFICATIONS

1. Add an additive migration with owner-only RLS for:
   - structured training constraints with region, side, severity, triggers/excluded exercise slugs, status and optional expiry;
   - exercise preferences with explicit/inferred source and confidence;
   - readiness check-ins with short-lived/session-scoped values;
   - body-composition measurements and optional segment rows, extraction/review/comparability metadata and per-surface allowed uses;
   - data consent records with purpose/provider/policy version/grant/withdraw timestamps;
   - compact AI decision context/provenance without raw image/PII.
2. Do not create a public image bucket or persist raw image bytes/path in P0.
3. Update local database TypeScript types.
4. Add a typed, versioned server-side `PersonalizationContextV1` builder. It must separate declared, hard constraints, preferences, readiness, performance/body composition and consented allowed uses.
5. Add pure helpers for expiry, consent/use filtering, trend comparability and minimal AI context projection.
6. Add focused tests using Node's test runner; no external DB/network needed.

## ACCEPTANCE CRITERIA

- Given two different users, RLS policies only allow owners to CRUD their rows.
- Given expired constraints/readiness, context excludes them.
- Given withdrawn/missing purpose consent, body composition is excluded from that AI surface.
- Given one confirmed measurement, context exposes baseline but no trend; with two comparable confirmed measurements it exposes a trend.
- Given AI projection, it contains no raw image, email, phone, full birthday or storage path.
- Existing workout phase tests remain passing.

## CONSTRAINTS

- No production Supabase mutation or migration apply.
- No new dependency unless escalated.
- No UI or AI prompt edits in this TIP.
- Follow existing naming and RLS patterns.

## REPORT FORMAT

Create `docs/COMPLETION-TIP-P01-PERSONALIZATION-FOUNDATION.md` per Vibecode Completion Report.

