# MASTER PLAN - Muscle Readiness / Recovery Estimate

> Quy trình: VibeCode Kit v6.1 - Chủ thầu lập Blueprint, Thợ thầu triển khai theo TIP
>
> Trạng thái: DRAFT - chờ chủ nhà phê duyệt
>
> Ngày kiểm tra nguồn sự thật: 2026-08-25
>
> Phạm vi của tài liệu này: lập kế hoạch, chưa sửa code tính năng, chưa chạy migration, chưa ghi Supabase

## 1. Kết quả sản phẩm cần đạt

Người dùng nhìn thấy mức sẵn sàng tập lại của từng nhóm cơ dựa trên chính lịch sử buổi tập đã hoàn thành. Mỗi điểm số phải:

- Có nguồn gốc truy vết được từ bài tập, nhóm cơ, set đã hoàn thành, mức gắng sức và thời gian.
- Hiển thị đây là một ước tính, không phải chẩn đoán y khoa.
- Giải thích được qua màn hình "Vì sao?" thay vì chỉ đưa ra một con số.
- Không được dùng để tăng tải vượt quá chương trình, giới hạn an toàn, đau hoặc chống chỉ định hiện có.
- Hoạt động đúng khi xử lý lại cùng một workout, khi thiếu dữ liệu và khi người dùng có dữ liệu cũ.

### MVP được đề xuất

Release V1 gồm:

1. Chuẩn hóa dữ liệu effort đang tồn tại nhưng chưa được dùng nhất quán.
2. Tính tải mỏi theo từng cơ khi workout được hoàn thành.
3. Suy giảm tải mỏi theo thời gian và trả về readiness 0-100.
4. Trang `/recovery` có body map, danh sách nhóm cơ, trạng thái, độ tin cậy và thời gian dự kiến đạt 60/80/90%.
5. Bottom sheet "Vì sao?" hiển thị các workout và bài tập gần nhất tạo ra điểm số.
6. Điểm vào từ Dashboard và desktop navigation. Không thay một tab chính trên mobile trong V1.
7. Gợi ý tạo workout từ nhóm cơ đã hồi phục nằm ở lát cắt cuối của V1, sau khi score và giải thích đã được kiểm chứng.

Không thuộc V1:

- Điều chỉnh điểm trực tiếp theo giấc ngủ, stress, soreness hoặc đau.
- Cá nhân hóa đường cong bằng ML.
- Dùng AI để tự thay thế giáo án hoặc tự tăng tải.
- Đồng bộ wearable.
- Khẳng định người dùng đã phục hồi sinh lý hoàn toàn.

## 2. SCAN - Báo cáo nguồn sự thật

### 2.1 Thứ tự ưu tiên nguồn

| Ưu tiên | Nguồn | Vai trò |
|---|---|---|
| 1 | Schema và migration trong `supabase/migrations` | Hợp đồng dữ liệu thực thi |
| 2 | Luồng ghi và đọc hiện tại trong `src/app` và `src/lib` | Hành vi ứng dụng hiện tại |
| 3 | Dữ liệu bài tập trong `data/exercises` và script đồng bộ | Nguồn mapping bài tập sang cơ |
| 4 | Tài liệu yêu cầu đính kèm | Ý định sản phẩm và mô hình V1 |
| 5 | Ảnh tham chiếu UI | Ngôn ngữ tương tác, không phải nguồn công thức |

Schema live chưa được truy vấn trong vòng lập kế hoạch này. Trước migration, Thợ thầu phải xác minh lại live schema, migration history, RLS và độ phủ mapping. Không được suy luận rằng migration cục bộ đã được áp dụng lên production.

### 2.2 Những gì đang tồn tại

| Năng lực | Nguồn hiện tại | Kết luận |
|---|---|---|
| Danh mục cơ | `muscles` trong `20260818120000_initial_schema.sql` | Có `slug`, tên Việt và vùng cơ |
| Mapping bài tập - cơ | `exercise_muscles` | Chỉ có `primary` và `secondary`, chưa có hệ số đóng góp |
| Nhật ký set | `workout_sets` | Có weight, reps, RIR, set type và thời điểm hoàn thành |
| Effort chủ quan | `20260824184000_add_perceived_effort_to_workout_sets.sql` | Migration cục bộ có cột nhưng code/type/query chưa dùng nhất quán |
| Feedback sau buổi | `workout_feedback` | Có difficulty, energy, quality và note; đau được xử lý như tín hiệu an toàn riêng |
| Ước tính hồi phục | `src/lib/programs/recovery.ts` | Chỉ là khoảng giờ cho toàn session, chưa phải readiness từng cơ |
| Body map | `src/components/ui/MuscleBody.tsx` | Có 9 vùng hiển thị, chưa có score map, chọn vùng và accessibility tương tác |
| Điểm tích hợp hoàn thành | `workout-logger.tsx` | Client đang cập nhật workout thành `completed` trực tiếp |
| Trang sau workout | `workouts/[id]/done/page.tsx` | Có breakdown cơ chính và recovery session đơn giản |
| RLS | `20260818120001_rls_policies.sql` và migration tối ưu sau đó | Có owner policies, nhưng style giữa các migration chưa đồng nhất |

### 2.3 Lệch hợp đồng cần sửa trước

1. `perceived_effort` đã xuất hiện trong migration cục bộ nhưng chưa có trong `src/types/database.ts`.
2. Tracker vẫn ghi effort vào `workout_sets.note` theo dạng `effort:<value>`.
3. Trang workout đọc `s.perceived_effort` nhưng query không select trường này và type chưa khai báo.
4. Trang done không select effort.
5. Script `scripts/sync-exercises.ts` xóa toàn bộ `exercise_muscles` rồi tạo lại. Nếu thêm coefficient mà không sửa script, lần sync sau có thể làm mất hợp đồng tính toán.
6. Dữ liệu cơ hiện có cả nhãn chi tiết và nhãn thô như `back`, `shoulders`, `core`. Body map chỉ có 9 nhóm hiển thị nên cần bảng ánh xạ rõ ràng.

Đây là P0. Không triển khai thuật toán readiness trên một hợp đồng effort và mapping chưa ổn định.

### 2.4 Độ phủ dữ liệu cục bộ

Kiểm tra read-only ngày 2026-08-25:

- 1.324 file bài tập thực tế hợp lệ trong `data/exercises`.
- 1.324 bài có primary muscle không rỗng.
- Tất cả có ít nhất một secondary muscle theo dữ liệu file hiện tại.
- Có 20 nhãn primary khác nhau, gồm một số nhãn ngoài 9 vùng body map như cardiovascular system, serratus anterior và levator scapulae.

Đây chỉ là độ phủ file cục bộ, không chứng minh dữ liệu live đã đồng bộ đầy đủ.

### 2.5 Luồng hiện tại và luồng mục tiêu

```text
Hiện tại
Workout logger -> update workouts.status = completed -> trang done

Mục tiêu
Workout logger
  -> completion service có xác thực chủ sở hữu
  -> chuẩn hóa completed sets + effort + exercise-muscle mapping
  -> ghi ledger tải mỏi idempotent
  -> cập nhật trạng thái mỏi từng cơ
  -> đánh dấu workout completed + recovery processed
  -> trang done và /recovery đọc cùng một nguồn
```

## 3. RRI - Requirement Refinement Interview đã giải quyết

### 3.1 Ma trận yêu cầu

| ID | Yêu cầu đã khóa | Nguồn | Cách xác minh |
|---|---|---|---|
| MR-001 | Score hiển thị là readiness, 100 nghĩa là sẵn sàng hơn | Tài liệu yêu cầu | Unit test và UI copy |
| MR-002 | V1 chỉ dùng mapping cơ, completed sets, effort và thời gian | Tài liệu yêu cầu | Fixture model |
| MR-003 | Primary mặc định 1.0, secondary mặc định 0.5 | Quyết định Blueprint | Test mapping fallback |
| MR-004 | Effort factor: too_hard 1.35, hard 1.15, appropriate 1.0, easy 0.70 | Tài liệu yêu cầu | Exact-value unit test |
| MR-005 | Set factor: warmup 0.30, working 1.0, drop 1.15, failure 1.30 | Blueprint dựa trên enum hiện có | Exact-value unit test |
| MR-006 | Fatigue saturation dùng `100 * (1 - exp(-points / 6))` | Tài liệu yêu cầu | Boundary test |
| MR-007 | Decay dùng half-life theo giờ | Tài liệu yêu cầu | Clock-controlled test |
| MR-008 | Nhiều lần tập được cộng theo công thức hợp xác suất | Tài liệu yêu cầu | Sequential event test |
| MR-009 | Không chạy cron từng phút, score hiện tại tính khi đọc | Tài liệu yêu cầu | Architecture test |
| MR-010 | Ghi `fatigue_score`, `fatigue_at`, `half_life_hours`, không ghi score trôi theo thời gian | Blueprint | Schema review |
| MR-011 | Xử lý hoàn thành workout phải retry-safe | Rủi ro từ luồng hiện tại | Integration test gọi hai lần |
| MR-012 | Cold start hiển thị "Chưa đủ dữ liệu", không giả định 100% là sự thật | Safety decision | Empty-state test |
| MR-013 | Mỗi score có confidence và model version | Explainability | API/schema test |
| MR-014 | Pain không tăng hoặc giảm score; pain tiếp tục là cảnh báo an toàn riêng | Safety contract hiện tại | Regression test |
| MR-015 | Readiness chỉ được giảm hoặc giữ tải khuyến nghị, không tự tăng tải | Safety contract | Planner integration test |
| MR-016 | 9 nhóm body map là lớp trình bày, phép tính giữ ở muscle slug chi tiết | Data architecture | Mapping fixture |
| MR-017 | Readiness nhóm hiển thị lấy minimum của các cơ con có dữ liệu | Quyết định bảo thủ | Aggregation test |
| MR-018 | Màu luôn đi kèm nhãn chữ và số | Accessibility | Component test |
| MR-019 | Người dùng mở được "Vì sao?" cho từng nhóm | Ảnh và yêu cầu | E2E test |
| MR-020 | Chỉ chủ dữ liệu xem và thay đổi recovery của mình | RLS | Two-user test |
| MR-021 | Dữ liệu lịch sử chỉ backfill sau dry run và phê duyệt riêng | Phạm vi vận hành | Release gate |
| MR-022 | Không đưa service role key xuống client | Security | Static review |

### 3.2 Quyết định Chủ thầu đề xuất

| ID | Quyết định | Lý do |
|---|---|---|
| D-001 | Dùng trang riêng `/recovery`, thêm entry ở Dashboard và desktop nav | Body map, list và giải thích cần không gian riêng; tránh làm nặng trang Progress |
| D-002 | Giữ tính toán ở muscle slug chi tiết, chỉ aggregate khi trình bày | Không làm mất tín hiệu front/rear delts hoặc upper/lower back |
| D-003 | Aggregate bằng readiness thấp nhất trong nhóm | Bảo thủ, dễ giải thích và không che cơ con còn mỏi bằng trung bình |
| D-004 | Thêm coefficient nullable vào `exercise_muscles`, có fallback theo role | Cho phép ship V1 trước khi curate toàn bộ coefficient |
| D-005 | Ledger bất biến + state snapshot | Có audit trail, truy vết "Vì sao?" và retry an toàn |
| D-006 | Completion đi qua server endpoint/domain service | Xóa logic phân tán khỏi client và khóa quyền sở hữu |
| D-007 | Không dùng sleep/stress/soreness để sửa score trong V1 | Tránh tạo độ chính xác giả khi chưa hiệu chỉnh |
| D-008 | CTA workout là advisory và chạy qua constraint engine hiện tại | Readiness không được vượt quyền safety/program/equipment |

### 3.3 Điểm cần chủ nhà phê duyệt

Blueprint mặc định dùng các quyết định D-001 đến D-008. Nếu không muốn một quyết định, phản hồi theo ID trước khi giao cho Thợ thầu. Hai lựa chọn có ảnh hưởng lớn nhất:

- D-003: dùng minimum bảo thủ thay vì trung bình có trọng số.
- D-001: tạo `/recovery` riêng thay vì đặt toàn bộ vào `/progress`.

## 4. VISION - Kiến trúc mục tiêu

### 4.1 Thành phần

```text
Supabase
  muscles
  exercise_muscles + contribution
  workout_sets + perceived_effort
  muscle_training_loads
  muscle_recovery_states

Domain
  src/lib/recovery/model.ts
  src/lib/recovery/muscle-groups.ts
  src/lib/recovery/confidence.ts
  src/lib/recovery/process-workout.server.ts

API
  POST /api/workouts/[id]/complete
  GET  /api/recovery
  GET  /api/recovery/[group]

UI
  /recovery
  MuscleReadinessMap
  MuscleReadinessList
  RecoveryWhySheet
  DashboardRecoveryCard
```

### 4.2 Mô hình tính V1

Với mỗi completed set và mỗi muscle mapping:

```text
set_points = contribution * effort_factor * set_type_factor
exercise_muscle_points = sum(set_points)
new_fatigue = 100 * (1 - exp(-exercise_muscle_points / K))
decayed_old = old_fatigue * 2 ^ (-elapsed_hours / old_half_life)
combined = 100 * (1 - (1 - decayed_old / 100) * (1 - new_fatigue / 100))
readiness_now = 100 - combined * 2 ^ (-hours_since_fatigue_at / half_life)
```

Hằng số V1:

| Loại | Giá trị |
|---|---:|
| K | 6 |
| effort too_hard | 1.35 |
| effort hard | 1.15 |
| effort appropriate | 1.00 |
| effort easy | 0.70 |
| set warmup | 0.30 |
| set working | 1.00 |
| set drop | 1.15 |
| set failure | 1.30 |

Base half-life:

| Nhóm | Giờ |
|---|---:|
| chest, back | 20 |
| shoulders | 18 |
| biceps, triceps | 16 |
| quads, hamstrings | 22 |
| calves | 18 |
| abs | 14 |
| forearms | 14 |
| glutes, adductors, abductors | 22 |

Với muscle slug chưa có cấu hình, fallback là 18 giờ và confidence bị giảm. Half-life có thể tăng theo fatigue band, nhưng phải được đóng thành bảng hằng số có test, không dùng magic number rải rác.

### 4.3 Thứ tự chuẩn hóa effort

1. `workout_sets.perceived_effort`.
2. Legacy marker trong `note` dạng `effort:<value>`.
3. Suy ra từ RIR theo bảng cố định.
4. Fallback `appropriate` và giảm confidence.

Ghi mới chỉ ghi cột `perceived_effort`. Legacy note chỉ được đọc trong giai đoạn chuyển tiếp.

### 4.4 Confidence và cold start

Confidence không phải xác suất y khoa. Nó mô tả chất lượng dữ liệu đầu vào:

- High: có coefficient được curate, effort trực tiếp và set đầy đủ.
- Medium: dùng fallback role hoặc RIR.
- Low: thiếu effort, dùng muscle fallback hoặc mapping thô.
- Unknown: chưa có workout đã xử lý cho nhóm đó.

API trả `readiness: null` cho Unknown. UI hiển thị "Chưa đủ dữ liệu" với màu trung tính, không hiển thị 100%.

### 4.5 Ngưỡng hiển thị

| Readiness | Nhãn | Màu |
|---|---|---|
| 0-29 | Cần hồi phục nhiều | Đỏ |
| 30-59 | Chưa nên tập nặng | Cam |
| 60-79 | Có thể tập nhẹ | Vàng |
| 80-89 | Có thể tập | Xanh nhạt |
| 90-100 | Sẵn sàng | Xanh |

Màu không được là tín hiệu duy nhất. Mỗi vùng chọn được phải có tên, phần trăm hoặc trạng thái Unknown, nhãn chữ và mô tả cho screen reader.

### 4.6 Ánh xạ lớp trình bày

| Body group | Muscle slugs dự kiến |
|---|---|
| CHEST | chest, upper_chest, inner_chest |
| SHOULDERS | shoulders, front_delts, side_delts, rear_delts |
| BACK | back, upper_back, lats, lower_back, traps, rhomboids, spine |
| TRICEPS | triceps |
| BICEPS | biceps, brachialis |
| FOREARMS | forearms |
| ABS | abs, lower_abs, obliques, core |
| LEGS | quads, hamstrings, adductors, abductors |
| GLUTES | glutes |

Calves phải được thêm như vùng riêng nếu SVG hỗ trợ chính xác. Nếu asset hiện tại không có vùng chọn độc lập, V1 hiển thị calves trong list và đánh dấu hạn chế của body map, không gộp âm thầm vào LEGS. Các slug ngoài mapping không tham gia body map nhưng phải xuất hiện trong báo cáo coverage để curate.

## 5. BLUEPRINT - Hợp đồng triển khai

### 5.1 Thay đổi schema đề xuất

#### `exercise_muscles`

- Thêm `contribution numeric(4,3) null`.
- Check `contribution > 0 and contribution <= 1` khi không null.
- Fallback trong model: primary 1.0, secondary 0.5.
- Sửa `scripts/sync-exercises.ts` trước khi chạy sync để ghi default theo role và không phá coefficient đã curate.
- Không chạy script sync lên live trong TIP này.

#### `workouts`

- Thêm `recovery_processed_at timestamptz null`.
- Thêm `recovery_model_version text null`.
- Hai trường này là checkpoint idempotency, không phải nguồn score.

#### `muscle_training_loads`

Các trường tối thiểu:

- `id uuid primary key`.
- `user_id uuid not null references auth.users`.
- `workout_id uuid not null references workouts on delete cascade`.
- `workout_exercise_id uuid not null references workout_exercises on delete cascade`.
- `muscle_id uuid not null references muscles`.
- `completed_set_count integer not null`.
- `fatigue_points numeric not null`.
- `new_fatigue numeric not null`.
- `input_quality text not null`.
- `occurred_at timestamptz not null`.
- `model_version text not null`.
- `created_at timestamptz not null default now()`.
- Unique `(workout_exercise_id, muscle_id, model_version)`.
- Index `(user_id, occurred_at desc)` và `(user_id, muscle_id, occurred_at desc)`.

Ledger lưu kết quả chuẩn hóa đủ để giải thích nhưng không sao chép toàn bộ set JSON. Chi tiết bài tập/set tiếp tục đọc từ bảng nguồn.

#### `muscle_recovery_states`

Các trường tối thiểu:

- `user_id uuid not null references auth.users`.
- `muscle_id uuid not null references muscles`.
- `fatigue_score numeric not null check between 0 and 100`.
- `fatigue_at timestamptz not null`.
- `half_life_hours numeric not null check > 0`.
- `confidence text not null`.
- `last_workout_id uuid references workouts on delete set null`.
- `model_version text not null`.
- `updated_at timestamptz not null default now()`.
- Primary key `(user_id, muscle_id)`.

Không lưu `readiness_now`, vì nó thay đổi theo thời gian.

### 5.2 RLS và quyền

Cho hai bảng mới:

- Enable và force RLS theo chuẩn dự án nếu phù hợp với vai trò owner.
- Policy tách SELECT và mutation, dùng `TO authenticated`.
- Biểu thức owner dùng `(select auth.uid()) = user_id`.
- Cấp quyền bảng rõ ràng theo cấu hình Data API thực tế, không giả định RLS tự cấp quyền.
- Service role chỉ tồn tại ở server.
- Test User A không đọc, insert, update hoặc delete dữ liệu User B.
- Nếu dùng SQL function bảo mật, phải có owner check nội bộ, `search_path` cố định, revoke khỏi `PUBLIC` và grant tối thiểu. Blueprint ưu tiên domain service server-side trước, chỉ thêm RPC khi cần transaction thật sự.

Tham chiếu hiện hành: [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) và [Securing your API](https://supabase.com/docs/guides/api/securing-your-api).

### 5.3 Completion service và idempotency

Thay thao tác client cập nhật `workouts.status` trực tiếp bằng `POST /api/workouts/[id]/complete`:

1. Xác thực session và quyền sở hữu workout.
2. Nếu cùng `model_version` đã xử lý, trả kết quả hiện tại, không cộng fatigue lần hai.
3. Đọc workout exercises, completed sets, effort và muscle mappings.
4. Chỉ tính set có `completed_at` và `reps > 0`.
5. Bỏ qua timed warmup/cooldown phase không có set log; set `warmup` bên trong main exercise vẫn có factor 0.30.
6. Tính load bằng pure functions trong `src/lib/recovery/model.ts`.
7. Upsert ledger theo unique key.
8. Tính lại các state bị ảnh hưởng theo thứ tự thời gian từ ledger của model version hiện hành. Cách rebuild này sửa được trạng thái nếu lần chạy trước bị gián đoạn.
9. Cập nhật `status = completed`, `completed_at`, `recovery_processed_at` và `recovery_model_version` sau cùng.
10. Nếu bước nào lỗi, client nhận lỗi có thể retry; không điều hướng sang done như thể đã thành công.

Thợ thầu phải kiểm tra race hai request đồng thời. Nếu unique key và transaction hiện có không đủ để bảo đảm state, chuyển phần ghi sang một RPC hẹp nhận `workout_id`, không nhận score do client tính.

### 5.4 API đọc

`GET /api/recovery` trả:

```ts
type MuscleReadinessGroup = {
  group: BodyMuscleGroup;
  readiness: number | null;
  status: "unknown" | "recovering" | "light_only" | "trainable" | "ready";
  confidence: "unknown" | "low" | "medium" | "high";
  limitingMuscle: { id: string; slug: string; nameVi: string } | null;
  projectedAt: { r60: string | null; r80: string | null; r90: string | null };
  lastTrainedAt: string | null;
};
```

`GET /api/recovery/[group]` trả thêm:

- Các muscle chi tiết trong group.
- Những load event gần nhất trong cửa sổ tối đa 30 ngày.
- Workout, exercise, số set, effort source và fatigue contribution.
- Câu giải thích deterministic bằng tiếng Việt.
- Cảnh báo ước tính và pain safety note nếu session gần nhất có báo đau, nhưng không trộn pain vào score.

Không dùng LLM để tính hoặc giải thích con số V1.

### 5.5 UI states

Trang `/recovery` phải có:

- Loading skeleton.
- Cold start Unknown.
- Populated state với body map và list.
- Partial state khi một số nhóm chưa có dữ liệu.
- Stale/model-upgrade state nếu state cũ khác model version hiện hành.
- Error state có retry.
- Mobile 320 px không tràn ngang.
- Keyboard focus, Enter/Space mở Why sheet, focus trap và đóng bằng Escape.
- Reduced motion.

Bottom sheet "Vì sao?" gồm:

1. Score, nhãn và confidence.
2. Cơ chi tiết đang giới hạn group.
3. Những bài tập gần nhất đóng góp tải mỏi.
4. Thời gian dự kiến đạt 60/80/90%.
5. Gợi ý an toàn: tập nhẹ, đổi nhóm cơ hoặc nghỉ.
6. Copy rõ "Đây là ước tính từ nhật ký tập, cảm nhận thực tế và đau luôn được ưu tiên".

### 5.6 Tích hợp workout recommendation

Chỉ mở TIP tích hợp sau khi model, API và UI pass acceptance:

- Readiness là một constraint bổ sung cho generator hiện có.
- Nhóm dưới 60 không được chọn làm target nặng.
- Nhóm 60-79 chỉ được dùng cho volume/intensity nhẹ theo policy định trước.
- Nhóm 80 trở lên có thể được cân nhắc, không tự động tăng mức tải.
- Pain, equipment, phase, contraindication và program rules có quyền ưu tiên cao hơn.
- Nếu readiness Unknown, generator dùng hành vi hiện tại và nói rõ thiếu dữ liệu.

## 6. TASK GRAPH - Giao việc Chủ thầu sang Thợ thầu

```text
TIP-MR-00 Live preflight
  -> TIP-MR-01 Effort contract
  -> TIP-MR-02 Schema + mapping
       -> TIP-MR-03 Recovery model
            -> TIP-MR-04 Completion processing
                 -> TIP-MR-05 Read API
                      -> TIP-MR-06 Recovery UI
                      -> TIP-MR-07 Workout recommendation
                 -> TIP-MR-08 Historical backfill + rollout
TIP-MR-06 + TIP-MR-07 + TIP-MR-08
  -> TIP-MR-09 Full verification
```

Không chạy TIP-MR-08 trên live nếu chưa có phê duyệt mutation riêng.

### TIP-MR-00 - Live source-truth preflight

**Mục tiêu:** xác nhận local và live không lệch trước khi viết migration.

**Nhiệm vụ:**

- Ghi `git status`, branch và migration list, không làm sạch dirty tree.
- Kiểm tra live columns của workout_sets, trạng thái migration perceived_effort và RLS hiện hành.
- Đếm live exercises, muscles, exercise_muscles và tỷ lệ primary/secondary.
- Báo các muscle slug không map được vào body group.
- Chốt feature flag và môi trường thử nghiệm.

**Acceptance:** báo cáo preflight có số liệu, không log secret, không mutation.

**Report:** Completed / Files changed / Tests / Decisions / Deviations / Risks.

### TIP-MR-01 - Chuẩn hóa perceived effort

**Tệp chính:**

- `src/types/database.ts`
- `src/app/(app)/workouts/[id]/objective-set-tracker.tsx`
- `src/app/(app)/workouts/[id]/page.tsx`
- `src/app/(app)/workouts/[id]/done/page.tsx`

**Nhiệm vụ:** thêm type/select/write cho cột thật; dual-read legacy note và RIR; ngừng ghi marker effort mới vào note.

**Acceptance:** save/reload giữ đúng effort; dữ liệu legacy vẫn đọc được; typecheck và focused tests xanh.

### TIP-MR-02 - Schema recovery và mapping contract

**Tệp chính:** migration mới, `scripts/sync-exercises.ts`, generated DB types nếu có.

**Nhiệm vụ:** thêm coefficient, ledger, state, processing marker, indexes, grants và RLS. Sửa sync để giữ hợp đồng coefficient.

**Acceptance:** migration lên/xuống trên local test database; constraint/unique/index đúng; two-user RLS pass; sync dry-run không xóa coefficient curate.

### TIP-MR-03 - Pure recovery model

**Tệp chính:**

- `src/lib/recovery/model.ts`
- `src/lib/recovery/constants.ts`
- `src/lib/recovery/muscle-groups.ts`
- test fixtures tương ứng

**Nhiệm vụ:** viết pure functions cho factor, saturation, decay, combine, projection và aggregation.

**Acceptance:** exact fixtures cho 0 set, warmup, hard/failure, nhiều session, mốc half-life, clock future/past, clamp 0-100 và Unknown.

### TIP-MR-04 - Idempotent workout completion

**Tệp chính:** route complete mới, `process-workout.server.ts`, workout logger.

**Nhiệm vụ:** chuyển completion sang server, tạo/rebuild ledger-state, xử lý retry và lỗi một phần.

**Acceptance:** gọi hai lần không tăng fatigue lần hai; hai request đồng thời không tạo duplicate; workout không thuộc user bị 404/403; lỗi xử lý không điều hướng giả thành công.

### TIP-MR-05 - Recovery read API

**Nhiệm vụ:** endpoint summary và detail, tính decay khi đọc, project 60/80/90, giải thích deterministic, giới hạn cửa sổ lịch sử.

**Acceptance:** response schema ổn định; không N+1 theo nhóm cơ; owner isolation; Unknown và model version mismatch đúng.

### TIP-MR-06 - Body map và Why sheet

**Tệp chính:** `MuscleBody.tsx`, trang `/recovery`, component readiness mới, nav/dashboard entry.

**Nhiệm vụ:** mở rộng body map bằng score map và selection mà không phá các consumer cũ; thêm list fallback cho calves/unmapped; triển khai states và accessibility.

**Acceptance:** kiểm thử 320/375/768/1440 px; keyboard và screen reader labels; màu + text; không regression `day-muscle-map`.

### TIP-MR-07 - Tạo workout từ nhóm đã hồi phục

**Nhiệm vụ:** nối readiness vào constraint engine theo policy giảm/giữ tải; tạo CTA có confirmation và giải thích nhóm được chọn/bỏ.

**Acceptance:** không tăng tải vì readiness; pain và contraindication thắng readiness; Unknown giữ hành vi cũ; recommendation có audit reason.

### TIP-MR-08 - Backfill và staged rollout

**Nhiệm vụ:** script dry-run 14 ngày gần nhất, thống kê coverage, số workout/set bị bỏ qua và chênh lệch model; sau phê duyệt mới chạy write. Bật feature flag theo môi trường hoặc cohort.

**Acceptance:** dry-run không mutation; write retry-safe; có before/after counts; có rollback flag; không xóa source data.

### TIP-MR-09 - Full verification

**Nhiệm vụ:** typecheck, unit, integration, RLS, authenticated E2E, accessibility, responsive và regression workout journey.

**Acceptance:** toàn bộ Definition of Done bên dưới có bằng chứng. Nếu một gate không chạy được, báo `UNVERIFIED`, không chuyển thành PASS.

## 7. Kế hoạch kiểm thử

### Unit

- Bảng factor effort và set type.
- Contribution fallback.
- Saturation K=6.
- Half-life: sau đúng một half-life, residual giảm một nửa.
- Combine hai fatigue event.
- Projection 60/80/90, gồm trường hợp đã vượt ngưỡng.
- Clamp và invalid input.
- Conservative group aggregation.
- Confidence source precedence.

### Integration

- Hoàn thành workout tạo đúng ledger/state.
- Retry và request đồng thời.
- Legacy note effort và RIR fallback.
- Workout không có completed set.
- Workout có coarse và detailed muscle mapping.
- Model version đổi và rebuild state.

### Security

- Hai tài khoản thực, A/B, kiểm tra SELECT/INSERT/UPDATE/DELETE chéo.
- Anonymous không đọc được dữ liệu recovery.
- Không có service-role secret trong client bundle hoặc log.
- API xác minh owner thay vì tin `user_id` từ request.

### E2E và UX

- Người mới thấy Unknown hợp lý.
- Sau workout, score xuất hiện và giảm theo fixture clock.
- Mở Why sheet từ map và list.
- Pain copy không bị biến thành recovery score.
- Mobile, desktop, keyboard, reduced motion và contrast.
- Existing workout logging, done page, programs muscle map và progress page không regression.

### Hiệu năng

- Summary dùng truy vấn theo user và state, không quét toàn bộ workout history.
- Detail giới hạn 30 ngày và có index hỗ trợ.
- Ghi completion có số query đo được trong test; nếu vượt ngân sách được thống nhất, tối ưu trước rollout.

## 8. Rollout, quan sát và rollback

1. Deploy schema additive trước, UI flag vẫn tắt.
2. Deploy effort dual-read và completion processor.
3. Chạy local/staging fixtures và authenticated two-user test.
4. Bật cho tài khoản nội bộ.
5. Theo dõi completion error, duplicate conflict, Unknown rate, mapping coverage và API latency.
6. Chỉ sau đó cân nhắc dry-run backfill 14 ngày.
7. Bật cohort nhỏ rồi mở rộng.

Rollback:

- Tắt feature flag và quay completion UI về hành vi không hiển thị recovery.
- Giữ bảng additive và ledger để điều tra, không xóa dữ liệu trong rollback khẩn cấp.
- Nếu processor lỗi, workout vẫn phải có đường retry/reconcile rõ ràng.
- Migration phá hủy hoặc backfill đảo ngược cần kế hoạch và phê duyệt riêng.

## 9. Definition of Done

- [ ] Live source truth đã được xác nhận và lưu bằng chứng.
- [ ] Effort contract không còn lệch giữa schema, types, select và write.
- [ ] Formula/constants chỉ có một nguồn canonical và có exact fixture tests.
- [ ] Completion retry-safe, không double count.
- [ ] Ledger giải thích được score về tới workout/exercise/set source.
- [ ] RLS two-user và anonymous tests pass.
- [ ] Cold start không hiển thị 100% giả.
- [ ] Body map có nhãn chữ, keyboard và list fallback.
- [ ] Pain và safety constraints luôn ưu tiên hơn readiness.
- [ ] Recommendation không tự tăng tải.
- [ ] Full self-service authenticated journey pass trên mobile và desktop.
- [ ] Build, typecheck và focused/full tests có bằng chứng.
- [ ] Rollout flag, metrics và rollback đã sẵn sàng.
- [ ] Mỗi TIP có Completion Report và mọi deviation được Chủ thầu duyệt.

## 10. Cổng phê duyệt

Để chuyển từ Chủ thầu sang Thợ thầu, chủ nhà phê duyệt:

```text
APPROVED MUSCLE READINESS BLUEPRINT
```

Nếu muốn đổi quyết định, ghi rõ ID, ví dụ:

```text
Đổi D-003 sang trung bình có trọng số.
```

Phê duyệt Blueprint chỉ cho phép bắt đầu thay đổi code cục bộ theo TIP. Nó không tự động cho phép chạy migration, backfill, deploy hoặc ghi vào Supabase live. Các mutation live vẫn cần phê duyệt riêng tại đúng checkpoint.
