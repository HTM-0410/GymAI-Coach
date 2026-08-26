# VERIFY REPORT: Chuẩn hóa cách tính lượng tập

Date: 2026-08-26
TIP: TIP-WM-01 và REFINE TIP-WM-01-R1
Role: Chủ thầu

## REQUIREMENT COVERAGE

- Total requirements: 13
- Implemented: 13
- Missing: 0
- Deferred: 0 trong phạm vi code
- Coverage: 100%

| REQ-ID | Result | Evidence |
|---|---|---|
| REQ-WM-001 | PASS | Central contract có `weight_reps`, `reps`, `duration`, `duration_distance` |
| REQ-WM-002 | PASS | Phase và tracking mode được validate độc lập; test phase independence PASS |
| REQ-WM-003 | PASS | Exercise schema, sync và 30 mapping reviewed có default, allowed, review source và load basis |
| REQ-WM-004 | PASS | Migration và confirm route lưu snapshot mode cùng target tương ứng |
| REQ-WM-005 | PASS | Set actual lưu canonical kg, reps, seconds và meters |
| REQ-WM-006 | PASS | Logger hiển thị và validate field theo mode; reps-only không yêu cầu weight |
| REQ-WM-007 | PASS | AI schemas, planner, generate, regenerate và confirm giữ mode-specific targets |
| REQ-WM-008 | PASS | Actual projector và done view tính volume, reps, duration, distance, pace theo mode |
| REQ-WM-009 | PASS | Chỉ `weight_reps` đi vào tăng tạ; safety và recovery cap giữ nguyên |
| REQ-WM-010 | PASS | Recovery nhận valid main effort ở cả 4 mode và loại accessory phases |
| REQ-WM-011 | PASS | Legacy `reps`, `time`, `hold` được normalize và đọc tương thích |
| REQ-WM-012 | PASS | UI đọc `profile.unit_system`, dùng kg/lb và m/mi, storage vẫn kg/meters |
| REQ-WM-013 | PASS | Focused regression suite, typecheck và build đều PASS |

## SCENARIO RESULTS

- Acceptance criteria: 12/12 PASS
- Focused scenarios: 45/45 PASS
- Failed: 0 trong phạm vi TIP
- Untestable locally: authenticated browser E2E trên schema đã migrate

Các lỗi VERIFY vòng 1 đã được sửa và tái kiểm:

1. Imperial wiring: PASS. Create, active logger và done đều đọc `unit_system`; input được đổi về canonical trước khi ghi.
2. Distance-only: PASS. Dùng count-up, không tạo cutoff 45 giây, yêu cầu actual duration và positive distance.
3. Countdown thiếu distance: PASS. Validation xảy ra trước duplicate-send guard và có thể hoàn tất sau khi nhập distance.
4. Missing metric display: PASS. Formatter bỏ qua giá trị thiếu, không tạo `0 m`.

## TECHNICAL HEALTH

- Production build: PASS, compile thành công và static generation 52/52 theo build của Thợ; artifact có BUILD_ID và route manifest hiện hữu.
- Type errors: 0, Chủ thầu chạy lại `npx.cmd tsc --noEmit --pretty false`.
- Focused tests: 45 PASS, 0 FAIL, Chủ thầu chạy lại độc lập.
- Full unit tests: 221 PASS, 2 FAIL, tổng 223.
- Hai lỗi full-unit đều thuộc expectation onboarding đang lệch với dirty worktree có trước TIP. Không phải regression của workout metrics.
- Forbidden em dash trong feature sources và artifacts: 0.
- `tsconfig.json`: không còn include build tạm.

## ISSUES AND DEFERRED ROLLOUT GATES

1. LOW: Hai test onboarding hiện vẫn fail ngoài phạm vi TIP và cần luồng sở hữu onboarding xử lý.
2. ROLLOUT GATE: Migration mới chưa được chạy trên local preview hoặc Supabase từ xa, đúng giới hạn không ghi dữ liệu ngoài khi chưa được duyệt.
3. ROLLOUT GATE: Chưa có authenticated browser E2E với database đã áp dụng migration cho cả 4 mode.
4. CLEANUP: Hai thư mục build `.next-codex-workout-metrics` và `.next-codex-workout-metrics-verify` là artifact untracked, không được stage hoặc deploy.

## DECISIONS NEEDED FROM CHỦ NHÀ

- Không cần quyết định thêm để hoàn tất code.
- Trước rollout, cần phê duyệt riêng nếu muốn áp dụng migration hoặc sync taxonomy lên Supabase.

## OVERALL STATUS

READY-WITH-DEFERRED-ROLLOUT

Code và contract đạt 13/13 requirements. Chưa tuyên bố production-ready cho đến khi migration được kiểm trên preview và authenticated E2E đủ 4 mode PASS.
