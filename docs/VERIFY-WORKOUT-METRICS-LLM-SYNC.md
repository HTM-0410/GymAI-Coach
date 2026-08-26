# VERIFY REPORT: Review và sync workout metrics classification

Date: 2026-08-26
Source: `workout-metrics-llm-classification.json`, prompt `workout-metrics-v1.1.1`
Model: `gemini-3.5-flash-lite`

## REQUIREMENT COVERAGE

- Live catalog coverage: 1.324/1.324
- Missing slugs: 0
- Extra slugs: 0
- Invalid mappings: 0
- Manual calibration matches: 30/30
- Review queue adjudicated: 5/5
- Database rows synced: 1.324/1.324
- Coverage: 100%

## REVIEW DECISIONS

- `band-assisted-pull-up`: `reps`, vì dây không cung cấp tải kg hoặc lb số hóa ổn định.
- `bear-crawl`: `duration_distance`, cho phép `duration`, theo hướng dẫn distance hoặc time.
- `dumbbell-single-arm-overhead-carry`: `duration_distance`, cho phép `duration`; contract hiện chưa hỗ trợ đồng thời tải và distance.
- `farmers-walk`: `duration_distance`, cho phép `duration`; loại `weight_reps` vì bài không có reps tự nhiên.
- `london-bridge`: `reps`, theo hướng dẫn lặp chuyển động và không có tải số hóa.

Các quyết định được lưu riêng trong `data/exercise-taxonomy/workout-metrics-contractor-overrides.json`; output LLM gốc được giữ nguyên để audit.

## DRY-RUN

- Transaction dry-run: PASS và rollback thành công.
- Candidate rows: 1.324
- Candidate invariant failures: 0
- Expected reviewed rows: 35
- Expected LLM-classified rows còn `needs_review`: 1.289

## SYNC RESULT

- Transaction: COMMIT
- Rows updated: 1.324
- Safe fallback rows remaining: 0
- Post-sync invalid rows: 0

### Default mode distribution

- `weight_reps`: 866
- `reps`: 374
- `duration`: 69
- `duration_distance`: 15

### Review status

- `reviewed`: 35
- `needs_review`: 1.289

### Sources

- Manual review: 30
- Contractor review: 5
- Gemini LLM classification: 1.289

Không đánh dấu 1.289 kết quả LLM là human-reviewed. Chúng đã được sync để ứng dụng sử dụng nhưng giữ trạng thái `needs_review` và nguồn model rõ ràng.

## VERIFICATION

- Focused classification tests: 5/5 PASS.
- TypeScript check: PASS, 0 errors.
- Direct Postgres post-check: PASS.
- Supabase Data API read for representative strength, bodyweight, locomotion và carry exercises: PASS.
- Schema constraints accepted every updated row.

## RECOVERY ARTIFACTS

- Pre-sync snapshot: `artifacts/workout-metrics-sync/20260826-v3/pre-sync-catalog.csv`
- Post-sync snapshot: `artifacts/workout-metrics-sync/20260826-v3/post-sync-catalog.csv`
- Both snapshots contain exactly 1.324 rows.

## OVERALL STATUS

READY

Classification review passed and the catalog sync was completed successfully. No workout history, exercise content, deployment, commit or push was changed.
