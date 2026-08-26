# Completion Report: TIP-WM-02

## STATUS

DONE

Run được nghiệm thu: `wm-full-v3-20260826`.

- Model: `gemini-3.5-flash-lite`
- Prompt version: `workout-metrics-v1.1.1`
- Batch size: 20
- Rate limit cấu hình: 12 request/phút
- Live catalog: 1.324 bài
- Kết quả hợp lệ: 1.324 bài
- Thời gian full run: 545 giây
- Supabase mutation: không

## FILES CHANGED

### Source và test

- `scripts/classify-workout-metrics.ts`
- `tests/workout-metrics-classification.test.ts`

### Stable result

- `data/exercise-taxonomy/workout-metrics-llm-classification.json`

### Audit evidence

- `artifacts/workout-metrics-classification/wm-dry-run-20260826/`
- `artifacts/workout-metrics-classification/wm-smoke-20260826/`
- `artifacts/workout-metrics-classification/wm-smoke-v2-20260826/`
- `artifacts/workout-metrics-classification/wm-smoke-v3-20260826/`
- `artifacts/workout-metrics-classification/wm-full-20260826/`
- `artifacts/workout-metrics-classification/wm-full-v2-20260826/`
- `artifacts/workout-metrics-classification/wm-dry-v4-20260826/`
- `artifacts/workout-metrics-classification/wm-full-v3-20260826/`

### Report

- `docs/COMPLETION-WORKOUT-METRICS-LLM-CLASSIFICATION.md`

Không sửa bất kỳ file nguồn nào trong `data/exercises`. Không sync, backfill, deploy, commit hoặc push.

## TEST RESULTS

| AC | Kết quả | Bằng chứng đo được |
|---|---|---|
| AC-01 Catalog coverage | PASS | Stable output có đúng 1.324 unique slug. Missing 0, extra 0, duplicate 0. Tập slug khớp chính xác input catalog live. |
| AC-02 Rate safety | PASS | 69 request attempts, 0 rolling-window violation ở mức 12 RPM, khoảng cách request nhỏ nhất 5.325 ms. |
| AC-03 Model fidelity | PASS | Manifest, 67 batch input, 67 batch response và stable result đều ghi đúng `gemini-3.5-flash-lite`. |
| AC-04 Context sufficiency | PASS | 1.324 input có slug, name, name_vi, subtitle_vi, movement_pattern, exercise_type, muscle, equipment, tags, full instructions, setup, workout_role và calibration nếu có. |
| AC-05 Contract validity | PASS | Validator kiểm 1.324/1.324 record hợp lệ, invalid 0. Toàn bộ cross-field invariant đạt. |
| AC-06 Resume and retry | PASS | Checkpoint atomic sau từng batch. Rate limiter được seed từ attempt timestamps khi resume. Full v3 có 2 validation rerun, cả hai đi qua limiter. |
| AC-07 Review safety | PASS | Review queue có 5 bài. Cả 3 bài dưới confidence 0,90 đều được flag; conflict deterministic cũng được đưa vào queue. |
| AC-08 No remote mutation | PASS | Read-only verification sau run: 1.324/1.324 vẫn `safe_fallback`, 1.324/1.324 vẫn `needs_review`. Transaction verification đã rollback. |
| AC-09 Auditability | PASS | Có manifest, input catalog, 67 batch input, 67 batch response, progress, run log, summary, review queue và rationale/evidence signals theo slug. |
| AC-10 Completion | PASS | Focused tests 5/5 PASS. `tsc --noEmit` có 0 lỗi. Completion Report có số đo chính xác của full v3. |

Lưu ý: giá trị AC-02 là 5.325 ms theo định dạng hàng nghìn của tiếng Việt, tương đương 5.325 giây và lớn hơn yêu cầu 5.000 ms.

## REQUEST AND RATE EVIDENCE

| Chỉ số | Giá trị |
|---|---:|
| Primary requests | 67 |
| Validation reruns | 2 |
| Transport retries | 0 |
| Tổng request attempts | 69 |
| Rolling 60-second violations trên 12 RPM | 0 |
| Khoảng cách attempt nhỏ nhất | 5.325 ms |
| Full run elapsed | 545 giây |

Hai response invalid bị từ chối toàn batch và rerun đúng một lần:

- Batch 58 tự thay đổi slug `sled-45-*`; validator phát hiện missing và extra slug trước khi checkpoint.
- Batch 65 vi phạm contract cross-field; validator từ chối trước khi checkpoint.

Không response invalid nào được đưa vào stable result.

## EXACT DISTRIBUTION

### Default tracking mode

| Mode | Số bài |
|---|---:|
| `weight_reps` | 868 |
| `reps` | 373 |
| `duration` | 69 |
| `duration_distance` | 14 |
| Tổng | 1.324 |

### Allowed tracking modes

| Allowed modes | Số bài |
|---|---:|
| `weight_reps` | 793 |
| `reps` | 324 |
| `reps + weight_reps` | 94 |
| `duration + reps` | 53 |
| `duration` | 44 |
| `duration + duration_distance` | 10 |
| `duration + duration_distance + reps` | 3 |
| `duration + duration_distance + weight_reps` | 2 |
| `duration + reps + weight_reps` | 1 |
| Tổng | 1.324 |

### Load basis

| Load basis | Số bài |
|---|---:|
| `external_total` | 567 |
| `none` | 451 |
| `per_implement` | 297 |
| `assistance` | 9 |
| Tổng | 1.324 |

### Confidence

| Band | Số bài |
|---|---:|
| `0.95-1.00` | 1.305 |
| `0.90-0.949` | 16 |
| Dưới `0.90` | 3 |
| Tổng | 1.324 |

## REVIEW QUEUE

Review queue có 5 bài:

| Slug | Confidence | Lý do |
|---|---:|---|
| `band-assisted-pull-up` | 0,95 | `non_numeric_band_assistance` |
| `bear-crawl` | 0,92 | LLM yêu cầu human review |
| `dumbbell-single-arm-overhead-carry` | 0,85 | Confidence thấp, LLM flag, loaded-carry contract gap |
| `farmers-walk` | 0,85 | Confidence thấp, LLM flag, loaded-carry contract gap |
| `london-bridge` | 0,85 | Confidence thấp, LLM flag |

Không bài nào được đánh dấu human-reviewed và database vẫn giữ trạng thái `needs_review`.

## QUALITY AUDIT

- 30/30 calibration đã review hiện hữu khớp chính xác default mode, allowed modes, duration style và load basis.
- Full v1 hoàn thành schema nhưng bị loại khi quality audit phát hiện 752 bài kháng lực được thêm `reps` không tự nhiên. Prompt đã được siết để `weight_reps` không kéo theo `reps`, và resistance band không tự được coi là tải kg/lb.
- Full v2 bị loại và dừng fail-closed ở batch 43. Nguyên nhân gốc là calibration cũ cung cấp `duration_style = active` cho `inchworm` dù default là `reps`, tạo context tự mâu thuẫn.
- Full v3 dùng prompt/context `workout-metrics-v1.1.1`, chuẩn hóa duration style trong calibration theo default mode và vượt toàn bộ deterministic invariants.
- Stable result hiện trỏ tới full v3, không dùng kết quả v1 hoặc v2.

## TECHNICAL VERIFICATION

- `npx tsx --test tests/workout-metrics-classification.test.ts`: 5 PASS, 0 FAIL.
- `npx tsc --noEmit --pretty false`: 0 lỗi.
- Stable contract validation: 1.324 valid, missing 0, extra 0, duplicate 0, invalid 0.
- Batch evidence: 67 input, 67 response, 67 completed checkpoint.
- Secret scan trên script, test, stable result và full v3 artifacts: 0 file chứa `GEMINI_API_KEY`, `DATABASE_URL` hoặc service-role value.
- Không dùng dấu em dash trong source, log hoặc report mới.

## DEVIATIONS

1. Dry smoke đầu tiên bị fail-closed do model hiểu `duration_style` theo allowed mode thay vì default mode. Prompt v1.1.0 bổ sung cross-field examples và validation rerun feedback.
2. Full v1 không được nghiệm thu dù đủ 1.324 slug vì quality distribution không hợp lý. Đây là quality rejection, không dùng heuristic để sửa kết quả cuối.
3. Full v2 dừng sau đúng một rerun thất bại theo TIP. Context calibration được sửa ở lớp prompt input, không sửa taxonomy nguồn hoặc exercise JSON.
4. Full v3 là run duy nhất được nghiệm thu và dùng làm stable output.

## SUGGESTIONS FOR CHỦ THẦU

1. Human review 5 bài trong `review-queue.json` trước mọi sync.
2. Trước khi ghi Supabase, tạo TIP riêng cho dry-run sync, row diff, rollback plan và xác nhận lại catalog SHA/count.
3. Giữ artifacts v1/v2 đến khi Chủ thầu hoàn tất VERIFY vì chúng chứng minh fail-closed và quality refinement.
