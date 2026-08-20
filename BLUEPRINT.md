# BLUEPRINT: GymAI Coach

## Vibecode Kit v6.1

---

### PROJECT INFO


| Field   | Value                                                                                              |
| ------- | -------------------------------------------------------------------------------------------------- |
| Project | GymAI Coach                                                                                        |
| Nature  | Responsive Web + AI Personal Trainer + Mobile-first workout logger + Team-scale multi-user backend |
| Date    | 2026-08-18                                                                                         |
| Stage   | Plan-only (Blueprint artifact, no code yet)                                                        |
| Source  | `spec.md` + `UI implementation spec.md`                                                            |
| Scope   | Full spec (MVP Phase 1 + Phase 2 + Phase 3)                                                        |


---

---

### REVISION: AI Stack Update (2026-08-18)

**Lý do:** Google image/video API không còn miễn phí hoặc không hỗ trợ. Tìm thay thế rẻ hơn.

| Task | Model | Provider | Price | Notes |
|------|-------|----------|-------|-------|
| Text (chat, planner, coach) | gemini-3.5-flash-lite | Google AI Studio | ~$0 (free tier) | Unchanged |
| Image (exercise demo) | FLUX 1.1 [pro] | fal.ai | **$0.04 / megapixel** | Best FLUX quality, strong photorealism + text rendering |
| Video (exercise demo) | Veo 3.1 (Lite) | Byesu | **$0.01875 / sec** | Official Google channel, best motion fidelity, 8s max |

**Chi phí ước tính (Phase 3):** $20/tháng (500 images) + $15/tháng (100 videos) = ~$35/tháng.

---

### REVISION 2: Build Order + Photo Equipment Detection (2026-08-18 19:38)

**Lý do:**
1. Human muốn demo **quản lý bài tập** (danh sách + mô tả) sớm hơn AI generation. Đảo thứ tự build: Exercise Library + UI quản lý → Gym + Equipment → ...
2. Ảnh/video exercise demo: dùng **Gemini với Google Search grounding** lấy URL từ Unsplash/Wikimedia (CC0) cho seed data. AI gen ảnh chính thức (FLUX) và video (Veo) vẫn giữ cho Phase 2/3.
3. Tính năng mới: **Chụp ảnh dụng cụ phòng gym** → Gemini multimodal detect equipment → user confirm → save vào gym_equipment.

#### Photo Equipment Detection

**Use case:** User đến phòng gym mới, muốn tạo gym record nhanh thay vì chọn từng equipment thủ công. Chụp ảnh → AI phân tích → trả về danh sách dụng cụ.

**API Endpoint:**
```
POST /api/equipment/detect
Body: { image: base64 | multipart, gymId?: uuid }
Auth: required (user)
  → 1. Validate (size ≤ 5MB, mime in [jpg/png/webp])
  → 2. Upload to Supabase Storage bucket "equipment-scans" (private, RLS)
  → 3. Call Gemini 3.5 Flash-Lite multimodal:
       - Image input (~560 tokens)
       - Prompt: "Phân tích ảnh phòng gym. Trả về JSON
         { detected: [{equipment_slug, quantity, confidence}] }
         Map về catalog equipment sau: [embed equipment table]"
  → 4. Validate output via Zod
  → 5. Log to ai_interactions (endpoint='equipment-detect')
  → 6. Return { detected: [...], scanId, imageUrl }
```

**Cost:** Gemini 3.5 Flash-Lite ~$0.25/M input tokens → ~$0.00014/ảnh. Rẻ, free tier đủ dùng MVP.

**UI flow (trong form Create Gym — TIP-006):**
```
Step 2: Chọn thiết bị (chips grid — existing flow)
   ↓
   + NÚT MỚI: "PHÁT HIỆN DỤNG CỤ TỪ ẢNH"
   ↓
Modal: Upload ảnh hoặc camera capture (mobile: camera trực tiếp)
   ↓
Loading: "AI ĐANG PHÂN TÍCH..." (3-8 giây)
   ↓
Result: danh sách detected
   - Mỗi row: [✓] tên thiết bị [số lượng] [confidence ●●●○]
   - User toggle, sửa số lượng, bỏ equipment sai
   ↓
Apply → merge vào chips grid (existing equipment selector)
   ↓
Step 3: Lưu gym
```

**Multi-photo:** Cho phép upload nhiều ảnh (1 phòng gym có thể rộng). AI tổng hợp danh sách unique.

**Image retention:** Lưu ảnh gốc vào Supabase Storage bucket `equipment-scans` (private, RLS chỉ owner đọc) để:
- Audit/improve model sau
- User xem lại ảnh đã scan
- Phase 3 có thể dùng làm training data

**Storage bucket:** `equipment-scans`, private, max 5MB/file, mime: image/jpeg, image/png, image/webp.

#### Seed Image Strategy (Web Search)

**Approach:** Exercise demo images trong seed data dùng URL tham chiếu từ web, không upload trực tiếp Supabase Storage.

**Source options (chọn Gemini grounding):**
- **Gemini 3.5 Flash-Lite + Google Search grounding**: tự động tìm URL Unsplash/Wikimedia
- Manual dev browse Unsplash → paste URL vào SQL seed

**`exercise_media` rows:**
```sql
INSERT INTO exercise_media (exercise_id, media_type, url, source, license)
VALUES (?, 'image', 'https://images.unsplash.com/photo-xxx',
        'web_search_grounding', 'Unsplash License');
```

**Source values:**
- `web_search_grounding` — từ Gemini Search grounding
- `manual` — dev paste thủ công
- `ai_generated_flux` — Phase 2 FLUX gen
- `ai_generated_veo` — Phase 3 Veo video (future)

**Human xử lý sau:** Khi có budget/hệ thống AI image gen chính thức, Human sẽ:
- Replace URL demo bằng ảnh FLUX/Veo generate/upload
- Update `source` column tương ứng
- `ai_interactions` table audit trail đầy đủ

**Lợi ích:**
- MVP có ảnh demo ngay (không phải gray box)
- Rẻ — Gemini grounding có 5000 queries free/tháng
- Không tốn storage trong Supabase
- Audit được nguồn ảnh

#### Updated Build Order (Phase 1)

**Cũ:** scaffold → design → DB → auth → profile → gym → exercise → program → AI → logger → progress → dashboard
**Mới:** scaffold → design → DB → auth → profile → **exercise (text + web images)** → **exercise management UI** → **gym (+ photo detect)** → program → AI L1/L2/L3 → logger → completion → progress → dashboard → verify

**Lý do:** Demo quản lý bài tập cho stakeholder trước khi xây AI pipeline.

---

### GOALS

**Primary Goal:**
Xây dựng một hệ thống **AI Personal Trainer** hoàn chỉnh cho người tập gym, đóng vòng lặp *Lập kế hoạch → Thực hiện → Ghi lại → Phân tích → Điều chỉnh*, với trải nghiệm mobile-first tại phòng gym (ghi log nhanh bằng 1 tay) và giao diện desktop-first cho quản lý, phân tích, lập kế hoạch.

**Target Audience:**

- Cá nhân người tập gym muốn quản lý lịch tập + có AI đề xuất cá nhân hóa
- Kiến trúc support nhiều user ngay từ đầu (chuẩn bị cho SaaS Phase 3)
- Admin quản lý system exercise library và AI-generated content

**Key Message:**

> *"You are not just opening a fitness website. You are operating a control system for your own training process."*
>
> Giao diện **Industrial Skeuomorphism × Training Control System**: cảm giác bảng điều khiển máy, thiết bị công nghiệp, không phải dashboard SaaS thông thường.

---



### ARCHITECTURE



#### High-level component diagram

```
                    BROWSER (User)
                         │
                         │ HTTPS
                         ▼
              ┌───────────────────────────┐
              │   Next.js UI (React 19)   │
              │  Tailwind + shadcn/ui     │
              │  lucide-react icons       │
              │  Zustand (client state)   │
              │  Server Components        │
              └─────────────┬─────────────┘
                            │
                            │ RSC + Server Actions
                            │ + Route Handlers
                            ▼
              ┌───────────────────────────┐
              │  Cloudflare Workers       │
              │  (via @opennextjs/cloudflare)
              │                           │
              │  /api/* Route Handlers    │
              │  Server Actions (mutations)│
              │  Server Components (RSC)  │
              │  AI Context Builder       │
              │  Constraint Engine        │
              │  Gemini Client            │
              └─────┬──────────┬──────────┘
                    │          │
          ┌─────────┘          └─────────┐
          ▼                              ▼
   ┌─────────────┐               ┌──────────────┐
   │  Supabase   │               │ Gemini API   │
   │             │               │              │
   │ • Postgres  │               │ • text:      │
   │ • Auth      │               │   gemini-3.5-flash-lite
   │ • Storage   │               │ • image:     │
   │ • RLS       │               │   FLUX 1.1 [pro] @ fal.ai (image) / Gemini 3.5 Flash-Lite + Search grounding (seed web URLs) / Gemini 3.5 Flash-Lite multimodal (photo detect)
   │             │               │ • video:     │
   │             │               │   Veo 3.1 @ Byesu   │
   └─────────────┘               └──────────────┘
```



#### Data flow — Regular feature (e.g., load dashboard)

```
Browser
  → Server Component
    → Supabase client (cookies-based session)
      → SELECT FROM workouts WHERE user_id = auth.uid()  -- RLS enforced
    → Server Component renders
  → HTML shipped to browser (no API key leakage)
```



#### AI flow — Workout generation (the core loop)

```
User clicks "Generate with AI"
  ↓
Server Action: generateWorkout(userId, trainingDayId, gymId)
  ↓
Step 1: Auth check — Supabase getUser()
  ↓
Step 2: AI Context Builder (server-side)
    • profile (goal, experience, injuries)
    • training_program_day (muscle targets, volume)
    • gym_equipment
    • candidate_exercises filtered (primary muscle match + equipment available + not recent)
    • recent_exercise_performance (last 5 sets per exercise)
    • body_weight_trend (last 30 days)
    • recent_workout_feedback
  ↓
Step 3: Constraint Engine applies:
    "filter exercises where:
       PRIMARY muscle ∈ day_targets
       AND ALL required equipment ∈ gym_equipment
       AND difficulty ≤ experience_level
       AND not in user's recent blacklist
       AND (if injury flag) substitutes known alternatives"
  ↓
Step 4: Gemini call (server-only, API key from Cloudflare secret)
    prompt: structured JSON schema
    response: validated Zod schema
    max_output_tokens: 4096
    temperature: 0.7
  ↓
Step 5: Server validation
    • every exerciseId must be in candidate list
    • volume matches day target ±10%
    • rest_seconds 30..600
    • rir 0..4
  ↓
Step 6: AI returns recommendation → UI shows preview
    [Accept] [Reject] [Edit]
  ↓
Step 7 (on Accept):
    INSERT INTO workouts (... ai_generated=true ...)
    INSERT INTO workout_exercises
    Log ai_interactions (for future audit / rate limit Phase 3)
  ↓
Return workoutId to UI → navigate to /workout/[id]/active
```



#### AI control principle (CRITICAL)

> AI Suggest → User Review → Accept / Reject. AI never mutates persistent state without user confirmation. (spec §23)

This applies to:

- Workout plan changes
- Weight progression suggestions
- Exercise substitution
- Program/schedule modification

Recommendation rows live in `ai_recommendations` table with `status` enum `PENDING / ACCEPTED / REJECTED`. User action flips status.

---



### DESIGN SYSTEM

Industrial Skeuomorphism × Training Control System.

#### Colors (from UI spec §5–§8)

```css
:root {
  /* Chassis (Level 0) */
  --background: #e0e5ec;          /* Main app background */
  --panel: #f0f2f5;                /* Raised panel contrast */
  --muted: #d1d9e6;                /* Recessed area (inputs, screens) */

  /* Typography */
  --text-primary: #2d3436;         /* Heading, exercise name, metrics */
  --text-secondary: #4a5568;       /* Label, metadata */

  /* Brand Accent — safety red, used sparingly */
  --accent: #ff4757;               /* Primary CTA, active state, AI trigger */
  --accent-foreground: #ffffff;

  /* Functional */
  --success: #22c55e;              /* Workout completed, PR */
  --warning: #f59e0b;              /* Plateau, recovery */
  --error: #ef4444;                /* Validation, failed generation */
  --info: #3b82f6;                 /* AI insight, neutral recommendation */

  /* Shadows */
  --shadow-dark: #babecc;
  --shadow-light: #ffffff;
}
```

**Accent rule:** accent đỏ chỉ dùng cho CTA chính, active state, AI trigger, warning, critical action. KHÔNG phủ đỏ toàn giao diện.

**Light direction:** Highlight top/left +45°, Shadow bottom/right.

#### Typography


| Role             | Font           | Weight                               | Size (desktop / mobile) | Use case                                   |
| ---------------- | -------------- | ------------------------------------ | ----------------------- | ------------------------------------------ |
| Heading          | Inter          | 700                                  | 32-40 / 26-32 px        | Page title                                 |
| Body             | Inter          | 400-500                              | 16 / 16 px              | Min 16px on mobile                         |
| Card title       | Inter          | 600-700                              | 18-20 px                | Card header                                |
| Technical label  | JetBrains Mono | 700, uppercase, letter-spacing .05em | 12-13 px                | "SESSION ACTIVE", "SET 03", "WORKOUT #124" |
| Dashboard metric | JetBrains Mono | 700                                  | 32-48 px                | "92.5 KG", "72.4 KG", "01:42"              |




#### Elevation System (4 levels)


| Level           | Token                                                      | Visual                                                                                            | Use case               |
| --------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------- |
| **-1 Recessed** | Inset shadow, darker bg                                    | Inputs, search, workout logger input, timer screen, weight input, rep input, RIR selector, charts | Level below surface    |
| **0 Chassis**   | App background `#e0e5ec`                                   | App background, dashboard background, workout background                                          | Main surface           |
| **+1 Panel**    | Dual shadow `8px 8px 16px #babecc, -8px -8px 16px #ffffff` | Cards, dashboard modules, workout modules, exercise cards, AI recommendation cards, gym cards     | Standard raised        |
| **+2 Control**  | Stronger shadow + inset highlight                          | Start Workout, Generate with AI, Complete Set, Save, Accept AI Suggestion                         | Interactive, prominent |




#### Shadow Tokens (cheat sheet)

```css
--shadow-card:      8px 8px 16px #babecc, -8px -8px 16px #ffffff;
--shadow-floating:  12px 12px 24px #babecc, -12px -12px 24px #ffffff,
                    inset 1px 1px 0 rgba(255,255,255,.5);
--shadow-pressed:   inset 6px 6px 12px #babecc, inset -6px -6px 12px #ffffff;
--shadow-recessed:  inset 4px 4px 8px #babecc, inset -4px -4px 8px #ffffff;
```



#### Border Radius (fixed scale)


| Size  | Token  | Use case              |
| ----- | ------ | --------------------- |
| 4px   | `sm`   | Small technical badge |
| 8px   | `md`   | Input / small button  |
| 16px  | `lg`   | Standard card         |
| 24px  | `xl`   | Large module          |
| 30px  | `2xl`  | Hero / workout panel  |
| 999px | `full` | Circular indicator    |


> Soft injection-molded plastic feel, not sharp metal edges.



#### Icon System

- **Library:** `lucide-react` only (no mix)
- **Sizes:** 16-18 inline / 20-24 navigation / 28-32 feature / 32-40 main action
- **Icon housing:** Important icons sit in raised circular housing with technical label below



#### Navigation

**Desktop (>=1024px):**

- Sidebar 240-260px width (chassis material, not white panel)
- Active item: pressed surface + accent LED on left
- Items: Tổng quan, Buổi tập hôm nay, Lịch tập, Bài tập, Phòng tập, Tiến độ, AI Coach, Lịch sử, Profile, Settings

**Mobile (<768px):**

- Bottom nav 5 items: Home / Lịch / Tập / Progress / AI
- "Tập" là floating action center button, opens Workout Today



#### Breakpoints


| Name          | Width       |
| ------------- | ----------- |
| Mobile        | < 768px     |
| Tablet        | 768-1023px  |
| Desktop       | 1024-1279px |
| Large Desktop | ≥ 1280px    |




#### Animation Tokens

```css
--ease-mechanical: cubic-bezier(0.175, 0.885, 0.32, 1.275);  /* Spring/bounce */
--duration-press: 150ms;          /* translateY 2px, raised → pressed */
--duration-hover: 300ms;          /* translateY -4px on desktop */
```

LED animations: green pulse for active workout, red/blue subtle pulse for AI, yellow static for warning.

`prefers-reduced-motion: reduce` disables bounce/rotation/elevation transitions.

---



### TECH STACK


| Layer              | Choice                                                   | Source   |
| ------------------ | -------------------------------------------------------- | -------- |
| Frontend framework | Next.js (App Router) + TypeScript + React                | spec §49 |
| UI library         | Tailwind CSS + shadcn/ui + Lucide Icons                  | spec §49 |
| Charts             | Recharts                                                 | spec §49 |
| Backend            | Next.js Route Handlers + Server Actions (no FastAPI MVP) | spec §49 |
| Hosting            | Cloudflare Workers via `@opennextjs/cloudflare` adapter  | spec §50 |
| Database           | Supabase PostgreSQL                                      | spec §51 |
| Auth               | Supabase Auth — Email/Password + Google OAuth            | spec §52 |
| Storage            | Supabase Storage (avatar, exercise images, videos)       | spec §53 |
| AI text / multimodal | Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`) — chat, workout gen, equipment photo detect | spec §54, Revision 2 §Photo Equipment |
| AI image (seed) | Web search URL (Unsplash/Wikimedia CC0) via Gemini Search grounding — seed data, MVP | Revision 2 §Seed Image Strategy |
| AI image (Phase 2) | FLUX 1.1 [pro] on fal.ai — $0.04/megapixel | Revised §AI Stack (2026-08-18) |
| AI video (Phase 3) | Veo 3.1 (Lite) on Byesu — $0.01875/sec | Revised §AI Stack (2026-08-18) |
| Client state       | Zustand (for logger draft, timer state)                  | derived  |
| Forms              | react-hook-form + zod                                    | derived  |
| Database client    | `@supabase/ssr` (Server Components friendly)             | derived  |
| Schema migrations  | `supabase` CLI + SQL files in `supabase/migrations/`     | derived  |
| AI SDK             | `@google/generative-ai` (text + multimodal + Search grounding) + `fal` npm + Byesu REST | Revised §AI Stack + Revision 2 |
| Testing            | Vitest (unit) + Playwright (e2e)                         | derived  |
| Code quality       | TypeScript strict + ESLint + Prettier                    | derived  |
| Deployment         | `wrangler` + `pnpm`                                      | derived  |


---



### FILE STRUCTURE

Next.js App Router monolith với module-based folders:

```
gymai-coach/
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── opennext.config.ts                          # Cloudflare adapter config
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json                             # shadcn/ui config
├── wrangler.toml                               # Cloudflare Workers config
├── .env.example                                # Required env vars (no real values)
│
├── src/
│   ├── app/                                    # Next.js App Router
│   │   ├── (auth)/                             # Public auth pages
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── callback/route.ts               # OAuth callback
│   │   │
│   │   ├── (app)/                              # Authenticated shell
│   │   │   ├── layout.tsx                      # AppShell + Sidebar/MobileNav
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── workout/
│   │   │   │   ├── today/page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx                # Workout preview / accept
│   │   │   │   │   └── active/page.tsx         # Active workout logger
│   │   │   │   └── history/page.tsx
│   │   │   ├── programs/
│   │   │   │   ├── page.tsx                    # Templates + My Programs
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── exercises/
│   │   │   │   ├── page.tsx                    # Library + search/filter
│   │   │   │   └── [id]/page.tsx               # Detail
│   │   │   ├── gyms/
│   │   │   │   ├── page.tsx                    # List
│   │   │   │   └── [id]/page.tsx               # Edit + Equipment
│   │   │   ├── progress/page.tsx
│   │   │   ├── ai-coach/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   └── settings/page.tsx
│   │   │
│   │   ├── onboarding/                         # First-time setup
│   │   │   ├── layout.tsx
│   │   │   ├── step-1-profile/page.tsx
│   │   │   ├── step-2-program/page.tsx
│   │   │   ├── step-3-gym/page.tsx
│   │   │   └── step-4-ready/page.tsx
│   │   │
│   │   ├── api/                                # Route Handlers (public-ish)
│   │   │   ├── ai/
│   │   │   │   ├── generate-workout/route.ts
│   │   │   │   ├── substitute-exercise/route.ts
│   │   │   │   └── chat/route.ts
│   │   │   └── webhooks/                       # if needed (e.g., Stripe Phase 3)
│   │   │
│   │   └── actions/                            # Server Actions (mutations)
│   │       ├── auth.ts
│   │       ├── profile.ts
│   │       ├── workout.ts
│   │       ├── exercise.ts
│   │       ├── gym.ts
│   │       ├── program.ts
│   │       ├── body-weight.ts
│   │       └── recommendation.ts
│   │
│   ├── components/
│   │   ├── ui/                                 # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── …
│   │   ├── industrial/                         # Design-system primitives
│   │   │   ├── IndustrialCard.tsx
│   │   │   ├── IndustrialButton.tsx
│   │   │   ├── IndustrialInput.tsx
│   │   │   ├── IndustrialScreen.tsx
│   │   │   ├── LedIndicator.tsx
│   │   │   ├── TechnicalLabel.tsx
│   │   │   ├── MetricDisplay.tsx
│   │   │   ├── PhysicalToggle.tsx
│   │   │   ├── SegmentControl.tsx
│   │   │   ├── ScrewDecoration.tsx
│   │   │   └── VentDecoration.tsx
│   │   ├── workout/
│   │   │   ├── WorkoutHero.tsx
│   │   │   ├── WorkoutExerciseCard.tsx
│   │   │   ├── WorkoutSetLogger.tsx
│   │   │   ├── SetRow.tsx
│   │   │   ├── RIRSelector.tsx
│   │   │   ├── SetTypeSelector.tsx
│   │   │   ├── RestTimer.tsx
│   │   │   ├── PreviousPerformance.tsx
│   │   │   ├── WorkoutProgress.tsx
│   │   │   └── FinishWorkoutModal.tsx
│   │   ├── exercise/
│   │   │   ├── ExerciseCard.tsx
│   │   │   ├── ExerciseLibraryGrid.tsx
│   │   │   ├── ExerciseFilters.tsx
│   │   │   ├── ExerciseInstructions.tsx       # STEP 01 / STEP 02 modules
│   │   │   └── ExerciseMedia.tsx
│   │   ├── gym/
│   │   │   ├── GymCard.tsx
│   │   │   ├── GymEquipmentSelector.tsx
│   │   │   └── ActiveGymBadge.tsx
│   │   ├── program/
│   │   │   ├── ProgramTemplateCard.tsx
│   │   │   ├── ProgramDayBuilder.tsx
│   │   │   └── WeeklyScheduleGrid.tsx
│   │   ├── progress/
│   │   │   ├── StrengthChart.tsx
│   │   │   ├── VolumeChart.tsx
│   │   │   ├── BodyWeightChart.tsx
│   │   │   ├── PRCard.tsx
│   │   │   └── TrainingConsistency.tsx
│   │   ├── ai/
│   │   │   ├── AIRecommendation.tsx
│   │   │   ├── AIInsightCard.tsx
│   │   │   ├── AIStatus.tsx
│   │   │   ├── AIChat.tsx
│   │   │   └── AIWorkoutGenerator.tsx
│   │   └── layout/
│   │       ├── AppShell.tsx
│   │       ├── Sidebar.tsx
│   │       ├── MobileNavigation.tsx
│   │       ├── TopBar.tsx
│   │       └── PageContainer.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts                       # Server Component / Route Handler client
│   │   │   ├── browser.ts                      # Client component client
│   │   │   └── middleware.ts                   # Session refresh
│   │   ├── gemini/
│   │   │   ├── client.ts                       # Gemini SDK setup (server only)
│   │   │   ├── prompts/
│   │   │   │   ├── workout-generation.ts
│   │   │   │   ├── recommendation.ts
│   │   │   │   ├── exercise-substitution.ts
│   │   │   │   └── coach-chat.ts
│   │   │   └── schemas/                        # Zod schemas for output validation
│   │   │       ├── workout.ts
│   │   │       └── recommendation.ts
│   │   ├── ai/
│   │   │   ├── context-builder.ts              # Build AI input context
│   │   │   ├── constraint-engine.ts            # Filter candidates
│   │   │   └── rule-engine.ts                  # Progressive overload rules
│   │   ├── auth/
│   │   │   └── helpers.ts
│   │   ├── calc/
│   │   │   ├── one-rm.ts                       # Epley/Brzycki
│   │   │   ├── volume.ts
│   │   │   └── consistency.ts
│   │   └── utils.ts                            # cn(), formatWeight, …
│   │
│   ├── hooks/
│   │   ├── useActiveWorkout.ts                 # Logger state
│   │   ├── useRestTimer.ts
│   │   └── useOnboarding.ts
│   │
│   ├── stores/
│   │   ├── workout-logger.ts                   # Zustand
│   │   └── timers.ts
│   │
│   ├── types/
│   │   ├── database.ts                         # Generated from Supabase
│   │   ├── ai.ts
│   │   └── workout.ts
│   │
│   └── middleware.ts                           # Next.js middleware (auth gate)
│
├── supabase/
│   ├── config.toml
│   ├── migrations/                             # Numbered SQL migrations
│   │   ├── 0001_init.sql                       # 22 tables
│   │   ├── 0002_rls_policies.sql               # All RLS policies
│   │   ├── 0003_functions.sql                  # Triggers, RPC
│   │   ├── 0004_seed_muscles.sql
│   │   ├── 0005_seed_equipment.sql
│   │   ├── 0006_seed_exercises.sql
│   │   ├── 0007_seed_programs.sql
│   │   └── 0008_admin_role.sql
│   └── seed.sql                                # Dev data
│
├── tests/
│   ├── unit/
│   │   ├── one-rm.test.ts
│   │   ├── constraint-engine.test.ts
│   │   └── gemini-output-validation.test.ts
│   └── e2e/
│       ├── onboarding.spec.ts
│       ├── workout-logger.spec.ts
│       └── ai-generation.spec.ts
│
└── docs/
    ├── BLUEPRINT.md                            # This file
    ├── RRI_REPORT.md
    ├── DECISIONS_LOG.md
    ├── TASK_GRAPH.md
    └── CONTRACT.md
```

---



### DATABASE SCHEMA (22 tables)

Lấy trực tiếp từ spec.md §36-46, bổ sung 3 field injury theo OQ-1.

#### Tables summary


| #   | Table                   | Purpose                                   | Owner  |
| --- | ----------------------- | ----------------------------------------- | ------ |
| 1   | `auth.users`            | Supabase managed                          | —      |
| 2   | `profiles`              | User profile + injury flags (OQ-1)        | user   |
| 3   | `body_weight_logs`      | Daily weight entry                        | user   |
| 4   | `muscles`               | Muscle group catalog (admin managed)      | global |
| 5   | `equipment`             | System equipment list (admin)             | global |
| 6   | `exercises`             | System + custom exercises                 | mixed  |
| 7   | `exercise_muscles`      | M:N exercise ↔ muscle                     | mixed  |
| 8   | `exercise_equipment`    | M:N exercise ↔ equipment                  | mixed  |
| 9   | `exercise_media`        | Image/video per exercise                  | mixed  |
| 10  | `exercise_alternatives` | M:N exercise ↔ alternative                | global |
| 11  | `gyms`                  | User's gyms                               | user   |
| 12  | `gym_equipment`         | M:N gym ↔ equipment                       | user   |
| 13  | `training_programs`     | Templates + custom programs               | mixed  |
| 14  | `training_program_days` | Days within program (Push, Pull, etc.)    | mixed  |
| 15  | `training_day_targets`  | Muscle + volume per day                   | mixed  |
| 16  | `user_programs`         | User's selected program + active schedule | user   |
| 17  | `workouts`              | Individual session                        | user   |
| 18  | `workout_exercises`     | Exercises within a workout                | user   |
| 19  | `workout_sets`          | Per-set log                               | user   |
| 20  | `workout_feedback`      | Post-workout rating                       | user   |
| 21  | `exercise_user_stats`   | Aggregated PR/working weights             | user   |
| 22  | `personal_records`      | PR history                                | user   |
| 23  | `ai_recommendations`    | Suggestion w/ PENDING/ACCEPTED/REJECTED   | user   |
| 24  | `ai_interactions`       | Audit log of every AI call                | user   |




#### Schema highlights (verbatim from spec)

```sql
-- profiles (REQ-010..017 + OQ-1)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  birthday DATE,
  height_cm NUMERIC,
  current_weight_kg NUMERIC,
  unit_system TEXT CHECK (unit_system IN ('kg', 'lb')) DEFAULT 'kg',
  experience_level TEXT CHECK (experience_level IN ('Beginner', 'Intermediate', 'Advanced')),
  goal TEXT CHECK (goal IN ('Tăng cơ', 'Tăng sức mạnh', 'Giảm mỡ', 'Duy trì thể lực')),
  preferred_training_days TEXT[],                     -- ['T2','T3','T4','T6','T7']
  preferred_session_duration INTEGER,                 -- minutes
  -- OQ-1 injury flags (optional, do not block onboarding)
  has_shoulder_injury BOOLEAN DEFAULT FALSE,
  has_back_injury BOOLEAN DEFAULT FALSE,
  has_knee_injury BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- exercises
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users ON DELETE CASCADE,  -- NULL = system
  type TEXT CHECK (type IN ('SYSTEM', 'CUSTOM')) NOT NULL,
  name TEXT NOT NULL,
  name_vi TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  exercise_type TEXT CHECK (exercise_type IN ('Compound', 'Isolation')),
  instructions JSONB,                                       -- array of steps
  tips TEXT,
  common_mistakes TEXT,
  status TEXT CHECK (status IN ('Draft', 'Published', 'Archived')) DEFAULT 'Published',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- workouts
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  training_program_day_id UUID REFERENCES training_program_days,
  gym_id UUID REFERENCES gyms,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('Planned', 'Active', 'Completed', 'Cancelled')) DEFAULT 'Planned',
  planned_duration INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- workout_exercises
CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises,
  order_index INTEGER NOT NULL,
  target_sets INTEGER,
  target_rep_min INTEGER,
  target_rep_max INTEGER,
  target_weight NUMERIC,
  target_rir INTEGER,
  rest_seconds INTEGER,
  ai_reason TEXT
);

-- workout_sets
CREATE TABLE workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID NOT NULL REFERENCES workout_exercises ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  weight NUMERIC,
  reps INTEGER,
  rir INTEGER,
  set_type TEXT CHECK (set_type IN ('WARMUP', 'WORKING', 'DROP', 'FAILURE')),
  note TEXT,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ
);

-- ai_recommendations
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  recommendation_type TEXT,
  target_type TEXT,
  target_id UUID,
  current_value TEXT,
  suggested_value TEXT,
  reason TEXT,
  confidence TEXT CHECK (confidence IN ('LOW', 'MEDIUM', 'HIGH')),
  status TEXT CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')) DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- ai_interactions (audit log; foundation for OQ-4 future rate limit)
CREATE TABLE ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  endpoint TEXT,                        -- 'generate-workout' | 'chat' | 'substitute' | …
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  model TEXT,
  duration_ms INTEGER,
  status TEXT CHECK (status IN ('success', 'failed', 'rejected_by_validation')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

(Full schema with remaining 16 tables in Task Graph TIP-003.)

#### RLS Strategy

- **Owner-scoped tables** (workouts, gyms, body_weight_logs, ai_recommendations, ai_interactions, …):
RLS policy: `auth.uid() = user_id`. Read & write limited to owner.
- **System tables** (muscles, equipment, exercise_alternatives, system-templates):
Read = anyone authenticated; Write = `is_admin()` claim only.
- **Mixed tables** (exercises, training_programs, training_program_days):
`SELECT` allowed if either `owner_user_id = auth.uid()` OR `type = 'SYSTEM'` AND `status = 'Published'`.
`INSERT/UPDATE/DELETE` allowed only if `owner_user_id = auth.uid()` (custom) OR `is_admin()` (system).
- **Admin role** stored in `auth.users.app_metadata.is_admin`. Gated by middleware check.
- **Gemini API key** lives in Cloudflare secret binding, never touches client.

---



### RRI REQUIREMENTS MATRIX (selection — full list in `RRI_REPORT.md`)


| Blueprint Section          | Requirements | Source                                |
| -------------------------- | ------------ | ------------------------------------- |
| Auth                       | REQ-001..003 | RRI §Auth + spec §4, §52              |
| Profile + Onboarding       | REQ-010..017 | RRI §Profile + spec §5                |
| Body Weight Tracking       | REQ-020..023 | RRI §Body + spec §6                   |
| Exercise Library           | REQ-030..040 | RRI §Exercise + spec §9–11            |
| Equipment                  | REQ-050..052 | RRI §Equipment + spec §15             |
| Gym Management             | REQ-060..065 | RRI §Gym + spec §16–17                |
| Program                    | REQ-070..076 | RRI §Program + spec §7–8              |
| AI Workout Generation (L1) | REQ-090..095 | RRI §AI L1 + spec §19, §20, §45       |
| AI Personalization (L2)    | REQ-100..103 | RRI §AI L2 + spec §21                 |
| AI Coach (L3)              | REQ-110..119 | RRI §AI L3 + spec §22, §25, §42       |
| AI Content Admin (Phase 2) | REQ-130..133 | RRI §Admin + spec §12–14              |
| Workout Logger             | REQ-140..150 | RRI §Logger + spec §26–30 + UI §26–31 |
| Workout Completion         | REQ-160..163 | RRI §Completion + spec §31–32         |
| Progress                   | REQ-170..175 | RRI §Progress + spec §34 + UI §43–46  |
| Phase 3 Features           | REQ-200..211 | RRI §Phase 3 + spec §59               |




#### OQ decisions integrated into Blueprint


| OQ   | Decision                           | Schema / Arch impact                                                  | Where applied                                                                                                 |
| ---- | ---------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| OQ-1 | Thêm optional injury checkboxes    | `profiles.has_shoulder_injury`, `has_back_injury`, `has_knee_injury`  | `profiles` table; AI Context Builder reads them; Constraint Engine uses `exercise_alternatives` to substitute |
| OQ-2 | VI-first hard-code                 | UI strings hard-code VI; `next-intl` deferred                         | All `src/app/**/*.tsx`, `src/components/**/*.tsx`; `exercises.name_vi` preserved                              |
| OQ-3 | Single-tenant MVP                  | No social/role tables Phase 1; only `profiles.user_id` owner relation | RLS scope; `is_admin()` claim only for system-data admin                                                      |
| OQ-4 | No rate limit MVP, log mọi request | `ai_interactions` table captures every call + token usage + duration  | All Gemini calls go through helper that logs to this table                                                    |
| OQ-5 | No offline MVP                     | No IndexedDB queue; no PWA manifest Phase 1                           | Mobile logger expects online connection; error toast on network failure                                       |
| OQ-6 | Keep storage vô hạn                | No cleanup cron; manual admin only                                    | Supabase Storage policies unchanged                                                                           |


---



### API ENDPOINTS (Route Handlers + Server Actions overview)

Server Actions preferred for mutations (form-based). Route Handlers for AI calls (streaming, public-ish webhook).

#### Auth


| Method | Path                 | Purpose                          |
| ------ | -------------------- | -------------------------------- |
| POST   | `/api/auth/signup`   | Wrap Supabase signUp             |
| POST   | `/api/auth/login`    | Wrap Supabase signInWithPassword |
| GET    | `/api/auth/callback` | OAuth callback                   |
| POST   | `/api/auth/logout`   | Wrap Supabase signOut            |


(All auth flows ideally via Server Actions; Route Handlers only for OAuth callback.)

#### Profile


| Action                                 | Purpose                             |
| -------------------------------------- | ----------------------------------- |
| `updateProfile(profile)`               | Save profile + injury flags         |
| `recordBodyWeight(weight, date, note)` | Insert body_weight_logs             |
| `getBodyWeightHistory(range)`          | Select history with computed deltas |




#### Exercise


| Action                            | Purpose                                         |
| --------------------------------- | ----------------------------------------------- |
| `searchExercises(query, filters)` | Filter exercises by muscle/equipment/difficulty |
| `createCustomExercise(data)`      | Insert CUSTOM exercise                          |
| `getExerciseDetail(id)`           | Read with muscles/equipment/alternatives        |




#### Equipment


| Action                   | Purpose                    |
| ------------------------ | -------------------------- |
| `getSystemEquipment()`   | Admin catalog              |
| `getGymEquipment(gymId)` | Selected equipment per gym |




#### Gym


| Action                | Purpose                         |
| --------------------- | ------------------------------- |
| `createGym(data)`     | Insert                          |
| `updateGym(id, data)` | Update + equipment sync         |
| `deleteGym(id)`       | Cascade                         |
| `setActiveGym(id)`    | Update `profiles.active_gym_id` |




#### Program


| Action                               | Purpose                         |
| ------------------------------------ | ------------------------------- |
| `getProgramTemplates()`              | System + user programs          |
| `createCustomProgram(data)`          | Insert program + days + targets |
| `selectProgram(programId, schedule)` | Insert user_programs            |
| `getActiveProgram(userId)`           | Today's day + targets           |




#### Workout


| Action                                    | Purpose                          |
| ----------------------------------------- | -------------------------------- |
| `createWorkout(dayId, gymId)`             | Insert skeleton                  |
| `addWorkoutExercise(workoutId, data)`     | Insert workout_exercises row     |
| `reorderWorkoutExercises(workoutId, ids)` | Update order_index               |
| `logSet(workoutExerciseId, setData)`      | Insert/update workout_sets       |
| `completeSet(setId)`                      | Mark complete + start rest timer |
| `finishWorkout(workoutId, feedback)`      | Update status + capture feedback |




#### AI endpoints (Route Handlers)


| Method | Path                       | Purpose                                               |
| ------ | -------------------------- | ----------------------------------------------------- |
| POST   | `/api/ai/generate-workout` | Layer 1 — workout generation (uses Constraint Engine) |
| POST   | `/api/ai/chat`             | Layer 3 — coach chat (Phase 2)                        |
| POST   | `/api/ai/substitute`       | Layer 1 — exercise substitution                       |
| POST   | `/api/ai/generate-content` | Admin exercise content (Phase 2)                      |
| POST   | `/api/ai/generate-image`   | Admin exercise image (Phase 2)                        |


All AI endpoints:

1. Validate session (`getUser()`)
2. Log to `ai_interactions` before + after
3. Validate output with Zod schema
4. Return either confirmed recommendation row OR preview (depends on `confirm` flag)

---



### AI PIPELINE (detail)

```
generateWorkout(input):
  1. user = await getUser()
  2. if !user → throw 401
  3. ctx = buildContext(user.id, input.programDayId, input.gymId)
     // includes: profile (incl. injury flags OQ-1), day targets,
     // gym equipment, candidate exercises, recent performance,
     // body weight trend, recent workout feedback
  4. candidates = runConstraintEngine(ctx)
     // filter: muscle match + equipment available + difficulty fit
     //        + not recent blacklist + injury-aware substitute
  5. logAiInteraction({ user, endpoint: 'generate-workout', status: 'pending' })
  6. raw = await geminiClient.generate({
       model: 'gemini-3.5-flash-lite',
       prompt: WORKOUT_GENERATION_PROMPT(ctx, candidates),
       responseFormat: 'json',
       schema: WorkoutOutputSchema,  // Zod-equivalent for Gemini
       maxOutputTokens: 4096,
       temperature: 0.7,
     })
  7. parsed = WorkoutOutputSchema.safeParse(raw)
     if (!parsed.success) { log status 'rejected_by_validation'; throw 422 }
  8. // hard validation
     ensure every exerciseId in candidates
     ensure total sets match day target ±10%
     ensure rest_seconds 30..600; rir 0..4
  9. logAiInteraction({ status: 'success', tokens: raw.usage, duration_ms })
  10. return { preview: parsed.data, aiInteractionId }
  // UI shows preview → user clicks Accept → separate action persists to DB
```

**Phase 1 personalisation (Layer 2):** Same pipeline, but Context Builder also includes `last 5 sessions for each exercise` and `body weight trend`. Rule Engine runs progressive-overload check first; if rules fire, Gemini prompt is "explain this rule" not "decide from scratch".

**Phase 1 coach (Layer 3):** Trigger from `/api/ai/coach` after workout completion. Rule Engine produces recommendation candidates (progression / deload / volume), Gemini writes the human explanation, recommendation row inserted with PENDING.

---



### SECURITY

- **Authentication:** Supabase Auth — `getUser()` server-side; never trust client-supplied userId.
- **Authorization (RLS):** Every table has RLS enabled. Owner check `auth.uid() = user_id`. Admin tables guard `is_admin()` from `auth.users.app_metadata`.
- **API Key handling:** Gemini API key stored as Cloudflare Worker secret binding (`GEMINI_API_KEY`). Accessed only in `/api/ai/`* Route Handlers. Never imported in client bundle.
- **CSRF:** Server Actions use Next.js built-in origin check + Supabase auth token.
- **Rate limit:** Deferred (OQ-4). However `ai_interactions` table pre-logs. Adding limit later = insert middleware that reads last 24h count.
- **PII:** `profiles.birthday` optional, body weight is sensitive — treat as PII; RLS sufficient.
- **Storage:** Supabase Storage buckets scoped via RLS. Avatar bucket = owner-write, public-read. Exercise media bucket = system admin write, public-read.
- **Injection:** All AI prompts use template + context JSON; output validated through Zod schema before persisting. No raw text→DB.
- **Auditability:** Every AI call leaves row in `ai_interactions` (user, endpoint, tokens, status).

---



### TASK DECOMPOSITION PREVIEW

Chi tiết đầy đủ ở `TASK_GRAPH.md`. Tổng quan:

- **30 TIPs** chia làm 3 phases theo MVP scope.
- **Phase 1 (MVP — P0):** 16 TIPs (~10 days effort in Cursor context).
- **Phase 2 (Advanced AI + Admin):** 7 TIPs (~5 days).
- **Phase 3 (Growth features):** 7 TIPs (~7 days).

Effort estimate là cho Cursor (chứ không phải AI runtime) — thời gian để thực thi mỗi TIP, có thể phải chạy nhiều session.

---



### ACCEPTS THE FOLLOWING HUMAN INPUTS

Blueprint này được viết dựa trên:

- `spec.md` 62 sections + `UI implementation spec.md` 82 sections
- 6 Open Questions đã được Human trả lời:


| OQ   | Decision                                                                    |
| ---- | --------------------------------------------------------------------------- |
| OQ-1 | Thêm optional checkbox vai/lưng/đầu gối → 3 boolean fields trong `profiles` |
| OQ-2 | VI-first hard-code                                                          |
| OQ-3 | Single-tenant MVP                                                           |
| OQ-4 | No rate limit MVP, log mọi request vào `ai_interactions`                    |
| OQ-5 | No offline MVP                                                              |
| OQ-6 | Keep storage vô hạn                                                         |


---



### CHECKPOINT — Human Review

Vui lòng review và xác nhận Blueprint. Các điểm cần verify:

- [x] **Architecture** khớp với kỳ vọng: Next.js + Cloudflare Workers + Supabase + Gemini (server only).
- [x] **Design system** đầy đủ: Industrial Skeuomorphism tokens, 4 elevations, shadows, breakpoints.
- [x] **Database schema** 22+ bảng đủ cho MVP và mở rộng Phase 2/3.
- [x] **AI pipeline** tuân theo: Constraint Engine → Gemini → Validation → Save → UI review → Accept/Reject (AI never auto-mutates).
- [x] **OQ decisions** đã được tích hợp đúng (OQ-1 schema field, OQ-2 VI-first, OQ-3 single-tenant, OQ-4 logging only, OQ-5 no offline, OQ-6 no retention).
- [x] **File structure** 200-300 files, hierarchy rõ ràng theo App Router + module-based components.
- [x] **Không có gì quan trọng bị sót**.

**Để approve:** reply `APPROVED`.

**Để revise:** reply `REVISE: [ghi chú cụ thể]` — ví dụ `REVISE: Đổi database từ Supabase sang Neon`.

Sau khi approve, Chủ thầu tiếp tục viết `TASK_GRAPH.md`.

