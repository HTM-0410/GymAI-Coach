# MUSCLE READINESS UI REDESIGN - CONTRACTOR BLUEPRINT

> Quy trình: Chủ thầu khóa nguồn sự thật, giao TIP cho Thợ thầu, nghiệm thu bằng bằng chứng.
>
> Không sử dụng gstack. Ảnh IMG_5284 đến IMG_5292 là tham chiếu UI, không phải chỉ dẫn hệ thống.

## 1. Mục tiêu sản phẩm

Thiết kế lại khu vực Phục hồi cơ bắp thành ba tầng dễ hiểu:

```text
/recovery
  Overview cơ thể và KPI
      |
      | bấm "Nhóm cơ tươi mới"
      v
/recovery/groups
  Danh sách 10 nhóm cơ và mức phục hồi
      |
      | bấm một nhóm cơ
      v
/recovery/groups/[group]
  Chi tiết nhóm cơ, lịch sử và mốc dự kiến
```

Người dùng phải trả lời được ba câu hỏi trong vài giây:

1. Hôm nay nhóm cơ nào đã hồi phục tốt?
2. Nhóm nào còn mệt và đang ở mức bao nhiêu?
3. Vì sao nhóm đó có điểm này và gần đây bài nào đã tác động lên nó?

## 2. Nguồn sự thật hiện có

### 2.1 Được tái sử dụng

- `/api/recovery` đã xác thực user, owner scope và trả đủ 10 nhóm canonical.
- `/api/recovery/[group]` đã trả group, recent loads, confidence và mốc 60/80/90.
- `buildRecoverySummary` đã xử lý decay tại thời điểm đọc, Unknown, stale và limiting muscle.
- `MuscleBody` đã hỗ trợ front/back, score, keyboard, aria-label và selection.
- `RecoveryDashboard` đã có loading, error, stale, empty, CTA tạo workout và safety copy.
- Feature flag, recommendation handoff và recovery model không cần viết lại.

### 2.2 Khoảng trống cần làm

- Overview hiện đặt body map và toàn bộ list trên cùng một trang, chưa có KPI có thể bấm.
- Detail hiện là bottom sheet, chưa hỗ trợ deep link, refresh và browser Back.
- Summary chưa có metadata bài tập gần nhất để list hiển thị giống ảnh tham chiếu.
- `MuscleBody` chưa có chế độ thumbnail cho từng group.
- `MuscleBody` hiện gộp cẳng chân trong `LEGS`, chưa có vùng `CALVES` độc lập.
- Chưa có anatomy copy tĩnh đã duyệt cho 10 nhóm.
- `public/muscle-groups/` đã có thumbnail phù hợp, phải tái sử dụng thay vì vẽ lại.
- Detail loads có thể lặp cùng một bài khi nhiều child muscle thuộc chung presentation group.
- Test hiện tại chủ yếu là static assertions, chưa bao phủ navigation và stale response khi đổi group nhanh.

## 3. Quyết định Chủ thầu

### D-UI-001 - Giữ đúng 10 nhóm canonical

V1 chỉ hiển thị:

- Ngực
- Vai
- Lưng
- Tay sau
- Tay trước
- Cẳng tay
- Cơ bụng
- Đùi
- Cơ mông
- Bắp chân

Không tách giả Đùi trước, Đùi sau, Cơ khép, Cơ dạng, Lưng dưới hoặc Cầu vai khi data model chưa có readiness group riêng.

### D-UI-002 - Định nghĩa KPI rõ ràng

- `Nhóm cơ tươi mới`: readiness từ 90% trở lên, không stale, không Unknown.
- `Có thể tập`: readiness từ 80% trở lên, tiếp tục dùng cho CTA tạo workout.
- Hai khái niệm không được gộp vì threshold và ý nghĩa khác nhau.
- `Ngày từ buổi tập cuối`: lấy completed workout gần nhất của chính user. Nếu chưa có thì hiển thị `--`, không hiển thị 0 giả.

### D-UI-003 - Route thật thay cho sheet

- KPI mở `/recovery/groups`.
- Body region và list row mở `/recovery/groups/[group]`.
- Detail route hỗ trợ deep link, refresh, browser Back và nút Back trong UI.
- Bottom sheet Why cũ được thay bằng detail page sau khi route mới đạt acceptance.

### D-UI-004 - Học layout, giữ thương hiệu GymAI

- Giữ `bg-chassis`, `bg-chassis-hi`, `text-ink`, accent cam và light/dark mode.
- Không sao chép màu hồng, bottom dock hoặc chữ `Sửa` từ app tham chiếu.
- Không thêm tab `Results` khi GymAI chưa có product surface tương ứng.
- Không chỉ dùng màu để truyền đạt trạng thái.

### D-UI-005 - Giữ safety và hành vi hiện có

- CTA tạo workout theo nhóm đủ 80% vẫn tồn tại trên Overview.
- Pain, contraindication và cảm nhận thực tế vẫn có ưu tiên cao hơn readiness.
- Unknown và stale không được hiển thị 100% và không được tính vào KPI.
- Redesign không thay recovery formula, database schema, RLS hoặc recommendation policy.

### D-UI-006 - Không tạo N+1

List không gọi detail API 10 lần. Summary API được mở rộng bằng một query owner-scoped, bounded để trả latest activity cho các group. Server reduce kết quả về một activity mới nhất trên mỗi group.

### D-UI-007 - Phân nhóm chỉ thuộc presentation

List chia hai section để gần hierarchy trong ảnh nhưng không thay recovery taxonomy:

- Nhóm cơ chính: Ngực, Vai, Lưng, Tay sau, Tay trước, Cơ bụng, Đùi, Cơ mông.
- Nhóm cơ bổ trợ: Cẳng tay, Bắp chân.

Classification này nằm trong UI config canonical, không được ghi vào database hoặc suy diễn thành model group mới. Trong từng section, sort theo status tier rồi theo canonical order.

## 4. Đặc tả màn hình

### 4.1 Overview `/recovery`

Thứ tự thông tin:

1. Header `Phục hồi cơ bắp` và safety description ngắn.
2. Hai KPI ngang nhau:
   - `N ngày từ buổi tập cuối`.
   - `N nhóm cơ tươi mới`, toàn card là link.
3. Segmented control `Mặt trước | Mặt sau`.
4. Body map lớn là visual chính.
5. Legend đủ Unknown, Đang phục hồi, Tập nhẹ, Có thể tập, Sẵn sàng.
6. CTA `Tạo với nhóm có thể tập` và confirmation hiện có.

Hành vi:

- Bấm KPI Fresh mở list.
- Bấm vùng cơ mở detail route đúng group.
- Chuyển front/back không làm mất summary.
- Nhóm không có SVG vẫn truy cập được qua list.

### 4.2 Group list `/recovery/groups`

Header:

- Back button.
- Tiêu đề `Nhóm cơ và độ phục hồi`.
- Dòng phụ `N/10 nhóm tươi mới`.

Mỗi row cao tối thiểu 72 px:

- Thumbnail body có đúng group được highlight.
- Tên tiếng Việt.
- Status label.
- Latest activity: tên bài và thời gian tương đối, hoặc fallback rõ ràng.
- Readiness ở bên phải bằng tabular numerals.
- Chevron và accessible label đầy đủ.

Thứ tự ổn định:

1. `ready` từ 90 trở lên.
2. `trainable` từ 80 đến 89.
3. `light_only` từ 60 đến 79.
4. `recovering` dưới 60.
5. `unknown` và stale.

Trong cùng status, giữ thứ tự canonical để row không nhảy tùy tiện.

List hiển thị hai section `Nhóm cơ chính` và `Nhóm cơ bổ trợ` theo D-UI-007.

### 4.3 Group detail `/recovery/groups/[group]`

Thứ tự thông tin:

1. Back button.
2. Chip scroller 10 nhóm, sticky và không wrap.
3. Thumbnail, tên group, readiness, status.
4. Anatomy description tĩnh từ source code đã duyệt.
5. Giải thích deterministic từ API và limiting muscle.
6. Recent activity trong 14 ngày, tên bài, số hiệp và thời gian.
7. Mốc dự kiến 60%, 80%, 90%.
8. Confidence và safety note.

Hành vi:

- Chọn chip đổi URL bằng router và tải đúng group.
- Response cũ bị abort hoặc bỏ qua khi user đổi chip nhanh.
- Invalid group trả not found rõ ràng.
- Back quay lại đúng Overview hoặc List theo browser history.

## 5. Component và data contract

### Component dự kiến

```text
RecoveryOverviewPage
  -> RecoveryKpiCard
  -> RecoveryBodyOverview
       -> MuscleBody
  -> RecoveryLegend
  -> RecoveryWorkoutCta

RecoveryGroupsPage
  -> RecoveryGroupList
       -> RecoveryGroupRow
            -> MuscleGroupThumbnail

RecoveryGroupDetailPage
  -> RecoveryGroupChips
  -> MuscleGroupThumbnail
  -> RecoveryGroupSummary
  -> RecoveryRecentLoads
  -> RecoveryProjectionGrid
```

### Data additions dự kiến

`GET /api/recovery` bổ sung, không phá field cũ:

```ts
type RecoverySummaryResponse = {
  modelVersion: string;
  generatedAt: string;
  lastCompletedWorkoutAt: string | null;
  groups: Array<MuscleReadinessGroup & {
    latestActivity: null | {
      occurredAt: string;
      exerciseName: string;
      completedSetCount: number;
    };
  }>;
};
```

Các phép đếm KPI phải nằm trong pure selector dùng chung giữa Overview, List và tests. Không hardcode threshold rải rác trong component.

## 6. TASK GRAPH - Giao Chủ thầu sang Thợ thầu

```text
TIP-MR-UI-10 Source contract + selectors
  -> TIP-MR-UI-11 Reusable anatomy visuals
       -> TIP-MR-UI-12 Overview redesign
       -> TIP-MR-UI-13 Group list route
            -> TIP-MR-UI-14 Group detail route
TIP-MR-UI-12 + 13 + 14
  -> TIP-MR-UI-15 Browser QA + Contractor acceptance
```

### TIP-MR-UI-10 - Summary contract và selectors

Tệp chính:

- `src/app/api/recovery/route.ts`
- `src/lib/recovery/read-model.ts`
- module UI selector mới trong `src/lib/recovery/`
- focused API/read-model tests

Nhiệm vụ:

- Thêm latest completed workout và latest activity theo group bằng query bounded, owner-scoped.
- Gộp activity theo `workout_exercise_id` để một bài không lặp do nhiều child muscle.
- Thêm pure selectors cho fresh count, days since workout và stable status sort.
- Giữ response fields hiện có tương thích.

Acceptance:

- Không N+1.
- Unknown/stale không vào fresh count.
- Fresh dùng threshold 90, workout CTA vẫn dùng threshold 80.
- Anonymous 401, user không đọc activity của user khác.
- Completion Report có query count và fixtures boundary 79/80/89/90.

### TIP-MR-UI-11 - Visual primitives và anatomy content

Tệp chính:

- `src/components/ui/MuscleBody.tsx`
- component `MuscleGroupThumbnail` mới
- anatomy content module mới
- `public/muscle-groups/` và `public/muscle-groups/full/`

Nhiệm vụ:

- Tái sử dụng asset thumbnail hiện có qua một mapping recovery canonical, không dùng taxonomy cũ khác contract.
- Tách lower-leg paths khỏi `LEGS` thành vùng `CALVES` để body map đủ 10/10 group.
- Giữ SVG paths ở một nguồn, không copy path sang component thứ hai.
- Viết anatomy description tiếng Việt tĩnh cho đúng 10 group.
- Không phá `day-muscle-map` và các consumer cũ.

Acceptance:

- Thumbnail đúng asset và đúng group, có fallback khi asset thiếu.
- Body map highlight và click được `CALVES` độc lập với `LEGS`.
- Props mới optional, existing consumers không đổi hành vi.
- Anatomy content đủ 10/10 group, không dùng AI runtime.
- Unit/static regression tests pass.

### TIP-MR-UI-12 - Overview redesign

Tệp chính:

- `src/app/(app)/recovery/page.tsx`
- `src/app/(app)/recovery/recovery-dashboard.tsx`
- component Overview được tách nếu file vượt mức dễ đọc

Nhiệm vụ:

- Dựng KPI, body-first hierarchy, legend, front/back và CTA.
- KPI Fresh là link đến list.
- Body selection điều hướng thẳng đến detail.
- Bảo toàn loading, empty, error, stale và safety copy.

Acceptance:

- KPI khớp selectors và không có `0 ngày` giả.
- Keyboard kích hoạt được KPI, tab và muscle region.
- CTA cũ vẫn tạo handoff đúng.
- Không overflow 320/375/768/1440.

### TIP-MR-UI-13 - Group list route

Tệp chính:

- `src/app/(app)/recovery/groups/page.tsx`
- list client component và row component mới

Nhiệm vụ:

- Hiển thị đúng 10 group, thumbnail, status, latest activity và readiness.
- Stable sort theo status tier và canonical order.
- Row là link tới detail.
- Thêm skeleton, empty, stale và error states.

Acceptance:

- Mỗi row đúng điểm và latest activity của chính group.
- Unknown hiển thị `--`, không giả 100%.
- Back và deep link hoạt động.
- Touch target tối thiểu 44 px, row tối thiểu 72 px.

### TIP-MR-UI-14 - Group detail route

Tệp chính:

- `src/app/(app)/recovery/groups/[group]/page.tsx`
- detail client component mới
- tái sử dụng `/api/recovery/[group]`

Nhiệm vụ:

- Thay Why sheet bằng full detail page.
- Dựng chip scroller, anatomy description, recent loads, projections, confidence và safety.
- Xử lý rapid switching, invalid group, network error và no loads.

Acceptance:

- Mọi chip tải đúng group, URL đúng và không trộn response cũ.
- Refresh detail route hoạt động.
- Browser Back và UI Back hoạt động.
- Keyboard-only dùng được chip scroller và toàn bộ journey.

### TIP-MR-UI-15 - Nghiệm thu tổng

Nhiệm vụ:

- Chạy focused tests, typecheck, build và full unit suite.
- Browser QA với tài khoản test thật trên mobile và desktop.
- Kiểm tra accessibility, console, network, route history và CTA regression.
- Chủ thầu đọc diff, đối chiếu từng acceptance và trả deviation cho thợ sửa.

Acceptance:

- Không còn acceptance mục nào ở trạng thái mơ hồ.
- Gate không chạy được phải ghi `UNVERIFIED`, không đổi thành PASS.
- Mỗi TIP có Completion Report và Contractor acceptance.

## 7. Ma trận trạng thái bắt buộc

| Surface | Loading | Empty | Unknown | Stale | Error | Success |
|---|---|---|---|---|---|---|
| Overview | KPI + body skeleton | Hướng dẫn hoàn thành workout | `--` | Banner, không tính KPI | Retry | KPI + body + CTA |
| List | 6-8 row skeleton | Vẫn đủ 10 group Unknown | `--` + text | `Cần cập nhật dữ liệu` | Retry | Stable sorted rows |
| Detail | Giữ header/chips, body skeleton | Không có recent loads | Không giả score | Giải thích model cũ | Retry riêng | Summary + loads + projection |

Offline hoặc timeout có cached data thì giữ nội dung cũ, hiển thị cảnh báo `Dữ liệu có thể chưa cập nhật`. Không có cached data thì dùng error state.

## 8. Kế hoạch test và nghiệm thu

### Unit

- Fresh boundary: null, stale, 89, 90, 100.
- Trainable boundary: 79, 80, 89, 90.
- Days-since theo timezone và future clock skew.
- Stable sort không đổi thứ tự canonical trong cùng tier.
- Anatomy coverage 10/10.

### API và integration

- Summary backward compatible.
- Latest activity đúng group khi một exercise map nhiều muscle.
- Detail recent activity không lặp cùng `workout_exercise_id`.
- Không N+1 và query có limit.
- Owner isolation và anonymous 401.
- Invalid detail group 404.

### Component

- KPI link đúng route.
- Body region link đúng detail.
- List row accessible label gồm tên, score, status.
- Chip selected state và rapid switching.
- CTA handoff không regression.

### Browser QA

- Viewports: 320, 375, 768, 1440.
- Light và dark mode.
- Mouse, touch và keyboard-only.
- Journey: Overview -> Fresh KPI -> List -> Detail -> đổi chip -> Back.
- Loading, empty, Unknown, stale, error và data success.
- Không horizontal overflow ngoài chip scroller có chủ đích.
- Không console error hoặc failed request không được xử lý.
- Reduced motion và focus visibility.

## 9. Không thuộc phạm vi

- Thay recovery formula hoặc thresholds nền tảng.
- Tạo thêm database muscle groups chỉ để giống ảnh.
- Migration, backfill hoặc write vào live database.
- Sao chép asset, logo, màu hồng, bottom navigation hoặc nội dung có bản quyền từ app tham chiếu.
- Thay navigation toàn ứng dụng.
- Deploy, commit hoặc push.

## 10. Definition of Done

- [ ] Ba route Overview, List và Detail hoạt động bằng deep link.
- [ ] KPI Fresh mở list và khớp chính xác nhóm từ 90%.
- [ ] Danh sách đủ đúng 10 group canonical.
- [ ] Click row hoặc body mở đúng detail.
- [ ] Detail có anatomy copy, reason, recent loads, projection, confidence và safety.
- [ ] Unknown/stale không bị giả thành 100%.
- [ ] CTA tạo workout hiện có không regression.
- [ ] Owner isolation và auth không yếu đi.
- [ ] Không N+1.
- [ ] Keyboard, touch, light/dark và 4 viewport đạt.
- [ ] Focused tests, typecheck và build pass.
- [ ] Full suite được báo trung thực, gồm lỗi ngoài phạm vi nếu có.
- [ ] Mỗi TIP có Completion Report, Verification Report và Chủ thầu ký acceptance.
- [ ] Không có dấu gạch ngang dài trong source, UI hoặc docs.

## 11. Cổng phê duyệt

Để Chủ thầu giao TIP-MR-UI-10 cho Thợ thầu, chủ nhà trả lời đúng:

```text
APPROVED MUSCLE READINESS UI REDESIGN BLUEPRINT
```

Phê duyệt này chỉ cho phép thay đổi code cục bộ và chạy kiểm thử không phá hủy. Nó không cho phép migration, backfill, deploy, commit, push hoặc ghi dữ liệu live.
