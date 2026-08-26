# TIP-021B: Move /exercises-test → (app)/exercises + Consolidate Library Route

> Vibecode Kit v6.1 - TIP (Task Instruction Pack) format.
> Contractor: chủ thầu đã approve scope với Human (2026-08-18).
> Builder: Cursor agent thực thi.
> Depends on: TIP-002 (design tokens in place), TIP-007A (data/exercises/*.json + loader).
> Effort: ~90 phút Cursor time.

---

## Context

**Working directory:** `d:\GymAI-Coach`

**Key files (đã tồn tại, KHÔNG sửa trừ khi TIP yêu cầu):**
- `src/lib/exercises.ts` - loader JSON, `getAllExercises`, `getExerciseBySlug`, `filterExercises`, `getExerciseFacets`, `getResolvedAlternatives`. Cache in-memory. **Dùng nguyên.**
- `src/lib/exercises-types.ts` - TypeScript types mirror schema JSON. **Dùng nguyên.**
- `src/app/(app)/layout.tsx` - auth gate + sidebar nav inject. Route mới tự kế thừa.
- `src/components/nav.tsx` - sidebar đã có item `/exercises` (label "Bài tập"). Highlight theo `pathname.startsWith(href + '/')`. **Không đổi.**
- `src/app/globals.css` - design tokens đã có (`.card`, `.btn-primary`, `.chip`, `.input`, `.corner-screws`, `.shadow-inset`, `.blueprint-grid`, `.led-pulse`, `.ex-detail-bg`, `.ex-chassis`). **Không đổi.**
- `tailwind.config.ts` - colors `chassis / ink / accent / warn / success / danger / info`, shadows `neumorph`, `inset`, `pressed`, `accent`. **Không đổi.**
- `next.config.mjs` - đã whitelist `images.unsplash.com` + `upload.wikimedia.org`. **Không đổi.**
- `data/exercises/*.json` - 7 bài (back-squat, barbell-row, bench-press, deadlift, hip-thrust, overhead-press, pull-up, romanian-deadlift). **Source of truth, không đổi nội dung.**

**Files cần MOVE (không viết lại):**
- `src/app/exercises-test/page.tsx` → `src/app/(app)/exercises/page.tsx`
- `src/app/exercises-test/exercise-filters.tsx` → `src/app/(app)/exercises/exercise-filters.tsx`
- `src/app/exercises-test/[slug]/page.tsx` → `src/app/(app)/exercises/[slug]/page.tsx`
- `src/app/exercises-test/new/page.tsx` → `src/app/(app)/exercises/new/page.tsx`
- `src/app/exercises-test/new/exercise-ai-client.tsx` → `src/app/(app)/exercises/new/exercise-ai-client.tsx`

**Files giữ nguyên (KHÔNG move, KHÔNG xóa):**
- `src/app/exercise-demo/page.tsx` - design reference, sau khi move sẽ thêm banner `@deprecated`.
- `src/app/exercise-demo/video-guide.tsx` - component dùng chung, import từ `[slug]/page.tsx`.
- `src/app/exercise-demo/performance-chart.tsx` - component dùng chung, import từ `[slug]/page.tsx`.
- `src/app/exercise-demo/interactive-performance-chart.tsx` - chưa dùng ở trang nào, giữ nguyên.

**Pattern đã chuẩn trong repo:**
- Route group `(app)` dùng cho mọi trang sau auth.
- Server Component cho page, `'use client'` cho interactive bits (filters, AI client).
- `next/image` cho mọi ảnh (KHÔNG dùng `<img>`).
- Tailwind tokens qua classes (`bg-chassis`, `text-ink`, `text-accent`, `shadow-neumorph-sm`...). KHÔNG hard-code màu.
- Icons: `lucide-react` (đã có sẵn trong `package.json`).
- Vietnamese UI strings hard-code (OQ-2 - `next-intl` deferred).
- Industrial Skeuomorphism: shadows neumorph, accent LED, technical labels uppercase mono.

---

## Task

### Phase 1 - Copy & Adjust Imports

1. Tạo thư mục `src/app/(app)/exercises/`.
2. Copy toàn bộ file từ `src/app/exercises-test/` (kể cả nested `[slug]/` và `new/`) sang `src/app/(app)/exercises/`. Preserve line endings (LF) và encoding (UTF-8).
3. Trong `src/app/(app)/exercises/[slug]/page.tsx`:
   - **Sửa** `generateStaticParams`:
     - Xóa: `const { getAllExercises } = await import('@/lib/exercises');`
     - Thêm ở đầu file (cùng nhóm import với `getExerciseBySlug`): `import { getAllExercises, getExerciseBySlug, getResolvedAlternatives } from '@/lib/exercises';`
     - `generateStaticParams` dùng `await getAllExercises()` (đã import).
4. Trong `src/app/(app)/exercises/[slug]/page.tsx`, button "Thêm vào buổi tập" (dòng ~86 hiện tại):
   - Thêm `aria-disabled="true"` + `title="Sẽ kết nối buổi tập trong TIP-011"`.
   - KHÔNG đổi `className` hay `onClick` (chưa có handler).
5. Trong `src/app/(app)/exercises/[slug]/page.tsx`, button "Áp dụng cho buổi tiếp theo" (dòng ~239):
   - Tương tự: thêm `aria-disabled="true"` + `title="Sẽ kết nối AI Coach trong TIP-015"`.
6. **Không đổi** các import path khác - chúng đã trỏ đúng `@/lib/...` và `@/app/exercise-demo/...`.

### Phase 2 - Padding Audit

7. Mở `(app)/layout.tsx` (đã đọc): root có `pb-20 md:pb-0 md:pl-60`. Nghĩa là mobile đã có 80px bottom padding cho nav bar.
8. Trong `src/app/(app)/exercises/page.tsx`:
   - Bỏ class `pb-24` (tránh double-padding). Đổi thành `pb-6` hoặc giữ nguyên nếu muốn card cuối cách nav xa hơn - tùy judgment L1. Ghi lại DEVIATIONS nếu đổi.
9. Trong `src/app/(app)/exercises/[slug]/page.tsx`:
   - Tương tự: bỏ `pb-24` để tránh double, hoặc ghi DEVIATIONS.

### Phase 3 - Placeholder Images

10. Tạo `public/exercises/demo/PLACEHOLDER.svg` - SVG đơn giản 800×500, nền `#e0e5ec` (chassis), chữ "DEMO IMAGE" ở giữa font JetBrains Mono fallback `monospace`, màu `#8896a5` (ink-muted), có viền dashed `#c7d0da`. Tên file UPPERCASE theo convention repo.
11. Update 6 file JSON (KHÔNG đổi các field khác, chỉ path):
    - `data/exercises/barbell-row.json` - `gallery.main` + cả `gallery.views[].src` → `/exercises/demo/PLACEHOLDER.svg`
    - `data/exercises/deadlift.json` - tương tự
    - `data/exercises/hip-thrust.json` - tương tự
    - `data/exercises/overhead-press.json` - tương tự
    - `data/exercises/pull-up.json` - tương tự
    - `data/exercises/romanian-deadlift.json` - tương tự
12. Validate JSON sau update: mỗi file phải `JSON.parse` không lỗi. (Dùng `node -e "JSON.parse(require('fs').readFileSync(...))"` hoặc tương đương PowerShell.)
13. 2 file còn lại (back-squat, bench-press) - giữ nguyên ảnh hiện có.

### Phase 4 - Deprecate Demo Page

14. Trong `src/app/exercise-demo/page.tsx`, thêm banner sau vào **đầu `<main>`**, **trước** `<div className="mx-auto max-w-6xl ...">` hiện tại:

```tsx
<div className="mx-auto max-w-6xl px-4 pt-4">
  <div className="card p-3 mb-4 flex items-center gap-3 border-2 border-warn/40">
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

15. Thêm `import Link from 'next/link';` ở đầu file (đã có sẵn trong bản hiện tại - verify trước khi thêm).

### Phase 5 - Cleanup Staging

16. Xóa toàn bộ `src/app/exercises-test/`.
17. Verify `grep -r "exercises-test"` toàn repo → phải trả về 0 hit. (PowerShell: `Get-ChildItem -Recurse | Select-String "exercises-test"`.)

### Phase 6 - Docs

18. Trong `data/exercises/README.md`, sau dòng "Hiện tại `[slug]/page.tsx` đang đọc từ Supabase..." thêm:
    ```
    Trang chính để xem các bài này là `/exercises` (TIP-021A, Phase 1 MVP).
    Trang `/exercise-demo` đã deprecated - chỉ dùng làm design reference.
    ```
19. Trong `DECISIONS_LOG.md`, append cuối file:

```markdown
## D-029: Route consolidation `/exercises` (2026-08-18)
**Decision:** Move staging `/exercises-test/*` → `(app)/exercises/*`; giữ `/exercise-demo` làm design reference với banner `@deprecated`.
**Reason:** TIP-021A yêu cầu route `/exercises` chuẩn; staging `/exercises-test` chỉ là intermediate; demo `/exercise-demo` cần giữ để so sánh visual với JSON-driven detail page.
**Impact:** Nav đã trỏ `/exercises` sẽ bắt đầu resolve; smoke test cần user onboarded (auth gate trong `(app)/layout.tsx`).

## D-030: Design reference policy (2026-08-18)
**Decision:** Pages trong `src/app/exercise-demo/` không bao giờ xóa hẳn khi còn component được import từ route khác. Khi muốn xóa phải extract component ra `src/components/exercise/` trước.
**Reason:** Tránh mồ côi import (`VideoGuide`, `PerformanceChart` đang được `exercises/[slug]/page.tsx` import trực tiếp).
**Impact:** Maintenance cost: 4 file demo vẫn tồn tại, nhưng chỉ `page.tsx` thêm banner; 3 component file giữ nguyên.
```

---

## Acceptance Criteria

Mỗi AC phải pass trước khi Builder nộp Completion Report. Đánh số AC-1 → AC-12 theo bảng dưới.

| # | AC | Cách verify |
|---|---|---|
| AC-1 | `/exercises` render grid ≥7 bài từ JSON | Browser DevTools, count `<Link href="/exercises/...">` |
| AC-2 | `/exercises/back-squat` + 6 slug khác đều render detail đầy đủ | 7 lần navigate |
| AC-3 | `/exercises?muscle=Ngực` filter đúng | URL bar thay đổi, count card giảm |
| AC-4 | `/exercises?q=bench` search đúng (case-insensitive trên `name_vi` + `name` + `primary_muscle` + `tags`) | URL `?q=bench` → chỉ thấy bench-press |
| AC-5 | `/exercises/deadlift` không broken image (dù đang dùng PLACEHOLDER.svg) | Visual check |
| AC-6 | `/exercises-test/*` đã sạch khỏi repo | `grep -r exercises-test` (PowerShell: `Select-String`) |
| AC-7 | `/exercise-demo` có banner `@deprecated` dùng class `border-warn/40` + text-warn | Visual check |
| AC-8 | `pnpm lint` exit code 0 | Terminal |
| AC-9 | `pnpm build` exit code 0 (Next.js build, không có type error) | Terminal |
| AC-10 | Sidebar nav highlight `/exercises` khi ở `/exercises` và `/exercises/[slug]` | Visual: `bg-accent text-white shadow-accent font-semibold` |
| AC-11 | Mobile breakpoint 375px: không horizontal scroll, touch target ≥ 48px | DevTools responsive mode |
| AC-12 | Tất cả 7 bài có ảnh render (placeholder OK) | Visual navigate 7 slug |

**Bonus (không bắt buộc nhưng ghi trong Completion Report nếu làm):**
- AC-13: `data/exercises/validate.ps1` còn chạy được (nếu touch script - không touch trong TIP này).

---

## Constraints

### Làm được
- Dùng `next/image` cho mọi ảnh.
- Dùng Tailwind tokens, KHÔNG hard-code hex color.
- Refactor nhỏ trong cùng file (L1) nếu phát hiện cần - ghi DEVIATIONS.
- Thêm comment ngắn giải thích nếu placeholder SVG cần thiết cho build pass.

### KHÔNG làm (L2/L3 nếu cần → escalate Contractor)
- **KHÔNG** sửa `data/exercises/*.json` ngoài 6 file được liệt kê ở Task.11, **CHỈ** đổi `gallery.main` + `gallery.views[].src`, **không** thêm field, không đổi nội dung.
- **KHÔNG** sửa schema `exercise.schema.json` - không thêm field mới.
- **KHÔNG** đụng Supabase, RLS, migrations.
- **KHÔNG** đổi design tokens (`globals.css`, `tailwind.config.ts`).
- **KHÔNG** đổi `package.json` (đủ deps rồi: `next`, `react`, `lucide-react`, `tailwindcss`, `zod`).
- **KHÔNG** implement handler cho "Thêm vào buổi tập" / "Áp dụng AI" (TIP-011 + TIP-015).
- **KHÔNG** xóa `/exercise-demo/*` - giữ components.
- **KHÔNG** tự ý đổi sang `<img>` thay vì `next/image`.
- **KHÔNG** hard-code tiếng Anh trong UI mới (giữ Vietnamese theo OQ-2).
- **KHÔNG** skip lint hoặc build errors.

---

## Completion Report Template

Thợ phải nộp bằng cách paste **chính xác** format sau vào chat khi xong. Thiếu một mục → VERIFY fail.

```markdown
# Completion Report - TIP-021B

**STATUS:** DONE | PARTIAL | BLOCKED

## FILES CHANGED

### Created
- [list path mới + số dòng, vd: `src/app/(app)/exercises/page.tsx` (139 lines)]

### Modified
- [list path đã sửa + tóm tắt thay đổi 1 dòng, vd: `src/app/(app)/exercises/[slug]/page.tsx` - đổi dynamic → static import cho generateStaticParams]

### Deleted
- [list path đã xóa, vd: `src/app/exercises-test/` (toàn bộ)]

## TEST RESULTS

| AC# | Pass/Fail | Bằng chứng |
|---|---|---|
| AC-1 | ✅/❌ | [mô tả ngắn: "thấy 7 card trong grid"] |
| AC-2 | ✅/� | [7/7 slug navigate OK hoặc note slug fail] |
| AC-3 | ✅/❌ | ... |
| ... | ... | ... |

## ISSUES
- [Severity: BLOCKER/MAJOR/MINOR] Mô tả + repro steps.
- Hoặc: "None."

## DEVIATIONS
- [Cái gì đổi so với TIP + lý do + impact. Ví dụ: "Bỏ pb-24 trong page.tsx vì `(app)/layout.tsx` đã có pb-20 mobile - tránh double."]

## SUGGESTIONS (cho Contractor)
- [Bất cứ cải tiến nào phát hiện khi làm. Ví dụ: "Schema JSON nên có `media_type: 'placeholder'` flag để sau này TIP-007A biết bài nào cần thay URL."]

## COMMANDS RUN

```bash
# Paste output (hoặc tóm tắt) của:
pnpm lint
pnpm build
grep -r "exercises-test"  # hoặc tương đương PowerShell
```

## ARTIFACTS

- [Đường dẫn file mới/sửa quan trọng nếu có]
```

---

## Escalation Path

- **L1 ambiguity** (variable name, padding tweak, comment style): quyết và ghi DEVIATIONS.
- **L2 ambiguity** (spec mơ hồ, cần đổi pattern, conflict giữa 2 AC): dừng, hỏi Contractor (paste câu hỏi ngắn trong chat).
- **L3** (cần thêm route, đổi schema, đụng Supabase): dừng, đề xuất, đợi Human.

**Một câu escalation:** "Quyết định này có làm thay đổi TIP đã approve, hoặc ảnh hưởng ngoài scope không?" → Có = L2/L3. Không + đủ context = L1.

---

**Contractor (Chủ thầu):** đã approve scope với Human lúc 2026-08-18 23:51 UTC+7.
**Builder (Thợ):** Cursor agent.
**Estimated:** 90 phút. 1-2 commit tùy judgment.
