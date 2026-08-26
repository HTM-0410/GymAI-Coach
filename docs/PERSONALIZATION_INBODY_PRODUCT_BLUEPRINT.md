# GymAI Coach - Personalization & InBody Product Blueprint (Draft)

Status: **VISION / BLUEPRINT DRAFT - chờ Chủ nhà phê duyệt trước BUILD**  
Ngày nghiên cứu: 2026-08-22  
Phương pháp: Vibecode Kit v6.1, focused SCAN → research → RRI challenge → VISION → Blueprint draft → Task Graph  
Phạm vi: phân tích sản phẩm, UI/UX, dữ liệu và tích hợp AI; chưa sửa code/DB, chưa gửi ảnh ra dịch vụ ngoài.

## 1. Kết luận điều hành

Tính năng nên được định vị là **Hồ sơ thích nghi (Adaptive Profile)**, không chỉ là một form “thông tin cá nhân”. Nó là nguồn sự thật dùng chung để mọi AI hiểu cùng một người, cùng các giới hạn và cùng mức độ tin cậy của dữ liệu.

Giá trị cốt lõi:

> GymAI Coach biết điều gì người dùng muốn, điều gì họ làm được hôm nay, điều gì tuyệt đối phải tránh, họ đã phản ứng ra sao với các buổi trước, rồi giải thích rõ vì sao buổi tập được điều chỉnh.

InBody là một đầu vào **tự nguyện** giúp theo dõi xu hướng thành phần cơ thể. Nó không được quyết định độc lập mức tạ, chẩn đoán sức khỏe hay áp đặt mục tiêu hình thể. Với một lần đo, hệ thống chỉ tạo baseline và nêu điểm cần theo dõi; chỉ khi có từ hai lần đo trong điều kiện tương đối nhất quán mới hiển thị xu hướng.

Kiến trúc đề xuất:

```text
User-declared profile      Workout/performance history      Optional InBody
          │                           │                           │
          └──────────────┬────────────┴──────────────┬────────────┘
                         ▼                           ▼
              Personalization Context       Safety/Consent Gate
                 (versioned + typed)          (deterministic)
                         │                           │
                         └──────────┬────────────────┘
                                    ▼
                  Planner / Progression / Substitute
                    Coach Chat / Weekly Report
                                    │
                                    ▼
                       Explainability + feedback
                                    │
                                    └── learn/update profile
```

## 2. SCAN REPORT - hiện trạng GymAI Coach

### Nền tảng và pattern đang có

- Next.js 14 App Router, React 18, TypeScript, Tailwind, Supabase Auth/DB/RLS, Zod và Gemini.
- Visual language nhất quán: chassis/neumorphic, accent cam, mono micro-label, light/dark, mobile bottom navigation.
- Core loop đã có: program → AI draft → confirm → workout logger → feedback → progression/recommendation → weekly report/coach.
- AI đã có các surface chính: workout planner, progression, substitute, coach chat, weekly summary, exercise content và equipment detection.
- Planner đã có candidate allowlist, equipment filter, experience filter, explicit avoidance, phase/time budget và Zod validation. Đây là nền tốt để thêm personalization mà không trao quyền quyết định an toàn cho LLM.

### Dữ liệu cá nhân hoá hiện có

| Nhóm | Dữ liệu hiện có | Nơi đang dùng |
|---|---|---|
| Cơ bản | tên, ngày sinh (schema), chiều cao, cân nặng, đơn vị | profile, coach |
| Ý định | mục tiêu chính, trình độ | onboarding, planner, coach |
| Khả dụng | số ngày/tuần, phút/buổi | onboarding/profile; planner nhận duration theo request |
| Môi trường | thiết bị cá nhân, gym, mức dumbbell | planner, substitute |
| Hành vi tập | workout, set, reps, load, RIR legacy, completion | progression, coach, report |
| Phản hồi | difficulty, energy, quality, note | weekly report; chưa vào planner context đầy đủ |
| Tiến bộ | body weight, PR, estimated 1RM/volume | report/progress |
| Governance AI | pending recommendation + accept/reject, ai_interactions | recommendation review/audit |

### Khoảng trống đáng chú ý

1. Không có một `PersonalizationContext` chuẩn; mỗi AI tự query và tự diễn giải profile.
2. Goal mapping trong coach không khớp hoàn toàn enum DB (`strength`/`general_fitness` so với `strength_gain`/`maintenance`).
3. Blueprint cũ ghi 3 cờ chấn thương vai/lưng/gối, nhưng migration, type và UI hiện tại không có. Ba boolean cũng quá thô để điều khiển bài tập an toàn.
4. Chưa có sở thích bài tập (thích/không thích), động tác không muốn làm, ưu tiên máy/free-weight, phong cách buổi tập.
5. Chưa có readiness trước buổi (đau, mệt, ngủ, stress, thời gian thực tế hôm nay).
6. Feedback gần đây chưa được đưa nhất quán vào planner; coach chỉ nhìn 3 workout gần nhất.
7. Chưa có consent/purpose/retention cho dữ liệu sức khỏe hoặc ảnh InBody.
8. Chưa có provenance, confidence, thời điểm hiệu lực và khả năng sửa từng insight.
9. `ai_interactions.request_json` có nguy cơ lưu quá nhiều dữ liệu nhạy cảm nếu context mới được nhét nguyên khối.
10. Auth guard trong app layout đang bị comment phục vụ smoke test; phải đóng lại trước khi ship dữ liệu sức khỏe.

## 3. Người tập gym cần cá nhân hoá điều gì?

Không nên hỏi mọi thứ trong onboarding. Dữ liệu được chia theo thời gian sống và quyền ưu tiên.

### 3.1 Hard constraints - bắt buộc tôn trọng

Các input này phải được constraint engine xử lý trước LLM:

- Thiết bị thực sự có tại gym hiện tại và các mức tạ khả dụng.
- Vùng đau/giới hạn vận động hiện tại; bên trái/phải; mức độ; động tác gây khó chịu; thời hạn.
- Bài tập hoặc thiết bị người dùng đánh dấu “không bao giờ đề xuất”.
- Chống chỉ định/khuyến cáo từ chuyên gia do người dùng tự khai. Hệ thống chỉ lưu nội dung đã chọn/nhập, không tự suy đoán bệnh.
- Thời lượng còn lại trong buổi, ngày có thể tập và accessibility.
- Trạng thái cần dừng/escalate: đau ngực, ngất, khó thở bất thường hoặc triệu chứng cấp tính do người dùng khai báo. UI không đưa giáo án thay thế; hướng người dùng tìm hỗ trợ y tế phù hợp.

### 3.2 Stable preferences - ít đổi

- Mục tiêu chính và mục tiêu phụ: tăng cơ, sức mạnh, giảm mỡ, duy trì, kỹ năng/động tác cụ thể.
- Mức ưu tiên mục tiêu và kỳ vọng thời gian; không hứa kết quả.
- Trình độ theo từng pattern nếu cần (squat/hinge/push/pull), không chỉ một nhãn toàn cục.
- Lịch tập lý tưởng, ngày cố định/linh hoạt, thời lượng thường có.
- Phong cách: bài compound hay máy, ít bài dài buổi hay nhiều bài ngắn, cardio ưa thích, mức đa dạng bài.
- Ngôn ngữ, đơn vị, mức chi tiết giải thích, cách AI xưng hô/động viên.

### 3.3 Learned preferences - học từ hành vi, luôn cho phép sửa

- Bài thường thay/xoá, bài thường hoàn thành, tỷ lệ bỏ giữa buổi.
- Mức tạ thực tế so với đề xuất, rest thực tế, rep drop và tốc độ tiến bộ.
- Recommendation nào được chấp nhận/từ chối và lý do.
- Gym/location thường dùng, khung giờ và thời lượng thực tế.

Hệ thống phải ghi đây là **suy luận từ hành vi**, hiển thị “AI nghĩ rằng…” và có nút “Không đúng”. Không âm thầm biến suy luận thành hard constraint.

### 3.4 Daily readiness - hiệu lực ngắn

Check-in trước buổi tối đa 15-20 giây:

- Năng lượng 1-5.
- Chất lượng ngủ 1-5 hoặc số giờ (tùy chọn).
- Đau cơ/vùng khó chịu hôm nay.
- Stress 1-5 (tùy chọn).
- Thời gian thực tế còn lại.
- Ý muốn hôm nay: theo lịch / nhẹ hơn / thử sức.

Readiness chỉ điều chỉnh volume, intensity, exercise selection và kỳ vọng; không chẩn đoán nguyên nhân.

### 3.5 Longitudinal outcomes

- Hiệu suất: load/reps/set, estimated 1RM, volume theo nhóm cơ, adherence.
- Phản ứng: difficulty/energy/quality, đau sau buổi (nếu user tự khai).
- Cân nặng và thành phần cơ thể theo thời gian.
- Mục tiêu hành vi: số buổi hoàn thành, consistency, kỹ thuật/learning goals.

## 4. Vai trò đúng của InBody

### 4.1 InBody giúp gì

- Tạo baseline ngoài cân nặng: skeletal muscle mass, body-fat mass/percentage, fat-free mass, total body water và phân bố segmental khi phiếu có.
- Cho thấy xu hướng recomposition: cân có thể ít đổi trong khi cơ/mỡ thay đổi.
- Hỗ trợ ưu tiên theo dõi: ví dụ mục tiêu tăng cơ nên nhìn SMM/FFM và performance, không chỉ tổng cân.
- Cung cấp ngữ cảnh để coach giải thích báo cáo, đặt mục tiêu đo lại và khuyến khích điều kiện đo nhất quán.

### 4.2 InBody không được làm gì

- Không chẩn đoán béo phì, suy dinh dưỡng, mất nước, bệnh nội khoa hay chấn thương.
- Không dùng một scan để tự động tăng/giảm mức tạ hoặc thay đổi mạnh volume.
- Không biến `InBody Score` thành điểm sức khỏe hoặc gamification gây xấu hổ.
- Không so sánh BIA từ máy/điều kiện khác nhau như thể hoàn toàn tương đương.
- Không thay thế performance, adherence, feedback và readiness trong quyết định tập.
- Không dùng calorie recommendation trên phiếu như prescription dinh dưỡng tự động.

InBody USA cũng mô tả Result Sheet là thông tin giáo dục, không phải tư vấn y tế. Nghiên cứu tổng quan cho thấy BIA hữu ích để theo dõi nhưng không nên dùng thay thế qua lại với DXA; kết quả bị ảnh hưởng bởi phương pháp và điều kiện đo. Vì vậy sản phẩm phải ưu tiên **trend trong điều kiện nhất quán**, không tuyệt đối hoá một số đo.

### 4.3 Đọc thử ảnh mẫu (chỉ để kiểm chứng thiết kế OCR)

Ảnh đính kèm là phiếu InBody270, có số điện thoại/ID ở đầu phiếu. Báo cáo này cố ý không chép lại định danh đó.

Các trường nhìn được với độ tin cậy thị giác tương đối cao:

| Chỉ số | Giá trị đọc thử |
|---|---:|
| Chiều cao / tuổi / giới tính trên phiếu | 170 cm / 22 / nam |
| Cân nặng | 63.0 kg |
| Total Body Water | 35.9 L |
| Skeletal Muscle Mass | 27.5 kg |
| Body Fat Mass | 14.1 kg |
| Percent Body Fat | 22.3% |
| BMI | 21.8 kg/m² |
| Fat Free Mass | 48.9 kg |
| Basal Metabolic Rate | 1427 kcal |
| Waist-Hip Ratio | 0.89 |
| Visceral Fat Level | 5 |
| SMI | 7.1 kg/m² |
| InBody Score | 70/100 |

Phiếu còn có target/weight-control và segmental lean/fat. Tuy nhiên ảnh bị nghiêng, nhăn và một phần chữ nhỏ; đây là lý do UI phải bắt người dùng xác nhận từng field, không “scan xong là lưu”.

**Cách diễn giải sản phẩm cho mẫu:** đây là baseline thành phần cơ thể. App có thể nói dữ liệu cân/BMI nằm trong vùng tham chiếu in trên phiếu, PBF được phiếu đánh dấu hơi cao và segmental fat vùng thân được đánh dấu cao; đồng thời nhấn mạnh đây không phải chẩn đoán. Mục tiêu tập nên được chọn bởi user. Nếu mục tiêu là recomposition, app theo dõi song song SMM/PBF, performance và adherence; không lấy con số “Fat Control/Muscle Control” của máy làm deadline bắt buộc.

### 4.4 Điều kiện đo và quality flag

Mỗi measurement cần các metadata:

- `measured_at`, timezone, device brand/model, gym/source.
- Nhịn ăn đủ thời gian? vừa tập? vừa sauna? hydration khác thường? thời điểm trong ngày?
- Ảnh đủ trang/đủ nét? OCR confidence? user đã xác nhận?
- `comparability`: high / medium / low so với lần trước.

InBody khuyến nghị đo cùng thời điểm trong ngày, duy trì điều kiện dịch cơ thể nhất quán, đi vệ sinh trước đo, tránh ăn và tránh tập sát thời điểm đo. App nên hiển thị checklist ngắn trước lần đo tiếp theo, không dùng checklist để “phán” lần đo cũ sai.

## 5. InBody image-to-insight journey

```text
1. Entry             2. Privacy gate          3. Capture quality
“Thêm InBody”   →     giải thích dữ liệu   →   crop/rotate/glare check
                                                   │
                                                   ▼
6. Insights          5. Human review           4. OCR extraction
baseline/trend   ←    sửa từng field       ←   boxes + confidence
      │
      ▼
7. Apply scope: “Cho AI nào dùng?” → 8. retention/delete/export controls
```

### Bước 1 - entry

Hai điểm vào:

- Profile → **Cơ thể & InBody**.
- Progress → card **Thành phần cơ thể** → “Thêm lần đo”.

Không đặt upload InBody là bước bắt buộc của onboarding; phần lớn user không có phiếu.

### Bước 2 - privacy/consent trước upload

Microcopy đề xuất:

> Ảnh InBody có thể chứa số điện thoại, ID và dữ liệu cơ thể. GymAI sẽ tìm và che thông tin nhận dạng trước khi phân tích. Nếu cần gửi ảnh đã che tới nhà cung cấp AI để đọc chỉ số, chúng tôi sẽ nêu rõ nhà cung cấp, mục đích và thời gian lưu. Bạn luôn có thể nhập tay, xoá ảnh hoặc xoá toàn bộ lần đo.

Consent phải tách mục đích:

- Lưu chỉ số trong hồ sơ.
- Dùng chỉ số để cá nhân hoá Workout AI.
- Dùng chỉ số trong Coach/Weekly Report.
- Lưu ảnh gốc sau khi trích xuất (default: **không**).
- Gửi ảnh đã che ra nhà cung cấp AI ngoài hệ thống (nếu kiến trúc OCR yêu cầu).

### Bước 3 - capture quality

- Overlay bốn góc, auto-crop, rotate/perspective correction.
- Cảnh báo glare, blur, thiếu mép, chữ quá nhỏ.
- Nếu nhiều trang: thêm từng trang, đánh số.
- Cho phép nhập tay thay vì upload.

### Bước 4 - PII redaction rồi mới OCR ngoài hệ thống

Pipeline an toàn đề xuất:

1. Upload tạm bằng signed URL vào private bucket với TTL.
2. Local/server CV phát hiện vùng header và pattern phone/ID; tạo ảnh redacted.
3. Nếu user đồng ý, chỉ gửi bản redacted sang OCR/vision provider.
4. Parse về schema typed; lưu raw extraction tạm kèm bounding box/confidence.
5. Không đưa raw image/raw OCR vào `ai_interactions`.

Nếu không đảm bảo redaction đáng tin cậy ở MVP, chọn phương án **crop header bắt buộc + user xác nhận vùng che** trước khi gửi ngoài.

### Bước 5 - review-before-save

UI hai cột trên desktop, dạng accordion trên mobile:

```text
┌──────────────────────────┬──────────────────────────┐
│ Ảnh đã che PII           │ Chỉ số đã đọc            │
│ [zoom/crop]              │ Cân nặng  [63.0] kg  98% │
│ highlight field selected │ SMM       [27.5] kg  96% │
│                          │ PBF       [22.3] %   94% │
│                          │ [!] WHR   [0.89]     71% │
└──────────────────────────┴──────────────────────────┘
```

- Field confidence thấp cần attention; không dùng màu đỏ như chẩn đoán.
- Chạm field sẽ highlight vùng ảnh nguồn.
- Range và đơn vị lấy từ chính phiếu khi có; không tự thay bằng một range chung.
- Nút chính: **Xác nhận và tạo baseline**. Không dùng “AI chẩn đoán”.

### Bước 6 - insight hierarchy

Thứ tự giúp giảm cognitive load:

1. **Điều quan trọng nhất:** 2-3 dòng, phân biệt “đo được” và “suy luận”.
2. **So với lần trước:** chỉ xuất hiện khi comparability đủ.
3. **Liên quan mục tiêu của bạn:** ví dụ tăng cơ/recomposition.
4. **AI sẽ dùng dữ liệu này thế nào:** cụ thể theo surface.
5. **Tất cả chỉ số:** bảng kỹ thuật có range/source/confidence.
6. **Giới hạn phép đo:** link dễ thấy.

### Bước 7 - user control

- Toggle theo AI surface.
- Sửa/xoá measurement; xoá ảnh nhưng giữ chỉ số; export JSON/CSV/PDF summary.
- “Không dùng lần đo này để cá nhân hoá” không đồng nghĩa phải xoá lịch sử.
- Coach/trainer chỉ thấy InBody khi user cấp quyền riêng; quyền có thể thu hồi.

## 6. Information architecture và UI/UX

### 6.1 Không biến Profile thành form dài

Profile mới là dashboard của personalization:

```text
┌────────────────────────────────────────────────────┐
│ HỒ SƠ THÍCH NGHI        “AI đang dùng 8 nguồn”     │
│ [Mục tiêu] [Khả dụng] [Giới hạn] [Sở thích]       │
├────────────────────────────┬───────────────────────┤
│ Cơ thể & InBody            │ Readiness gần đây     │
│ Baseline + trend mini      │ ngủ / năng lượng      │
├────────────────────────────┴───────────────────────┤
│ AI đã học gì?  [Đúng] [Không đúng] [Sửa]          │
│ “Bạn thường đổi barbell squat sang leg press.”    │
├────────────────────────────────────────────────────┤
│ Quyền riêng tư & dữ liệu                           │
└────────────────────────────────────────────────────┘
```

Mobile: các section là card; CTA “Cập nhật hôm nay” ở đầu. Reuse `card`, `bg-chassis`, `shadow-neumorph`, accent cam và mono label hiện có. Dùng xanh/amber cho trạng thái kỹ thuật, không dùng màu để đánh giá cơ thể “tốt/xấu”.

### 6.2 Progressive profiling

- Onboarding bắt buộc: tên, goal, experience, days/duration, equipment như hiện tại.
- Sau onboarding: một “next best question” theo ngữ cảnh, tối đa một câu tại một thời điểm.
- Trước workout đầu: hỏi hard constraints và vùng đau hôm nay.
- Sau 2-3 workouts: hỏi xác nhận sở thích suy luận.
- Khi user vào Progress: mời thêm body measurement/InBody.

### 6.3 Workout generation

Trước Generate:

- Readiness quick check (có thể skip).
- Tóm tắt constraints đang áp dụng: gym, duration, vùng cần tránh, goal.
- Cho user ghi prompt tự do nhưng hard constraints không bị prompt ghi đè.

Sau Generate:

- Mỗi điều chỉnh có chip “Vì sao”: `Thiết bị`, `Mục tiêu`, `Lịch sử`, `Readiness`, `Giới hạn`.
- Một panel **Cá nhân hoá đã áp dụng** thay cho lý do LLM mơ hồ.
- User có thể “Đừng đề xuất bài này” hoặc “Chỉ đổi hôm nay”; hai hành động có thời hạn khác nhau.

### 6.4 AI Coach

- Header có chip “Đang dùng: mục tiêu, 3 buổi gần nhất, readiness hôm nay”; tap để xem và tắt nguồn.
- Câu trả lời phải phân biệt dữ liệu: “Theo log của bạn…” / “Theo lần InBody ngày…” / “Mình đang suy luận…”.
- Khi câu hỏi vượt phạm vi tập luyện an toàn, coach nói rõ giới hạn và hướng người dùng tìm chuyên gia phù hợp.
- Conversation memory không tự trở thành profile. Coach đề xuất lưu: “Bạn muốn mình ghi đây là giới hạn lâu dài không?”

### 6.5 Weekly report và Progress

- Report theo goal, nhưng luôn có behavior trước outcome: adherence, performance, recovery rồi mới body weight/composition.
- InBody không cần đo hàng tuần. Card ghi ngày scan gần nhất và gợi ý đo lại trong điều kiện tương đồng thay vì tạo áp lực streak.
- Biểu đồ cho Weight/SMM/PBF có marker về device và comparability; không nối đường qua hai điểm không tương thích mà không cảnh báo.

### 6.6 Accessibility và sensitive-body UX

- Không chỉ dùng màu; mọi trạng thái có label/icon/text.
- Không dùng copy “xấu”, “thừa”, “fail”, “body age”.
- Cho ẩn số cân/PBF trên dashboard shared-screen.
- Không tạo social leaderboard từ InBody Score/PBF.
- Tất cả edit/delete/consent dùng ngôn ngữ rõ, có undo khi phù hợp.

## 7. Personalization Context - hợp đồng chung cho mọi AI

### 7.1 Nguyên tắc

1. Một builder server-side duy nhất tạo context typed và versioned.
2. Tách `hard_constraints`, `user_declared`, `observed`, `derived` và `ephemeral`.
3. Mỗi field có `source`, `observed_at`, `confidence`, `expires_at` nếu cần.
4. LLM chỉ nhận subset tối thiểu cho task; không nhận toàn bộ hồ sơ mặc định.
5. Safety/eligibility chạy deterministic trước; LLM chọn trong allowlist hoặc chỉ viết lời giải thích.
6. Mọi recommendation trả về `factors_used`, `factors_ignored`, `confidence`, `valid_until`.

### 7.2 Contract minh hoạ

```ts
type PersonalizationContextV1 = {
  version: '1.0';
  user: {
    goal: { primary: Goal; secondary: Goal[]; source: 'user' };
    experience: ExperienceLevel;
    schedule: { daysPerWeek: number; preferredMinutes: number };
  };
  hardConstraints: {
    unavailableEquipment: string[];
    excludedExerciseSlugs: string[];
    movementLimitations: Array<{
      region: string;
      side?: 'left' | 'right' | 'both';
      severity: 'mild' | 'moderate' | 'severe';
      triggers: string[];
      validUntil?: string;
      source: 'user' | 'professional_note';
    }>;
  };
  preferences: {
    explicit: Array<{ key: string; value: unknown }>;
    inferred: Array<{ key: string; value: unknown; confidence: number }>;
  };
  readiness?: {
    energy: 1 | 2 | 3 | 4 | 5;
    sleepQuality?: 1 | 2 | 3 | 4 | 5;
    discomfortRegions: string[];
    availableMinutes: number;
    expiresAt: string;
  };
  performance: {
    recentSessions: unknown[];
    exerciseTrends: unknown[];
    adherence: unknown;
  };
  bodyComposition?: {
    latestConfirmed: unknown;
    trend?: unknown;
    comparability: 'high' | 'medium' | 'low';
    allowedUses: Array<'planner' | 'coach' | 'weekly_report'>;
  };
};
```

### 7.3 AI integration matrix

| AI surface | Dữ liệu nên dùng | Không nên dùng để quyết định | Hard gate / output |
|---|---|---|---|
| Workout Planner | goal, experience, gym/equipment, schedule, constraints, readiness, recent performance, program targets | InBody Score; calorie target | constraint allowlist → structured plan → preview |
| Progression | completed load/reps/sets, target range, equipment increments, trend, readiness modifier | một lần InBody; chat claim chưa xác nhận | deterministic verdict; LLM chỉ giải thích |
| Substitute | muscle/pattern, equipment, movement limitations, explicit dislikes | chẩn đoán nguyên nhân đau | safe candidate list; user confirms |
| Coach Chat | minimal profile, recent verified logs, consented body-composition summary, conversation | raw photo, phone/ID, unrestricted medical inference | source-attributed answer; escalation policy |
| Weekly Report | adherence, volume/performance, feedback, weight/body-comp trends | false precision từ sparse data | facts calculated first; LLM narrative second |
| Exercise Detail Coach | current exercise history, goal, relevant constraint | toàn bộ health profile | next-session suggestion remains confirmable |
| Exercise Content | user language/detail preference only | health/body comp | catalog content remains canonical |
| Equipment Detect | selected gym and units | profile health/InBody | detection + human confirmation |

## 8. Data model đề xuất

Không nhồi mọi dữ liệu vào `profiles`. Giữ `profiles` cho identity/basic defaults; thêm các bảng lịch sử và purpose rõ.

### 8.1 Bảng P0

`personalization_profiles`

- `user_id` unique, primary/secondary goals, coaching tone, detail level, updated_at.

`training_constraints`

- region, side, severity, triggers, excluded patterns/exercises, status, valid_from/until, source, user_confirmed_at.

`exercise_preferences`

- exercise/pattern/equipment target, preference (`prefer`, `avoid`, `exclude`), strength, source (`explicit`, `inferred`), confidence, last_confirmed_at.

`readiness_checkins`

- checkin_date/time, energy, sleep_quality/hours optional, stress optional, discomfort JSON, available_minutes, intent.

`body_composition_measurements`

- source/device/measured_at, weight, TBW, protein, mineral, body_fat_mass, SMM, PBF, BMI, FFM, BMR, WHR, visceral_fat_level, SMI, score.
- target/control fields are stored as **device-provided**, never silently treated as app goals.
- preparation/comparability metadata, extraction confidence, review status, confirmed_at.
- `raw_image_path` nullable; redacted image separately; deletion/retention timestamps.

`body_composition_segments`

- measurement_id, segment, tissue_type (lean/fat), mass, percent_of_reference, device_evaluation.

`data_consents`

- purpose, provider, data_categories, granted_at, withdrawn_at, policy_version.

`ai_decision_contexts`

- interaction/recommendation id, context version, compact field provenance, factors used/ignored, rules fired. Không lưu raw image hoặc prompt chứa PII.

### 8.2 RLS và lifecycle

- Owner-only RLS cho tất cả bảng health/personalization.
- Trainer access qua explicit grant có scope + expiry, không dựa vào `is_trainer` chung.
- Private storage, signed URLs, encryption in transit/at rest, no public bucket.
- Raw upload TTL ngắn; default xoá sau extraction/confirmation. Redacted derivative cũng có retention rõ.
- Withdrawal stops future AI use; deletion removes derivatives/cache/audit payloads trong phạm vi pháp luật cho phép.
- Audit event ghi ai/luồng nào đọc category nào, không ghi chính giá trị nhạy cảm vào log vận hành.

## 9. Safety, privacy và AI governance

### 9.1 Data protection

Tại Việt Nam, Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 đã có hiệu lực từ 01/01/2026. Nghị định 13/2023 cũng xác định hình ảnh/số điện thoại là dữ liệu cá nhân và tình trạng sức khỏe/đặc điểm sinh học có thể là dữ liệu nhạy cảm; consent phải rõ loại dữ liệu, mục đích, bên xử lý và quyền của chủ thể. Vì vậy đây là P0 architecture, không phải polish sau cùng.

Yêu cầu sản phẩm:

- Data minimization và purpose limitation theo từng AI.
- Consent riêng trước khi chuyển ảnh/dữ liệu tới Gemini hoặc nhà cung cấp ở ngoài hệ thống.
- Export, correct, withdraw, delete; giải thích hậu quả của việc tắt từng purpose.
- Privacy impact assessment và kiểm tra chuyển dữ liệu xuyên biên giới trước production.

### 9.2 Exercise safety

- Hỏi dấu hiệu/triệu chứng và bệnh đã biết ở mức screening, không tự chẩn đoán.
- Khi user khai triệu chứng nguy hiểm/đau cấp: block vigorous recommendation, đưa safety message.
- Constraint theo vùng đau không tự biến thành rehab plan.
- “Professional note” chỉ là lời user nhập/chọn; nếu cần tài liệu y tế thật, đó là scope pháp lý khác.

### 9.3 Prompt/data leakage

- Không gửi full DOB, email, phone, raw image path, clinic name hay identifier vào prompt.
- Use pseudonymous interaction ID.
- Prompt injection từ OCR: toàn bộ text trên phiếu là untrusted data; parser chỉ lấy field allowlist, không cho nội dung OCR trở thành instruction.
- Output schema tách facts/insights/recommendations; validator chặn diagnosis language và field ngoài contract.

## 10. RRI challenge - đề xuất mặc định và quyết định cần Chủ nhà duyệt

| ID | Đề xuất mặc định | Mức |
|---|---|---|
| D-01 | InBody hoàn toàn optional; không chặn onboarding/workout | L3 product |
| D-02 | Ảnh gốc mặc định xoá sau khi user xác nhận extraction | L3 privacy |
| D-03 | Chỉ gửi bản đã che PII ra provider sau explicit consent | L3 privacy/architecture |
| D-04 | Không dùng InBody Score/calorie recommendation để tự động prescribe | L3 safety |
| D-05 | Một scan = baseline; trend cần ≥2 điểm có comparability | L3 product |
| D-06 | Thay 3 injury boolean bằng constraint model có region/side/severity/expiry | L3 architecture |
| D-07 | Readiness check có thể skip, hết hiệu lực sau buổi/ngày | L3 UX |
| D-08 | User có toggle riêng cho Planner, Coach và Weekly Report | L3 consent |
| D-09 | Trainer không xem health/body-comp nếu chưa có explicit scoped grant | L3 permissions |
| D-10 | Personalization giải thích được; mọi inference có “Không đúng/Sửa” | L3 UX/AI |

Các câu hỏi cần chốt trước BUILD:

1. Có muốn phục vụ user dưới 18 tuổi trong scope này không? Khuyến nghị P0 chỉ 18+ để tránh consent phức tạp.
2. Ảnh OCR sẽ dùng Gemini Vision hay provider/OCR khác? Chọn provider quyết định disclosure và data-transfer design.
3. Có cho trainer xem InBody/constraints không, hay chỉ user tự dùng ở Phase 1?
4. Có đưa tư vấn dinh dưỡng/calorie/macros vào scope không? Khuyến nghị tách khỏi P0; hiện chỉ diễn giải tracking.
5. Retention mong muốn cho measurement đã xác nhận và ảnh redacted là bao lâu?
6. Phạm vi launch: Việt Nam-only hay đa quốc gia? Điều này quyết định compliance matrix.

## 11. Requirements Matrix

| REQ | Requirement | Priority | Verification |
|---|---|---:|---|
| PER-001 | One typed/versioned personalization context | P0 | contract/unit test |
| PER-002 | Hard constraints run before any LLM | P0 | adversarial constraint tests |
| PER-003 | Progressive profile with explicit vs inferred data | P0 | UI/E2E + DB |
| PER-004 | Readiness check with expiry | P1 | time-bound behavior test |
| PER-005 | Explain factors used for every personalized output | P0 | contract/UI test |
| PER-006 | User can correct/disable learned preference | P0 | E2E |
| INB-001 | Optional manual entry or photo upload | P0 | E2E |
| INB-002 | PII redaction before external processing | P0 | image fixture/privacy test |
| INB-003 | Explicit per-purpose consent | P0 | consent audit test |
| INB-004 | OCR field confidence + bounding box + human review | P0 | extraction fixture/E2E |
| INB-005 | Raw image default deletion | P0 | lifecycle/integration test |
| INB-006 | Baseline vs trend comparability | P0 | unit tests |
| INB-007 | No medical diagnosis or automatic load from BIA | P0 | policy/adversarial test |
| INB-008 | Segmental values and device provenance | P1 | schema/API test |
| PRIV-001 | Owner-only RLS and scoped trainer grant | P0 | SQL policy tests |
| PRIV-002 | Export, correction, withdrawal and delete | P0 | E2E + audit |
| AI-001 | Minimal context subset per AI surface | P0 | context snapshots |
| AI-002 | No raw PII/image in prompts or interaction logs | P0 | log inspection tests |

## 12. Phased delivery và Task Graph

### P0 - Trustworthy personalization foundation

```text
TIP-P01 Data contract + enums
   ├── TIP-P02 DB/RLS/consent/storage lifecycle
   ├── TIP-P03 Profile IA + hard constraints UI
   └── TIP-P04 Context Builder + provenance
             ├── TIP-P05 Planner/substitute integration
             ├── TIP-P06 Coach/report integration
             └── TIP-P07 Explainability + correction loop

TIP-I01 InBody schema + manual entry
   └── TIP-I02 secure upload/redaction/consent
          └── TIP-I03 OCR typed extraction + review UI
                 └── TIP-I04 baseline insight + deletion/export

All P0 ──> TIP-Q01 privacy/security/AI safety verification
```

### P1 - Adaptive loop

- Readiness check-in and session-scoped adaptation.
- Body-composition trends/segmental display/comparability.
- Learned preferences and user correction.
- Scoped trainer sharing.
- Better feedback reasons for reject/substitute.

### P2 - only after evidence

- Wearable/sleep integrations.
- Nutrition module led by explicit product/legal scope.
- Multi-device BIA calibration guidance.
- Experimentation/personalization ranking model.

## 13. Acceptance and product metrics

### Quality/safety gates

- 0 hard-constraint violations in test corpus and production audit sample.
- 0 raw identifiers/raw image in AI prompt or `ai_interactions` fixtures.
- 100% externally processed scans have recorded provider/purpose consent.
- 100% OCR measurements require user confirmation before `confirmed` state.
- Delete/withdraw flow verified end-to-end, including derived artifacts/cache.
- AI fallback remains usable when no InBody/readiness/preferences exist.

### Product outcome metrics

- Workout draft edit rate and full-regeneration rate decrease without reducing completion.
- Recommendation accept/reject rate plus reject reasons.
- Workout completion/adherence and mid-session abandonment.
- Constraint/profile correction rate (signals wrong inference).
- InBody OCR correction rate by field and device model.
- Percentage of users who understand “why this changed” in usability testing.
- Retention of users with and without InBody; do not make InBody a paywall proxy for quality.

Không lấy PBF giảm, cân giảm hoặc InBody Score tăng làm product KPI mặc định; đây là outcome cá nhân, có thể không phù hợp mục tiêu và dễ tạo incentive nguy hiểm.

## 14. VERIFY plan trước khi ship

- Unit: context precedence/expiry, comparability, redaction patterns, schema/range/unit conversion.
- SQL: RLS owner separation, trainer grant expiry, consent withdrawal, cascading delete.
- Contract: each AI receives only permitted categories and structured output.
- Adversarial: OCR instruction injection, image with phone/ID, conflicting user prompt vs hard constraint, low-confidence OCR, duplicate scan, wrong units.
- E2E mobile/desktop: upload → redact → consent → OCR → correction → confirm → explain → disable → delete.
- Accessibility: keyboard, screen reader labels, no color-only state, zoom/large text.
- Operational: signed URL expiry, stuck extraction recovery, provider outage/manual fallback, retention job and audit counts.
- Usability: first-time gymer, daily user, power user, reluctant/body-sensitive user, trainer and accessibility user.

## 15. Decision recommendation

Phê duyệt hướng **Adaptive Profile + optional InBody baseline**, với P0 tập trung vào trust, consent, constraints và one-context architecture. Không xây “AI đọc InBody rồi tự lên giáo án” như một đường tắt độc lập; đó là thiết kế dễ sai nhất về sức khỏe, privacy và tính nhất quán của hệ thống.

Sau khi D-01…D-10 và 6 câu hỏi scope được duyệt, có thể tách P0 thành các TIP implementation chi tiết có Gherkin, file context và verification gate.

## Nguồn nghiên cứu chính

- InBody USA, Result Sheet Interpretation: https://inbodyusa.com/general/result-sheet/
- InBody USA, test preparation and consistency: https://inbodyusa.com/general/inbody-test/
- Coratella et al., BIA vs reference methods in athletes, systematic review: https://pubmed.ncbi.nlm.nih.gov/35067750/
- Dzator et al., BIA vs DXA in athletes, systematic review/meta-analysis: https://pubmed.ncbi.nlm.nih.gov/36853902/
- Larsen et al., autoregulation in resistance training: https://pubmed.ncbi.nlm.nih.gov/33520457/
- WHO Guidelines on physical activity and sedentary behaviour: https://www.who.int/publications/i/item/9789240015128
- ACSM/EIM preparticipation screening guide: https://acsm.org/wp-content/uploads/EIM-Health-Care-Providers-Action-Guide-clickable-links.pdf
- Quốc hội, Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15: https://thuvienso.quochoi.vn/handle/11742/103334
- Chính phủ, Nghị định 13/2023/NĐ-CP: https://vanban.chinhphu.vn/?docid=207759&pageid=27160

