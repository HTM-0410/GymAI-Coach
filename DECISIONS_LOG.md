# DECISIONS LOG: GymAI Coach

## Vibecode Kit v6.1

| Field | Value |
|-------|-------|
| Project | GymAI Coach |
| Date | 2026-08-18 |
| Scope | All architectural and design decisions made during plan-only phase |

---

## HOW TO READ THIS LOG

Each decision entry follows this format:

| Field | Description |
|-------|-------------|
| ID | Sequential number + short slug |
| Date | When decision was made |
| Phase | RRI / Blueprint / TaskGraph / Human OQ / Revision |
| Decision | What was decided |
| Options Considered | What alternatives were evaluated |
| Chosen | What was selected |
| Rationale | Why this choice was made |
| Reversal Risk | How likely this needs to change later |
| References | Spec section, research source, or conversation |

Decisions are **binding** once approved in the Blueprint. Any future change requires a new decision entry and explicit Human approval.

---

## DECISIONS

### D-001: Skip full RRI 40-60 questions

| Field | Value |
|-------|-------|
| ID | D-001 |
| Date | 2026-08-18 |
| Phase | RRI |
| Decision | Skip full RRI and use abbreviated RRI with 6 Open Questions |
| Options Considered | Full RRI (40-60 questions) vs Abbreviated RRI (spec-first, OQ-only) |
| Chosen | Abbreviated RRI |
| Rationale | `spec.md` (62 sections) + `UI implementation spec.md` (82 sections) already contain detailed requirements for most topics. RRI only needed to verify 6 ambiguous areas not covered by spec. |
| Reversal Risk | Low ? spec is comprehensive |
| References | spec.md �1?62, UI implementation spec.md �1?82 |

---

### D-002: Cloudflare Workers hosting via OpenNext adapter

| Field | Value |
|-------|-------|
| ID | D-002 |
| Date | 2026-08-18 |
| Phase | Blueprint |
| Decision | Deploy Next.js to Cloudflare Workers via `@opennextjs/cloudflare` adapter |
| Options Considered | Vercel / Cloudflare Workers via OpenNext / Self-host on VPS |
| Chosen | Cloudflare Workers |
| Rationale | spec �50 explicitly states Cloudflare Workers. OpenNext adapter provides full Next.js App Router support (Route Handlers, Server Components, SSR, Server Actions, response streaming). No reason to override spec. |
| Reversal Risk | Low ? specified in spec |
| References | spec �50, OpenNext Cloudflare docs |

---

### D-003: Single monolith backend (Next.js Route Handlers + Server Actions)

| Field | Value |
|-------|-------|
| ID | D-003 |
| Date | 2026-08-18 |
| Phase | Blueprint |
| Decision | No separate FastAPI/Python backend ? use Next.js Route Handlers + Server Actions for all backend logic |
| Options Considered | Separate FastAPI backend (spec �49 mentions FastAPI but deprecates for MVP) vs Monolith Next.js |
| Chosen | Monolith Next.js |
| Rationale | spec �49 explicitly: "Kh�ng t�ch FastAPI ? MVP." FastAPI adds infrastructure complexity (separate service, deployment pipeline) without MVP benefit. AI calls (Gemini, fal.ai, Byesu) are all HTTP-based ? no performance reason for Python. |
| Reversal Risk | Medium ? if AI workload becomes very heavy, FastAPI separation could be revisited |
| References | spec �49 |

---

### D-004: Supabase as single-vendor backend (Postgres + Auth + Storage)

| Field | Value |
|-------|-------|
| ID | D-004 |
| Date | 2026-08-18 |
| Phase | Blueprint |
| Decision | Use Supabase for database, auth, and storage ? single vendor |
| Options Considered | Supabase / Firebase + separate services / AWS (RDS + Cognito + S3) / Neon + Clerk + S3 |
| Chosen | Supabase |
| Rationale | spec �51?53 specify Supabase. Single vendor reduces integration overhead. Supabase Auth integrates natively with PostgreSQL RLS. Supabase Storage handles both avatars and exercise media. Cost-effective for MVP scale. |
| Reversal Risk | Low ? specified in spec |
| References | spec �51, �52, �53 |

---

### D-005: Gemini 3.5 Flash-Lite for all text AI tasks

| Field | Value |
|-------|-------|
| ID | D-005 |
| Date | 2026-08-18 |
| Phase | Blueprint |
| Decision | Use `gemini-3.5-flash-lite` for workout generation, recommendations, coach chat, content generation |
| Options Considered | Gemini Pro / Gemini Flash-Lite / Claude 3.5 Haiku / GPT-4o-mini |
| Chosen | Gemini 3.5 Flash-Lite |
| Rationale | spec �54 specifies this model. Structured JSON output + context window adequate for workout generation. Cost-effective (free tier available). Single vendor for text AI simplifies SDK. |
| Reversal Risk | Low ? specified in spec |
| References | spec �54 |

---

### D-006: 3-layer AI architecture (Constraint Engine ? Gemini ? Validation ? Save)

| Field | Value |
|-------|-------|
| ID | D-006 |
| Date | 2026-08-18 |
| Phase | Blueprint |
| Decision | Pre-filter candidate exercises with rule-based Constraint Engine BEFORE calling Gemini; Gemini only generates structured plan from filtered candidates |
| Options Considered | Pure LLM generation (no constraints) / 3-layer with Constraint Engine / Hybrid with post-filtering |
| Chosen | 3-layer with Constraint Engine |
| Rationale | spec �19 explicitly requires Constraint Engine. Pre-filtering ensures AI never suggests exercises unavailable at user's gym or exceeding difficulty. Reduces Gemini token usage (smaller candidate list). Rule Engine produces deterministic progressive overload suggestions independent of LLM. |
| Reversal Risk | Low ? specified in spec |
| References | spec �19, �20, �21, �22 |

---

### D-007: RLS mandatory on all tables (defense in depth)

| Field | Value |
|-------|-------|
| ID | D-007 |
| Date | 2026-08-18 |
| Phase | Blueprint |
| Decision | Enable Row Level Security on every table; every query goes through RLS check |
| Options Considered | App-level filtering only / RLS mandatory / No access control |
| Chosen | RLS mandatory |
| Rationale | spec �56 explicitly requires RLS. Even if app-level checks exist, RLS is defense in depth ? prevents data leakage if app-level logic has bugs. Supabase enforces RLS at database level. |
| Reversal Risk | Low ? security requirement |
| References | spec �56 |

---

### D-008: Gemini API key only on server, never exposed to browser

| Field | Value |
|-------|-------|
| ID | D-008 |
| Date | 2026-08-18 |
| Phase | Blueprint |
| Decision | Gemini API key stored as Cloudflare Workers secret binding; accessed only in Route Handlers; never imported in client bundle |
| Options Considered | Client-side with key (security risk) / Server-side proxy (chosen) / Third-party proxy |
| Chosen | Server-side proxy |
| Rationale | spec �56 explicitly prohibits browser exposure. All AI calls happen in Server Actions or Route Handlers. Cloudflare secret bindings provide secure access without env var leakage to client. |
| Reversal Risk | Low ? security requirement |
| References | spec �56 |

---

### D-009: Plan-only first, then BUILD

| Field | Value |
|-------|-------|
| ID | D-009 |
| Date | 2026-08-18 |
| Phase | Process |
| Decision | Execute Vibecode Kit workflow in plan-only mode first; produce BLUEPRINT + TASK_GRAPH + CONTRACT before any code |
| Options Considered | Jump directly to code / Plan-only first, then BUILD |
| Chosen | Plan-only first |
| Rationale | Human explicitly selected "Blueprint_only" mode. This ensures architecture is locked before implementation starts. |
| Reversal Risk | N/A ? process decision |
| References | Human instruction |

---

### D-010: Scope = Full spec (MVP + Phase 2 + Phase 3)

| Field | Value |
|-------|-------|
| ID | D-010 |
| Date | 2026-08-18 |
| Phase | Process |
| Decision | Cover all 3 phases in artifacts, not just MVP |
| Options Considered | MVP only / Full spec |
| Chosen | Full spec |
| Rationale | Human selected "Full spec" scope. Allows complete audit trail and dependency planning across all phases. |
| Reversal Risk | N/A ? process decision |
| References | Human instruction |

---

### D-011: VI-first hard-code (no i18n framework in MVP)

| Field | Value |
|-------|-------|
| ID | D-011 |
| Date | 2026-08-18 |
| Phase | Human OQ-2 |
| Decision | All UI strings hard-coded in Vietnamese for MVP; database stores `name` (EN) + `name_vi` (VI) for exercises; i18n deferred to Phase 3 |
| Options Considered | VI-first with `next-intl` / EN-first / Song ng? (bilingual) |
| Chosen | VI-first hard-code |
| Rationale | Human answered OQ-2: "VI-first hard-code". UI spec examples are all in Vietnamese. `next-intl` adds complexity unnecessary for single-language MVP. Phase 3 can add proper i18n when needed. |
| Reversal Risk | Medium ? if English market needed, i18n adds work |
| References | OQ-2 Human answer 2026-08-18, UI spec �73 |

---

### D-012: Single-tenant MVP (no social/multi-user features Phase 1)

| Field | Value |
|-------|-------|
| ID | D-012 |
| Date | 2026-08-18 |
| Phase | Human OQ-3 |
| Decision | MVP is single-tenant; no friends, trainer invite, or social features; RLS enforces `user_id` ownership; Phase 3 adds trainer account |
| Options Considered | Multi-tenant from day 1 / Single-tenant MVP (chosen) |
| Chosen | Single-tenant MVP |
| Rationale | Human answered OQ-3: "Single-tenant MVP". Multi-tenancy adds significant complexity (tenant scoping, cross-user queries, role-based access) without MVP benefit. RLS already supports multi-user isolation for future expansion. |
| Reversal Risk | Medium ? adding multi-tenancy later requires schema migration |
| References | OQ-3 Human answer 2026-08-18, spec �1 |

---

### D-013: No AI rate limit enforcement in MVP (log infrastructure only)

| Field | Value |
|-------|-------|
| ID | D-013 |
| Date | 2026-08-18 |
| Phase | Human OQ-4 |
| Decision | MVP does not enforce rate limits on AI requests; every call logged to `ai_interactions` table; middleware prepared to wire limit when enabled |
| Options Considered | Strict rate limit (X/day) / No limit MVP (chosen) / Soft warning only |
| Chosen | No limit MVP |
| Rationale | Human answered OQ-4: "Hi?n t?i ch?a gi?i h?n, s? gi?i h?n trong t??ng lai." `ai_interactions` table captures every request (tokens, duration, status) for future billing/tier systems. Not blocking MVP with premature optimization. |
| Reversal Risk | Low ? infrastructure in place, limit easy to wire later |
| References | OQ-4 Human answer 2026-08-18, spec �36 (ai_interactions table) |

---

### D-014: No offline support MVP (online-only)

| Field | Value |
|-------|-------|
| ID | D-014 |
| Date | 2026-08-18 |
| Phase | Human OQ-5 |
| Decision | Mobile workout logger assumes online connectivity; no IndexedDB queue; Phase 3 adds PWA + offline queue |
| Options Considered | Offline-first with sync / Online-only MVP (chosen) |
| Chosen | Online-only MVP |
| Rationale | Human answered OQ-5: "Kh�ng h? tr? offline MVP". Offline adds significant complexity (conflict resolution, sync queue, IndexedDB management). Most gyms have connectivity. Phase 3 PWA feature will address this properly. |
| Reversal Risk | Low ? offline deferred, spec acknowledges this |
| References | OQ-5 Human answer 2026-08-18, spec �59 |

---

### D-015: Keep Supabase Storage indefinitely (no auto-cleanup)

| Field | Value |
|-------|-------|
| ID | D-015 |
| Date | 2026-08-18 |
| Phase | Human OQ-6 |
| Decision | No automated storage retention policy; manual cleanup by admin only; draft/archived exercises keep their media |
| Options Considered | Auto-delete after X days / Keep indefinitely (chosen) / Tiered retention |
| Chosen | Keep indefinitely |
| Rationale | Human answered OQ-6: "Gi? v� h?n". Auto-cleanup adds cron jobs and risk of data loss. Storage cost manageable for MVP scale. Manual admin cleanup sufficient. |
| Reversal Risk | Low ? easy to add cleanup later |
| References | OQ-6 Human answer 2026-08-18 |

---

### D-016: Add optional injury flags to profile schema

| Field | Value |
|-------|-------|
| ID | D-016 |
| Date | 2026-08-18 |
| Phase | Human OQ-1 |
| Decision | Add 3 optional boolean fields to `profiles` table: `has_shoulder_injury`, `has_back_injury`, `has_knee_injury`; used by AI Context Builder to filter exercise alternatives |
| Options Considered | Full medical conditions database / Optional 3-checkbox (chosen) / No injury tracking |
| Chosen | Optional 3-checkbox |
| Rationale | Human answered OQ-1: "Th�m optional checkbox vai/l?ng/??u g?i". Sufficient for MVP ? AI uses `exercise_alternatives` table to suggest substitutions when injury detected. Full medical database is overkill. Checkboxes are optional and do not block onboarding. |
| Reversal Risk | Low ? easy to extend later |
| References | OQ-1 Human answer 2026-08-18, spec �5 |

---

### D-017: FLUX 1.1 [pro] on fal.ai for image generation

| Field | Value |
|-------|-------|
| ID | D-017 |
| Date | 2026-08-18 |
| Phase | Revision (Human REVISE) |
| Decision | Replace Google image API with FLUX 1.1 [pro] on fal.ai at $0.04/megapixel |
| Options Considered | DeepSeek Janus-Pro (quality/price not mature enough) / FLUX 1.1 [pro] (chosen) / DALL-E 3 (expensive) / Stable Diffusion (self-host complex) |
| Chosen | FLUX 1.1 [pro] on fal.ai |
| Rationale | Human REVISE: Google API not free/available. FLUX 1.1 [pro] is production-proven, strong text rendering (important for exercise labels), strong photorealism, $0.04/MP is cost-effective. fal.ai provides managed API with SDK. DeepSeek Janus-Pro quality still maturing for fitness demo use case. |
| Reversal Risk | Medium ? if FLUX pricing changes or quality issues emerge |
| References | Research 2026-08-18, fal.ai pricing page |

---

### D-018: Veo 3.1 (Lite) on Byesu for video generation

| Field | Value |
|-------|-------|
| ID | D-018 |
| Date | 2026-08-18 |
| Phase | Revision (Human REVISE) |
| Decision | Replace Google Veo API with Veo 3.1 (Lite) on Byesu at $0.01875/sec |
| Options Considered | Luma Ray 3.2 (expensive) / Kling 3.0 (good but pricier) / Seedance 2.0 Fast (cheaper but no audio) / Veo 3.1 on Byesu (chosen) |
| Chosen | Veo 3.1 (Lite) on Byesu |
| Rationale | Human REVISE: Google API not free/available. Byesu is official Google channel (not reverse-engineered) at 22� lower price than Vertex AI ($0.01875 vs $0.40/sec). Veo 3.1 has best motion fidelity for exercise form demo. Lite tier sufficient for 8-second clips. |
| Reversal Risk | Medium ? if Byesu pricing or availability changes |
| References | Research 2026-08-18, Byesu docs, genrates.com comparison |

---

### D-019: fal.ai + Byesu as separate AI service vendors

| Field | Value |
|-------|-------|
| ID | D-019 |
| Date | 2026-08-18 |
| Phase | Revision |
| Decision | Accept multiple AI service vendors (fal.ai for images, Byesu for video, Google for text) instead of consolidating on one vendor |
| Options Considered | Single vendor for all AI (not available) / Multiple vendors as needed (chosen) |
| Chosen | Multiple vendors |
| Rationale | No single vendor offers best-in-class for all three tasks (text/chat, image, video) at competitive prices. fal.ai + Byesu + Google AI Studio is the practical optimal combination. Each has OpenAI-compatible SDK or REST API. Total estimated cost ~$35/month for Phase 3. |
| Reversal Risk | Low ? vendors are established with good SDK support |
| References | Research 2026-08-18 |

---

### D-020: No Tailwind UI library pre-made (shadcn/ui customized)

| Field | Value |
|-------|-------|
| ID | D-020 |
| Date | 2026-08-18 |
| Phase | Blueprint |
| Decision | Use shadcn/ui as component foundation but fully override styles to match Industrial Skeuomorphism design system |
| Options Considered | shadcn/ui customized / Chakra UI / MUI / Pure custom |
| Chosen | shadcn/ui customized |
| Rationale | shadcn/ui provides accessible, well-structured primitives. Design system tokens (CSS variables, shadows, radii) are applied via Tailwind config overrides. Avoids building Input/Button/Card from scratch. Industrial components layered on top. |
| Reversal Risk | Low ? well-established approach |
| References | UI spec �21 (IndustrialCard), �23 (Button System), shadcn/ui docs |

---

### D-021: Recharts for all charts

| Field | Value |
|-------|-------|
| ID | D-021 |
| Date | 2026-08-18 |
| Phase | Blueprint |
| Decision | Use Recharts for strength charts, volume charts, body weight charts |
| Options Considered | Recharts / Tremor / Chart.js / Visx / Plain SVG |
| Chosen | Recharts |
| Rationale | spec �49 specifies Recharts. React-native-friendly, good TypeScript support, customizable enough for Industrial dark-panel style. Chart containers styled via custom components. |
| Reversal Risk | Low ? specified in spec |
| References | spec �49 |

---

### D-022: AI NEVER auto-mutates persistent state

| Field | Value |
|-------|-------|
| ID | D-022 |
| Date | 2026-08-18 |
| Phase | Blueprint |
| Decision | AI recommendations always require user confirmation; workout plans always shown as preview before save; AI never applies changes without explicit user action |
| Options Considered | AI auto-applies low-confidence suggestions / Human approval required for all (chosen) |
| Chosen | Human approval required for all |
| Rationale | spec �23 explicitly: "AI Suggest ? User Review ? Accept/Reject. AI never mutates persistent state without user confirmation." This is a core UX principle ? user maintains control over their training plan. |
| Reversal Risk | None ? core UX principle |
| References | spec �23 |

---

### D-023: 1RM = Epley formula

| Field | Value |
|-------|-------|
| ID | D-023 |
| Date | 2026-08-18 |
| Phase | Blueprint |
| Decision | Calculate estimated 1RM using Epley formula: `weight � (1 + reps/30)` |
| Options Considered | Epley / Brzycki / Lombardi / Lander |
| Chosen | Epley |
| Rationale | Industry standard for rep ranges 1-10. Simple, widely understood. Brzycki slightly more accurate at 1RM but less accurate at higher reps. Epley works across all rep ranges we track. |
| Reversal Risk | Low ? formula well-established |
| References | Sports science literature, spec �34 |

---

### D-024: Mobile-first workout logger design

| Field | Value |
|-------|-------|
| ID | D-024 |
| Date | 2026-08-18 |
| Phase | Blueprint |
| Decision | Workout logger is the primary mobile UI; designed for one-handed operation, large touch targets, minimal input fields, auto-advance |
| Options Considered | Desktop-first with mobile adaptation / Mobile-first logger (chosen) |
| Chosen | Mobile-first logger |
| Rationale | spec �26 explicitly: "?�y l� m�n h�nh quan tr?ng nh?t tr�n mobile." Users log sets at the gym ? sweaty, one hand, between sets, limited time. Every design decision serves speed and clarity. Desktop gets full analytics; mobile gets fast logging. |
| Reversal Risk | None ? specified in spec |
| References | spec �26, UI spec �26?31 |

---

## DECISION OVERRIDE RULES

1. **Spec First:** If a decision conflicts with spec.md or UI implementation spec.md, the spec wins unless Human explicitly overrides.
2. **Human Wins:** Human can override any decision during plan-only phase via `REVISE:` message.
3. **Audit Trail:** Every decision (including overrides) is logged in this file with rationale.
4. **Reversal Threshold:** Decisions with "Reversal Risk: High" require explicit Human approval before change.
5. **No Silent Changes:** If a dev later changes a decision, they must add a new decision entry explaining why.

---

---

### D-025: Photo Equipment Detection (P0 MVP feature)

| Field | Value |
|-------|-------|
| ID | D-025 |
| Date | 2026-08-18 (Round 2) |
| Phase | Revision 2 (Human REVISE) |
| Decision | Add Photo Equipment Detection feature in Phase 1 MVP: user uploads photo of gym ? Gemini 3.5 Flash-Lite multimodal detects equipment ? user confirms ? save into gym_equipment |
| Options Considered | Train custom YOLO model / Use Gemini 3.5 Flash-Lite multimodal (chosen) / Use GPT-4o vision / Manual-only equipment selection |
| Chosen | Gemini 3.5 Flash-Lite multimodal |
| Rationale | Custom YOLO requires training data, GPU hosting ? overkill for MVP with 30 equipment types. GPT-4o vision $2.50/M input = ~$0.0014/image vs Gemini ~$0.00014/image ? 10� cheaper. Gemini is already in stack, free tier sufficient for MVP launch. Accuracy sufficient for 30 equipment catalog. Manual-only remains available as fallback in same equipment selector UI. |
| Reversal Risk | Medium ? if detection accuracy < 70% in production, may need fine-tuned model or larger LLM |
| References | Roboflow gym equipment datasets (alternative explored), Gemini 3.5 Flash-Lite pricing, TASK_GRAPH �TIP-006A |

---

### D-026: Web Image Seed for Exercises via Gemini Search Grounding

| Field | Value |
|-------|-------|
| ID | D-026 |
| Date | 2026-08-18 (Round 2) |
| Phase | Revision 2 (Human REVISE) |
| Decision | Seed exercise images as URLs from web search (Unsplash/Wikimedia CC0) via Gemini 3.5 Flash-Lite + Google Search grounding; do NOT upload to Supabase Storage in MVP |
| Options Considered | Manual URL pasting (slow, error-prone) / Gemini Search grounding automated (chosen) / FLUX generation (deferred to Phase 2) / Placeholder gray box |
| Chosen | Gemini Search grounding automated |
| Rationale | Manual URL pasting for 150 exercises is tedious and error-prone. Gemini Search grounding returns CC0 URLs automatically with license metadata. 5000 queries/month free tier covers 150-seed + extras. FLUX deferred to Phase 2 ? Human x? l� ?nh ch�nh th?c sau. Placeholder unacceptable ? stakeholders need visual demo. |
| Reversal Risk | Low ? easy to replace URLs with FLUX-generated images later via `source` column |
| References | Gemini Search grounding docs, Unsplash License, TASK_GRAPH �TIP-007A |

---

### D-027: Build Order Reorder (Exercise Library Before AI Pipeline)

| Field | Value |
|-------|-------|
| ID | D-027 |
| Date | 2026-08-18 (Round 2) |
| Phase | Revision 2 (Human REVISE) |
| Decision | Reorder Phase 1 build sequence: Exercise Library + Management UI moved up to TIP-021A (between profile and gym); AI workout generation (TIP-009+) deferred to after exercise catalog is reviewable |
| Options Considered | Original MVP order (gym ? exercise ? AI) / Reorder: exercise first (chosen) |
| Chosen | Reorder: Exercise Management UI early |
| Rationale | Human stakeholder review needs to validate exercise catalog (names, descriptions, image URLs) before AI generates workouts based on it. Building AI first risks rework if exercise data has issues. Phase 1 now produces reviewable artifact (library page) by TIP-021A. |
| Reversal Risk | Low ? pure build order, no schema changes |
| References | TASK_GRAPH �Revision 2 Build Order |

---

### D-028: Gemini Multimodal Endpoint Pattern (Server-side Only)

| Field | Value |
|-------|-------|
| ID | D-028 |
| Date | 2026-08-18 (Round 2) |
| Phase | Revision 2 (derived) |
| Decision | Gemini multimodal endpoint integrated as Route Handler in Cloudflare Worker; image uploaded to Supabase Storage private bucket first, then base64 sent to Gemini |
| Options Considered | Direct browser ? Gemini (security risk) / Server Route Handler via Supabase Storage proxy (chosen) / Browser presigned URL ? Gemini |
| Chosen | Server Route Handler via Supabase Storage proxy |
| Rationale | Consistent with other AI endpoints (D-008: server-only API key). Image upload to private bucket enables audit trail + RLS enforcement + retry logic. Server validates input (size, mime) before expensive LLM call. Gemini API key never exposed. |
| Reversal Risk | Low ? established security pattern |
| References | D-008, TASK_GRAPH �TIP-006A |

---

## DECISION COUNT

| Category | Count |
|----------|-------|
| Architecture | 4 (D-002, D-003, D-004, D-006) |
| AI | 4 (D-005, D-006, D-017, D-018) |
| Security | 2 (D-007, D-008) |
| Process | 2 (D-009, D-010) |
| Human OQ | 5 (D-011, D-012, D-013, D-014, D-015, D-016) |
| Revision | 7 (D-017, D-018, D-019, D-025, D-026, D-027, D-028) |
| UI/Tech | 4 (D-020, D-021, D-022, D-023, D-024) |
| Integration | 3 (D-029, D-030, D-031) |
| Infra Cleanup | 3 (D-032, D-033, D-034) |
| Localization | 1 (D-035) |
| **Subtotal** | **35 decisions** |

## D-032: ESLint setup for Next.js 14 (2026-08-19, TIP-021C)
**Decision:** Add `.eslintrc.json` v?i `extends: "next/core-web-vitals"` ?? c� lint gate.
**Reason:** Repo thi?u ESLint config ? `npm run lint` interactive prompt ? kh�ng verify ???c. TIP-021C follow-up sau verify TIP-021B.
**Impact:** L?n ??u ch?y lint ph�t hi?n 9 pre-existing errors (`react/no-unescaped-entities` ? 3 form files) + 1 warning (`@next/next/no-img-element` ? blob URL). T?t c? fix b?ng inline `eslint-disable-next-line` (an to�n cho unicode apostrophe + blob URL kh�ng th? d�ng `next/image`).
**Reversal Risk:** None ? config chu?n Next.js docs.

## D-033: Seed script type fix (2026-08-19, TIP-021D)
**Decision:** S?a 1 d�ng trong `scripts/seed-exercises-data.ts:553` ? ??i `slug: 'N�ng g�t Smith ??ng'` th�nh `name_vi: 'N�ng g�t Smith ??ng'` (key b? sai do copy-paste).
**Reason:** Build type-check fail v� duplicate key `slug` + missing required `name_vi`.
**Impact:** Build pass. B�i `Smith Machine Standing Calf Raise` gi? c� `name_vi: 'N�ng g�t Smith ??ng'` ? ?�ng ngh?a. C� th? seed DB OK.
**Reversal Risk:** None.

## D-034: Root layout cleanup (2026-08-19, TIP-021E inline)
**Decision:** B? duplicate import `Metadata, Viewport` ? `src/app/layout.tsx` line 2 + b? `#region agent log` instrumentation fetch c�n s�t.
**Reason:** Pre-existing duplicate import + debug instrumentation break `next build` type-check. Kh�ng thu?c scope TIP-021B nh?ng user y�u c?u "FIX NGAY" n�n x? l� inline.
**Impact:** Build pass ho�n to�n. Kh�ng thay ??i runtime behavior.
**Reversal Risk:** None.
**Decision:** Move staging `/exercises-test/*` ? `(app)/exercises/*`; gi? `/exercise-demo` l�m design reference v?i banner `@deprecated`.
**Reason:** TIP-021A y�u c?u route `/exercises` chu?n; staging `/exercises-test` ch? l� intermediate; demo `/exercise-demo` c?n gi? ?? so s�nh visual v?i JSON-driven detail page.
**Impact:** Nav ?� tr? `/exercises` s? b?t ??u resolve; smoke test c?n user onboarded (auth gate trong `(app)/layout.tsx`).

## D-030: Design reference policy (2026-08-18)
**Decision:** Pages trong `src/app/exercise-demo/` kh�ng bao gi? x�a h?n khi c�n component ???c import t? route kh�c. Khi mu?n x�a ph?i extract component ra `src/components/exercise/` tr??c.
**Reason:** Tr�nh m? c�i import (`VideoGuide`, `PerformanceChart` ?ang ???c `exercises/[slug]/page.tsx` import tr?c ti?p).
**Impact:** Maintenance cost: 4 file demo v?n t?n t?i, nh?ng ch? `page.tsx` th�m banner; 3 component file gi? nguy�n.

## D-031: Placeholder image policy (2026-08-18)
**Decision:** T?o `public/exercises/demo/PLACEHOLDER.svg` d�ng chung cho 6/8 b�i ch?a c� ?nh th?t (barbell-row, deadlift, hip-thrust, overhead-press, pull-up, romanian-deadlift).
**Reason:** Phase n�y kh�ng ??ng AI image generation (TIP-007A Phase 2). Tr�nh broken image ?nh h??ng UX verify.
**Impact:** Placeholder s? ???c thay th? b?ng Gemini Search grounding URLs trong TIP-007A. Schema JSON kh�ng c?n ??i ? ch? path `gallery.main` + `gallery.views[].src` thay ??i khi c� URL th?t.

## DECISION COUNT (updated)

| Category | Count |
|----------|-------|
| Architecture | 4 (D-002, D-003, D-004, D-006) |
| AI | 4 (D-005, D-006, D-017, D-018) |
| Security | 2 (D-007, D-008) |
| Process | 2 (D-009, D-010) |
| Human OQ | 5 (D-011, D-012, D-013, D-014, D-015, D-016) |
| Revision | 7 (D-017, D-018, D-019, D-025, D-026, D-027, D-028) |
| UI/Tech | 4 (D-020, D-021, D-022, D-023, D-024) |
| Integration | 3 (D-029, D-030, D-031) |
| Infra Cleanup | 3 (D-032, D-033, D-034) |
| Localization | 1 (D-035) |
| **Subtotal** | **35 decisions** |


## D-035: Localization cleanup (2026-08-19, TIP-021G)
**Decision:** UI content 100% ti?ng Vi?t, kh?ng k?m (English) annotation. Ngo?i l?: t?n b?i hi?n th? 2 d?ng ? Vi?t to + Anh mono nh? (kh?ng ngo?c).
**Reason:** User feedback screenshot sau smoke test TIP-021B cho th?y nhi?u pattern Ti?ng Vi?t (English) ? muscle + meta line. User y?u c?u thu?n Vi?t tr? t?n b?i.
**Impact:** Strip parens kh?i 8 JSON, Vi?t h?a enum trong tags + subtitle_vi, file m?i src/lib/exercises-i18n.ts, card 2 d?ng + meta Vi?t.
**Reversal Risk:** Low.
