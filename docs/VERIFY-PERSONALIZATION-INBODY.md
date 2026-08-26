# CONTRACTOR VERIFY - Personalization & InBody

**Ngày kiểm tra:** 2026-08-22  
**Kết luận:** READY - Chủ thầu chấp nhận P01, P02, P03, P04 và P05.

## Requirement coverage

- 18/18 yêu cầu P0 trong ba TIP đã có implementation và evidence: **100%**.
- Adaptive Profile có mục tiêu/lịch tập, giới hạn vận động, sở thích bài tập và readiness.
- InBody là luồng tùy chọn trong modal: trang chỉ có một CTA; chọn ảnh sẽ tự che header ở client và tự phân tích; người dùng kiểm tra bốn trường chính rồi nhấn `Lưu kết quả`. Không còn form upload inline hoặc công tắc quyền AI.
- Planner, candidate/fallback, substitute, progression, coach và weekly report dùng cùng context versioned; hard exclusions ưu tiên cao nhất; readiness chỉ giảm/giữ workload; InBody không quyết định tải tập và không tạo chẩn đoán.

## Scenario results

| Scenario | Kết quả | Mức độ |
|---|---:|---:|
| Constraint/readiness hết hạn bị loại | PASS | Critical |
| Measurement đã xác nhận luôn tới planner/coach/weekly report | PASS | Critical |
| 1 phép đo chỉ là baseline; 2 phép đo tương đồng mới có trend | PASS | High |
| Ảnh được che ở client, không có cột lưu ảnh/path/URL | PASS | Critical |
| OCR/Gemini chỉ tạo draft; user review mới lưu | PASS | Critical |
| Explicit exclusion thắng candidate và fallback | PASS | Critical |
| Readiness thấp không thể tăng workload | PASS | Critical |
| InBody không thay đổi progression/load | PASS | Critical |
| API chưa đăng nhập trả 401 | PASS | Critical |
| RLS owner CRUD và chặn cross-user read/update | PASS | Critical |

## Technical health

- Personalization context: **8/8 PASS**.
- InBody/body composition: **15/15 PASS**.
- AI personalization integration: **6/6 PASS**.
- Workout regression: **16/16 PASS**.
- Dist-dir isolation: **1/1 PASS**.
- Tổng focused/regression mới nhất: **46/46 PASS**.
- TypeScript `tsc --noEmit`: PASS.
- `git diff --check`: PASS.
- ESLint: 0 error; 1 warning cũ tại `objective-set-tracker.tsx`, ngoài phạm vi.
- Production build cô lập tại `.next-build-verify`: PASS, **45/45** pages generated.
- Local smoke tại `localhost:3000`: `/profile` HTTP 200 sau khi khởi động lại một Next dev server sạch.

## P04 authenticated E2E

- Đăng nhập local bằng tài khoản người dùng cung cấp: PASS.
- Ba nhóm `Có gì cần tránh?`, `Bạn thích tập thế nào?`, `Hôm nay bạn thế nào?`: tồn tại và đều đóng mặc định.
- Chọn ảnh InBody: tự tạo bản dẫn xuất đã che và phát đúng một multipart request.
- Request có `redactedImage`, `consent=true`, `redactionApplied=header_masked_v1`: PASS.
- Checkbox consent và nút phân tích trung gian: **0**.
- Review chính: thời điểm đo + 3 chỉ số chính; vùng `Chỉ số khác (tuỳ chọn)` đóng mặc định.
- Một CTA cuối `Lưu kết quả` và một master AI switch: PASS.
- Viewport 390 px: tràn ngang **0 px**; console error **0**.
- `/api/inbody/extract` được intercept bằng fixture ở browser; không gọi Gemini và không ghi Supabase trong E2E.

## P05 authenticated E2E

- Trang có đúng **1** CTA `Thêm kết quả InBody`, form upload inline **0**, card/toggle AI **0**.
- Modal mở đúng semantic dialog; khoá scroll nền; Escape đóng và focus trở lại CTA.
- Chọn ảnh tự phát đúng một request chứa derivative, `consent=true` và `header_masked_v1`.
- Bốn trường review chính hiện trong modal; chỉ số khác đóng mặc định.
- Save payload luôn có `planner`, `coach`, `weekly_report` và `reviewed=true`; lưu thành công đóng modal.
- Viewport 390 px: tràn ngang **0 px**; console error **0**.
- Extract, save và refresh API đều được intercept; provider call **0**, database mutation **0**.

## Local runtime incident

- Symptom: `localhost:3000/profile` trả 500 với `__webpack_modules__[moduleId] is not a function`.
- Root cause: hai `next dev` dùng chung `.next` trong khi `next build` tạo lại cùng artifact, khiến server cổng 3000 đọc chunk dev/build không đồng bộ.
- Recovery: dừng đúng hai cây Next process, chuyển cache lỗi ra khỏi `.next`, khởi động một server duy nhất ở cổng 3000.
- Fresh evidence: Next ready, `/profile` compile thành công và trả HTTP 200.

## REFINE note - cô lập artifact khi VERIFY build

- Antigravity language server tiếp tục tự respawn đồng thời `npm run dev` và `npx next dev`, nên không thể bảo đảm `.next` độc quyền trong lúc chạy production build.
- `next.config.mjs` hỗ trợ opt-in `distDir: process.env.NEXT_DIST_DIR || '.next'`; mặc định dev/production vẫn dùng `.next` như trước.
- Gate build sạch đã chạy bằng `$env:NEXT_DIST_DIR='.next-build-verify'; npm.cmd run build`: **PASS 45/45**, không tranh chấp với các dev server do IDE quản lý.
- Static regression `npx.cmd tsx --test tests/next-dist-dir.test.ts`: xác minh override, fallback `.next` và chỉ có một khai báo `distDir`.
- Sau build, thay đổi format/include tự động của Next trong `tsconfig.json` đã được hoàn nguyên; TypeScript và `git diff --check` vẫn PASS.

## Supabase MCP verification

- Không dùng Docker.
- Applied migrations:
  - `personalization_foundation` - MCP version `20260822021230`.
  - `optimize_personalization_rls_and_fks` - MCP version `20260822021718`.
- 7/7 bảng mới tồn tại, RLS enabled, mỗi bảng có owner-only policy.
- RLS transaction test với hai user: owner đọc/ghi/xóa được; user khác không đọc/cập nhật được; transaction rollback sạch và các bảng vẫn không có dữ liệu test.
- 2 covering indexes cho composite FK tồn tại.
- Supabase Advisor sau REFINE: không còn `auth_rls_initplan` hoặc `unindexed_foreign_keys` thuộc module mới; không có security finding thuộc module mới.

## Boundaries

- Không gửi ảnh InBody đính kèm lên Gemini và không lưu chỉ số từ ảnh đó.
- Không tạo user test, không để lại record test, không commit/push Git.
- Authenticated browser E2E đã chạy không-cost bằng API interception; không lưu credential vào source hoặc report.
