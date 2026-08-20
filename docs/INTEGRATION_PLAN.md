# Plan: Tích hợp chuẩn trang hiển thị bài tập vào hệ thống

> **Mục tiêu:** đưa trang hiển thị bài tập (library + detail) về đúng route `/exercises` chuẩn trong `(app)`, dùng JSON làm source-of-truth, giữ `/exercise-demo` làm design reference có cờ `@deprecated`. Plan dành cho **Cursor (agent)** execute từng bước; không chạm vào AI pipeline ở phase này (TIP-007A / 021A / 020 làm sau).

---

## 0. Bối cảnh & trạng thái repo

| Mục | Hiện tại | Mong muốn |
|---|---|---|
| Route chuẩn library (theo UI spec §69 + TIP-021A) | `/exercises` — **chưa tồn tại** trong `(app)` | `/exercises` trong `(app)` |
| Trang staging đang chạy | `/exercises-test` (page.tsx, [slug]/page.tsx, exercise-filters.tsx) | xóa sau khi migrate xong |
| Template design gốc | `/exercise-demo` (hard-code Bench Press) | giữ + thêm banner `@deprecated` |
| Data source | `data/exercises/*.json` (đã có 7 bài + schema + loader) | giữ JSON, **không** đụng Supabase ở phase này |
| Loader lib | `src/lib/exercises.ts` + `src/lib/exercises-types.ts` | giữ nguyên, dùng chung |
| Filter facets | `getExerciseFacets()` đã có | dùng nguyên |
| Nav (sidebar) | `/exercises` đã có trong `src/components/nav.tsx` (item `Bài tập`) | không đổi |
| Layout bảo vệ | `(app)/layout.tsx` yêu cầu auth + onboarding | route mới sẽ tự kế thừa |
| Design tokens | Tailwind + `globals.css` đã đầy đủ (`.card`, `.btn-primary`, `.chip`, `.input`, `corner-screws`, `shadow-inset`) | không đổi |
| Asset trong `/public` | chỉ có ảnh cho 2 bài: bench-press (jpg) + back-squat (svg) | **gap** — 5 bài còn lại chưa có ảnh, dùng placeholder |

### Gap đã phát hiện (sẽ xử lý trong plan)

1. `/exercises-test/exercise-filters.tsx` import `@/lib/exercises` và dùng prop `muscles`/`equipment` dạng `{id, slug, name_vi}[]`, nhưng `getExerciseFacets()` chỉ trả `string[]`. Trang đang tự map sang shape trên — phải giữ logic này.
2. `generateStaticParams` trong `[slug]/page.tsx` import dynamic `await import('@/lib/exercises')`. Khi move sang route mới phải import static (đỡ bug).
3. `exercises-test/[slug]/page.tsx` import `VideoGuide` và `PerformanceChart` từ `@/app/exercise-demo/...`. Sau khi move route, phải đổi import về `@/components/exercise/...`.
4. `exercises-test/page.tsx` dùng `next/image` với `sizes` + `fill`. OK, giữ nguyên.
5. `next.config.mjs` đã whitelist `images.unsplash.com` + `upload.wikimedia.org`. SVG local không cần whitelist, OK.
6. Có 5 bài JSON không có file ảnh trong `public/exercises/demo/`: barbell-row, deadlift, hip-thrust, overhead-press, pull-up, romanian-deadlift. Trong phase này **chỉ render placeholder** (SVG fallback) cho các bài này — không block integration.
7. `exercises-test/[slug]/page.tsx` dùng `<button className="btn-primary fixed ...">` cho "Thêm vào buổi tập" — CTA này chưa có handler (TIP-011 sẽ xử lý sau). Trong phase này giữ button nhưng thêm `aria-disabled` + tooltip.
8. `exercises-test/new/page.tsx` đang tồn tại nhưng UI spec yêu cầu route `/exercises/new` chỉ dành cho custom exercise (TIP-007 phase 2). Phase này: **giữ nguyên** hoặc xóa — recommend giữ vì đã wired với `/api/ai/exercise-content`.
9. `(app)/layout.tsx` redirect người chưa onboard → `/onboarding`. Mọi route mới trong `(app)` sẽ bị gate. Test cần user onboarded.

---

## 1. Cấu trúc file mới (target)

```
src/
├─ app/
│  ├─ (app)/
│  │  └─ exercises/                ← MOVE VÀO ĐÂY
│  │     ├─ page.tsx               (library list — từ exercises-test/page.tsx)
│  │     ├─ exercise-filters.tsx   (giữ nguyên, đổi path import nếu cần)
│  │     ├─ [slug]/
│  │     │  └─ page.tsx            (detail — từ exercises-test/[slug]/page.tsx)
│  │     └─ new/                   (giữ nguyên, đã wired)
│  │        ├─ page.tsx
│  │        └─ exercise-ai-client.tsx
│  ├─ exercise-demo/               (giữ nguyên — design reference @deprecated)
│  │  ├─ page.tsx                  (THÊM banner DEPRECATED ở đầu main)
│  │  ├─ video-guide.tsx
│  │  ├─ performance-chart.tsx
│  │  └─ interactive-performance-chart.tsx
│  └─ exercises-test/              ← XÓA TOÀN BỘ thư mục này sau khi move xong
│
├─ components/
│  └─ exercise/                    ← THÊM MỚI (optional, có thể skip nếu giữ import path cũ)
│     └─ index.ts                  (re-export VideoGuide + PerformanceChart từ @/app/exercise-demo/...)
│
data/
└─ exercises/
   ├─ *.json                       (giữ nguyên, đã có 7 bài)
   ├─ exercise.schema.json
   └─ README.md

docs/
└─ INTEGRATION_PLAN.md             (file này)
```

---

## 2. Checklist thực thi (cho Cursor agent)

Mỗi bước là 1 commit nhỏ, đảm bảo `pnpm lint` + `pnpm build` pass trước khi qua bước tiếp.

### Bước 1 — Chuẩn bị thư mục & copy file

- [ ] Tạo `src/app/(app)/exercises/`.
- [ ] Copy `src/app/exercises-test/page.tsx` → `src/app/(app)/exercises/page.tsx`.
- [ ] Copy `src/app/exercises-test/exercise-filters.tsx` → `src/app/(app)/exercises/exercise-filters.tsx`.
- [ ] Copy `src/app/exercises-test/[slug]/page.tsx` → `src/app/(app)/exercises/[slug]/page.tsx`.
- [ ] Copy toàn bộ `src/app/exercises-test/new/` → `src/app/(app)/exercises/new/`.
- [ ] **Không xóa** `exercises-test/` cho đến Bước 4.

### Bước 2 — Sửa import path

- [ ] Trong `exercises/page.tsx`:
  - `import ExerciseFilters from './exercise-filters';` ← giữ nguyên (cùng thư mục).
  - `import { filterExercises, getExerciseFacets, type ExerciseFilter } from '@/lib/exercises';` ← giữ nguyên.
  - `import type { Difficulty, ExerciseType, MovementPattern } from '@/lib/exercises-types';` ← giữ nguyên.
- [ ] Trong `exercises/[slug]/page.tsx`:
  - Đổi `import VideoGuide from '@/app/exercise-demo/video-guide';` → `import VideoGuide from '@/app/exercise-demo/video-guide';` *(giữ path này vì sẽ giữ `/exercise-demo` làm design reference)*.
  - Đổi `import PerformanceChart from '@/app/exercise-demo/performance-chart';` ← giữ nguyên.
  - `import { getExerciseBySlug, getResolvedAlternatives } from '@/lib/exercises';` ← giữ nguyên.
- [ ] Trong `exercises/[slug]/page.tsx` dòng `generateStaticParams`:
  - **Sửa**: thay `const { getAllExercises } = await import('@/lib/exercises');` (dynamic import) bằng `import { getAllExercises } from '@/lib/exercises';` ở đầu file.
- [ ] Trong `exercises/new/exercise-ai-client.tsx`: giữ nguyên (đã ổn).

### Bước 3 — Polish cho hợp với nav + auth

- [ ] Đảm bảo `exercises/page.tsx` không override padding của `(app)/layout.tsx` (layout đã có `pb-20 md:pb-0 md:pl-60`). B� `pb-24 pt-6` chỉnh lại nếu cần để không bị double-padding.
- [ ] Đảm bảo breadcrumb back (`ArrowLeft` → `/exercises`) vẫn đúng sau khi move.
- [ ] Đảm bảo CTA "Thêm vào buổi tập" trong `[slug]/page.tsx` không bị nav che (đã `fixed inset-x-4 bottom-4 z-30`) — kiểm tra bằng browser ở breakpoint 375px.
- [ ] Thêm `aria-disabled="true"` + `title="Sẽ kết nối buổi tập trong TIP-011"` cho button "Thêm vào buổi tập" và "Áp dụng cho buổi tiếp theo".
- [ ] Đảm bảo `Image` với `priority` chỉ ở hero image của detail page, các card trong list dùng `loading="lazy"` mặc định.
- [ ] Kiểm tra `next.config.mjs` đã whitelist Unsplash/Wikimedia (đã có) — không cần đổi.

### Bước 4 — Smoke test

- [ ] `pnpm lint` pass.
- [ ] `pnpm build` pass — chú ý `generateStaticParams` không được throw.
- [ ] Khởi động dev server, login bằng tài khoản đã onboard.
- [ ] Truy cập `/exercises` → thấy grid 7 bài.
- [ ] Filter `movement_pattern=squat` → chỉ thấy `back-squat`.
- [ ] Search `bench` → thấy `bench-press`.
- [ ] Truy cập `/exercises/back-squat` → render đầy đủ detail page.
- [ ] Bấm bài thay thế → navigate tới bài mới.
- [ ] Mobile breakpoint 375px → CTA bottom không che nội dung.
- [ ] Truy cập `/exercises/does-not-exist` → `notFound()` render 404.

### Bước 5 — Dọn staging

- [ ] Xóa `src/app/exercises-test/` toàn bộ.
- [ ] `pnpm lint` + `pnpm build` pass.
- [ ] Grep `exercises-test` trong toàn repo — phải bằng 0 (kể cả docs).

### Bước 6 — Đánh dấu design reference

- [ ] Trong `src/app/exercise-demo/page.tsx`, thêm banner ở đầu `<main>`:

  ```tsx
  <div className="mx-auto max-w-6xl px-4 pt-4">
    <div className="card border-2 border-warn/40 p-3 mb-4 flex items-center gap-3">
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-warn">
        @deprecated
      </span>
      <p className="text-xs text-ink-secondary">
        Trang demo chỉ dùng để so sánh thiết kế. Trang chính đã chuyển sang{' '}
        <Link href="/exercises" className="text-accent underline">/exercises</Link>.
      </p>
    </div>
  </div>
  ```

- [ ] Không xóa `exercise-demo/*` vì `PerformanceChart` được dùng chung.

### Bước 7 — Tạo SVG placeholder cho 5 bài thiếu ảnh

> Phạm vi: tối thiểu để page detail không bị broken image.

- [ ] Tạo `public/exercises/demo/PLACEHOLDER.svg` (1 file dùng chung, có label "DEMO IMAGE").
- [ ] Update 5 JSON: `barbell-row`, `deadlift`, `hip-thrust`, `overhead-press`, `pull-up`, `romanian-deadlift`:
  - `gallery.main` → `/exercises/demo/PLACEHOLDER.svg`
  - `gallery.views[].src` → `/exercises/demo/PLACEHOLDER.svg`
- [ ] Verify `/exercises/deadlift` render được ảnh placeholder (đã có deadlift.json).
- [ ] Mở rộng phase sau: thay bằng Gemini Search grounding (TIP-007A) hoặc FLUX 1.1.

### Bước 8 — Tài liệu & handoff

- [ ] Update `data/exercises/README.md` thêm dòng:
  > "Trang chính để xem các bài này là `/exercises` (TIP-021A). Trang `/exercise-demo` đã deprecated."
- [ ] Append mục **Open items** vào `DECISIONS_LOG.md` (D-029: route consolidation, D-030: design reference policy).
- [ ] Commit + PR.

---

## 3. Acceptance Criteria (Definition of Done)

| # | Tiêu chí | Verify |
|---|---|---|
| AC-1 | `/exercises` render được grid bài tập t� JSON | curl + browser |
| AC-2 | `/exercises/[slug]` render đúng bài cho 7 slug hiện có | 7 lần navigate |
| AC-3 | Filter + search hoạt động với URL params | 4 filter + 1 search |
| AC-4 | `/exercises-test/` không còn trong repo | `grep -r exercises-test` |
| AC-5 | `/exercise-demo` có banner @deprecated | visual check |
| AC-6 | Tất cả 7 bài render được ảnh (placeholder OK) | navigate 7 slug |
| AC-7 | Build + lint pass | `pnpm build && pnpm lint` |
| AC-8 | Nav highlight đúng khi ở `/exercises` và `/exercises/[slug]` | sidebar visual |
| AC-9 | Responsive: mobile 375px không overflow, touch target ≥ 48px | mobile breakpoint |
| AC-10 | Không ảnh hưởng các route khác: `/dashboard`, `/workouts/new`, `/recommendations` | smoke navigate |

---

## 4. Out-of-scope (phase này KHÔNG làm)

- Không đụng Supabase / RLS / seeding JSON → DB (TIP-007A + migration `0006_seed_exercises.sql`).
- Không implement handler cho "Thêm vào buổi tập" (TIP-011).
- Không implement "Áp dụng cho bu�i tiếp theo" cho AI Coach panel (TIP-015).
- Không generate ảnh AI — chỉ placeholder SVG.
- Không i18n, không dark mode toggle, không PWA.
- Không sửa `globals.css` (đã đủ tokens cho industrial design).

---

## 5. Rủi ro & mitigation

| Rủi ro | Mitigation |
|---|---|
| `generateStaticParams` dynamic import bị build-time error ở route mới | Sửa thành static import ở Bư�c 2 |
| 7 bài JSON nhưng chỉ 2 có ảnh → 5 page detail broken | Placeholder SVG ở Bước 7 |
| CTA fixed bottom che content mobile | Đã có `pb-20` ở `(app)/layout.tsx`, nhưng cần test |
| Auth gate của `(app)/layout.tsx` block test khi user chưa onboard | Plan test phải login user có `experience_level` |
| Nav không highlight đúng cho nested route | Pattern `pathname.startsWith(href + '/')` đã có trong nav.tsx — chỉ cần đảm bảo href match |
| `eslint-config-next` complain về `<img>` nếu có | Plan không dùng `<img>`, toàn bộ qua `next/image` |
| Build fail vì `Image` remote pattern chưa whitelist | `next.config.mjs` đã whitelist Unsplash + Wikimedia, OK |

---

## 6. Effort estimate (Cursor time)

| Bước | Phút |
|---|---|
| B1: Copy file | 5 |
| B2: Sửa import | 10 |
| B3: Polish | 15 |
| B4: Smoke test + fix | 25 |
| B5: Cleanup staging | 5 |
| B6: Banner @deprecated | 5 |
| B7: Placeholder SVG | 15 |
| B8: Docs + commit | 10 |
| **Tổng** | **~90 phút (1.5h)** |

---

## 7. Theo sau (chưa làm, ghi vào backlog)

- TIP-007A: thay placeholder bằng Gemini Search grounding URL Unsplash/Wikimedia CC0.
- TIP-021: Admin CRUD cho custom exercise (`/exercises/new` hiện đã có skeleton).
- TIP-011: wire "Thêm vào buổi tập" vào workout logger.
- TIP-009 + 010: dùng `getExerciseBySlug` từ JSON làm input cho AI Constraint Engine.
- TIP-016: VERIFY Phase 1 — chạy full QA protocol.

---

**Owner:** Cursor agent
**Reviewer:** Human (Khách hàng)
**Estimated delivery:** 1 commit duy nhất sau khi pass Bước 4, hoặc 2 commit (staging → cleanup).
