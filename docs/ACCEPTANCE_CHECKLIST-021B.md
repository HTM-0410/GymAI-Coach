# Acceptance Checklist - TIP-021B

> Vibecode Kit v6.1 - Verify Report template.
> Builder paste vào Completion Report. Contractor kiểm tra theo checklist này.

---

## Sàn tối thiểu (thiếu 1 mục → chưa VERIFY xong)

### REQUIREMENT COVERAGE
| Mục | Đếm | Tổng | % |
|---|---|---|---|
| AC implement (12 mục trong TIP §Acceptance Criteria) | __ | 12 | __% |
| Tasks trong TIP §Task (19 mục Phase 1-6) | __ | 19 | __% |

### SCENARIO RESULTS
| Severity | Count | Chi tiết |
|---|---|---|
| BLOCKER (chặn ship) | __ | ... |
| MAJOR (ảnh hưởng UX rõ rệt) | __ | ... |
| MINOR (cosmetic, defer OK) | __ | ... |

### TECHNICAL HEALTH
| Check | Exit code | Ghi chú |
|---|---|---|
| `pnpm lint` | __ | |
| `pnpm build` | __ | |
| `pnpm dev` boot OK | ✅/❌ | |
| `grep -r "exercises-test"` hits | __ | (mục tiêu: 0) |

### OVERALL STATUS
- **READY** - pass tất cả AC, không BLOCKER, không MAJOR.
- **READY with deferred** - có MINOR đã liệt kê, Human chọn ship/fix.
- **NOT READY** - còn BLOCKER hoặc MAJOR.

---

## Functional checklist (Contractor check sau khi thợ nộp)

### A. Route & Navigation
- [ ] Sidebar highlight `/exercises` khi đứng tại `/exercises`
- [ ] Sidebar highlight `/exercises` khi đứng tại `/exercises/[slug]`
- [ ] Active state đúng `bg-accent text-white shadow-accent font-semibold` (class trong `nav.tsx`)
- [ ] Mobile bottom nav highlight tương ứng

### B. Library page (`/exercises`)
- [ ] Grid 3 cols desktop / 2 tablet / 1 mobile
- [ ] Tất cả 7 bài hiển thị: back-squat, barbell-row, bench-press, deadlift, hip-thrust, overhead-press, pull-up, romanian-deadlift (đếm lại - verify 8 slug đã seed)
- [ ] Search input dùng `.input` class (recessed shadow)
- [ ] Search filter real-time, dùng URL param `q`
- [ ] Muscle chips: hiển thị tất cả distinct muscle groups từ `getExerciseFacets()`
- [ ] Equipment chips: tối đa 12 cái đầu (theo code hiện tại `slice(0, 12)`)
- [ ] Difficulty chips: 3 nút Mới / TB / Nâng cao
- [ ] Filter clear: bấm lại chip đang active → toggle off
- [ ] Empty state: "Không tìm thấy bài tập nào khớp bộ lọc." (đã có trong code cũ)

### C. Detail page (`/exercises/[slug]`)
- [ ] Generate static params chạy lúc build (không error)
- [ ] Back link → `/exercises`
- [ ] Gallery: 1 ảnh lớn + 3 thumbnail (active = border-accent)
- [ ] Tags hiển thị đúng số lượng từ JSON
- [ ] Goal panel + 3 stat cells (Cơ chính / Cơ phụ / Kiểu chuyển động)
- [ ] Instructions: STEP 01/02/03... với badge accent
- [ ] Tips: CheckCircle2 + text-success
- [ ] Mistakes: ShieldAlert + text-warn
- [ ] Aside: Thông số & thiết lập (8 dòng dl)
- [ ] Aside: AI Coach đề xuất + button `aria-disabled="true"` + tooltip
- [ ] Aside: Lưu ý an toàn
- [ ] Hiệu suất gần đây: 3 metric cards + PerformanceChart SVG render đúng
- [ ] Bài thay thế: 0-3 cards, mỗi card link tới `/exercises/[alt-slug]`
- [ ] "Thêm vào buổi tập" button fixed bottom (mobile) / inline (desktop) - `aria-disabled="true"` + tooltip

### D. Visual consistency (Industrial Skeuomorphism)
- [ ] Background `bg-chassis` + `blueprint-grid`
- [ ] Cards dùng `card` class (neumorph shadow)
- [ ] Technical labels uppercase + JetBrains Mono + tracking-wider
- [ ] Accent LED dots trên heading (theo code hiện tại)
- [ ] Hover state card có `hover:-translate-y-1 transition-all duration-300` (đã có)
- [ ] Corner screws (`.corner-screws`) trên panel quan trọng

### E. Responsive
- [ ] Desktop 1280px: grid 3 cols, aside 310px sticky
- [ ] Tablet 768px: grid 2 cols
- [ ] Mobile 375px: grid 1 col, no horizontal scroll, CTA bottom không che content
- [ ] Touch target ≥ 48px (input/button)

### F. Auth & Onboarding gate
- [ ] Chưa login → redirect `/auth/login` (từ `(app)/layout.tsx`)
- [ ] Chưa onboard → redirect `/onboarding`
- [ ] Đã onboard (có `experience_level`) → render đầy đủ

### G. Deprecated banner
- [ ] `/exercise-demo` hiển thị banner với:
  - `border-warn/40` border
  - `text-warn` cho label "@deprecated"
  - Link `/exercises` accent + underline
- [ ] Banner nằm trong `max-w-6xl px-4 pt-4`, trước content cũ

### H. Cleanup
- [ ] `src/app/exercises-test/` đã xóa hoàn toàn
- [ ] Không còn reference `exercises-test` trong source, docs, scripts
- [ ] `data/exercises/README.md` có dòng mới về `/exercises`
- [ ] `DECISIONS_LOG.md` có D-029 + D-030

### I. Placeholder image
- [ ] `public/exercises/demo/PLACEHOLDER.svg` tồn tại
- [ ] 6 JSON updated: barbell-row, deadlift, hip-thrust, overhead-press, pull-up, romanian-deadlift
- [ ] 2 JSON không touch: back-squat, bench-press
- [ ] Tất cả 7 (8?) slug render ảnh OK (không broken)

---

## Verification flow

1. Builder chạy smoke test locally (Bước 4 trong TIP).
2. Builder paste **Completion Report** theo template trong TIP §Completion Report.
3. Contractor chạy lại checklist trên, verify từng mục.
4. Nếu pass → Contractor append **VERIFY REPORT** vào `docs/VERIFY-TIP-021B.md`, link từ `DECISIONS_LOG.md`.
5. Nếu fail → Contractor đề xuất REFINE (Bước 8 trong Vibecode Kit) hoặc escalate L2/L3.

---

**Owner verification:** Contractor.
**Sign-off cần:** Human review khi OVERALL STATUS = READY.
