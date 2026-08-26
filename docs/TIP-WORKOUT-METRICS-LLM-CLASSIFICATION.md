# TIP-WM-02: Phân loại 1.324 bài tập bằng Gemini 3.5 Flash-Lite

## HEADER

- TIP-ID: TIP-WM-02
- Project: GymAI Coach
- Module: Exercise workout metrics taxonomy
- Depends on: TIP-WM-01
- Priority: P0
- Blueprint approval: Chủ nhà yêu cầu trực tiếp chạy LLM với Gemini 3.5 Flash-Lite và giới hạn 15 request/phút

## CONTEXT

- Working directory: `D:\GymAI-Coach`
- Supabase production hiện có đúng 1.324 exercise, tất cả đang ở fallback `reps`, `needs_review`, `safe_fallback`.
- Local `data/exercises` có 1.326 file. Chỉ phân loại slug đang tồn tại trong Supabase, không tự lấy hai file ngoài catalog.
- `GEMINI_API_KEY` và `DATABASE_URL` nằm trong `.env.local`. Không log hoặc ghi credential vào artifact.
- Model bắt buộc: `gemini-3.5-flash-lite`.
- Model hỗ trợ structured output, input context 1.048.576 token và output 65.536 token.
- Không dùng dấu em dash trong code, output, log hoặc tài liệu.

## REQUIREMENTS MATRIX

| REQ-ID | Requirement | Priority |
|---|---|---|
| REQ-LLM-001 | Phân loại đúng 1.324 slug live, không thiếu và không thừa | P0 |
| REQ-LLM-002 | Chỉ dùng model `gemini-3.5-flash-lite` | P0 |
| REQ-LLM-003 | Mỗi request chứa đủ context để quyết định mode theo bản chất bài tập | P0 |
| REQ-LLM-004 | Batch mặc định 20 exercise/request | P0 |
| REQ-LLM-005 | Tốc độ tối đa 12 RPM, tối thiểu 5 giây giữa mọi request attempt | P0 |
| REQ-LLM-006 | Dùng structured JSON schema và validation fail-closed | P0 |
| REQ-LLM-007 | Có retry 429/5xx, resume, checkpoint và raw evidence theo batch | P0 |
| REQ-LLM-008 | Mapping tuân thủ contract 4 mode của TIP-WM-01 | P0 |
| REQ-LLM-009 | Kết quả confidence thấp hoặc mâu thuẫn được flag review, không tự coi là human-reviewed | P0 |
| REQ-LLM-010 | Có quality audit, distribution report và deterministic invariants | P0 |
| REQ-LLM-011 | Không ghi Supabase trong bước classification | P0 |
| REQ-LLM-012 | Có Completion Report và Verify-ready evidence | P0 |

## CLASSIFICATION CONTRACT

Mỗi exercise phải trả:

```ts
type Classification = {
  slug: string;
  default_tracking_mode: 'weight_reps' | 'reps' | 'duration' | 'duration_distance';
  allowed_tracking_modes: Array<'weight_reps' | 'reps' | 'duration' | 'duration_distance'>;
  duration_style: 'active' | 'hold' | null;
  load_basis: 'external_total' | 'per_implement' | 'assistance' | 'none';
  confidence: number;
  requires_human_review: boolean;
  rationale: string;
  evidence_signals: string[];
};
```

Invariants:

- `allowed_tracking_modes` không rỗng và chứa default mode.
- `duration_style` chỉ khác null khi default mode là `duration` hoặc `duration_distance`.
- `load_basis = none` trừ khi mode cho phép ghi tải bên ngoài hoặc bài có semantics assistance rõ ràng.
- Confidence nằm trong `[0, 1]`.
- Slug output phải khớp chính xác input, không được tự tạo hoặc bỏ slug.
- `requires_human_review = true` nếu confidence dưới 0.90 hoặc bài không thể biểu diễn tự nhiên bằng 4 mode hiện có.

## PROMPT CONTEXT

Prompt system phải giải thích đầy đủ:

1. Phase `warmup | main | cooldown` và workout role không quyết định tracking mode.
2. `weight_reps`: bài kháng lực động, ghi tải ngoài và số lần.
3. `reps`: bài động đếm số lần, thường bodyweight hoặc không cần tải ngoài.
4. `duration`: giữ tĩnh, stretch, mobility hoặc hoạt động đo chủ yếu bằng thời gian.
5. `duration_distance`: chạy, đi bộ, đạp xe, rowing, elliptical hoặc locomotion có quãng đường hữu ích.
6. Static hold dùng `duration_style = hold`; timed active work dùng `active`.
7. Dumbbell ghi `per_implement` nếu UI hiểu mức tạ mỗi quả; barbell/cable/machine resistance dùng `external_total`; assisted machine dùng `assistance`.
8. Weighted bodyweight có thể cho phép cả `reps` và `weight_reps`, nhưng default theo cách thực hiện phổ biến.
9. Jump rope có thể cho phép `duration` và `reps`.
10. Loaded carry không biểu diễn đủ load + distance trong contract hiện tại, nên chọn metric chính phù hợp và flag human review.
11. Không suy đoán từ một keyword khi instructions, equipment và movement pattern mâu thuẫn.
12. Không thay đổi workout role, exercise type, equipment hoặc nội dung bài.

Mỗi input exercise phải cung cấp tối thiểu:

- slug, name, name_vi, subtitle_vi
- movement_pattern, exercise_type
- primary_muscle, secondary_muscles
- equipment, tags
- instructions đầy đủ
- setup hiện tại
- workout_role nếu có
- mapping reviewed hiện hữu nếu có, dùng như calibration examples chứ không ép kết quả

## BATCH AND RATE DESIGN

- Batch size mặc định: 20.
- Với 1.324 bài: 67 primary requests.
- Rate mặc định: 12 RPM.
- Khoảng cách giữa thời điểm bắt đầu mọi request attempt: ít nhất 5.000 ms.
- Retry cũng đi qua cùng rate limiter.
- Retry 429/500/502/503/504 tối đa 5 lần, ưu tiên `Retry-After`, sau đó exponential backoff có jitter.
- Temperature 0.
- Structured output schema bắt buộc.
- Max output tokens đủ cho 20 objects, không cắt output.

## OUTPUT ARTIFACTS

### Stable result

`data/exercise-taxonomy/workout-metrics-llm-classification.json`

Phải chứa metadata:

- schema_version
- generated_at
- model
- batch_size
- requests_per_minute
- live_catalog_count
- source_catalog_ref
- prompt_version
- classifications sorted by slug

### Audit evidence

`artifacts/workout-metrics-classification/<run-id>/`

- `manifest.json`
- `input-catalog.json`
- `batches/batch-XXX-input.json`
- `batches/batch-XXX-response.json`
- `progress.json`
- `run.log`
- `summary.json`
- `review-queue.json`

Log không chứa API key, database URL hoặc service-role key.

## IMPLEMENTATION TASKS

1. Tạo script `scripts/classify-workout-metrics.ts`.
2. Đọc `.env.local` an toàn mà không overwrite environment variables đã có.
3. Đọc đúng live slug list từ Supabase bằng read-only query, phân trang đầy đủ.
4. Ghép mỗi live slug với local canonical JSON; fail nếu thiếu context.
5. Compact context nhưng không bỏ instructions hoặc equipment.
6. Tạo deterministic batches sorted by slug.
7. Gọi Gemini bằng structured output, rate limiter và retry policy ở trên.
8. Validate từng batch và checkpoint atomically sau mỗi batch.
9. Hỗ trợ `--dry-run`, `--limit`, `--resume`, `--batch-size`, `--rpm`, `--run-id`.
10. Dry-run không gọi API và không ghi Supabase.
11. Chạy smoke batch 20 exercise, kiểm output trước khi chạy full.
12. Chạy full 1.324 exercise.
13. Re-run đúng một lần các batch invalid hoặc incomplete. Không lặp vô hạn.
14. Tạo review queue từ confidence, ambiguity và deterministic conflict checks.
15. Tạo summary phân bố mode, allowed modes, load basis, confidence bands, review count và request count.
16. Không sync kết quả vào Supabase.
17. Tạo `docs/COMPLETION-WORKOUT-METRICS-LLM-CLASSIFICATION.md`.

## ACCEPTANCE CRITERIA

### AC-01 Catalog coverage

Given live Supabase contains 1.324 exercise slugs, when classification completes, then output contains exactly the same 1.324 unique slugs.

### AC-02 Rate safety

Given every primary or retry request, when request timestamps are inspected, then no rolling 60-second window contains more than 12 request starts.

### AC-03 Model fidelity

Given all batch evidence, when manifests and responses are inspected, then the model is exactly `gemini-3.5-flash-lite`.

### AC-04 Context sufficiency

Given an exercise request, when its input evidence is inspected, then all required context fields and full instructions are present.

### AC-05 Contract validity

Given the final mapping, when validated, then every record satisfies the Classification contract and invariants.

### AC-06 Resume and retry

Given a completed checkpoint or a retryable failure, when the script resumes, then valid completed slugs are not called again and retry attempts still obey rate limiting.

### AC-07 Review safety

Given confidence below 0.90, ambiguous four-mode fit or deterministic conflict, when output is finalized, then the record appears in `review-queue.json` and is not represented as human-reviewed.

### AC-08 No remote mutation

Given the full run, when Supabase is re-queried, then all 1.324 rows remain `safe_fallback` until a separate sync approval.

### AC-09 Auditability

Given the final output, when one slug is sampled, then its input batch, raw structured response, rationale and evidence signals are traceable.

### AC-10 Completion

Given smoke and full runs finish, when technical verification runs, then script tests/typecheck pass and Completion Report contains exact measured counts.

## CONSTRAINTS

- Preserve dirty work and unrelated artifacts.
- Không ghi Supabase, không chạy sync, backfill, deploy, commit hoặc push.
- Không sửa 1.324 exercise JSON source files.
- Không dùng broad heuristic làm kết quả cuối thay cho LLM.
- Không log secret.
- Không vượt 12 RPM dù user limit là 15 RPM.
- Không đổi model.
- Không tự nâng `tracking_mode_review_status` trên database.

## DECISIONS LOG

| ID | Decision | Rationale |
|---|---|---|
| D-LLM-01 | 20 exercise/request | Context trung bình khoảng 951 ký tự/exercise; batch khoảng 19K ký tự, đủ ngữ cảnh và output vẫn nhỏ |
| D-LLM-02 | 12 RPM, 5 giây/request | Giữ buffer 20% dưới giới hạn 15 RPM và áp dụng cả retry |
| D-LLM-03 | Structured output + fail-closed validation | Tránh lệch slug, thiếu field và JSON bị cắt |
| D-LLM-04 | Full result local, không sync DB | Phân loại LLM chưa tương đương human review |
| D-LLM-05 | Confidence dưới 0.90 vào review queue | Giảm nguy cơ auto-apply phân loại mơ hồ |

## REPORT FORMAT

Completion Report phải gồm:

- STATUS: DONE, PARTIAL hoặc BLOCKED
- FILES CHANGED
- TEST RESULTS mapped AC-01 đến AC-10
- Model, total request attempts, primary requests, retries và elapsed time
- Exact distribution by default mode, allowed modes, load basis, confidence band
- Review queue count và lý do
- Missing/duplicate/invalid slug count
- Secret scan result
- DEVIATIONS
- SUGGESTIONS FOR CHỦ THẦU
