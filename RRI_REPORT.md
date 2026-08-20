# RRI REPORT: GymAI Coach

| Field | Value |
|-------|-------|
| Project | GymAI Coach |
| Generated | 2026-08-18 |
| Methodology | Vibecode Kit v6.1 — RRI 3.0 Context-Aware |
| Spec source | `spec.md` (62 sections) + `UI implementation spec.md` (82 sections) |
| Scope | Full spec — MVP Phase 1 + Phase 2 + Phase 3 |
| Mode | Context-aware adaptive (auto-answer from spec) |

---

## AUTO-ANSWERED FROM SPEC (no need to re-ask)

These items are already decided in `spec.md` and `UI implementation spec.md`. Chủ thầu does not re-ask.

| Topic | Decision | Source |
|-------|----------|--------|
| Nature of product | Responsive Web + AI Personal Trainer + Mobile-first logger | spec.md §1 |
| Tech stack — Frontend | Next.js + TypeScript + React | spec.md §49 |
| Tech stack — UI | Tailwind CSS + shadcn/ui + Lucide Icons | spec.md §49 |
| Tech stack — Charts | Recharts | spec.md §49 |
| Tech stack — Backend | Next.js Route Handlers + Server Actions (no FastAPI) | spec.md §49 |
| Hosting | Cloudflare Workers via OpenNext adapter | spec.md §50 |
| Database | Supabase PostgreSQL | spec.md §51 |
| Auth | Supabase Auth — Email/Password + Google OAuth | spec.md §52 |
| Storage | Supabase Storage (avatar, exercise images, videos) | spec.md §53 |
| AI text | Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`) | spec.md §54 |
| AI image | gemini-3.1-flash-lite-image | spec.md §54 |
| AI video | Veo family (deferred to Phase 3) | spec.md §54 |
| Security | Supabase Row Level Security mandatory; Gemini API key never exposed to browser | spec.md §56 |
| Design style | Industrial Skeuomorphism × Training Control System | UI spec §2 |
| Chassis color | `#e0e5ec` | UI spec §5 |
| Panel color | `#f0f2f5` | UI spec §5 |
| Accent color | `#ff4757` (safety red, used sparingly) | UI spec §7 |
| Typography — UI | Inter (weights 400/500/600/700/800) | UI spec §9 |
| Typography — Data | JetBrains Mono (technical metrics) | UI spec §9 |
| Elevation levels | 4: Recessed (-1), Chassis (0), Panel (+1), Control (+2) | UI spec §4 |
| Light direction | Top-left 45° (highlight top/left, shadow bottom/right) | UI spec §3 |
| Icon library | lucide-react only | UI spec §14 |
| Mobile nav | Bottom navigation, 5 items, "Tập" is center floating action | UI spec §17 |
| Mobile touch target | min 48px, primary action 56–60px | UI spec §24 |
| Breakpoints | Mobile 375px / Tablet 768px / Desktop 1440px (UI spec §52) | UI spec §52 |
| Core MVP user journey | Đăng ký → Onboarding → Chọn PPL+UL → Tạo gym → Equipment → Generate → Log → Progress | spec.md §60 |
| AI architecture | 3 layers: Planner (L1), Personalized (L2), Coach (L3) | spec.md §20–22 |
| AI control principle | AI Suggest → User Review → Accept/Reject (AI never mutates without confirmation) | spec.md §23 |
| AI recommendation pattern | Rule Engine → Recommendation → Gemini → Explanation | spec.md §24 |
| Database schema | 22 tables defined in spec.md §36–48 | spec.md §36 |
| RLS scope | User A cannot read User B's workouts/gyms/body_weight/AI history | spec.md §56 |
| 5 user personas | End User, Business Analyst, QA/Tester, Developer, Operator — implicit in spec | RRI methodology |

---

## REQUIREMENTS MATRIX

Mapping REQ-IDs to spec sections. Each REQ-ID is traceable to: (a) spec section, (b) persona perspective, (c) implementation target.

### Authentication (P0)

| REQ-ID | Requirement | Source | Priority | Persona |
|--------|-------------|--------|----------|---------|
| REQ-001 | Email + Password signup/login | spec §4, §52, §57 | P0 | End User |
| REQ-002 | Google OAuth login | spec §4, §52, §57 | P0 | End User |
| REQ-003 | Session persistence + secure cookie | spec §56 | P0 | QA/Tester |

### Profile (P0)

| REQ-ID | Requirement | Source | Priority | Persona |
|--------|-------------|--------|----------|---------|
| REQ-010 | Profile: display_name, avatar_url, birthday, height_cm | spec §5, §37 | P0 | End User |
| REQ-011 | Profile: current_weight_kg, unit_system (kg/lb) | spec §5, §6, §37 | P0 | End User |
| REQ-012 | Profile: experience_level (Beginner/Intermediate/Advanced) | spec §5, §37 | P0 | Business |
| REQ-013 | Profile: goal (Tăng cơ / Tăng sức mạnh / Giảm mỡ / Duy trì) | spec §5, §37 | P0 | Business |
| REQ-014 | Profile: preferred_training_days (weekly schedule) | spec §5, §37 | P0 | End User |
| REQ-015 | Profile: preferred_session_duration (45/60/75/90 min) | spec §5, §37 | P0 | End User |
| REQ-016 | Onboarding wizard (multi-step) | spec §57, §60 | P0 | End User |
| REQ-017 | Display name + avatar (Google OAuth profile sync) | spec §5 | P0 | End User |

### Body Weight Tracking (P0)

| REQ-ID | Requirement | Source | Priority | Persona |
|--------|-------------|--------|----------|---------|
| REQ-020 | Daily body_weight_log entry (date, weight, note) | spec §6, §36 | P0 | End User |
| REQ-021 | Body weight dashboard: current, 7-day change, 30-day change | spec §6 | P0 | End User |
| REQ-022 | Body weight chart (Recharts line) | spec §6, UI §46 | P0 | End User |
| REQ-023 | Body weight history view | spec §6 | P1 | End User |

### Exercise Library (P0)

| REQ-ID | Requirement | Source | Priority | Persona |
|--------|-------------|--------|----------|---------|
| REQ-030 | Admin-managed system exercises | spec §9.1, §15, §57 | P0 | Admin |
| REQ-031 | User-created custom exercises | spec §9.2, §57 | P0 | End User |
| REQ-032 | Copy system exercise to personal custom | spec §9.1 | P1 | End User |
| REQ-033 | Search exercises by name (EN + VI) | spec §10, §32 | P0 | End User |
| REQ-034 | Filter by muscle, equipment, difficulty, type | spec §10, UI §32 | P0 | End User |
| REQ-035 | Exercise detail page (name EN/VI, instructions, tips, mistakes, video, image) | spec §11, UI §34–35 | P0 | End User |
| REQ-036 | Exercise status: Draft / Published / Archived | spec §10 | P0 | Admin |
| REQ-037 | Exercise data: primary muscle, secondary muscles, equipment list | spec §10 | P0 | Developer |
| REQ-038 | Exercise type: Compound / Isolation | spec §10 | P0 | Business |
| REQ-039 | Exercise difficulty level | spec §10 | P0 | Business |
| REQ-040 | Exercise alternatives list | spec §10, §48 | P1 | End User |

### Equipment (P0)

| REQ-ID | Requirement | Source | Priority | Persona |
|--------|-------------|--------|----------|---------|
| REQ-050 | Admin seed system equipment (Dumbbell, Barbell, Bench, Cable, Smith, Leg Press, Leg Extension, Leg Curl, Hack Squat, Squat Rack, Pull-up Bar, EZ Bar, Chest Press, Pec Deck, Lat Pulldown, …) | spec §15, §57 | P0 | Admin |
| REQ-051 | Many-to-many: exercise ↔ equipment (exercise_equipment table) | spec §15, §36 | P0 | Developer |
| REQ-052 | Equipment search chip grid | UI §39 | P0 | End User |

### Gym Management (P0)

| REQ-ID | Requirement | Source | Priority | Persona |
|--------|-------------|--------|----------|---------|
| REQ-060 | User can create multiple gyms (e.g., VinUni Gym, Home Gym) | spec §16, §57 | P0 | End User |
| REQ-061 | Gym fields: name, description, equipment list, note | spec §16 | P0 | End User |
| REQ-062 | Gym equipment selection (from system equipment catalog) | spec §17, UI §39 | P0 | End User |
| REQ-063 | Active gym indicator on gym cards | UI §38 | P1 | End User |
| REQ-064 | Edit gym + equipment | spec §57 | P0 | End User |
| REQ-065 | Gym scoped to owner (RLS) | spec §56 | P0 | QA/Tester |

### Workout Program (P0)

| REQ-ID | Requirement | Source | Priority | Persona |
|--------|-------------|--------|----------|---------|
| REQ-070 | System templates: Upper/Lower, PPL, PPL+UL, Full Body, Bro Split, Arnold Split | spec §7.1 | P0 | Admin |
| REQ-071 | User custom program | spec §7.2 | P0 | End User |
| REQ-072 | Program day: name, target muscles, volume per muscle | spec §8 | P0 | Business |
| REQ-073 | Weekly schedule: T2/T3/T4/T5/T6/T7/CN with workout day | spec §7.2 | P0 | End User |
| REQ-074 | User chooses/creates program during onboarding | spec §60 | P0 | End User |
| REQ-075 | Switch program mid-flight (deferred to Refine) | spec §3.1 | P2 | End User |
| REQ-076 | program day → training_day_targets (muscle + sets) | spec §36, §8 | P0 | Developer |

### AI Workout Generation — Layer 1 (P0)

| REQ-ID | Requirement | Source | Priority | Persona |
|--------|-------------|--------|----------|---------|
| REQ-090 | Constraint Engine filters candidate exercises before Gemini | spec §19 | P0 | Developer |
| REQ-091 | Constraint inputs: training day, muscle target, equipment, exercise library, user preferences, previous performance | spec §19 | P0 | Developer |
| REQ-092 | Gemini output: exercises, sets, rep range, weight, RIR, rest, order, reason | spec §20, §44 | P0 | Business |
| REQ-093 | AI Context Builder (no raw database passed to LLM) | spec §45 | P0 | QA/Tester |
| REQ-094 | Structured JSON output validated server-side | spec §44 | P0 | Developer |
| REQ-095 | AI cannot modify program/schedule without user confirmation | spec §23 | P0 | QA/Tester |

### AI Personalization — Layer 2 (P0)

| REQ-ID | Requirement | Source | Priority | Persona |
|--------|-------------|--------|----------|---------|
| REQ-100 | Personalization uses previous workouts (weight, reps, RIR) | spec §21 | P0 | Business |
| REQ-101 | Performance trend awareness (improving/plateau/declining) | spec §21, §22 | P0 | Business |
| REQ-102 | Body weight trend integrated into personalization | spec §45 | P0 | Business |
| REQ-103 | Recent workout feedback integrated | spec §32, §45 | P0 | End User |

### AI Coach — Layer 3 (P0 basic / P1 advanced)

| REQ-ID | Requirement | Source | Priority | Persona |
|--------|-------------|--------|----------|---------|
| REQ-110 | Plateau detection across weeks | spec §22, Phase 2 §58 | P1 | Business |
| REQ-111 | Deload suggestion | spec §58 | P1 | Business |
| REQ-112 | PR (Personal Record) detection | spec §58 | P1 | End User |
| REQ-113 | Weekly AI Report | spec §58 | P1 | End User |
| REQ-114 | AI Coach Chat (Q&A about training in user context) | spec §47 | P1 | End User |
| REQ-115 | Recommendation: progressive overload rule (all sets done, reps ≥ upper range, RIR OK → suggest +weight) | spec §25 | P0 | Business |
| REQ-116 | Recommendation: when struggling (low reps, RIR 0-1) → suggest hold or reduce | spec §25 | P0 | Business |
| REQ-117 | Recommendation confidence display (LOW/MEDIUM/HIGH, not raw %) | UI §42 | P0 | End User |
| REQ-118 | AI Recommendation table: type, target, current, suggested, reason, status | spec §42 | P0 | Developer |
| REQ-119 | Accept/Reject recommendation (AI never auto-applies) | spec §23, UI §41 | P0 | End User |

### AI Exercise Content Generation (P1 / Phase 2)

| REQ-ID | Requirement | Source | Priority | Persona |
|--------|-------------|--------|----------|---------|
| REQ-130 | Admin: AI generate exercise text content (description, muscle, equipment, instructions, tips, mistakes) | spec §12, §58 | P1 | Admin |
| REQ-131 | Admin: AI generate exercise image (gemini-3.1-flash-lite-image) | spec §13, §58 | P1 | Admin |
| REQ-132 | Admin: AI generate exercise video (Veo family) | spec §14, §59 | P2 | Admin |
| REQ-133 | Admin review before publish | spec §12, §14 | P1 | Admin |

### Workout Logger (P0)

| REQ-ID | Requirement | Source | Priority | Persona |
|--------|-------------|--------|----------|---------|
| REQ-140 | Mobile-first workout logger screen | spec §26, UI §26–27 | P0 | End User |
| REQ-141 | Per-set entry: weight, reps, RIR, set_type, note | spec §27, §28, §29, §41 | P0 | End User |
| REQ-142 | Previous workout always visible (last session's sets) | spec §26, UI §27 | P0 | End User |
| REQ-143 | Target suggestion (AI-generated) visible | UI §27 | P0 | End User |
| REQ-144 | RIR physical segmented buttons [0][1][2][3][4+] | spec §28, UI §28 | P0 | End User |
| REQ-145 | Set type selector: Khởi động / Set chính / Drop / Failure | spec §28, UI §29 | P0 | End User |
| REQ-146 | Rest timer auto-start on complete set | spec §30, UI §30 | P0 | End User |
| REQ-147 | Rest timer +30s / Skip / Pause controls | spec §30, UI §30 | P0 | End User |
| REQ-148 | Active workout header: SESSION ACTIVE LED, elapsed time, exercise X/Y | UI §31 | P0 | End User |
| REQ-149 | Workout exercise replacement ([Đổi bài]) with AI-ranked candidates | spec §48 | P0 | End User |
| REQ-150 | One-handed, large numeric input design | UI §26, §27 | P0 | End User |

### Workout Completion & History (P0)

| REQ-ID | Requirement | Source | Priority | Persona |
|--------|-------------|--------|----------|---------|
| REQ-160 | Mark workout complete + capture ended_at | spec §31, §39 | P0 | End User |
| REQ-161 | Workout feedback (rate difficulty / RPE) | spec §32, §36 | P0 | End User |
| REQ-162 | Workout history page | spec §3.1, §34 | P0 | End User |
| REQ-163 | Workout detail view (replay what was done) | spec §34 | P1 | End User |

### Progress (P0)

| REQ-ID | Requirement | Source | Priority | Persona |
|--------|-------------|--------|----------|---------|
| REQ-170 | Strength chart per exercise (estimated 1RM) | spec §34, §44, UI §44 | P0 | End User |
| REQ-171 | Weekly volume chart per muscle group | spec §34, UI §45 | P0 | End User |
| REQ-172 | Body weight chart (already in REQ-022) | UI §46 | P0 | End User |
| REQ-173 | Estimated 1RM calculation (Epley/Brzycki) | spec §34 | P0 | Developer |
| REQ-174 | Personal Records (PR) list | spec §58, §36 | P1 | End User |
| REQ-175 | Workout consistency heatmap | spec §34 | P2 | End User |

### Phase 3 — Growth (P2 / P3)

| REQ-ID | Requirement | Source | Priority | Persona |
|--------|-------------|--------|----------|---------|
| REQ-200 | Social features (friends, share workouts) | spec §59 | P3 | Business |
| REQ-201 | Trainer account + coach dashboard | spec §59 | P3 | Business |
| REQ-202 | Program marketplace | spec §59 | P3 | Business |
| REQ-203 | Gym database (public gyms) | spec §59 | P3 | End User |
| REQ-204 | Subscription tiers | spec §59 | P3 | Business |
| REQ-205 | Payments (Stripe or similar) | spec §59 | P3 | Business |
| REQ-206 | Push notifications | spec §59 | P3 | End User |
| REQ-207 | PWA install + offline logger queue | spec §59 | P2 | End User |
| REQ-208 | Voice AI (Voice Live) | spec §59, §47 | P3 | End User |
| REQ-209 | Multi-region CDN + performance optimization | spec §59, UI §76 | P2 | Developer |
| REQ-210 | Exercise preference learning | spec §58 | P2 | Business |
| REQ-211 | Advanced volume management | spec §58 | P2 | Business |

---

## DECISIONS LOG

| ID | Decision | Options considered | Chosen | Rationale |
|----|----------|--------------------|--------|-----------|
| D-001 | Skip full RRI 40-60 questions | Full RRI vs Rút gọn vì spec đầy đủ | Rút gọn 6 OQ | Spec đã quyết phần lớn yêu cầu. RRI chỉ còn 6 điểm chưa rõ. Theo nguyên tắc "Đề xuất trước, hỏi sau". |
| D-002 | Use Cloudflare Workers via OpenNext adapter | Vercel / Cloudflare Workers / Self-host | Cloudflare Workers | Spec §50 đã chốt. Reuse từ spec. |
| D-003 | Single backend (Next.js route handlers), no FastAPI | FastAPI tách / Monolith Next.js | Monolith Next.js | Spec §49 đã chốt. Đơn giản cho MVP. |
| D-004 | Supabase Postgres + Auth + Storage (single vendor) | Supabase / Firebase / AWS split | Supabase | Spec §51-53 đã chốt. Single vendor giảm complexity. |
| D-005 | gemini-3.5-flash-lite for all text AI | Gemini Pro / Flash-Lite / OpenAI | Flash-Lite | Spec §54 đã chốt. Cost-optimized, đủ mạnh cho structured output. |
| D-006 | 3-layer AI architecture | Single LLM / 3 layers | 3 layers | Spec §20-22. Separation of concerns. Rule Engine trước Gemini. |
| D-007 | RLS mandatory on all tables | App-level filtering only | RLS | Spec §56. Defense in depth. |
| D-008 | Gemini API key only on server (Route Handlers / Server Actions) | Client-side with key / Server proxy | Server only | Spec §56. Never expose to browser. |
| D-009 | Build plan-only artifacts first, then BUILD | Jump to code / Plan-only first | Plan-only first | Human chọn chế độ blueprint_only. |
| D-010 | Scope = Full spec (MVP + Phase 2 + Phase 3) | MVP only / Full spec | Full spec | Human đã chọn. Plan covers toàn bộ 3 phases. |

---

## OPEN QUESTIONS (Human cần trả l�i trước khi viết Blueprint)

Sáu câu hỏi dưới đây KHÔNG có câu trả lời rõ ràng trong spec. Chủ thầu cần Human quyết trước khi khóa Blueprint. Nếu Human không trả lời, mỗi OQ sẽ được ghi vào Blueprint với default "deferred — quyết trước khi TIP tương ứng vào BUILD".

| OQ | Câu hỏi | Tại sao cần biết trước Blueprint | Default nếu không trả lời |
|----|----------|----------------------------------|-----------------------------|
| OQ-1 | **Onboarding medical**: Profile có collect injuries/medical conditions không? Spec §5 ghi "Chưa quản lý" nhưng có nên bổ sung optional checkbox? | Ảnh hưởng schema `profiles` và AI context (AI nên biết nếu user có chấn thương vai). | Deferred. Không thêm field. AI dùng program day muscle target để filter thay thế. |
| OQ-2 | **Localization**: UI tiếng Việt-first, tiếng Anh-first hay song ngữ? Spec §73 có "Language Rule" nhưng nội dung không thấy trong file. UI spec dùng tiếng Việt trong các label ví dụ (TỔNG QUAN, Buổi tập hôm nay, …). | Ảnh hưởng i18n strategy, content DB schema (`name_vi` đã có sẵn, `name` = EN). Quyết định có cần `next-intl` hay hard-code VI. | Deferred. UI tiếng Việt-first (theo UI spec examples). Hard-code VI ở MVP, để i18n cho Phase 3. |
| OQ-3 | **Multi-user / Sharing**: Spec §1 nói "kiến trúc hỗ trợ nhiều user ngay từ đầu" nhưng Phase 1 chỉ cá nhân. Có cần friend/trainer invite ngay MVP không? | Ảnh hưởng RLS strategy (single-tenant vs multi-tenant from day 1) và UI (có cần "Friends" nav item). | Deferred. Single-tenant MVP. RLS theo `user_id`, không thêm social/role tables. Phase 3 mới thêm trainer role. |
| OQ-4 | **AI rate limiting / cost guardrail**: Có giới hạn user request AI generate bao nhiêu lần/ngày không? Gemini free tier có quota. | Ảnh hưởng rate-limit middleware, quota tracking table, billing tier. | Deferred. Default: 30 AI request/user/day. Tracking qua `ai_interactions` table (đã có trong spec §36). |
| OQ-5 | **Offline logger**: Mobile logger tại gym sóng yếu. Cần offline support (IndexedDB queue + sync khi online) không? | Ảnh hưởng kiến trúc (sync queue, conflict resolution), UI (offline indicator). | Deferred. Không hỗ trợ offline ở MVP. Mobile logger assume có sóng. Phase 3 PWA mới thêm offline. |
| OQ-6 | **Storage retention policy**: Exercise images/video trên Supabase Storage. Có policy dọn draft/archived sau X ngày không? | Ảnh hưởng storage cost, cron job, RLS archive policy. | Deferred. Giữ vô hạn. Cleanup manual bởi admin. Không tự động xóa. |

### Cách Human trả l�i

Reply theo format:

```
OQ-1: [answer] | default
OQ-2: [answer] | default
OQ-3: [answer] | default
OQ-4: [answer] | default
OQ-5: [answer] | default
OQ-6: [answer] | default
```

Ví dụ:
```
OQ-1: Thêm checkbox "Vai / Lưng / Đầu gối" optional ở profile | 
OQ-2: VI-first, hard-code | 
OQ-3: Single-tenant MVP | 
OQ-4: 20 requests/day/user | 
OQ-5: Không hỗ trợ offline MVP | 
OQ-6: Giữ vô hạn | 
```

Hoặc reply ngắn gọn: `Dùng default hết` để Chủ thầu dùng default ở cột phải.

---

## RRI SCOPE SUMMARY

- **Total REQ-IDs identified:** 70+ across 3 phases
- **P0 (MVP critical):** 49
- **P1 (Phase 2):** 11
- **P2 (Phase 3 polish):** 5
- **P3 (Phase 3 deferred):** 7
- **Open Questions:** 6 (cần Human trả lời)
- **Auto-answered:** 35+ items from spec

---

## NEXT STEP

Sau khi Human reply 6 OQ (hoặc `Dùng default hết`), Chủ thầu tiến hành viết `BLUEPRINT.md`.

---

## NEXT STEP (AFTER HUMAN ANSWERED)

✅ Đã nhận 6 câu trả lời từ Human (2026-08-18 18:38 UTC+7). Khóa final choice vào bảng phía trên.
Tiếp theo: Chủ thầu viết `BLUEPRINT.md` theo 6 final choices.
