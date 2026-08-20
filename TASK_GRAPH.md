# TASK GRAPH: GymAI Coach

## Vibecode Kit v6.1

| Field | Value |
|-------|-------|
| Project | GymAI Coach |
| Total TIPs | 32 (30 original + 2 added in Revision 2) |
| Phases | 3 |
| Generated | 2026-08-18 (Revision 2: same day) |
| Based on | `BLUEPRINT.md` + `RRI_REPORT.md` |

---

## PHASE OVERVIEW

| Phase | Priority | TIPs | Description |
|-------|----------|------|-------------|
| Phase 1 — MVP | P0–P1 | TIP-001 → TIP-007A (18 TIPs) | Exercise mgmt + Gym + photo detect → Program → AI → Logger → Progress → Dashboard |
| Phase 2 — Advanced AI + Admin | P1 | TIP-017 → TIP-023 | AI Coach chat, plateau detection, weekly report, admin content generation |
| Phase 3 — Growth | P2–P3 | TIP-024 → TIP-030 | Video generation, preference learning, PWA, payments, multi-region |

---

## PHASE 1 — MVP (Revision 2 ordering)

### Core Loop (Build Order)

```
Scaffold (TIP-001)
    ↓
Design System (TIP-002)
    ↓
Database + RLS (TIP-003)
    ↓
Auth (TIP-004)
    ↓
Profile + Body Weight (TIP-005)
    ↓
Gym + Equipment Catalog (TIP-006)
    ↓
Photo Equipment Detection (TIP-006A) ← NEW, Modal in TIP-006
    ↓
Exercise Library (text data) (TIP-007)
    ↓
Web Image Seed for Exercises (TIP-007A) ← NEW, via Gemini Search grounding
    ↓
Exercise Management UI (TIP-021A) ← NEW, prioritized in Phase 1
    ↓
Program System (TIP-008)
    ↓
AI Layer 1 — Workout Planner (TIP-009)
    ↓
AI Layer 2 — Personalization (TIP-010) ← Planner (TIP-009)
    ↓
Workout Logger UI (TIP-011) ← Planner (TIP-009) + Equipment (TIP-006)
    ↓
Workout Completion (TIP-012) ← Logger (TIP-011)
    ↓
Progress Page (TIP-013) ← Completion + Profile
    ↓
AI Layer 3 — Coach Recommendations (TIP-015) ← Planner + Logger
    ↓
Dashboard (TIP-014) ← Profile + Logger + Progress + AI
    ↓
VERIFY Phase 1 (TIP-016)
```

**Revision 2 changes:**
- Exercise (TIP-007) moved BEFORE Gym (was after)
- New TIP-006A: Photo Equipment Detection (integrated in Create Gym form)
- New TIP-007A: Web Image Seed for exercises (Gemini Search grounding)
- New TIP-021A: Exercise Management UI (moved from TIP-007 + TIP-020, prioritized in Phase 1)
- Total Phase 1: **18 TIPs** (was 16)

---

## PHASE 2 — Advanced AI + Admin

```
VERIFY Phase 1 (TIP-016)
    ↓
AI Coach Chat (TIP-017) ← Phase 1 dashboard + profile
    ↓
Plateau Detection + PR (TIP-018) ← Phase 1 progress data
    ↓
Weekly AI Report (TIP-019) ← Plateau (TIP-018) + Chat (TIP-017)
    ↓
Admin Exercise CRUD (TIP-020) ← Phase 1 exercise library
    ↓
AI Generate Content (TIP-021) ← Admin CRUD (TIP-020)
    ↓
AI Generate Image (TIP-022) ← Admin CRUD (TIP-020)
    ↓
VERIFY Phase 2 (TIP-023)
```

---

## PHASE 3 — Growth

```
VERIFY Phase 2 (TIP-023)
    ↓
AI Video Generation (TIP-024) ← Phase 2 image gen
    ↓
Exercise Preference Learning (TIP-025) ← Phase 1 logger data
    ↓
Advanced Volume Management (TIP-026) ← Phase 1 progress
    ↓
Multi-region CDN + Perf (TIP-027)
    ↓
PWA + Offline Logger (TIP-028) ← Phase 1 logger UI
    ↓
Subscription + Payments (TIP-029)
    ↓
VERIFY Phase 3 + X-Ray Handover (TIP-030)
```

---

## TIP DETAILS

---

### TIP-001: Project Scaffold

| Field | Value |
|-------|-------|
| TIP-ID | TIP-001 |
| Phase | 1 |
| Module | Infrastructure |
| Depends on | None |
| Priority | P0 |
| Estimated effort | 60–90 min |

#### Context

No source files exist. Starting from zero. Need to scaffold full Next.js + Cloudflare + Supabase + shadcn/ui stack before any feature code.

#### Task

Initialize the entire project infrastructure:

1. Create Next.js project with TypeScript, App Router, Tailwind, ESLint, Prettier
2. Configure `@opennextjs/cloudflare` adapter (wrangler.toml, opennext.config.ts)
3. Install and configure `shadcn/ui` — init with chassis `#e0e5ec` base color
4. Install core dependencies: `@supabase/ssr`, `zustand`, `react-hook-form`, `zod`, `@hookform/resolvers`, `recharts`, `lucide-react`, `@google/generative-ai`, `fal` npm, `clsx`, `tailwind-merge`, `class-variance-authority`
5. Set up `src/lib/supabase/server.ts` and `src/lib/supabase/browser.ts`
6. Create `.env.example` with all required variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `FAL_API_KEY`, `BYESU_API_KEY`
7. Set up `src/middleware.ts` for auth session refresh
8. Create `src/types/database.ts` stub (will be generated from Supabase after migrations)
9. Create `src/lib/utils.ts` with `cn()`, `formatWeight()`, `formatDuration()`, `formatDate()` utilities
10. Configure `next.config.ts` with image domains for Supabase Storage

#### Specifications

- pnpm as package manager
- TypeScript strict mode
- ESLint + Prettier with industrial theme settings
- Cloudflare Workers as deployment target (no Vercel-specific features)
- All env vars are placeholders in `.env.example`, no real values

#### Acceptance Criteria

- `pnpm dev` starts without errors
- `pnpm build` completes successfully
- `pnpm wrangler dev` starts Cloudflare preview
- Supabase client initializes correctly (can be mocked for now)
- All env vars documented in `.env.example`

#### Constraints

- Do NOT run `npx supabase init` here — that's in TIP-003
- Do NOT create any feature components
- Do NOT set up real Supabase project yet — just the client stubs

---

### TIP-002: Design System Foundation

| Field | Value |
|-------|-------|
| TIP-ID | TIP-002 |
| Phase | 1 |
| Module | UI / Design System |
| Depends on | TIP-001 |
| Priority | P0 |
| Estimated effort | 90–120 min |

#### Context

Industrial Skeuomorphism × Training Control System design system must be codified in code before any feature component. This creates the primitive components other features will build on.

#### Task

Implement the complete design system foundation:

1. **CSS Variables** — Add to `src/app/globals.css`:
   - All `--color-*` tokens from Blueprint §Design System
   - All `--shadow-*` tokens
   - All `--radius-*` tokens
   - `--font-sans: 'Inter', sans-serif`
   - `--font-mono: 'JetBrains Mono', monospace`
   - Animation tokens: `--ease-mechanical`, `--duration-press`, `--duration-hover`
   - Breakpoint CSS custom properties

2. **Industrial Components** (in `src/components/industrial/`):
   - `IndustrialCard.tsx` — variants: default, raised, technical, dark; props: variant, interactive, screws, vents
   - `IndustrialButton.tsx` — variants: primary (red accent), secondary, ghost; props: loading, disabled; press animation
   - `IndustrialInput.tsx` — recessed style, JetBrains Mono for numbers, large touch targets
   - `IndustrialScreen.tsx` — dark recessed panel for charts, timer, metrics
   - `LedIndicator.tsx` — props: color (green/red/yellow/blue), pulse, label
   - `TechnicalLabel.tsx` — uppercase monospace label, letter-spacing
   - `MetricDisplay.tsx` — large JetBrains Mono number display
   - `PhysicalToggle.tsx` — iOS-style toggle with mechanical feel
   - `SegmentControl.tsx` — RIR selector style: [0][1][2][3][4+]
   - `ScrewDecoration.tsx` — decorative corner screws
   - `VentDecoration.tsx` — decorative vent slots

3. **shadcn/ui base components** — Install and configure:
   - `button`, `card`, `input`, `label`, `select`, `dialog`, `modal`, `toast`, `badge`, `separator`, `skeleton`, `progress`, `dropdown-menu`, `checkbox`, `radio-group`, `switch`, `tabs`

4. **Utility** — Extend `src/lib/utils.ts`:
   - `formatWeight(kg, unitSystem)` → "62.5 KG" or "137.5 LB"
   - `formatReps(reps)` → "8 reps"
   - `formatDuration(minutes)` → "75 MIN"
   - `formatRIR(rir)` → "RIR 2"
   - `calculate1RM(weight, reps)` → Epley formula
   - `calculateVolume(sets)` → sum(weight × reps per set)

#### Specifications

- Every industrial component maps exactly to Blueprint §Design System tokens
- Button press: `translateY(2px)` in 150ms on active state
- Card hover on desktop: `translateY(-4px)` in 300ms
- All interactive elements min 48px touch target
- `prefers-reduced-motion` disables all animations
- LED pulse: CSS animation, 2s cycle, ease-in-out

#### Acceptance Criteria

- All 11 industrial components exist and render correctly
- shadcn/ui components use Industrial theme (override default styles)
- CSS variables match Blueprint token values exactly
- Responsive at all breakpoints (375px / 768px / 1024px / 1280px)
- Accessibility: WCAG AA contrast, keyboard nav, focus states, aria-labels

#### Constraints

- Do NOT implement feature-specific components (WorkoutCard, ExerciseCard, etc.) — those come later
- Do NOT create pages/routes — only primitives
- Do NOT hard-code Vietnamese strings — use i18n-ready keys (even if not wired yet)

---

### TIP-003: Database Schema + RLS Migrations

| Field | Value |
|-------|-------|
| TIP-ID | TIP-003 |
| Phase | 1 |
| Module | Backend / Database |
| Depends on | TIP-001 |
| Priority | P0 |
| Estimated effort | 90–120 min |

#### Context

The database schema defines every table, relationship, index, and RLS policy. This is foundational — all features depend on it. Must be created as numbered Supabase migrations for version control.

#### Task

Create all Supabase migrations in `supabase/migrations/`:

1. **`0001_init.sql`** — Core tables:
   - `profiles` (with OQ-1 injury fields: `has_shoulder_injury`, `has_back_injury`, `has_knee_injury`)
   - `body_weight_logs`
   - `muscles`
   - `equipment`
   - `exercises` (SYSTEM/CUSTOM, name + name_vi)
   - `exercise_muscles` (M:N)
   - `exercise_equipment` (M:N)
   - `exercise_media`
   - `exercise_alternatives` (M:N self-referential)
   - `gyms`
   - `gym_equipment` (M:N)
   - `training_programs` (templates + custom)
   - `training_program_days`
   - `training_day_targets`
   - `user_programs`
   - `workouts`
   - `workout_exercises`
   - `workout_sets`
   - `workout_feedback`
   - `exercise_user_stats`
   - `personal_records`
   - `ai_recommendations`
   - `ai_interactions` (audit log for OQ-4 foundation)
   - All `id`, `created_at`, `updated_at` conventions
   - Indexes on `user_id`, foreign keys, `status` columns

2. **`0002_rls_policies.sql`** — All RLS policies:
   - Owner-scoped: `auth.uid() = user_id` for workouts, gyms, body_weight_logs, ai_recommendations, ai_interactions, etc.
   - System read: anyone authenticated can read exercises where `type = 'SYSTEM' AND status = 'Published'`
   - System write: admin only for muscles, equipment, system exercises
   - `is_admin()` function: checks `auth.jwt() -> 'user_metadata' -> 'is_admin'`
   - Enable RLS on every table

3. **`0003_functions.sql`** — Database functions + triggers:
   - `updated_at` trigger on all tables with `updated_at` column
   - `is_admin()` helper function
   - `get_user_active_gym(user_id)` view
   - `get_exercise_stats(user_id, exercise_id)` function returning last 5 sessions + trend

4. **`0004_seed_muscles.sql`** — Seed 20 muscle groups:
   - Chest, Upper Back, Lower Back, Shoulders (Ant/Med/Post), Biceps, Triceps, Forearms, Abs (Upper/Lower), Obliques, Quads, Hamstrings, Glutes, Adductors, Abductors, Calves

5. **`0005_seed_equipment.sql`** — Seed 30+ equipment types:
   - Dumbbell, Barbell, EZ Bar, Trap Bar, Kettlebell, Bench (Flat/Incline/Decline), Cable Machine, Smith Machine, Leg Press, Hack Squat, Squat Rack, Pull-up Bar, Dip Station, Chest Press Machine, Pec Deck, Lat Pulldown, Seated Row, T-Bar Row, Leg Extension, Leg Curl, Calf Raise Machine, Hip Thrust Machine, Resistance Band, Pull-up Assist Machine, Battle Rope, Plyo Box, Medicine Ball, TRX

6. **`0006_seed_exercises.sql`** — Seed ~150 system exercises:
   - 5-10 exercises per major muscle group
   - Each: name EN, name VI, primary muscle, secondary muscles, equipment, difficulty, exercise_type, instructions (JSON), tips, common_mistakes
   - Use real gym exercise data from spec.md §9.1
   - All status = 'Published', type = 'SYSTEM'

7. **`0007_seed_programs.sql`** — Seed 6 system templates:
   - Upper/Lower Split (4 days)
   - Push/Pull/Legs (6 days)
   - Push/Pull/Legs + Upper/Lower (4 days) — hybrid
   - Full Body (3 days)
   - Bro Split (5-6 days)
   - Arnold Split (6 days)
   - Each with training_program_days + training_day_targets (muscle groups + sets)

8. **`0008_admin_role.sql`** — Admin role setup:
   - Function to promote user to admin
   - Seed one admin account for development

9. **`supabase/seed.sql`** — Development seed:
   - One demo user
   - Demo gym
   - 1 week of sample workouts
   - Demo progress data

#### Specifications

- All migrations are idempotent (use `CREATE TABLE IF NOT EXISTS`, `DROP TRIGGER IF EXISTS`)
- All timestamps use `TIMESTAMPTZ DEFAULT now()`
- All UUID primary keys use `gen_random_uuid()` default
- Enum types for: `set_type`, `workout_status`, `exercise_status`, `experience_level`, `unit_system`, `goal`, `recommendation_status`, `ai_interaction_status`

#### Acceptance Criteria

- All 8 migration files exist and run in order without error
- `supabase db diff` shows no drift after running migrations
- RLS policies: `auth.uid() = user_id` enforced on all owner-scoped tables
- System exercises are readable by any authenticated user
- `is_admin()` correctly gates admin operations
- Seed data loads without error
- `npx supabase db reset` resets cleanly

#### Constraints

- Do NOT create Supabase project yet — just migration files
- Do NOT put real API keys in migrations
- Do NOT use `CASCADE` on user data deletes that bypass RLS

---

### TIP-004: Supabase Auth Integration

| Field | Value |
|-------|-------|
| TIP-ID | TIP-004 |
| Phase | 1 |
| Module | Auth |
| Depends on | TIP-001, TIP-003 |
| Priority | P0 |
| Estimated effort | 60–90 min |

#### Context

Authentication is the gate for everything. Need email/password + Google OAuth, with proper session handling via Supabase SSR for Next.js App Router.

#### Task

1. **Auth Server Actions** (`src/app/actions/auth.ts`):
   - `signUp(email, password, displayName)` → Supabase `signUp`
   - `signIn(email, password)` → Supabase `signInWithPassword`
   - `signInWithGoogle()` → returns URL to redirect to Google OAuth
   - `signOut()` → Supabase `signOut`
   - `getSession()` → returns current user or null

2. **Auth Pages** (`src/app/(auth)/`):
   - `login/page.tsx` — email/password form + Google OAuth button
   - `signup/page.tsx` — email/password form + terms checkbox
   - `callback/route.ts` — handles OAuth redirect, creates profile row on first login

3. **Middleware** (`src/middleware.ts`):
   - Refresh session on every request
   - Redirect unauthenticated users away from `/(app)/*`
   - Allow `/(auth)/*`, `/onboarding/*`, `/api/ai/generate-workout` (auth handled inside)

4. **Profile auto-creation**:
   - Trigger on `auth.users` insert → create `profiles` row
   - Default `unit_system = 'kg'`

5. **Auth UI components**:
   - Styled login/signup forms matching Industrial design
   - Error states: invalid credentials, email taken, network error
   - Loading states during OAuth redirect

#### Specifications

- Session stored in HTTP-only cookies via `@supabase/ssr`
- Google OAuth configured via Supabase dashboard (client ID/secret set in env)
- On first Google OAuth login: create profile row with Google `raw_user_meta_data`
- CSRF protection via Next.js built-in origin check
- Sign out clears all cookies + redirects to login

#### Acceptance Criteria

- Email/password signup creates auth user + profile
- Email/password login redirects to `/dashboard` or `/onboarding`
- Google OAuth completes login flow and redirects correctly
- Unauthenticated access to `/dashboard` redirects to `/login`
- Session persists across page refreshes
- Sign out clears session completely

#### Constraints

- Do NOT handle auth in client components directly — always via Server Actions
- Do NOT store auth tokens in localStorage
- Do NOT skip RLS — session is for UX, RLS is for security

---

### TIP-005: Profile + Onboarding Flow + Body Weight Tracking

| Field | Value |
|-------|-------|
| TIP-ID | TIP-005 |
| Phase | 1 |
| Module | Profile |
| Depends on | TIP-001, TIP-003, TIP-004 |
| Priority | P0 |
| Estimated effort | 90–120 min |

#### Context

Profile is set during onboarding (first login) and body weight tracking is a daily habit. This TIP covers the complete profile experience including the multi-step onboarding wizard.

#### Task

1. **Profile Server Actions** (`src/app/actions/profile.ts`):
   - `updateProfile(data)` — update profile including injury flags (OQ-1)
   - `getProfile()` — fetch current user profile
   - `recordBodyWeight(weight, date, note)` — insert into `body_weight_logs`
   - `getBodyWeightHistory(days)` — select with computed 7-day and 30-day deltas
   - `deleteBodyWeightLog(id)` — soft delete

2. **Onboarding Wizard** (`src/app/onboarding/`):
   - `layout.tsx` — step indicator (4 steps)
   - `step-1-profile/page.tsx` — display name, height, weight, goal, experience, injury checkboxes (OQ-1), preferred training days, session duration
   - `step-2-program/page.tsx` — select template (PPL+UL default), view program overview
   - `step-3-gym/page.tsx` — create first gym, select equipment from catalog
   - `step-4-ready/page.tsx` — celebration screen, start first workout CTA
   - Each step validates before allowing next

3. **Profile Page** (`src/app/(app)/profile/page.tsx`):
   - View/edit profile
   - Update injury flags
   - Change unit system (kg/lb) — affects all weight displays

4. **Body Weight Components** (`src/components/progress/BodyWeightChart.tsx`):
   - Recharts LineChart, dark screen style
   - Current weight, 7-day change, 30-day change
   - Quick-add widget: enter today's weight in 2 taps

5. **Body Weight History** (`src/app/(app)/progress/` integration):
   - Show chart on Progress page
   - List view of all entries with delete option

#### Specifications

- Injury checkboxes: `has_shoulder_injury`, `has_back_injury`, `has_knee_injury` — all optional (OQ-1)
- Onboarding completion sets `profiles.onboarding_completed = true`
- Body weight chart: dark recessed screen style, JetBrains Mono for numbers
- 7-day delta: `current - weight_7_days_ago`
- 30-day delta: `current - weight_30_days_ago`
- Unit conversion: kg↔lb factor = 2.20462

#### Acceptance Criteria

- Onboarding completes in 4 steps, creates profile + first gym + user_program
- Profile edit saves and reflects immediately
- Injury flags saved and appear in AI Context Builder (TIP-009)
- Body weight chart renders with real or mock data
- Daily weight entry works with date picker (defaults to today)
- Unit system toggle converts all displayed weights

#### Constraints

- Do NOT skip validation — all required profile fields must be filled before onboarding complete
- Do NOT create profile during auth callback if profile already exists
- Do NOT hard-code weight display format — use `formatWeight()` from TIP-002

---

### TIP-006: Equipment + Gym Management

| Field | Value | | |
| TIP-ID | TIP-006 | Phase | 1 |
| Module | Gym | Depends on | TIP-001, TIP-003 |
| Priority | P0 | Estimated effort | 60–90 min |

#### Context

Users need to create and manage multiple gyms (e.g., VinUni Gym, Home Gym), each with a specific set of available equipment. The AI workout planner uses gym equipment to filter which exercises are available.

#### Task

1. **Gym Server Actions** (`src/app/actions/gym.ts`):
   - `createGym(data)` — insert gym + gym_equipment rows
   - `updateGym(id, data)` — update gym + sync equipment
   - `deleteGym(id)` — cascade delete gym_equipment
   - `getGyms()` — list user's gyms
   - `getGymDetail(id)` — gym with equipment list
   - `setActiveGym(gymId)` — set as `profiles.active_gym_id`

2. **Gyms List Page** (`src/app/(app)/gyms/page.tsx`):
   - Grid of gym cards
   - Active gym highlighted with LED indicator
   - "Add Gym" button → `/gyms/new`
   - Each card shows: name, equipment count, active badge

3. **Gym Detail/Edit Page** (`src/app/(app)/gyms/[id]/page.tsx`):
   - Gym name, description, note
   - Equipment selector: searchable chip grid (UI §39)
   - Chips show system equipment names
   - Selected = pressed appearance + accent indicator

4. **Gym Card Component** (`src/components/gym/GymCard.tsx`):
   - IndustrialCard variant
   - Shows gym name, equipment list (first 5 + "...")
   - Active LED indicator
   - Edit button, Delete button (with confirmation modal)

5. **Equipment Selector** (`src/components/gym/GymEquipmentSelector.tsx`):
   - Searchable input filters system equipment list
   - Chip grid: selected = pressed state
   - Shows: name + icon per equipment type

#### Specifications

- Gym belongs to exactly one user (RLS enforced)
- Equipment selector shows all system equipment from `equipment` table
- When user changes gym's equipment, the AI Context Builder reads the updated gym_equipment
- Active gym defaults to first created gym
- Gym deletion requires confirmation modal

#### Acceptance Criteria

- User can create gym with name + equipment selection
- User can edit gym name and equipment
- User can delete gym (with confirmation)
- Active gym indicator shows on gym card and in dashboard
- Switching active gym updates AI workout generation
- Equipment chips filter correctly when searching

#### Constraints

- Do NOT allow user to delete their last gym (must have at least 1)
- Do NOT allow duplicate gym names for the same user
- Do NOT include custom equipment (only system catalog in MVP)

---

### TIP-007: Exercise Library

| Field | Value |
|-------|-------|
| TIP-ID | TIP-007 |
| Phase | 1 |
| Module | Exercise |
| Depends on | TIP-001, TIP-003 |
| Priority | P0 |
| Estimated effort | 90–120 min |

#### Context

Users browse a library of exercises to understand each movement. This is also where admins manage system exercises. Exercise data drives the AI Constraint Engine — every exercise has primary muscle, secondary muscles, equipment, difficulty, and instructions.

#### Task

1. **Exercise Server Actions** (`src/app/actions/exercise.ts`):
   - `searchExercises(query, filters)` — full-text search + filter by muscle/equipment/difficulty/type
   - `getExerciseDetail(id)` — exercise with muscles, equipment, alternatives, media
   - `createCustomExercise(data)` — insert CUSTOM exercise for user
   - `getMuscleGroups()` — list all muscles
   - `getSystemEquipment()` — list all equipment

2. **Exercise Library Page** (`src/app/(app)/exercises/page.tsx`):
   - Search input (recessed style)
   - Filters: muscle group, equipment, difficulty, type
   - Grid: 3 cols desktop / 2 tablet / 1 mobile
   - Each card: image area (grayscale → color on hover), name, muscle, equipment badge, type badge

3. **Exercise Card** (`src/components/exercise/ExerciseCard.tsx`):
   - IndustrialCard with image (placeholder if none)
   - Name (uppercase technical label)
   - Primary muscle
   - Secondary muscles (truncated)
   - Equipment list badge
   - Difficulty indicator
   - Exercise type badge

4. **Exercise Detail Page** (`src/app/(app)/exercises/[id]/page.tsx`):
   - Layout: LEFT 60% media, RIGHT 40% info (desktop)
   - Sections: Name EN/VI, Muscle, Equipment, Instructions (STEP 01/02/03), Tips, Common Mistakes, Alternatives
   - Instructions rendered as modular mechanical steps (UI §35)
   - Alternatives list → link to each

5. **Exercise Filters** (`src/components/exercise/ExerciseFilters.tsx`):
   - Muscle group chips
   - Equipment chips
   - Difficulty radio
   - Type radio
   - "Clear all" button

6. **Create Custom Exercise** (`src/app/(app)/exercises/new/page.tsx`):
   - Form: name EN, name VI, primary muscle (select), secondary muscles (multi-select), equipment (multi-select), difficulty, type, instructions (step builder), tips, common mistakes

#### Specifications

- System exercises (type=SYSTEM, status=Published) visible to all authenticated users
- Custom exercises visible only to owner
- Search: `name ILIKE %query% OR name_vi ILIKE %query%`
- Filters combine with AND logic
- Instructions stored as JSON array of steps, rendered as STEP XX modules
- Exercise alternatives from `exercise_alternatives` table

#### Acceptance Criteria

- Exercise library loads with 150+ system exercises
- Search filters results in real-time
- All filter combinations work correctly
- Exercise detail shows all fields with proper formatting
- Custom exercise creation saves and appears in library for owner
- Instruction steps render as mechanical modules

#### Constraints

- Do NOT allow user to edit system exercises (only copy to custom)
- Do NOT load all exercises at once — use pagination or infinite scroll
- Do NOT show deleted/archived exercises to regular users

---

### TIP-008: Program System

| Field | Value |
|-------|-------|
| TIP-ID | TIP-008 |
| Phase | 1 |
| Module | Program |
| Depends on | TIP-001, TIP-003, TIP-007 |
| Priority | P0 |
| Estimated effort | 90–120 min |

#### Context

Training programs define what muscle groups to train on which days. Users pick a template during onboarding or create custom splits. The AI Context Builder reads today's program day to know what muscles to target.

#### Task

1. **Program Server Actions** (`src/app/actions/program.ts`):
   - `getProgramTemplates()` — list system + user's custom programs
   - `getProgramDetail(id)` — program with days + targets
   - `getActiveProgram(userId)` — today's active program + current day + targets
   - `createCustomProgram(data)` — insert program + days + targets
   - `updateProgram(id, data)` — update program + sync days
   - `selectProgram(programId, schedule)` — create/update user_programs entry
   - `getWeeklySchedule()` — T2-T7 + CN mapping to program days

2. **Programs Page** (`src/app/(app)/programs/page.tsx`):
   - Tab: "MẪU" (system templates) / "LỊCH CỦA TÔI" (custom)
   - Template cards: Upper/Lower, PPL, PPL+UL, Full Body, Bro Split, Arnold
   - Each card: name, days, difficulty, target muscles, "Chọn" button

3. **Program Detail Page** (`src/app/(app)/programs/[id]/page.tsx`):
   - Desktop: MON/TUE/... schedule grid
   - Each day: day name, workout type (Upper/Lower/Push/etc.), target muscles + volume
   - Edit button (custom programs only)
   - "Chọn chương trình này" CTA

4. **Program Builder** (`src/app/(app)/programs/new/page.tsx`):
   - Step 1: Program name, description
   - Step 2: Define days — select day, name (e.g., "Upper A"), add muscle targets with sets
   - Step 3: Set weekly schedule — map program days to weekdays
   - Preview: weekly calendar view

5. **Weekly Schedule Grid** (`src/components/program/WeeklyScheduleGrid.tsx`):
   - 7-column grid (T2-T7 + CN)
   - Each cell: workout name or "Nghỉ"
   - Active day highlighted with accent

6. **Program Day Builder** (`src/components/program/ProgramDayBuilder.tsx`):
   - Add muscle target: select muscle + sets
   - Visual volume bar per muscle
   - Auto-calculate total weekly volume

#### Specifications

- System templates are read-only (USER cannot edit, only select)
- Custom programs belong to user (RLS enforced)
- `user_programs` table links user → program + chosen schedule (which weekdays map to which days)
- AI Context Builder reads `training_program_days` + `training_day_targets` for today

#### Acceptance Criteria

- Program page shows all 6 system templates
- Selecting a template creates `user_programs` entry
- Custom program creation works end-to-end
- Weekly schedule displays correctly
- Today's training day is highlighted on dashboard

#### Constraints

- Do NOT allow user to edit system templates
- Do NOT allow duplicate program names for same user
- Do NOT hard-code template IDs — read from database

---

### TIP-009: AI Layer 1 — Workout Planner (Constraint Engine + Gemini)

| Field | Value |
|-------|-------|
| TIP-ID | TIP-009 |
| Phase | 1 |
| Module | AI |
| Depends on | TIP-001, TIP-003, TIP-005, TIP-006, TIP-007, TIP-008 |
| Priority | P0 |
| Estimated effort | 120–180 min |

#### Context

This is the core AI loop. When user clicks "Generate with AI", the system builds context → runs Constraint Engine → calls Gemini → validates output → returns preview to UI. User reviews and accepts or rejects.

#### Task

1. **AI Context Builder** (`src/lib/ai/context-builder.ts`):
   - `buildWorkoutContext(userId, programDayId, gymId): AIContext`
   - Fetches: profile (goal, experience, injury flags OQ-1), program_day targets, gym equipment, candidate exercises, recent performance, body weight trend, recent feedback
   - Returns structured JSON (never raw DB dumps to LLM)

2. **Constraint Engine** (`src/lib/ai/constraint-engine.ts`):
   - `filterCandidates(ctx: AIContext): Exercise[]`
   - Filters:
     - Primary muscle ∈ day_targets
     - All required equipment ∈ gym_equipment
     - Difficulty ≤ user experience level
     - Not in recent blacklist (same exercise not trained in last 3 sessions)
     - If injury flag set → exercise not targeting injured area OR has known alternative
   - Returns ranked candidate list with score

3. **Rule Engine** (`src/lib/ai/rule-engine.ts`):
   - Progressive overload check: if all sets completed with reps ≥ upper range and RIR ≤ 2, recommend +weight next session
   - Struggle check: if RIR = 0-1 and reps < lower range, recommend hold or -weight
   - Returns `Recommendation[]` — these go into `ai_recommendations` table

4. **Gemini Client** (`src/lib/gemini/client.ts`):
   - `generateWorkout(ctx, candidates): WorkoutOutput`
   - Uses `@google/generative-ai`
   - System prompt from `src/lib/gemini/prompts/workout-generation.ts`
   - Structured output via `responseMimeType: 'application/json'` + JSON schema
   - Max 4096 output tokens, temperature 0.7

5. **Output Schema** (`src/lib/gemini/schemas/workout.ts`):
   - Zod schema matching Blueprint §AI Pipeline output
   - Validates: exercise IDs in candidates, volume ±10% of target, rest 30-600s, RIR 0-4

6. **AI Generate Route Handler** (`src/app/api/ai/generate-workout/route.ts`):
   - Auth check → `getUser()`
   - Build context → run engine → call Gemini → validate → log to `ai_interactions`
   - Return `{ preview, interactionId }` or throw on error

7. **Workout Generation UI** (`src/components/ai/AIWorkoutGenerator.tsx`):
   - "Generate with AI" button on Workout Today page
   - Loading state: "READING TRAINING HISTORY... / CHECKING EQUIPMENT... / BUILDING WORKOUT..."
   - Preview: shows exercises, sets, weights, RIR
   - Actions: [Accept] [Reject] [Edit]
   - On Accept → Server Action saves to DB
   - On Reject → dismisses

8. **Prompt Templates** (`src/lib/gemini/prompts/workout-generation.ts`):
   - System prompt: role = "elite strength coach", constraints in Vietnamese, output as JSON schema
   - User prompt: assembles context + candidates into readable text for Gemini

#### Specifications

- AI NEVER auto-saves — always returns preview for user confirmation
- Every Gemini call logged to `ai_interactions` (OQ-4 foundation)
- Constraint Engine runs BEFORE Gemini call (filter candidates, not post-filter)
- Output validation rejects invalid JSON or out-of-range values
- Gemini API key accessed only server-side via Cloudflare secret binding

#### Acceptance Criteria

- Generate workout returns structured plan with exercises, sets, reps, weights, RIR, rest
- All exercises are valid for user's gym equipment
- All exercises target today's program day muscles
- Rejecting regenerates (clears preview, allows re-generate)
- Accepting saves workout to DB and navigates to `/workout/[id]/active`
- Error state: shows toast if Gemini fails, allows retry

#### Constraints

- Do NOT send raw database to Gemini — always through Context Builder
- Do NOT save workout without user confirmation
- Do NOT expose Gemini API key in client bundle
- Do NOT skip output validation

---

### TIP-010: AI Layer 2 — Personalization (History Context + RIR-based Suggestions)

| Field | Value |
|-------|-------|
| TIP-ID | TIP-010 |
| Phase | 1 |
| Module | AI |
| Depends on | TIP-009 |
| Priority | P0 |
| Estimated effort | 60–90 min |

#### Context

Layer 2 enhances Layer 1 by including user's recent workout history in the AI Context. This allows Gemini to suggest weights based on last session, adjust volume for fatigue, and personalize based on RIR patterns.

#### Task

1. **Enhanced Context Builder** (`src/lib/ai/context-builder.ts` update):
   - Add `recentSessions: RecentSession[]` — last 5 sessions per exercise
   - Add `bodyWeightTrend: 'increasing' | 'stable' | 'decreasing'`
   - Add `fatigueScore: number` — derived from recent RIR average
   - This context is passed to Gemini in Layer 2

2. **Performance Trend Analysis** (`src/lib/ai/trend-analyzer.ts`):
   - `analyzeExerciseTrend(exerciseId, userId): 'improving' | 'stable' | 'plateau' | 'declining'`
   - Uses last 6 sessions of working sets
   - Logic: if avg weight trending up → improving; if same → plateau; if down → declining

3. **Fatigue-Adjusted Volume** (`src/lib/ai/fatigue-advisor.ts`):
   - `calculateFatigueScore(recentRIRs): number` — 0 (fresh) to 10 (exhausted)
   - If fatigueScore > 7 → suggest -10% volume or deload
   - If fatigueScore < 3 → suggest +5% volume

4. **RIR-Based Weight Adjustment**:
   - Gemini prompt updated to include: "If user's recent sessions had RIR consistently < 2, suggest +2.5-5kg. If RIR > 3, suggest same or -2.5kg."

5. **Personalization Prompt** (`src/lib/gemini/prompts/workout-generation.ts` update):
   - Add section: recent performance context
   - Add section: fatigue-aware volume adjustment
   - Add section: RIR-based weight progression

#### Specifications

- Layer 2 uses same Gemini call as Layer 1 but with richer context
- Performance trend computed server-side before prompt assembly
- Fatigue score derived from `workout_sets.rir` over last 7 days
- If user has < 3 sessions for an exercise → no trend, use generic suggestion

#### Acceptance Criteria

- Generated workouts reflect user's recent performance (not generic)
- If user recently hit 8 reps at 60kg with RIR 1 → next suggestion is 62.5kg
- If fatigue score high → lower volume suggestion
- Exercise selection considers recent history (no repeat exercises within 3 days of same muscle)

#### Constraints

- Do NOT show raw database values in UI
- Do NOT make AI decisions without user review
- Do NOT calculate trends on < 3 sessions

---

### TIP-011: Workout Logger UI (Mobile-first, Set Input, RIR, Rest Timer)

| Field | Value |
|-------|-------|
| TIP-ID | TIP-011 |
| Phase | 1 |
| Module | Workout Logger |
| Depends on | TIP-001, TIP-002, TIP-003, TIP-009 |
| Priority | P0 |
| Estimated effort | 120–180 min |

#### Context

This is the most important screen on mobile — where the user logs sets at the gym, potentially sweating, with one hand, in 30 seconds between sets. Every design decision serves speed and clarity.

#### Task

1. **Workout Logger Store** (`src/stores/workout-logger.ts` — Zustand):
   - Current workout state: exercises, current exercise index, current set number
   - Draft sets (not yet saved)
   - Rest timer state (running, elapsed, target)
   - Elapsed workout time

2. **Active Workout Page** (`src/app/(app)/workout/[id]/active/page.tsx`):
   - Header: "● SESSION ACTIVE" (green blinking LED) + elapsed time + exercise X/Y
   - Exercise name (uppercase technical label)
   - Previous performance: last session's sets (read-only, recessed)
   - Target: weight, rep range, RIR target
   - Current set input: TẠ (weight), REPS, RIR buttons, LOẠI SET dropdown
   - Rest timer panel
   - "HOÀN THÀNH SET" primary button (56px tall)

3. **Workout Set Logger** (`src/components/workout/WorkoutSetLogger.tsx`):
   - Large numeric inputs (recessed, JetBrains Mono, 48px min height)
   - Weight input with quick +/- 2.5kg buttons
   - Reps input with +/- 1 buttons
   - Auto-advance to next set on complete

4. **RIR Selector** (`src/components/workout/RIRSelector.tsx`):
   - Physical segmented buttons: [0] [1] [2] [3] [4+]
   - Selected = pressed state + accent LED
   - Tooltip on hover: "RIR = số rep bạn nghĩ mình còn có thể làm thêm"

5. **Set Type Selector** (`src/components/workout/SetTypeSelector.tsx`):
   - Dropdown/select with options: Khởi động / Set chính / Drop Set / Đến thất bại
   - Default: Set chính

6. **Rest Timer** (`src/components/workout/RestTimer.tsx`):
   - Dark recessed screen style
   - Large monospace display: "01:42"
   - Controls: +30s, PAUSE, SKIP
   - Auto-starts on "HOÀN THÀNH SET"
   - Subtle scanline effect
   - Sound/vibration on complete (optional, respects device settings)

7. **Previous Performance** (`src/components/workout/PreviousPerformance.tsx`):
   - Shows last session's sets for current exercise
   - Format: "60 KG × 8 | 60 KG × 8 | 57.5 KG × 9"
   - Read-only, recessed style

8. **Exercise Replacement** (`src/components/workout/ExerciseSwap.tsx`):
   - "[Đổi bài]" button
   - Shows AI-ranked alternatives (muscle match + equipment available)
   - Select → replaces current exercise in workout

9. **Finish Workout Modal** (`src/components/workout/FinishWorkoutModal.tsx`):
   - Triggered by "KẾT THÚC BUỔI TẬP" button
   - Workout summary: total sets, volume, duration
   - Feedback: rate difficulty 1-10 + optional note
   - Confirm → save + redirect to completion screen

#### Specifications

- Touch targets: all inputs min 48px, primary action 56px
- Number inputs: large (32px font), JetBrains Mono
- Rest timer auto-starts on set completion
- Previous performance always visible (don't make user scroll)
- One-handed operation: all primary actions reachable from bottom half of screen
- SESSION ACTIVE LED: green pulse animation (CSS keyframe)
- Workout elapsed time updates every second

#### Acceptance Criteria

- User can log a complete set (weight + reps + RIR + type) in under 10 seconds
- Rest timer starts automatically and counts down correctly
- Previous session's performance shown without scrolling
- Swapping exercise preserves logged sets for completed exercises
- Finishing workout saves all sets to DB and shows summary

#### Constraints

- Do NOT show analytics or charts during active workout
- Do NOT require network for rest timer (local state)
- Do NOT auto-advance to next exercise without confirmation

---

### TIP-012: Workout Completion + History

| Field | Value |
|-------|-------|
| TIP-ID | TIP-012 |
| Phase | 1 |
| Module | Workout |
| Depends on | TIP-011 |
| Priority | P0 |
| Estimated effort | 60–90 min |

#### Context

After finishing a workout, the user sees a summary and all logged workouts become available in history. This closes the data loop that feeds back into AI Context Builder.

#### Task

1. **Workout Completion Server Action** (`src/app/actions/workout.ts`):
   - `finishWorkout(workoutId, feedback)` — update status = 'Completed', set ended_at, insert workout_feedback
   - `logSet(workoutExerciseId, setData)` — upsert workout_sets row
   - `completeSet(setId)` — mark complete + return rest seconds
   - `getWorkoutHistory(userId, page)` — paginated list
   - `getWorkoutDetail(workoutId)` — workout with exercises + sets

2. **Workout Completion Screen** (`src/app/(app)/workout/[id]/complete/page.tsx`):
   - Summary: workout name, duration, total sets, total volume, exercises completed
   - PR indicator if any new PR was hit
   - "Tập tiếp" (same program next day) vs "Về Dashboard" CTA

3. **Workout History Page** (`src/app/(app)/workout/history/page.tsx`):
   - Paginated list of completed workouts
   - Each card: date, program day name, gym, duration, total volume, exercise count
   - Click → Workout Detail page

4. **Workout Detail Page** (`src/app/(app)/workout/[id]/page.tsx`):
   - Full replay: all exercises with all sets
   - Total volume, total sets, duration
   - Feedback rating shown
   - "Log Again" button (copies exercises to today's workout)

5. **PR Detection** (runs on workout completion):
   - `checkForNewPRs(userId, workoutId)` — compares each exercise's best set against `personal_records` table
   - If new PR → insert row + show celebration on completion screen

#### Specifications

- Completion flow: User clicks "Kết thúc" → modal → confirm → save → navigate to `/workout/[id]/complete`
- Workout history sorted by date descending, 20 per page
- PR detection: compares estimated 1RM (Epley: weight × (1 + reps/30)) against stored PR
- Workout detail shows every set with weight/reps/RIR/type

#### Acceptance Criteria

- Workout completion saves all sets with timestamps
- Workout history shows all past sessions in reverse chronological order
- Workout detail replays exact sets logged
- PR detection fires correctly when new record is set
- Completion screen shows motivating summary

#### Constraints

- Do NOT delete sets when user goes back — confirm before destructive action
- Do NOT allow editing completed workout sets (MVP — immutable log)
- Do NOT show workout history to other users (RLS enforced)

---

### TIP-013: Progress Page

| Field | Value |
|-------|-------|
| TIP-ID | TIP-013 |
| Phase | 1 |
| Module | Progress |
| Depends on | TIP-001, TIP-002, TIP-005, TIP-012 |
| Priority | P0 |
| Estimated effort | 90–120 min |

#### Context

Progress page shows the user's training analytics: strength trends per exercise, weekly volume per muscle group, body weight trend, and personal records. This is the desktop-first analytics view.

#### Task

1. **Progress Server Actions** (`src/app/actions/progress.ts`):
   - `getExerciseStrengthHistory(userId, exerciseId)` — last 90 days, estimated 1RM per session
   - `getWeeklyVolume(userId, weekOffset)` — sets per muscle group per week
   - `getPersonalRecords(userId)` — all PRs with dates
   - `getBodyWeightTrend(userId, days)` — weight entries + deltas

2. **Strength Chart** (`src/components/progress/StrengthChart.tsx`):
   - Per exercise: estimated 1RM line chart
   - Dark screen container style
   - Current 1RM + % change vs 30 days ago
   - Exercise selector dropdown
   - Recharts AreaChart with gradient fill

3. **Volume Chart** (`src/components/progress/VolumeChart.tsx`):
   - Weekly sets per muscle group
   - Horizontal bar chart, mechanical meter style
   - Format: "CHEST 16 SETS" with bar

4. **Body Weight Chart** (`src/components/progress/BodyWeightChart.tsx`):
   - Recharts LineChart
   - Current weight, 7-day delta, 30-day delta
   - Dark screen container

5. **Personal Records List** (`src/components/progress/PRCard.tsx`):
   - Grid of PR cards: exercise name, weight × reps, date
   - Trophy/LED indicator for recent PRs

6. **Progress Page** (`src/app/(app)/progress/page.tsx`):
   - Desktop: 8-col strength chart + 4-col sidebar (PRs + weight)
   - Mobile: stacked vertically
   - Sections: Strength, Volume, Body Weight, Personal Records

#### Specifications

- 1RM calculation: Epley formula `weight × (1 + reps/30)`
- Volume: sum of (weight × reps) per muscle group per week
- Charts use dark recessed panel container (UI §44)
- All numbers in JetBrains Mono
- Week starts on Monday

#### Acceptance Criteria

- Strength chart renders with real workout data
- Volume chart shows correct sets per muscle per week
- Body weight chart matches body weight log entries
- PR list shows all personal records
- All charts responsive at breakpoints

#### Constraints

- Do NOT show data from other users (RLS enforced)
- Do NOT calculate 1RM from < 2 reps
- Do NOT hard-code chart colors — use design system tokens

---

### TIP-014: Dashboard Assembly

| Field | Value |
|-------|-------|
| TIP-ID | TIP-014 |
| Phase | 1 |
| Module | Dashboard |
| Depends on | TIP-001, TIP-002, TIP-005, TIP-008, TIP-009, TIP-011, TIP-012, TIP-013, TIP-015 |
| Priority | P0 |
| Estimated effort | 60–90 min |

#### Context

Dashboard is the home screen after login. It shows everything the user needs at a glance: today's workout, quick actions, recent progress, and AI recommendations. This TIP assembles all prior modules into the cohesive dashboard.

#### Task

1. **Dashboard Page** (`src/app/(app)/dashboard/page.tsx`):
   - Layout: 12-column grid, max-width 1440px
   - Priority order (UI §70): Today's Workout → AI Recommendation → Weekly Training → Progress → Body Weight → Gym → History

2. **Today's Workout Hero** (`src/components/workout/WorkoutHero.tsx`):
   - Industrial control panel style (UI §20)
   - Shows: program day name, gym, duration, exercise count, set count
   - "● SYSTEM READY" LED (green if planned, red if no workout)
   - Primary CTA: "GENERATE WITH AI" or "START WORKOUT"
   - Screw decorations, physical button feel

3. **Dashboard Modules** (assembled):
   - `DashboardGym.tsx` — active gym card + equipment count
   - `DashboardWeeklyTraining.tsx` — weekly schedule grid
   - `DashboardProgress.tsx` — strength + volume mini charts
   - `DashboardBodyWeight.tsx` — current weight + delta
   - `DashboardAIRecommendation.tsx` — top pending recommendation card
   - `DashboardHistory.tsx` — last 3 workouts

4. **App Shell** (`src/components/layout/AppShell.tsx`):
   - Desktop: Sidebar (240px) + main content
   - Mobile: Bottom navigation + content
   - Sidebar: active item = pressed + accent LED

5. **Sidebar** (`src/components/layout/Sidebar.tsx`):
   - Items: Tổng quan, Buổi tập hôm nay, Lịch tập, Bài tập, Phòng tập, Tiến độ, AI Coach, Lịch sử, Profile, Settings
   - Bottom: avatar + name

6. **Mobile Navigation** (`src/components/layout/MobileNavigation.tsx`):
   - 5 items: Home / Lịch / Tập / Progress / AI
   - "Tập" is center floating action button
   - Active state: filled icon + label visible

#### Specifications

- Dashboard loads Server Components for fast initial render
- Client islands for: AI generator, rest timer state, active workout state
- Empty states: "NO TRAINING DATA" with technical message + CTA
- Loading states: skeleton matching Industrial design

#### Acceptance Criteria

- Dashboard renders all 7 modules
- Today's workout hero shows correct program day
- "Generate with AI" opens AI generation flow
- "Start Workout" navigates to active workout page
- Sidebar navigation highlights current route
- Mobile nav shows all 5 items with "Tập" as floating center

#### Constraints

- Do NOT load all data on dashboard — use Suspense boundaries
- Do NOT show analytics in active workout mode
- Do NOT hard-code user names or weights

---

### TIP-015: AI Layer 3 — Coach (Basic Recommendations)

| Field | Value |
|-------|-------|
| TIP-ID | TIP-015 |
| Phase | 1 |
| Module | AI |
| Depends on | TIP-009, TIP-010, TIP-012 |
| Priority | P0 |
| Estimated effort | 60–90 min |

#### Context

Layer 3 surfaces AI recommendations after workout completion. The Rule Engine produces candidates (progressive overload, hold/deload), Gemini writes human explanation, recommendation row inserted with PENDING status.

#### Task

1. **Rule Engine Enhancement** (`src/lib/ai/rule-engine.ts` update):
   - `generateRecommendations(userId, workoutId): Recommendation[]`
   - Progressive overload: all working sets done with reps ≥ upper range and RIR ≤ 2 → suggest +weight
   - Struggle: RIR = 0-1 and reps < lower range → suggest hold or -2.5kg
   - Deload trigger: if 3 consecutive sessions with avg RIR < 1 → suggest deload week
   - Returns structured recommendations with confidence (LOW/MEDIUM/HIGH)

2. **Recommendation Explanation** (`src/lib/gemini/prompts/recommendation.ts`):
   - Gemini writes human explanation in Vietnamese
   - Format: "Bạn đã đạt 10 reps ở cả 3 working sets với RIR trung bình 1.7. Đề xuất tăng lên 62.5kg tuần sau."

3. **Recommendation Server Actions** (`src/app/actions/recommendation.ts`):
   - `getPendingRecommendations(userId)` — list PENDING recommendations
   - `acceptRecommendation(id)` — update status to ACCEPTED
   - `rejectRecommendation(id)` — update status to REJECTED
   - `generatePostWorkoutRecommendations(workoutId)` — called after workout completion

4. **AI Recommendation Card** (`src/components/ai/AIRecommendation.tsx`):
   - Shows: exercise name, current value, suggested value, confidence (LED dots ●●●○), reason
   - Actions: [REJECT] [ACCEPT]
   - Accepted → updates exercise_user_stats for next workout generation

5. **Recommendation Trigger**:
   - After workout completion (TIP-012), call `generatePostWorkoutRecommendations()`
   - New recommendations appear in AI Coach section of dashboard

#### Specifications

- AI NEVER auto-applies recommendations — always PENDING for user review
- Confidence: LOW = < 60% rule match, MEDIUM = 60-80%, HIGH = > 80%
- Recommendation stored in `ai_recommendations` table with full audit trail
- Each recommendation links to specific exercise + user

#### Acceptance Criteria

- Post-workout generates relevant recommendations
- Recommendation card shows exercise name, values, confidence, reason
- Accepting recommendation updates exercise stats
- Rejecting dismisses without effect
- Recommendations appear on dashboard AI section

#### Constraints

- Do NOT generate recommendations without user workout data
- Do NOT show recommendations from other users
- Do NOT auto-create workout changes from recommendations

---

### TIP-016: VERIFY Phase 1

| Field | Value |
|-------|-------|
| TIP-ID | TIP-016 |
| Phase | 1 |
| Module | Verification |
| Depends on | TIP-001 → TIP-015 |
| Priority | P0 |
| Estimated effort | 120–180 min |

#### Context

Phase 1 is complete. Run QA Protocol tier 1 (happy path) and tier 2 (edge cases) to validate the MVP core loop before moving to Phase 2.

#### Task

Execute verification protocol:

1. **Tier 1 — Happy Path Scenarios:**
   - Sign up → Onboarding → First workout → Log sets → Finish → View history
   - Generate AI workout → Accept → Log → View progress
   - Create gym → Add equipment → Generate workout (respects equipment)
   - Browse exercise library → View detail → Check instructions

2. **Tier 2 — Edge Cases:**
   - Empty gym (no equipment) → AI generation gracefully handles
   - No active program → redirect to program selection
   - Network failure during set log → retry / offline indicator
   - Invalid weight/reps input → validation error shown
   - Delete gym (has workout history) → workout history preserved

3. **Security Verification:**
   - RLS: User A cannot read User B's workouts (manual DB query test)
   - Auth: accessing `/dashboard` without session redirects to `/login`
   - API key: `GEMINI_API_KEY` not in client bundle (grep build output)

4. **Performance Verification:**
   - Dashboard load: < 2s on 3G
   - Exercise library search: < 200ms response
   - Workout logger: no jank during set logging

5. **Accessibility Verification:**
   - WCAG AA contrast on all text
   - Keyboard navigation through all forms
   - Screen reader labels on interactive elements

#### Report Format

```
VERIFY REPORT: GymAI Coach Phase 1

REQUIREMENT COVERAGE:
├── Total P0 Requirements: 49
├── Implemented: X
├── Missing: Y
└── Coverage: X/49%

SCENARIO RESULTS:
├── Passed: X
├── Failed: Y
└── Blocking issues: Z

CRITICAL ISSUES:
1. [Issue]: [description] — [recommendation]

OVERALL STATUS: READY / NEEDS FIXES / MAJOR ISSUES
```

#### Constraints

- Do NOT skip any P0 scenario
- Do NOT mark VERIFY done if blocking issues exist
- Document all failures in detail for TIP revision

---

## PHASE 2 — Advanced AI + Admin

### TIP-017: AI Coach Chat Interface

| Field | Value |
|-------|-------|
| TIP-ID | TIP-017 |
| Phase | 2 |
| Module | AI |
| Depends on | TIP-009, TIP-015 |
| Priority | P1 |
| Estimated effort | 90–120 min |

#### Context

Users can ask AI Coach questions about their training. Unlike a generic chatbot, AI Coach has full context of the user's profile, current program, recent workouts, and progress. This is Phase 2 — not MVP.

#### Task

1. **Chat Server Action** (`src/app/actions/ai-chat.ts`):
   - `sendChatMessage(userId, message)` — validates, builds context, calls Gemini
   - `getChatHistory(userId)` — last 50 messages (stored in memory, not DB for MVP)

2. **Chat API Route Handler** (`src/app/api/ai/chat/route.ts`):
   - Auth check
   - Build AI context: profile + today's workout + previous performance + body weight trend
   - Call Gemini with chat history + new message
   - Return streaming response

3. **AI Chat Page** (`src/app/(app)/ai-coach/page.tsx`):
   - Training Analysis Terminal layout (UI §40)
   - LEFT: Insights panel + Recommendation Queue
   - RIGHT: Chat interface
   - Mobile: stacked with chat primary

4. **Chat Interface** (`src/components/ai/AIChat.tsx`):
   - Message history (user + AI)
   - Input with send button
   - Typing indicator during AI response
   - Suggested prompts: "Hôm nay tôi thấy yếu hơn bình thường..."

5. **Chat Prompt** (`src/lib/gemini/prompts/coach-chat.ts`):
   - System prompt: elite strength coach persona, context-aware, Vietnamese responses
   - Memory: chat history passed as turns

#### Specifications

- Chat NOT stored in database (ephemeral in MVP) — log to `ai_interactions` for audit
- Context built same as workout generation (AI Context Builder)
- Streaming response via Next.js streaming
- Rate limit: deferred (OQ-4)

#### Acceptance Criteria

- Chat responds with context-aware answers
- User can ask about today's workout, recent performance, next steps
- Chat history persists during session
- AI respects user's profile and training data

---

### TIP-018: Plateau Detection + Deload Suggestion + PR Detection

| Field | Value |
|-------|-------|
| TIP-ID | TIP-018 |
| Phase | 2 |
| Module | AI |
| Depends on | TIP-013, TIP-017 |
| Priority | P1 |
| Estimated effort | 90–120 min |

#### Context

Phase 2 analytics: detect when a user is stalling (plateau), identify when a deload is needed, and celebrate new personal records with detailed analysis.

#### Task

1. **Plateau Detection** (`src/lib/ai/plateau-detector.ts`):
   - `detectPlateau(userId, exerciseId): PlateauAnalysis`
   - Logic: if 4+ consecutive weeks with < 2% 1RM improvement → plateau
   - Analysis: which muscle group, duration, likely cause (volume, recovery, diet)
   - Trigger: runs weekly or on-demand from AI Coach

2. **Deload Suggestion** (`src/lib/ai/deload-advisor.ts`):
   - `generateDeloadPlan(userId): DeloadRecommendation`
   - Logic: if 3 consecutive weeks with avg RIR < 1 → suggest deload
   - Suggestion: -40% volume, same intensity, 7-10 days
   - Gemini writes personalized explanation

3. **Enhanced PR Detection** (`src/lib/ai/pr-detector.ts`):
   - Enhanced from TIP-012: not just new PR, but PR analysis
   - "New PR on Bench Press: 72.5kg × 5 (previous best: 70kg × 5, three weeks ago)"
   - Trend: "Up 3.5% in 3 weeks — excellent progress"

4. **Analytics Dashboard Section** (`src/app/(app)/progress/page.tsx` update):
   - Plateau alerts section
   - Deload recommendation banner
   - PR celebration cards

#### Specifications

- Plateau detection requires ≥ 4 weeks of data
- Deload suggestion: do not auto-apply, user must accept
- PR analysis stored in `personal_records` table with metadata

#### Acceptance Criteria

- Plateau detected after 4 stagnant weeks
- Deload suggestion appears when recovery indicators are low
- PR detection with detailed before/after analysis
- Alerts visible on Progress page

---

### TIP-019: Weekly AI Report

| Field | Value |
|-------|-------|
| TIP-ID | TIP-019 |
| Phase | 2 |
| Module | AI |
| Depends on | TIP-017, TIP-018 |
| Priority | P1 |
| Estimated effort | 60–90 min |

#### Context

A weekly summary generated by AI that reviews the user's training week: volume, intensity, recovery, progress, and recommendations for next week.

#### Task

1. **Weekly Report Generator** (`src/lib/ai/weekly-report.ts`):
   - `generateWeeklyReport(userId, weekOffset): WeeklyReport`
   - Aggregates: total volume, sessions count, avg RIR, muscle groups hit
   - Compares to previous week
   - Generates AI summary via Gemini
   - Stored in `ai_recommendations` with type = 'WEEKLY_REPORT'

2. **Weekly Report Trigger**:
   - Auto-generated Sunday midnight (or configurable day)
   - Also available on-demand from AI Coach

3. **Weekly Report Display** (`src/components/ai/WeeklyReportCard.tsx`):
   - Terminal-style display
   - Sections: Volume summary, Sessions, Muscle coverage, Trend, Next week recommendations

4. **Report Page** (`src/app/(app)/ai-coach/weekly-report/page.tsx`):
   - Full weekly report view
   - Historical reports list

#### Specifications

- Weekly report = AI-generated summary (not raw data)
- Written in Vietnamese, encouraging tone
- Stored for 90 days

#### Acceptance Criteria

- Weekly report generates with correct week data
- Report visible in AI Coach section
- Historical reports accessible

---

### TIP-020: Admin Exercise CRUD + Review Flow

| Field | Value |
|-------|-------|
| TIP-ID | TIP-020 |
| Phase | 2 |
| Module | Admin |
| Depends on | TIP-007 |
| Priority | P1 |
| Estimated effort | 90–120 min |

#### Context

Admin users (with `is_admin()` claim) can create, edit, and manage system exercises. This includes review flow before publishing AI-generated content.

#### Task

1. **Admin Server Actions** (`src/app/actions/admin.ts`):
   - `createExercise(data)` — admin only, status = 'Draft'
   - `updateExercise(id, data)` — admin only
   - `publishExercise(id)` — admin only, status → 'Published'
   - `archiveExercise(id)` — admin only, status → 'Archived'
   - `getAdminExercises(status)` — list with filters

2. **Admin Dashboard** (`src/app/(admin)/admin/page.tsx`):
   - Admin-only layout (redirect if not admin)
   - Sections: Exercise Management, Content Review, AI Usage Stats

3. **Exercise Admin Table** (`src/app/(admin)/admin/exercises/page.tsx`):
   - Table: name, type, status, difficulty, created_at, actions
   - Filters: status, difficulty, type
   - Actions: Edit, Preview, Publish, Archive

4. **Exercise Editor** (`src/app/(admin)/admin/exercises/[id]/edit/page.tsx`):
   - Full edit form: all exercise fields
   - Image upload to Supabase Storage
   - Video embed support (Phase 3)
   - Preview as user would see it

5. **Review Queue** (`src/app/(admin)/admin/review/page.tsx`):
   - List of Draft exercises pending review
   - Side-by-side: AI-generated content vs admin form
   - Actions: Publish, Request Changes, Reject

#### Specifications

- Admin routes protected by `is_admin()` check in middleware
- Exercise status flow: Draft → Published → Archived
- Only Published exercises appear in user library
- All admin actions logged

#### Acceptance Criteria

- Admin can create exercise with all fields
- Admin can publish draft exercises
- Non-admin users cannot access admin routes
- Review queue shows pending content

---

### TIP-021: AI Generate Exercise Content (Text)

| Field | Value |
|-------|-------|
| TIP-ID | TIP-021 |
| Phase | 2 |
| Module | Admin |
| Depends on | TIP-020 |
| Priority | P1 |
| Estimated effort | 60–90 min |

#### Context

Admin clicks "Generate with AI" on exercise form → Gemini writes description, muscle groups, equipment, instructions, tips, common mistakes → Admin reviews → Publishes.

#### Task

1. **Content Generation API** (`src/app/api/ai/generate-content/route.ts`):
   - Auth check (admin only)
   - Call Gemini with exercise name + type
   - Return structured content: description, instructions (steps), tips, common_mistakes, suggested muscle groups, equipment

2. **Admin UI Integration**:
   - "Tạo nội dung với AI" button on exercise editor
   - Loading state: generating content
   - Preview: shows AI-generated content in form fields
   - Admin can edit before saving as Draft

3. **Prompt** (`src/lib/gemini/prompts/exercise-content.ts`):
   - System: elite personal trainer, Vietnamese output
   - Input: exercise name, type (Compound/Isolation), target muscle
   - Output: structured JSON matching exercise table fields

#### Specifications

- Generated content is draft — requires admin review before publish
- Each generation logged to `ai_interactions`
- Language: Vietnamese (consistent with UI)

#### Acceptance Criteria

- AI generates coherent exercise content
- Admin can edit and publish generated content
- Generated content matches exercise structure

---

### TIP-022: AI Generate Exercise Image

| Field | Value |
|-------|-------|
| TIP-ID | TIP-022 |
| Phase | 2 |
| Module | Admin |
| Depends on | TIP-020, TIP-021 |
| Priority | P1 |
| Estimated effort | 60–90 min |

#### Context

Admin generates exercise demonstration images using FLUX 1.1 [pro] on fal.ai. Images uploaded to Supabase Storage after generation.

#### Task

1. **Image Generation API** (`src/app/api/ai/generate-image/route.ts`):
   - Auth check (admin only)
   - Call fal.ai FLUX 1.1 [pro] API
   - Prompt: "Technical illustration of [exercise name] exercise form, gym setting, industrial control system aesthetic"
   - Download generated image
   - Upload to Supabase Storage bucket `exercise-media`
   - Return public URL

2. **Admin UI Integration**:
   - "Generate Image" button on exercise editor
   - Preview: shows generated image before save
   - Upload to Supabase Storage on confirm

3. **fal.ai Client** (`src/lib/fal/client.ts`):
   - `generateExerciseImage(exerciseName, exerciseType): ImageResult`
   - Uses `fal` npm package
   - Output format: 1024×1024 PNG

4. **Storage Setup**:
   - Supabase Storage bucket: `exercise-media`
   - RLS: admin write, public read
   - Max file size: 5MB
   - Allowed types: image/png, image/webp

#### Specifications

- Images generated with FLUX 1.1 [pro] on fal.ai ($0.04/megapixel)
- All generations logged to `ai_interactions`
- Admin reviews image before publishing

#### Acceptance Criteria

- AI generates exercise demonstration image
- Image uploads to Supabase Storage
- Image displays in exercise detail page
- Cost tracked in `ai_interactions`

---

### TIP-023: VERIFY Phase 2

| Field | Value |
|-------|-------|
| TIP-ID | TIP-023 |
| Phase | 2 |
| Module | Verification |
| Depends on | TIP-017 → TIP-022 |
| Priority | P1 |
| Estimated effort | 90–120 min |

#### Context

Phase 2 verification: test AI Coach chat, plateau detection, weekly report, and admin content generation flows.

#### Task

1. **Phase 2 Scenarios:**
   - AI Coach: ask about training → get context-aware answer
   - Plateau: train same exercise 4 weeks → detect plateau
   - Weekly Report: complete 3+ workouts → generate report
   - Admin: create exercise → AI generate content → review → publish
   - Admin: generate exercise image → upload → display

2. **Verify Report:**
   - Requirement coverage (Phase 2 P1 items)
   - Scenario results
   - Critical issues

---

## PHASE 3 — Growth Features

### TIP-024: AI Video Generation (Veo 3.1) + Storage Pipeline

| Field | Value |
|-------|-------|
| TIP-ID | TIP-024 |
| Phase | 3 |
| Module | Admin |
| Depends on | TIP-022 |
| Priority | P2 |
| Estimated effort | 90–120 min |

#### Context

Admin generates exercise demonstration videos using Veo 3.1 (Lite) on Byesu. Videos stored on Supabase Storage with CDN delivery.

#### Task

1. **Video Generation API** (`src/app/api/ai/generate-video/route.ts`):
   - Auth check (admin only)
   - Call Byesu REST API for Veo 3.1 (Lite tier, $0.01875/sec)
   - Prompt: "Gym exercise demonstration of [exercise name], proper form, 8 second clip"
   - Poll for completion
   - Download video
   - Upload to Supabase Storage bucket `exercise-media`
   - Return public URL

2. **Byesu Client** (`src/lib/byesu/client.ts`):
   - `generateExerciseVideo(exerciseName): VideoResult`
   - REST API with fetch
   - Async polling with timeout

3. **Storage + CDN**:
   - Supabase Storage bucket: `exercise-media` (videos)
   - RLS: admin write, public read
   - Max file size: 100MB
   - Allowed: video/mp4

4. **Admin UI Integration**:
   - "Generate Video" button on exercise editor
   - Progress indicator during generation (30-60 seconds)
   - Preview + confirm flow

#### Specifications

- Video: Veo 3.1 Lite on Byesu, max 8 seconds, $0.01875/sec
- All generations logged to `ai_interactions`
- Estimated cost: $0.15 per 8-second video
- Audio: disabled (MVP — silent exercise demo)

#### Acceptance Criteria

- AI generates exercise video
- Video uploads to Supabase Storage
- Video plays in exercise detail page
- Cost tracked per generation

---

### TIP-025: Exercise Preference Learning

| Field | Value |
|-------|-------|
| TIP-ID | TIP-025 |
| Phase | 3 |
| Module | AI |
| Depends on | TIP-011, TIP-012 |
| Priority | P2 |
| Estimated effort | 60–90 min |

#### Context

System learns which exercises users prefer based on logging patterns. If user consistently swaps a programmed exercise for an alternative, the AI starts preferring that alternative in future generations.

#### Task

1. **Preference Tracking** (`src/lib/ai/preference-learner.ts`):
   - `recordExerciseSwap(userId, originalExerciseId, substituteExerciseId)`
   - `getExercisePreferences(userId): Map<exerciseId, preferredAlternativeId>`
   - Logic: if swapped 3+ times → add to preference map
   - Stored in `exercise_user_stats` table

2. **AI Integration**:
   - Context Builder reads preference map
   - Constraint Engine ranks preferred alternatives higher

#### Specifications

- Minimum 3 swaps required before preference applies
- Preferences reset if user hasn't swapped in 90 days
- User can view/edit preferences in profile

#### Acceptance Criteria

- System learns from exercise swaps
- AI generation reflects learned preferences

---

### TIP-026: Advanced Volume Management

| Field | Value |
|-------|-------|
| TIP-ID | TIP-026 |
| Phase | 3 |
| Module | AI |
| Depends on | TIP-013 |
| Priority | P2 |
| Estimated effort | 60–90 min |

#### Context

Advanced users want fine-grained volume control: weekly sets per muscle, progressive overload tracking, deload scheduling. This extends Phase 1 progress with volume intelligence.

#### Task

1. **Volume Advisor** (`src/lib/ai/volume-advisor.ts`):
   - `calculateOptimalVolume(userId, muscleGroup): VolumeRecommendation`
   - Based on: experience, recovery, fatigue score, goal
   - Weekly sets recommendation per muscle group

2. **Progressive Overload Tracker**:
   - Tracks volume + intensity progression over time
   - Detects when to shift from volume to intensity phases

3. **Volume Dashboard** (`src/app/(app)/progress/volume/page.tsx`):
   - Detailed volume per muscle per week
   - Historical comparison
   - AI recommendations

#### Specifications

- Volume ranges based on experience: Beginner 10-15 sets/muscle/week, Intermediate 15-20, Advanced 18-25
- Adjustments based on recovery indicators

#### Acceptance Criteria

- Volume recommendations align with user's training history
- Progress page shows detailed volume breakdown

---

### TIP-027: Multi-region CDN + Performance Optimization

| Field | Value |
|-------|-------|
| TIP-ID | TIP-027 |
| Phase | 3 |
| Module | Infrastructure |
| Depends on | TIP-001 |
| Priority | P2 |
| Estimated effort | 60–90 min |

#### Context

Phase 3 optimization: Supabase Storage CDN for global delivery, Cloudflare CDN for static assets, image optimization, bundle analysis.

#### Task

1. **Supabase Storage CDN:**
   - Enable Cloudflare CDN integration on exercise-media bucket
   - Configure image transformation (WebP/AVIF conversion, resize)

2. **Next.js Optimization:**
   - Bundle analysis: reduce client bundle < 250KB
   - Route-based code splitting
   - Image optimization: next/image with Cloudflare provider
   - Font optimization: next/font with display: swap

3. **Performance Monitoring:**
   - Core Web Vitals tracking (LCP, INP, CLS)
   - Real User Monitoring (RUM) setup

#### Specifications

- LCP < 2.5s on 3G
- INP < 200ms
- CLS < 0.1
- Storage CDN: < 100ms globally

#### Acceptance Criteria

- CDN URLs used for all Supabase Storage assets
- Bundle size reduced
- Core Web Vitals targets met

---

### TIP-028: PWA + Offline Logger Queue

| Field | Value |
|-------|-------|
| TIP-ID | TIP-028 |
| Phase | 3 |
| Module | Mobile |
| Depends on | TIP-011 |
| Priority | P2 |
| Estimated effort | 90–120 min |

#### Context

Mobile users train at gyms with poor connectivity. Add PWA installability + IndexedDB queue for offline set logging + background sync when online.

#### Task

1. **PWA Setup:**
   - `manifest.json` with app name, icons, theme color
   - Service worker for offline caching
   - Install prompt for mobile browsers

2. **Offline Queue** (`src/lib/offline/queue.ts`):
   - `enqueueSetLog(setData)` — store in IndexedDB
   - `syncQueue()` — flush to server when online
   - `getQueueStatus()` — pending count

3. **Offline Logger UI:**
   - "Offline Mode" indicator when disconnected
   - Queue badge showing pending syncs
   - Auto-sync on reconnection

4. **Conflict Resolution:**
   - If server rejects (e.g., workout already completed) → show error
   - User resolves conflicts manually

#### Specifications

- IndexedDB via `idb` library
- Background sync via Service Worker Background Sync API
- Max queue: 100 sets (prevent unbounded storage)
- Sync on: online event + periodic (5 min if app open)

#### Acceptance Criteria

- PWA installable on iOS/Android
- Sets logged offline appear when back online
- No data loss during offline period

---

### TIP-029: Subscription + Payments (Stripe) + Tier Management

| Field | Value |
|-------|-------|
| TIP-ID | TIP-029 |
| Phase | 3 |
| Module | Business |
| Depends on | TIP-001, TIP-004 |
| Priority | P3 |
| Estimated effort | 120–180 min |

#### Context

Monetization layer: subscription tiers (Free / Pro / Team) with Stripe billing. Free tier limited; Pro unlocks AI generation limits, video, advanced analytics.

#### Task

1. **Stripe Integration** (`src/lib/stripe/client.ts`):
   - `createCheckoutSession(userId, tier)` — create Stripe Checkout
   - `createPortalSession(userId)` — customer portal for management
   - `handleWebhook(event)` — subscription events (created, updated, cancelled)

2. **Tier Management:**
   - `getUserTier(userId): 'free' | 'pro' | 'team'`
   - Middleware checks tier before AI generation (if limit reached)
   - Database: `profiles.subscription_tier`, `profiles.stripe_customer_id`

3. **Tier Limits:**
   - Free: 5 AI generations/day, no video, basic analytics
   - Pro: 30 AI generations/day, video generation, advanced analytics
   - Team: unlimited, multi-user support (Phase 3)

4. **Paywall UI:**
   - Upgrade prompts when limit reached
   - Tier comparison page

#### Specifications

- Stripe subscription with monthly/annual options
- Webhook verification via Stripe signature
- Graceful degradation when payment fails

#### Acceptance Criteria

- User can upgrade to Pro via Stripe
- AI generation blocked when daily limit reached (with paywall)
- Subscription management via Stripe portal

---

### TIP-030: VERIFY Phase 3 + X-Ray Handover Package

| Field | Value |
|-------|-------|
| TIP-ID | TIP-030 |
| Phase | 3 |
| Module | Verification |
| Depends on | TIP-024 → TIP-029 |
| Priority | P3 |
| Estimated effort | 120–180 min |

#### Context

Final verification and handover. Produce X-Ray Handover package: production-ready codebase + documentation + deployment guide.

#### Task

1. **Full System Verification:**
   - All Phase 1 + 2 + 3 scenarios
   - E2E tests via Playwright
   - Security audit: OWASP Top 10 check

2. **X-Ray Handover Package:**
   - `docs/DEPLOYMENT.md` — Cloudflare + Supabase + Stripe deployment guide
   - `docs/ENVIRONMENT.md` — all env vars with descriptions
   - `docs/TROUBLESHOOTING.md` — common issues + solutions
   - `docs/ARCHITECTURE.md` — system diagram + data flow
   - `docs/API.md` — all endpoints documented

3. **Code Quality Final Check:**
   - TypeScript strict mode: 0 errors
   - ESLint: 0 warnings
   - All tests passing
   - Bundle size within targets

#### Deliverables:
- Complete, production-ready codebase
- Deployment documentation
- Architecture documentation
- Handover checklist signed off

---

## TIP DEPENDENCY GRAPH (summary)

```
TIP-001 (Scaffold)
└─ TIP-002 (Design System)
└─ TIP-003 (Database + RLS)
   ├─ TIP-004 (Auth) ← TIP-001
   ├─ TIP-005 (Profile) ← TIP-001, TIP-003, TIP-004
   ├─ TIP-006 (Gym) ← TIP-001, TIP-003
   └─ TIP-007 (Exercise Library) ← TIP-001, TIP-003
       └─ TIP-008 (Program) ← TIP-001, TIP-003, TIP-007
           ├─ TIP-009 (AI L1 Planner) ← TIP-001/003/005/006/007/008
           ├─ TIP-010 (AI L2 Personalization) ← TIP-009
           └─ TIP-011 (Workout Logger) ← TIP-001/002/003/009
               └─ TIP-012 (Workout Completion) ← TIP-011
                   └─ TIP-013 (Progress) ← TIP-001/002/005/012
                       └─ TIP-015 (AI L3 Coach) ← TIP-009/010/012
                           └─ TIP-014 (Dashboard) ← all above
                               └─ TIP-016 (VERIFY Phase 1)
                                   └─ TIP-017 (AI Chat) ← TIP-009/015
                                       ├─ TIP-018 (Plateau/PR) ← TIP-013/017
                                       ├─ TIP-019 (Weekly Report) ← TIP-017/018
                                       ├─ TIP-020 (Admin CRUD) ← TIP-007
                                       │   ├─ TIP-021 (AI Content) ← TIP-020
                                       │   └─ TIP-022 (AI Image) ← TIP-020/021
                                       │       └─ TIP-024 (AI Video) ← TIP-022
                                       └─ TIP-023 (VERIFY Phase 2)
                                           ├─ TIP-025 (Preference Learning) ← TIP-011/012
                                           ├─ TIP-026 (Volume Management) ← TIP-013
                                           ├─ TIP-027 (CDN/Perf) ← TIP-001
                                           ├─ TIP-028 (PWA/Offline) ← TIP-011
                                           └─ TIP-029 (Payments) ← TIP-001/004
                                               └─ TIP-030 (VERIFY Phase 3 + Handover)
```

---

## EFFORT SUMMARY

| Phase | TIPs | Estimated Cursor Time |
|-------|------|----------------------|
| Phase 1 MVP (Revision 2) | 18 | ~28–40 hours |
| Phase 2 | 7 | ~15–20 hours |
| Phase 3 | 7 | ~20–25 hours |
| **Total (Revision 2)** | **32** | **~63–85 hours** |

> Effort estimates are for Cursor (AI coding agent) time — not wall-clock time. Actual time depends on iteration, review cycles, and debugging.

---

## REVISION 2: NEW TIPs DETAILS (2026-08-18)

The following 3 TIPs were added in Revision 2. Build order adjusted: Exercise Library + Exercise Management UI moved earlier (before Gym/Program/AI).

---

### TIP-006A: Photo Equipment Detection

| Field | Value |
|-------|-------|
| TIP-ID | TIP-006A |
| Phase | 1 |
| Module | Gym + AI (multimodal) |
| Depends on | TIP-006 (Gym form) + TIP-001 (Gemini API key setup) |
| Priority | P0 |
| Estimated effort | 60–90 min |

#### Context

User arriving at a new gym wants to create a gym record quickly. Manually checking 30+ equipment types is tedious. Photo detection: user takes photo → AI returns candidate equipment list → user confirms → gym equipment saved.

#### Task

1. **Equipment Detect Route Handler** (`src/app/api/equipment/detect/route.ts`):
   - Auth check via middleware
   - Accept multipart/form-data or base64 JSON body
   - Validate: mime in [image/jpeg, image/png, image/webp], size ≤ 5MB
   - Upload image to Supabase Storage bucket `equipment-scans` (private)
   - Call Gemini 3.5 Flash-Lite multimodal endpoint
   - Validate response with Zod schema
   - Log to `ai_interactions` (endpoint='equipment-detect', status)
   - Return `{ detected: [{slug, name, name_vi, quantity, confidence}], scanId, imageUrl }`

2. **Equipment Prompt** (`src/lib/gemini/prompts/equipment-detect.ts`):
   - System: "Elite fitness equipment analyst. Analyze gym photo. Output JSON only."
   - User: image + equipment catalog (passed inline, max 30 entries)
   - Schema: `{ detected: [{equipment_slug, quantity, confidence}] }`
   - Slugs must match `equipment.slug` in DB

3. **Equipment Detect Client** (`src/lib/gemini/multimodal-client.ts`):
   - `detectEquipment(imageBlob, supabaseToken): Promise<DetectResult>`
   - Stream-aware (Cloudflare Worker timeout-friendly)

4. **Photo Detect Modal** (`src/components/gym/EquipmentPhotoDetectModal.tsx`):
   - File upload zone + camera capture button (mobile: `<input type="file" accept="image/*" capture="environment">`)
   - Preview uploaded image
   - Loading state: "AI ĐANG PHÂN TÍCH..." (3–8 seconds)
   - Result list:
     - Checkbox (selected by default if confidence > 0.6)
     - Tên thiết bị + confidence dots ●●●○
     - Số lượng input (default 1)
   - Multi-photo: allow adding more images, AI aggregates result
   - "Apply" button → merges into parent equipment selector

5. **Equipment Selector Update** (`src/components/gym/GymEquipmentSelector.tsx`):
   - Add "📷 Phát hiện dụng cụ từ ảnh" button above chips grid
   - Click → opens EquipmentPhotoDetectModal
   - On apply → pre-select matching chips + quantity

6. **Supabase Storage**:
   - Bucket `equipment-scans` (private)
   - RLS: only owner can read/write their own folder
   - File path: `{user_id}/{scan_id}.jpg`

#### Specifications

- Gemini 3.5 Flash-Lite multimodal: $0.25/M input tokens → ~560 tokens/image → ~$0.00014/image
- Free tier available for MVP
- Multi-photo: send all images in single request, Gemini aggregates visually
- Confidence threshold: 0.6 (below = unselected by default)
- Returned slug must match `equipment.slug` exactly (whitelist validation)

#### Acceptance Criteria

- User uploads gym photo → gets back detected equipment list within 10 seconds
- Detected equipment pre-selects matching chips in equipment selector
- User can manually toggle/skip detected items
- Multi-photo: aggregated list returns union of detections
- Original photo saved to private bucket for later review
- 10/10 detections rounded correctly to the closest equipment slug

#### Constraints

- Do NOT auto-save detection as gym equipment — always require user confirmation
- Do NOT use detection as sole source — equipment selector still allows manual selection
- Do NOT expose Gemini API key to client — multimodal call goes through Route Handler

---

### TIP-007A: Web Image Seed for Exercises

| Field | Value |
|-------|-------|
| TIP-ID | TIP-007A |
| Phase | 1 |
| Module | Exercise + AI (Search grounding) |
| Depends on | TIP-007 (Exercise data schema + text seed) |
| Priority | P0 |
| Estimated effort | 30–60 min |

#### Context

Exercise library seed data needs visual demo. AI-generated images cost money and require DevOps. For MVP, use web search via Gemini Search grounding to find Unsplash/Wikimedia CC0 URLs. Human xử lý ảnh chính thức sau (Phase 2 FLUX).

#### Task

1. **Seed Script** (`scripts/seed-exercise-images.ts`):
   - Run via `pnpm tsx scripts/seed-exercise-images.ts`
   - Reads all 150 exercises from DB
   - For each, calls Gemini 3.5 Flash-Lite with Google Search grounding
   - Prompt: "Tìm URL ảnh demo chất lượng cao cho bài tập '[exercise.name]'. Ưu tiên Unsplash hoặc Wikimedia Commons (CC0). Trả về JSON: { url: string, license: string, source_url: string }"
   - Insert into `exercise_media` table:
     ```sql
     INSERT INTO exercise_media (exercise_id, media_type, url, source, license)
     VALUES ($1, 'image', $2, 'web_search_grounding', $3);
     ```
   - Skip if Gemini returns no valid URL (log warning)
   - Add delay between calls (500ms) to respect rate limit

2. **`exercise_media` Schema** (in TIP-003 migration `0001_init.sql`):
   - `id uuid PK`
   - `exercise_id uuid FK → exercises`
   - `media_type enum('image', 'video')`
   - `url text NOT NULL`
   - `source enum('web_search_grounding', 'manual', 'ai_generated_flux', 'ai_generated_veo')`
   - `license text` (e.g., 'CC0', 'Unsplash License')
   - `source_url text` (originating page)
   - `is_primary boolean` default false
   - `created_at timestamptz default now()`

3. **Fallback Manual Seed** (`supabase/seed-images-manual.sql`):
   - For ~150 exercises, hard-coded curated Unsplash URLs
   - Used if Gemini Search grounding unavailable (free tier exhausted)
   - License column always populated

4. **Image Display Update** (`src/components/exercise/ExerciseCard.tsx`):
   - Use `<img src={exercise.media.primary.url} />` for demo URLs
   - Add `loading="lazy"` for cards below fold
   - `onError`: fallback to grayscale placeholder

#### Specifications

- Gemini 3.5 Flash-Lite + Google Search grounding: 5000 queries free/month, then $14/1000
- 150 queries × 5000 free = $0 (well under free tier)
- License: only CC0 / Unsplash License / Wikimedia Commons accepted
- Image URL validation: must be HTTPS, valid URL format
- One image per exercise (is_primary = true) — multi-image is Phase 2

#### Acceptance Criteria

- 150 exercises have at least 1 demo image URL seeded
- All URLs are HTTPS with valid license
- Exercise cards render with image in library page
- Manual fallback available if Gemini unavailable
- Seed script idempotent (skip already-seeded exercises)

#### Constraints

- Do NOT upload image bytes to Supabase Storage in MVP — only URL reference
- Do NOT use AI-generated images from copyrighted sources
- Do NOT skip license attribution
- Do NOT store image without URL validation

---

### TIP-021A: Exercise Management UI (Browse + Filter + Detail)

| Field | Value |
|-------|-------|
| TIP-ID | TIP-021A |
| Phase | 1 |
| Module | Exercise |
| Depends on | TIP-007 (exercise data) + TIP-007A (images) + TIP-002 (design system) |
| Priority | P0 |
| Estimated effort | 90–120 min |

#### Context

Originally part of TIP-007 (Exercise Library). Lifted out as separate TIP for Revision 2 priority: Human wants Exercise Management UI (browse + filter + detail) ready early in Phase 1, before AI pipeline. Required so stakeholder can review the exercise catalog as soon as TIP-007A image seeding completes.

#### Task

1. **Exercise Library Page** (`src/app/(app)/exercises/page.tsx`):
   - Search bar (recessed style)
   - Filters: muscle group, equipment, difficulty, type chips
   - Grid: 3 cols desktop / 2 tablet / 1 mobile
   - Each card: image (web URL), name, muscle, equipment badges, type/difficulty indicators
   - Pagination or infinite scroll (20 per page)

2. **Exercise Card** (`src/components/exercise/ExerciseCard.tsx`):
   - IndustrialCard variant
   - `<img>` from media.primary.url (with onError → placeholder)
   - Uppercase name (EN) + Vietnamese name (subtitle)
   - Primary muscle, equipment badges
   - Type/difficulty LED indicators

3. **Exercise Detail Page** (`src/app/(app)/exercises/[id]/page.tsx`):
   - Layout: 60% media (LEFT) + 40% info (RIGHT) on desktop
   - Sections: Tên bài tập, Cơ bắp chính, Cơ bắt phụ, Dụng cụ, Độ khó, Hướng dẫn (steps JSON), Mẹo, Lỗi thường gặp, Bài tập thay thế
   - Instructions: rendered as STEP 01/02/03 modules (UI §35)
   - Alternatives: list of linked `exercise_alternatives` rows
   - "Thêm vào buổi tập" CTA (links to TIP-011 workout logger context)

4. **Exercise Filters** (`src/components/exercise/ExerciseFilters.tsx`):
   - Muscle group chips (multi-select)
   - Equipment chips (multi-select)
   - Difficulty radio
   - Type radio
   - "Clear all" button

5. **Exercise Search** (`src/app/actions/exercise.ts` update):
   - Server action: `searchExercises(query, filters, page)`
   - Filters combine with AND logic
   - Returns paginated list with media joined

#### Specifications

- System exercises visible to all authenticated users
- Custom exercises visible only to owner (RLS)
- Search: ILIKE on name + name_vi
- Instructions from JSON column rendered as modular mechanical steps
- Image displays web URL (with CSP-friendly HTTPS, no Supabase Storage proxy)

#### Acceptance Criteria

- Library page loads 150 exercises with images
- Search filters results in real-time (< 300ms)
- Filter combinations work correctly
- Detail page shows all fields with proper formatting
- Instructions render as mechanical modules
- Mobile responsive at all breakpoints

#### Constraints

- Do NOT load all 150 exercises at once — paginate
- Do NOT show draft/archived exercises
- Do NOT block library on AI generation features (independent of TIP-009+)

---

## REVISION 2 DEPENDENCY GRAPH

```
TIP-001 (Scaffold)
└─ TIP-002 (Design System)
└─ TIP-003 (Database + RLS)
   ├─ TIP-004 (Auth) ← TIP-001
   ├─ TIP-005 (Profile) ← TIP-001, TIP-003, TIP-004
   ├─ TIP-006 (Gym) ← TIP-001, TIP-003
   │   └─ TIP-006A (Photo Equipment Detection) ← TIP-006 + Gemini multimodal ← NEW
   ├─ TIP-007 (Exercise Library data) ← TIP-001, TIP-003
   │   └─ TIP-007A (Web Image Seed) ← TIP-007 + Gemini Search grounding ← NEW
   │       └─ TIP-021A (Exercise Management UI) ← TIP-007 + TIP-007A + TIP-002 ← NEW (prioritized)
   ├─ TIP-008 (Program) ← TIP-001, TIP-003, TIP-021A
   ├─ TIP-009 (AI L1 Planner) ← TIP-005/006/007/008
   ├─ TIP-010 (AI L2 Personalization) ← TIP-009
   ├─ TIP-011 (Workout Logger) ← TIP-001/002/003/009
   │   └─ TIP-012 (Workout Completion) ← TIP-011
   │       └─ TIP-013 (Progress) ← TIP-001/002/005/012
   │           └─ TIP-015 (AI L3 Coach) ← TIP-009/010/012
   │               └─ TIP-014 (Dashboard) ← all above
   │                   └─ TIP-016 (VERIFY Phase 1)
   │                       └─ TIP-017 (AI Chat) ← TIP-009/015
   │                           ├─ TIP-018 (Plateau/PR) ← TIP-013/017
   │                           ├─ TIP-019 (Weekly Report) ← TIP-017/018
   │                           ├─ TIP-020 (Admin CRUD) ← TIP-021A
   │                           │   ├─ TIP-021 (AI Content) ← TIP-020
   │                           │   └─ TIP-022 (AI Image) ← TIP-020/021
   │                           │       └─ TIP-024 (AI Video) ← TIP-022
   │                           └─ TIP-023 (VERIFY Phase 2)
   │                               ├─ TIP-025 (Preference Learning) ← TIP-011/012
   │                               ├─ TIP-026 (Volume Management) ← TIP-013
   │                               ├─ TIP-027 (CDN/Perf) ← TIP-001
   │                               ├─ TIP-028 (PWA/Offline) ← TIP-011
   │                               └─ TIP-029 (Payments) ← TIP-001/004
   │                                   └─ TIP-030 (VERIFY Phase 3 + Handover)
```

**Revision 2 adds:** TIP-006A, TIP-007A, TIP-021A
**Revision 2 reorders:** TIP-007 + TIP-021A moved BEFORE TIP-006 (was after Gym)

