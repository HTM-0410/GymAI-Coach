# GymAI Coach

> **AI Personal Trainer** — lập kế hoạch → tập luyện → ghi lại → phân tích → điều chỉnh.

## Tech Stack

- **Frontend:** Next.js 14 (App Router, RSC, Server Actions), React 18, TypeScript, Tailwind CSS, lucide-react
- **Backend:** Supabase (PostgreSQL + Auth + Storage + RLS)
- **AI:** Gemini 3.5 Flash-Lite (Google AI Studio) — free tier
- **Data source:** Web admin (Postgres via Supabase MCP applied migrations)

## Quick Start

```bash
npm install
# .env.local already configured
npm run dev      # dev mode
npm run build    # production build
npm start        # production server
```

Open [http://localhost:3000](http://localhost:3000).

## Database Schema

22 tables (all in `supabase/migrations/`), 38 RLS policies:
- **User data:** profiles, body_weight_logs, gyms, gym_equipment, user_programs, workouts, workout_exercises, workout_sets, workout_feedback, exercise_user_stats, personal_records, equipment_scans
- **System catalogs:** muscles, equipment
- **Exercise library:** exercises, exercise_muscles, exercise_equipment, exercise_media, exercise_alternatives
- **Training programs:** training_programs, training_program_days, training_day_targets
- **AI:** ai_recommendations, ai_interactions

## Seed Data

- 23 muscles, 23 equipment types
- 15 starter system exercises (compound + isolation)
- 6 system training programs (Upper/Lower, PPL, Full Body, Bro Split, Arnold…)
- 29 program days + 101 muscle targets

## AI Flows

1. **Workout Generation (`POST /api/workout/generate`):**
   - Build context (profile, day targets, gym equipment, recent sets)
   - Constraint engine filters candidate exercises by muscle + equipment + experience
   - Gemini picks 4-7 with sets/reps/RIR/rest
   - Stores `workouts` + `workout_exercises` rows + audit log

2. **Equipment Photo Detect (`POST /api/equipment/detect`):**
   - Upload image (max 5MB jpg/png/webp)
   - Save to private `equipment-scans` bucket
   - Gemini multimodal prompt with equipment catalog
   - Returns detected slugs + counts + confidence
   - UI merges auto-detected into gym equipment chip grid

3. **Coach Chat (Phase 2):** Stub ready in `src/lib/ai/`

## App Map

| Path | Purpose |
|------|---------|
| `/` | Landing |
| `/auth/{login,register,logout}` | Auth |
| `/onboarding` | 3-step profile setup |
| `/dashboard` | Today's workout + stats |
| `/exercises` + `/exercises/[slug]` | Library + Detail |
| `/gyms` + `/gyms/[id]` + `/gyms/new` | Gym mgmt (with AI photo detect) |
| `/programs` | Choose active training program |
| `/workouts` + `/workouts/[id]` + `/workouts/[id]/done` + `/workouts/new` | Workout lifecycle |
| `/profile` + `/profile/weight` | User profile + weight tracking |
| `/progress` | Analytics (buổi tập, body weight, PRs, top volume) |

## Environment Variables (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash-lite   # optional, default
```

## Build Verification

```bash
$ npx next build
✓ Compiled successfully
Route (app)                              Size     First Load JS
┌ ○ /                                    190 B          94.2 kB
├ ƒ /api/equipment/detect                0 B                0 B
├ ƒ /api/workout/generate                0 B                0 B
├ ƒ /auth/login                          1.19 kB         162 kB
├ ƒ /onboarding                          2.35 kB         156 kB
├ ƒ /dashboard                           190 B          94.2 kB
├ ƒ /exercises                           1.68 kB        95.7 kB
├ ƒ /exercises/[slug]                    190 B          94.2 kB
├ ƒ /gyms                                190 B          94.2 kB
├ ƒ /gyms/[id]                           190 B          94.2 kB
├ ƒ /gyms/new                            3.04 kB         157 kB
├ ƒ /profile                             1.87 kB         163 kB
├ ƒ /profile/weight                      1.09 kB         155 kB
├ ƒ /programs                            138 B          87.3 kB
├ ƒ /progress                            190 B          94.2 kB
├ ƒ /workouts                            190 B          94.2 kB
├ ƒ /workouts/[id]                       3.18 kB         157 kB
├ ƒ /workouts/[id]/done                  1.16 kB         162 kB
└ ƒ /workouts/new                        2.25 kB         89.4 kB
20 routes total
```

## Phase Status

### Phase 1 MVP — DONE ✅

| TIP | Feature | Status |
|-----|---------|--------|
| TIP-002 | DB schema (22 tables, RLS) | ✅ |
| TIP-003 | Seed (muscles, equipment, exercises, programs) | ✅ |
| TIP-004 | Auth (email/password) | ✅ |
| TIP-005 | Onboarding + Dashboard | ✅ |
| TIP-006 | Exercise Library + Detail | ✅ |
| TIP-007 | Gym + Equipment + Photo detect (Gemini) | ✅ |
| TIP-008 | Programs (6 system templates) | ✅ |
| TIP-009-015 | AI workout generation (constraint engine + Gemini) | ✅ |
| TIP-016 | Workout logger (active mode, rest timer, set editor) | ✅ |
| TIP-017 | Completion + Feedback | ✅ |
| TIP-018 | Progress analytics | ✅ |
| TIP-019 | Dashboard | ✅ |
| TIP-020 | Build verification | ✅ |

### Phase 2 — DONE ✅

- Layered AI (deterministic rules + Gemini explainer)
- Progressive overload rule engine (`src/lib/ai/rules.ts`)
- Plateau + deload detection
- Exercise substitution API (`/api/ai/recommendations` kind=substitute)
- Coach Chat `/coach` (Layer 3)
- Exercise AI content gen `/exercises/new`
- Weekly AI report `/weekly`
- Google OAuth (login/register + callback)
- Previous performance widget trong logger
- Recommendation Accept/Reject UI `/recommendations`

### Phase 3 — DONE ✅

- Trainer account + Coach dashboard
- Program marketplace (public share programs)
- Subscription tiers (Free/Pro/Elite) + Stripe checkout (demo mode)
- PWA (manifest + service worker)
- Social share workouts
- Gym database
- Voice AI (Web Speech API)
