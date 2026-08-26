# COMPLETION REPORT - TIP-WM-01

**STATUS:** DONE

## FILES CHANGED

### Created

- `src/lib/workouts/metrics.ts`: Contract trung tâm cho 4 tracking mode, tương thích legacy, validation, aggregation, pace và chuyển đổi metric/imperial.
- `src/lib/exercises/workout-metrics-taxonomy.ts`: Ánh xạ thủ công 30 bài đã review sang default mode, allowed modes, duration style và load basis.
- `supabase/migrations/20260826120000_standardize_workout_metrics.sql`: Migration cộng thêm cho exercise metadata, workout snapshot và actual duration/distance.
- `tests/workout-metrics.test.ts`: Focused tests cho contract, set write, taxonomy, AI round trip, actuals, progression, recovery và unit conversion.

### Modified

- `src/types/database.ts`, `src/lib/exercises-types.ts`, `data/exercise-canonical.schema.json`, `scripts/sync-exercises.ts`: Mở rộng exercise và database contract, giữ safe fallback `reps` với `needs_review` cho bài chưa review.
- `src/lib/ai/workout-contract.ts`, `src/lib/ai/schema.ts`, `src/lib/ai/workout-constraints.ts`, `src/lib/ai/context.ts`, `src/lib/ai/planner.ts`: Hỗ trợ 4 mode, bỏ suy mode chỉ theo phase, validate allowed modes và giữ target qua regenerate.
- `src/app/api/workout/generate/route.ts`, `src/app/api/workout/confirm/route.ts`: Giữ mode-specific targets qua generate/confirm, xác minh mode với exercise metadata và ghi snapshot mới cùng legacy columns.
- `src/components/exercise-picker-modal.tsx`, `src/app/(app)/workouts/new/new-workout-form.tsx`: Chọn mode trong allowed list, render cấu hình theo mode và dùng formatter chung ở preview.
- `src/app/(app)/workouts/[id]/page.tsx`, `src/app/(app)/workouts/[id]/workout-logger.tsx`, `src/app/(app)/workouts/[id]/objective-set-tracker.tsx`: Khởi tạo set rows cho mọi mode, resume theo set và không bắt buộc mức tạ cho reps-only.
- `src/app/(app)/workouts/[id]/components/current-set-logger.tsx`, `timed-exercise-logger.tsx`, `exercise-identity-header.tsx`, `workout-navigator-sheet.tsx`: UI logger theo mode, ghi actual duration và distance trước khi hoàn tất.
- `src/lib/workouts/actuals.ts`, `src/app/(app)/workouts/[id]/done/page.tsx`, `workout-done-view.tsx`: Tổng hợp volume, reps, duration, distance, pace và chip theo mode, không còn timed `0 reps`.
- `src/lib/training/workout-phases.ts`, `src/lib/ai/progression.ts`, `src/lib/ai/coach.ts`: Chỉ lịch sử `weight_reps` được dùng cho khuyến nghị tăng tạ, vẫn đọc legacy loaded sets.
- `src/lib/recovery/process-workout.server.ts`: Mọi completed main effort hợp lệ đều có thể đóng góp fatigue; warmup, cooldown và warmup set bị loại.
- `src/app/(app)/coach/dashboard/page.tsx`, `src/app/(app)/coach/client/[id]/page.tsx`: Đếm completed main sets không phụ thuộc mode.
- `tests/workout-phases.test.ts`: Cập nhật kỳ vọng phase độc lập với tracking mode.
- `src/app/(app)/workouts/new/page.tsx`, `src/app/(app)/workouts/[id]/page.tsx`, `src/app/(app)/workouts/[id]/done/page.tsx`: Đọc `profiles.unit_system` ở server và truyền vào đúng ba luồng tạo, tập và tổng kết.
- `src/app/(app)/workouts/[id]/components/current-set-logger.tsx`, `completed-sets-compact.tsx`, `exercise-identity-header.tsx`, `compact-rest-timer.tsx`: Hiển thị và chỉnh mức tạ theo kg/lb, chuyển ngược về kg trước khi ghi.
- `src/app/(app)/workouts/[id]/components/timed-exercise-logger.tsx`: Nhập m/mi và chuyển về meter trước khi ghi; bài chỉ có mục tiêu quãng đường dùng đồng hồ đếm lên, bắt buộc actual time và positive distance.
- `tsconfig.json`: Loại riêng include `.next-codex-workout-metrics-verify/types/**/*.ts` do build verification tự thêm, giữ nguyên các include khác trong dirty worktree.

## TEST RESULTS

- Acceptance criteria tested: 12/12 passed.
- AC-01 PASS: 4 mode mới hợp lệ, legacy `time`, `hold`, `reps` được normalize có bằng chứng và field combination sai bị từ chối.
- AC-02 PASS: `weight_reps` lưu kg và reps dương, volume bằng kg x reps.
- AC-03 PASS: `reps` lưu số lần, weight null và volume bằng 0.
- AC-04 PASS: `duration` lưu actual seconds trong workout set; projector và done chip hiển thị thời gian.
- AC-05 PASS: `duration_distance` lưu actual seconds và positive meters; projector trả pace seconds/km. Target-distance-only đếm lên, không còn cutoff 45 giây và không thể hoàn tất khi thiếu quãng đường.
- AC-06 PASS: 30 taxonomy entries được review thủ công, gồm cardio main-compatible và reps activation; phase không ghi đè mode.
- AC-07 PASS: AI draft schema giữ nguyên target của cả 4 mode; planner candidate list chứa default/allowed mode; confirm revalidates metadata trước insert.
- AC-08 PASS: Legacy `reps`, `time`, `hold` vẫn đọc được; legacy reps có load/RIR được nhận diện là `weight_reps`.
- AC-09 PASS: Progression chỉ nhận main `weight_reps`; reps, duration và duration_distance bị loại khỏi tăng kg. Pain và recovery cap hiện hữu không bị thay đổi.
- AC-10 PASS: Recovery nhận loaded, reps-only, duration và duration-distance main efforts; warmup và cooldown không tạo load event.
- AC-11 PASS: `unit_system` được nối end-to-end qua create, logger và done. Imperial input được đổi lb -> kg, mi -> meter trước write; preview, previous set, rest preview, completed set và done dùng formatter theo profile. Round trip helper sai số nhỏ hơn `1e-9`.
- AC-12 PASS: Focused suite 45/45; TypeScript 0 lỗi; production build compile và generate 52/52 trang thành công.

### Commands and evidence

- `npx.cmd tsx --test tests/workout-metrics.test.ts tests/workout-phases.test.ts tests/qa-completion.test.ts tests/muscle-readiness-completion.test.ts tests/workout-summary-insights.test.ts`: PASS 45/45.
- `npx.cmd tsc --noEmit --pretty false`: PASS, 0 errors.
- `$env:NEXT_DIST_DIR='.next-codex-workout-metrics-verify'; npm.cmd run build`: PASS, compile thành công và static generation 52/52. Include artifact do Next tự thêm đã được loại khỏi `tsconfig.json`, sau đó TypeScript check lại vẫn PASS.
- `npm.cmd run test:unit`: 217/219 PASS. Hai failure nằm ở `tests/onboarding-ui.test.ts`, yêu cầu copy cũ và token `DURATION_OPTIONS` không còn trong dirty worktree trước TIP. Không file onboarding nào được sửa trong TIP-WM-01.
- Kiểm tra dòng thêm mới chứa ký tự em dash: 0 kết quả.

## ISSUES DISCOVERED

- LOW: Full unit suite có 2 onboarding UI expectation fail ngoài phạm vi TIP. Đề xuất xử lý trong luồng onboarding đang sở hữu các thay đổi đó.
- LOW: Production build giữ thư mục kiểm thử `.next-codex-workout-metrics-verify` ở dạng untracked. Include tương ứng đã được loại khỏi `tsconfig.json`; thư mục không được stage, commit hoặc deploy.

## DEVIATIONS FROM SPEC

- Không có deviation kiến trúc.
- `prescription_mode` tiếp tục được ghi bằng legacy `reps | time | hold` để các reader cũ hoạt động; `tracking_mode` là snapshot chuẩn mới. Migration gỡ constraint phase-prescription cũ và thêm tracking shape constraint mới.
- Không chạy remote migration, backfill, exercise sync, deployment, commit hoặc push theo đúng giới hạn TIP.
- REFINE TIP-WM-01-R1 không đổi architecture contract. Chỉ nối profile unit vào UI, bổ sung canonical conversion ở write boundary và sửa state machine cho target-distance-only.

## SUGGESTIONS FOR CHỦ THẦU

- Nghiệm thu migration SQL trên một database local hoặc preview trước khi xin phép áp dụng từ xa.
- Sau migration, chạy `scripts/sync-exercises.ts --dry-run` để xác minh 30 reviewed mappings và safe fallback trước khi xin phép ghi catalog.
- Thêm authenticated browser E2E cho nhập và resume đủ 4 mode sau khi preview database có migration mới.
