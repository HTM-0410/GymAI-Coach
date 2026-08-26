# TIP-WM-01: Chuẩn hóa cách tính lượng tập

## HEADER

- TIP-ID: TIP-WM-01
- Project: GymAI Coach
- Module: Exercise taxonomy, AI workout, workout logger, analytics và recovery
- Depends on: None
- Priority: P0
- Blueprint approval: Chủ nhà đã duyệt đề xuất 4 chế độ đo lường trong hội thoại ngày 2026-08-26 bằng phản hồi "Ok"

## CONTEXT

- Working directory: `D:\GymAI-Coach`
- Worktree đang có nhiều thay đổi thuộc các luồng khác. Chỉ sửa file cần thiết và tuyệt đối không reset hoặc ghi đè thay đổi của người dùng.
- Hệ thống hiện dùng `prescription_mode = reps | time | hold`, gắn cứng mode theo phase và chỉ lưu `weight`, `reps` ở `workout_sets`.
- Không chạy migration hoặc backfill trên Supabase từ xa. Chỉ tạo migration cục bộ và code tương thích.
- Không dùng dấu em dash trong code, UI hoặc tài liệu.

## REQUIREMENTS MATRIX

| REQ-ID | Requirement | Priority |
|---|---|---|
| REQ-WM-001 | Có 4 tracking mode: `weight_reps`, `reps`, `duration`, `duration_distance` | P0 |
| REQ-WM-002 | Phase và tracking mode độc lập; mode được quyết định từ khả năng của bài tập | P0 |
| REQ-WM-003 | Thư viện bài tập có default mode, allowed modes, review metadata và load basis | P0 |
| REQ-WM-004 | Workout lưu snapshot mode cùng target phù hợp | P0 |
| REQ-WM-005 | Mỗi hiệp lưu actual phù hợp: load kg, reps, duration seconds, distance meters | P0 |
| REQ-WM-006 | Logger chỉ hiển thị và bắt buộc các trường đúng với mode | P0 |
| REQ-WM-007 | AI generate, regenerate và confirm bảo toàn mode hợp lệ | P0 |
| REQ-WM-008 | Summary và progress tính đúng volume, reps, duration, distance; không hiển thị timed thành 0 reps | P0 |
| REQ-WM-009 | Progression chỉ tăng tạ cho `weight_reps`; các mode khác không nhận khuyến nghị tăng tạ | P0 |
| REQ-WM-010 | Recovery nhận diện completed effort của mọi mode mà không tính warmup/cooldown thành working volume | P0 |
| REQ-WM-011 | Legacy `reps | time | hold` vẫn đọc được trong thời gian chuyển đổi | P0 |
| REQ-WM-012 | Đơn vị lưu chuẩn là kg, integer reps, seconds và meters; formatter hỗ trợ metric/imperial | P1 |
| REQ-WM-013 | Có test cho contract, validation, logger helpers, actuals, progression, recovery và legacy compatibility | P0 |

## ARCHITECTURE CONTRACT

### Tracking modes

```ts
type TrackingMode = 'weight_reps' | 'reps' | 'duration' | 'duration_distance';
type DurationStyle = 'active' | 'hold';
type LoadBasis = 'external_total' | 'per_implement' | 'assistance' | 'none';
```

Canonical storage:

- Load: kg
- Repetition: integer count
- Duration: seconds
- Distance: meters

### Exercise definition

Add additive fields to `exercises`:

- `default_tracking_mode`
- `allowed_tracking_modes`
- `tracking_mode_review_status`
- `tracking_mode_source`
- `load_basis`

The exercise default is the source of truth. Phase may restrict unsafe or nonsensical combinations but must not infer the mode by itself.

### Workout prescription snapshot

Add or normalize fields on `workout_exercises`:

- `tracking_mode`
- `duration_style`
- `target_duration_seconds`
- `target_distance_meters`
- Existing `target_weight`, rep range, `target_sets`, `per_side`, rest remain usable where appropriate.

Legacy normalization:

- `hold` -> `duration` with `duration_style = hold`
- `time` -> `duration` with `duration_style = active`
- Legacy `reps` remains readable and resolves safely to `weight_reps` only when load evidence or reviewed exercise metadata supports it; otherwise `reps`

### Set actuals

Add additive fields to `workout_sets`:

- `duration_seconds`
- `distance_meters`

Reuse `weight` as canonical kg for backward compatibility unless a local code constraint requires an alias. Do not introduce a destructive rename.

All modes should use workout set rows so completion, resume, editing, history and analytics share one lifecycle.

## IMPLEMENTATION TASKS

### T1: Domain contract, migration và exercise metadata

- Add a central metrics module containing types, legacy normalization, validation, labels, canonical conversion and aggregation helpers.
- Create one new additive Supabase migration. Do not edit historic migrations for this feature.
- Update generated/manual database types.
- Extend canonical exercise schema, TypeScript exercise types and sync script.
- Add reviewed defaults for the currently reviewed workout taxonomy entries. Unknown exercises must have a safe fallback and review status, not an invented high-confidence classification.

### T2: AI workout contract and planning

- Update AI schemas, planner prompt, deterministic fallback, duration estimator, generate route, confirm route and current draft preservation.
- Validate selected mode against `allowed_tracking_modes`.
- Remove the rule that every main exercise must be reps.
- `duration_distance` accepts a duration target, a distance target or both, but at least one must be present.
- Do not let time or distance modes receive target weight, RIR or weight progression.

### T3: Workout creation and live logger

- Exercise picker reads exercise metric metadata and displays fields by chosen mode.
- Workout preview uses one shared formatter.
- Logger initializes and persists set rows for all modes.
- `weight_reps`: weight + reps.
- `reps`: reps only.
- `duration`: timer or entered actual duration.
- `duration_distance`: actual duration plus distance input with canonical conversion.
- Timed completion must persist actuals before marking an exercise complete.
- Resume and incomplete-workout checks must work for every mode.

### T4: Summary, progression, recovery and compatibility

- Update canonical workout actual projector.
- Volume is load x reps for `weight_reps` only.
- Total reps includes `weight_reps` and `reps`.
- Total active duration includes `duration` and `duration_distance` actuals.
- Total distance includes `duration_distance` actuals.
- Done view renders mode-specific chips.
- Progression and previous-performance logic must be mode aware.
- Recovery must count valid completed working effort for non-rep modes without treating accessory phases as lifting volume.
- Preserve current safety rule: pain and recovery blocks override progression.

### T5: Verification artifacts

- Add focused automated tests mapped to every P0 REQ-ID.
- Run focused tests, TypeScript check and production build.
- If full lint contains pre-existing failures, report exact feature-local result separately.
- Create `docs/COMPLETION-WORKOUT-METRICS-STANDARDIZATION.md` using the Vibecode Completion Report format.

## ACCEPTANCE CRITERIA

### AC-01 Contract

Given a tracking mode value, when it is normalized and validated, then all four new modes pass, legacy modes map deterministically, and invalid field combinations fail.

### AC-02 Weight and reps

Given a `weight_reps` exercise, when a user completes a set, then positive canonical kg and positive reps are persisted and volume equals kg x reps.

### AC-03 Reps only

Given a `reps` exercise, when a user completes a set, then reps are persisted without requiring or inventing weight and no load volume is added.

### AC-04 Duration

Given a `duration` exercise, when a user completes or finishes early, then actual duration is persisted in a workout set and the summary shows time instead of 0 reps.

### AC-05 Duration and distance

Given a `duration_distance` exercise, when actual duration and distance are recorded, then values are stored as seconds and meters and the summary can derive pace.

### AC-06 Phase independence

Given a reviewed cardio exercise in the main phase or a reps activation exercise in warmup, when it is added or generated, then its allowed tracking mode is accepted without being overwritten solely by phase.

### AC-07 AI round trip

Given each of the four tracking modes, when a valid generated draft passes generate and confirm contracts, then mode-specific targets survive unchanged to insert rows.

### AC-08 Legacy compatibility

Given existing rows using `reps`, `time` or `hold`, when workout pages and summaries load, then they render without data loss or runtime error.

### AC-09 Progression safety

Given reps-only, duration or distance history, when next-session guidance is built, then it never recommends adding kilograms. Existing pain and fatigue overrides continue to win.

### AC-10 Recovery

Given completed main working efforts in each mode, when recovery processing runs, then valid efforts can contribute to fatigue while warmup and cooldown do not inflate lifting volume.

### AC-11 Unit conversion

Given metric and imperial profiles, when values are displayed and edited, then canonical stored values remain kg and meters while UI conversions round-trip within documented tolerance.

### AC-12 Health

Given the completed implementation, when focused tests, TypeScript check and production build run, then there are no feature-caused failures.

## CONSTRAINTS

- Preserve dirty work and unrelated user artifacts.
- No remote Supabase write, migration execution, backfill, deployment, commit or push.
- No new package dependency unless unavoidable and reported before adoption.
- No broad automatic classification of all 1,326 exercises from name heuristics.
- Do not weaken authentication, RLS, workout safety or recovery overrides.
- Do not alter the approved four-mode architecture. Architectural ambiguity must be escalated to the Contractor.

## DECISIONS LOG

| ID | Decision | Rationale |
|---|---|---|
| D-WM-01 | Use four tracking modes and merge hold into duration style | Units and execution style are separate concerns |
| D-WM-02 | Store canonical kg, seconds and meters | Prevent mixed-unit analytics |
| D-WM-03 | Snapshot selected mode on workout exercise | Historical workouts remain stable if exercise defaults change |
| D-WM-04 | Use additive migration and compatibility readers | Worktree and live schema safety |
| D-WM-05 | Skip repeated Blueprint checkpoint | Homeowner explicitly approved the proposal immediately before implementation |

## REPORT FORMAT

Create `docs/COMPLETION-WORKOUT-METRICS-STANDARDIZATION.md` containing:

- STATUS: DONE, PARTIAL or BLOCKED
- FILES CHANGED
- TEST RESULTS mapped to AC-01 through AC-12
- ISSUES DISCOVERED with severity
- DEVIATIONS FROM SPEC
- SUGGESTIONS FOR CHỦ THẦU
