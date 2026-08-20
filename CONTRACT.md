# CONTRACT: GymAI Coach

## Vibecode Kit v6.1

| Field | Value |
|-------|-------|
| Project | GymAI Coach |
| Date | 2026-08-18 |
| Phase | Plan-only (no code executed yet) |
| Human decision-maker | Human (Khách hàng) |

---

## DELIVERABLES

### Artifacts Produced (Plan-only Phase)

| # | Artifact | File | Purpose |
|---|---------|------|---------|
| 1 | RRI Report | `RRI_REPORT.md` | Requirements catalog (70+ REQ-IDs), 6 OQ decisions, decisions log |
| 2 | Blueprint | `BLUEPRINT.md` | Architecture, design system, database schema, API endpoints, AI pipeline, security |
| 3 | Task Graph | `TASK_GRAPH.md` | 30 TIPs across 3 phases with deps, specs, acceptance criteria |
| 4 | Decisions Log | `DECISIONS_LOG.md` | Full audit trail of every architectural decision |
| 5 | Contract | `THIS FILE` | Deliverables summary + not-included + confirmation |

**Total artifacts:** 5 files in `d:\GymAI-Coach/`

---

## TECHNICAL STACK

| Layer | Choice |
|-------|--------|
| Frontend | Next.js (App Router) + TypeScript + React |
| UI | Tailwind CSS + shadcn/ui + Lucide Icons |
| Charts | Recharts |
| Backend | Next.js Route Handlers + Server Actions |
| Hosting | Cloudflare Workers via OpenNext adapter |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Storage | Supabase Storage |
| AI text | Gemini 3.5 Flash-Lite (Google AI Studio) |
| AI image (seed, MVP) | Web search URL via Gemini Search grounding (Unsplash/Wikimedia CC0) |
| AI image (Phase 2) | FLUX 1.1 [pro] on fal.ai ($0.04/megapixel) |
| AI video | Veo 3.1 (Lite) on Byesu ($0.01875/sec) |
| AI multimodal (MVP) | Gemini 3.5 Flash-Lite photo equipment detection (~$0.00014/image) |
| Client state | Zustand |
| Forms | react-hook-form + zod |

---

## DELIVERABLE BREAKDOWN (in BUILD phase)

### Phase 1 — MVP (18 TIPs — Revision 2)

| TIP | Deliverable | REQ-IDs |
|-----|-------------|----------|
| TIP-001 | Project scaffold: Next.js + Cloudflare + Supabase + shadcn/ui + all configs | — |
| TIP-002 | Design system foundation: 11 industrial components + shadcn overrides + CSS tokens | — |
| TIP-003 | Database: 24 tables + 8 migrations + RLS policies + seed data | REQ-050..068 |
| TIP-004 | Auth: email/password + Google OAuth + middleware + profile creation | REQ-001..003 |
| TIP-005 | Profile + Onboarding (4-step wizard) + Body Weight tracking | REQ-010..017, REQ-020..023 |
| TIP-006 | Equipment catalog + Gym management (CRUD + equipment selector) | REQ-050..065 |
| **TIP-006A (NEW)** | **Photo Equipment Detection: camera/upload → Gemini multimodal → detect equipment → confirm** | **REQ-065b** |
| TIP-007 | Exercise library data: 150+ exercises, schema, text seed | REQ-030..040 |
| **TIP-007A (NEW)** | **Web Image Seed for Exercises: Gemini Search grounding → CC0 URLs** | **REQ-032b** |
| **TIP-021A (NEW)** | **Exercise Management UI: library browse + filter + detail (prioritized Phase 1)** | **REQ-031, REQ-033** |
| TIP-008 | Program system: 6 templates + custom builder + weekly schedule | REQ-070..076 |
| TIP-009 | AI Layer 1: Constraint Engine + Gemini + Context Builder + workout generation UI | REQ-090..095 |
| TIP-010 | AI Layer 2: History context + RIR-based suggestions + trend analysis | REQ-100..103 |
| TIP-011 | Workout Logger: mobile-first UI, RIR selector, rest timer, set logging | REQ-140..150 |
| TIP-012 | Workout completion + history + PR detection | REQ-160..163 |
| TIP-013 | Progress page: strength charts, volume charts, body weight, PRs | REQ-170..175 |
| TIP-014 | Dashboard: hero + modules + sidebar + mobile nav | REQ-160..165 |
| TIP-015 | AI Layer 3: Coach recommendations (progressive overload, deload) | REQ-110..119 |
| TIP-016 | VERIFY Phase 1: QA protocol tier 1+2 + security check | — |

### Phase 2 — Advanced AI + Admin (7 TIPs)

| TIP | Deliverable | REQ-IDs |
|-----|-------------|----------|
| TIP-017 | AI Coach Chat: context-aware Q&A with streaming | REQ-114 |
| TIP-018 | Plateau detection + PR analysis + deload advisor | REQ-110..113 |
| TIP-019 | Weekly AI report auto-generated | REQ-113 |
| TIP-020 | Admin exercise CRUD + review queue | REQ-036 |
| TIP-021 | AI generate exercise content (text via Gemini) | REQ-130 |
| TIP-022 | AI generate exercise image (FLUX 1.1 on fal.ai) | REQ-131 |
| TIP-023 | VERIFY Phase 2 | — |

### Phase 3 — Growth Features (7 TIPs)

| TIP | Deliverable | REQ-IDs |
|-----|-------------|----------|
| TIP-024 | AI video generation (Veo 3.1 on Byesu) + storage pipeline | REQ-132 |
| TIP-025 | Exercise preference learning from swap patterns | REQ-210 |
| TIP-026 | Advanced volume management + weekly sets advisor | REQ-211 |
| TIP-027 | Multi-region CDN + performance optimization | REQ-209 |
| TIP-028 | PWA + offline logger queue (IndexedDB + sync) | REQ-207 |
| TIP-029 | Subscription tiers + Stripe payments + tier management | REQ-204..205 |
| TIP-030 | VERIFY Phase 3 + X-Ray Handover package | — |

---

## TASK GRAPH SUMMARY

- **Total TIPs:** 32 (30 original + 2 added in Revision 2)
- **Phase 1 (MVP):** 16 TIPs
- **Phase 2:** 7 TIPs
- **Phase 3:** 7 TIPs
- **Estimated Cursor time:** ~60–80 hours
- **Dependency graph:** Defined in `TASK_GRAPH.md`

---

## NOT INCLUDED

The following are explicitly excluded from this contract:

| Item | Reason | Phase |
|------|--------|-------|
| FastAPI / Python backend | Spec §49: monolith Next.js at MVP | — |
| Multi-user social features (friends, follow, share) | OQ-3: single-tenant MVP | Phase 3 |
| Trainer account + coach dashboard | OQ-3: single-tenant MVP | Phase 3 |
| Voice AI (Voice Live) | Spec §59: deferred to Phase 3 | Phase 3 |
| PWA + offline support | OQ-5: no offline MVP | Phase 3 |
| Rate limiting on AI requests | OQ-4: deferred, log infrastructure only | Phase 3 |
| i18n (multiple languages) | OQ-2: VI-first hard-code MVP | Phase 3 |
| Storage retention policy | OQ-6: keep vô hạn | — |
| Medical/injury database beyond 3 checkboxes | OQ-1: 3 optional boolean flags only | — |
| Real-time collaboration | Out of scope | — |
| WebSocket connections | spec §59 deferred | Phase 3 |
| Custom model training | Not in spec | — |
| Physical hardware integration | Out of scope | — |

---

## OPEN ITEMS RESOLVED (Human Approved)

| OQ | Decision | Source |
|----|----------|--------|
| OQ-1 | Profile injury flags: 3 optional booleans (shoulder/back/knee) | Human (2026-08-18) |
| OQ-2 | Localization: VI-first hard-code, `next-intl` deferred | Human (2026-08-18) |
| OQ-3 | Multi-user: single-tenant MVP, no social features | Human (2026-08-18) |
| OQ-4 | AI rate limit: no limit MVP, log to `ai_interactions` table | Human (2026-08-18) |
| OQ-5 | Offline: no offline support MVP | Human (2026-08-18) |
| OQ-6 | Storage: keep vô hạn, manual cleanup only | Human (2026-08-18) |

---

## AI STACK REVISION (Round 1, 2026-08-18)

| Task | Old Choice | New Choice | Reason |
|------|-----------|-----------|--------|
| Image generation (Phase 2) | gemini-3.1-flash-lite-image (Google) | FLUX 1.1 [pro] on fal.ai ($0.04/MP) | Google API not free/available |
| Video generation (Phase 3) | Veo family (Google) | Veo 3.1 (Lite) on Byesu ($0.01875/sec) | Google API not free/available |
| Text AI | gemini-3.5-flash-lite | unchanged | Still free/available |

## AI STACK REVISION 2 (2026-08-18 19:38)

| Task | Implementation | Cost |
|------|----------------|------|
| Seed exercise images (MVP) | Web search via Gemini 3.5 Flash-Lite + Google Search grounding (Unsplash/Wikimedia CC0) | ~$0 (5000 free/month) |
| Photo equipment detection (MVP, NEW feature) | Gemini 3.5 Flash-Lite multimodal endpoint | ~$0.00014/image |
| Image generation (Phase 2) | FLUX 1.1 [pro] on fal.ai | $0.04/MP |
| Video generation (Phase 3) | Veo 3.1 (Lite) on Byesu | $0.01875/sec |
| Text/chat/AI workflow | Gemini 3.5 Flash-Lite | free tier |

**Estimated AI cost (Phase 3):** ~$35/month (500 FLUX images + 100 Veo videos) + ~$0.28/month (equipment photo detection) + ~$0 (Gemini Search grounding seed).

---

## CONFIRM

This CONTRACT summarizes what will be built in the BUILD phase (Phase 1 + Phase 2 + Phase 3), what is excluded, and the technical stack.

By replying **CONFIRM**, the Human (Khách hàng) acknowledges:

1. All 5 artifacts are reviewed and acceptable
2. The technical stack is approved
3. The scope (32 TIPs across 3 phases, includes Revision 2 additions) is accepted
4. The not-included list is acknowledged
5. The AI stack revision (FLUX + Byesu + Search grounding + multimodal) is approved
6. The 6 OQ decisions are final
7. Revision 2 changes (build order + photo equipment feature + web image seed) are approved
8. BUILD phase may begin on request

After CONFIRM, the plan-only phase is complete. The Human may:
- **(a)** Request revisions to any artifact before BUILD
- **(b)** Begin BUILD phase immediately — Cursor will execute TIPs in dependency order
- **(c)** Stop here — artifacts are preserved for future development

---

**Reply `CONFIRM` (Round 2) to complete the Revision 2 plan-only phase.**

**Revision 2 confirm checklist:**
- [x] Photo Equipment Detection feature added (TIP-006A) — Gemini multimodal, ~$0.00014/image
- [x] Build order reordered: Exercise Library + UI before Gym + AI pipeline
- [x] Web Image Seed via Gemini Search grounding (TIP-007A) — CC0 URLs, no upload
- [x] 3 new TIPs in Phase 1 (16 → 18 TIPs)
- [x] Total TIPs: 30 → 32
- [x] All decisions logged (D-025..D-028)
