# GymAI Coach — Basic Product & Technical Specification v0.1

## 1. Tổng quan sản phẩm

**GymAI Coach** là web responsive hỗ trợ người dùng quản lý quá trình tập gym và sử dụng AI như một **Personal Trainer cá nhân hóa**.

Sản phẩm không chỉ lưu lịch tập mà tạo thành vòng lặp:

```text
Lập kế hoạch
      ↓
Thực hiện buổi tập
      ↓
Ghi lại kết quả
      ↓
Phân tích
      ↓
Điều chỉnh
      ↓
Buổi tập tiếp theo
```

Mục tiêu giai đoạn đầu:

* Cá nhân sử dụng và trải nghiệm trước.
* Kiến trúc hỗ trợ nhiều user ngay từ đầu.
* Chưa tập trung SaaS/thanh toán.
* Responsive tốt trên mobile vì phần lớn việc logging diễn ra tại phòng gym.
* Không làm native mobile app ở giai đoạn hiện tại.

---

# 2. Mục tiêu chính

Hệ thống cần giải quyết 6 bài toán:

1. Quản lý lịch tập.
2. Quản lý thư viện bài tập.
3. Quản lý phòng gym và thiết bị.
4. Lập kế hoạch cho từng buổi tập.
5. Ghi lại quá trình tập.
6. Sử dụng AI để cá nhân hóa và tối ưu những buổi tiếp theo.

---

# 3. User Roles

## 3.1 User

User thông thường có thể:

* Quản lý hồ sơ.
* Chọn/tạo lịch tập.
* Tạo nhiều phòng gym.
* Khai báo equipment từng gym.
* Xem exercise library.
* Tạo exercise riêng.
* Generate workout bằng AI.
* Chỉnh workout.
* Ghi log.
* Xem lịch sử.
* Xem tiến độ.
* Nhận đề xuất AI.
* Accept hoặc Reject đề xuất của AI.

## 3.2 Admin

Admin có thể:

* Quản lý system exercises.
* Quản lý danh mục equipment.
* Quản lý muscle groups.
* Quản lý workout split template.
* Generate nội dung exercise bằng AI.
* Generate ảnh exercise.
* Generate video exercise.
* Review nội dung AI trước khi public.

---

# 4. Authentication

Hỗ trợ:

* Email + Password.
* Google Login.

Authentication sử dụng:

**Supabase Auth**

Supabase hỗ trợ password authentication và Google OAuth, đồng thời có hướng dẫn tích hợp trực tiếp với Next.js App Router.

---

# 5. User Profile

Mỗi user có:

```text
Tên
Avatar

Ngày sinh
Chiều cao
Cân nặng hiện tại

Đơn vị:
kg / lb

Kinh nghiệm:
Beginner
Intermediate
Advanced

Mục tiêu:
Tăng cơ
Tăng sức mạnh
Giảm mỡ
Duy trì thể lực

Số ngày muốn tập / tuần

Thời lượng mong muốn / buổi
Ví dụ:
45 phút
60 phút
75 phút
90 phút
```

Chưa quản lý:

* Chấn thương.
* Medical conditions.

---

# 6. Theo dõi cân nặng cơ thể

User có thể nhập:

```text
Ngày
Cân nặng
Ghi chú
```

Ví dụ:

```text
18/08
72.4kg

25/08
72.8kg

01/09
73.1kg
```

Dashboard hiển thị:

* Cân nặng hiện tại.
* Thay đổi 7 ngày.
* Thay đổi 30 ngày.
* Biểu đồ.

---

# 7. Workout Program

Có hai loại:

## 7.1 System Template

Admin cung cấp sẵn.

Ví dụ:

```text
Upper / Lower

Push Pull Legs

PPL + Upper Lower

Full Body

Bro Split

Arnold Split
```

---

## 7.2 Custom Program

User có thể tự tạo.

Ví dụ:

```text
Lịch của Hoàng

T2   Push
T3   Pull
T4   Legs
T5   Nghỉ
T6   Upper
T7   Lower
CN   Nghỉ
```

---

# 8. Program Day

Một ngày tập không bắt buộc chứa exercise cố định.

Nó định nghĩa:

```text
Tên ngày:
Push

Nhóm cơ mục tiêu:
Ngực
Vai
Tay sau

Volume mong muốn:
Ngực      8 set
Vai       5 set
Tay sau   4 set
```

Sau đó AI sẽ lựa chọn exercise cụ thể.

Điều này giúp cùng một Push Day nhưng:

```text
VinUni Gym
```

có workout khác:

```text
Home Gym
```

---

# 9. Exercise Library

Có hai loại exercise.

## 9.1 System Exercise

Do Admin quản lý.

User:

* Xem.
* Sử dụng trong workout.
* Không sửa trực tiếp.

Có thể:

> Sao chép thành bài tập cá nhân.

---

## 9.2 Custom Exercise

User tự tạo.

Chỉ user đó sử dụng.

---

# 10. Exercise Data

Mỗi bài tập nên có:

```text
Tên tiếng Anh
Tên tiếng Việt

Slug

Mô tả

Nhóm cơ chính

Nhóm cơ phụ

Equipment cần thiết

Loại bài:
Compound
Isolation

Độ khó:
Beginner
Intermediate
Advanced

Hướng dẫn thực hiện

Tips

Lỗi thường gặp

Video

Ảnh

Exercise thay thế

Trạng thái:
Draft
Published
Archived
```

---

# 11. Exercise Detail Page

Ví dụ:

# Barbell Bench Press

### Nhóm cơ chính

Ngực

### Nhóm cơ phụ

* Tay sau
* Vai trước

### Thiết bị

* Barbell
* Bench
* Weight Plates

### Cách thực hiện

```text
1. Nằm trên ghế.
2. Đặt chân chắc chắn trên sàn.
3. Retract scapula.
4. Nắm thanh đòn.
5. Hạ thanh xuống vùng ngực.
6. Đẩy thanh lên.
```

### RIR đề xuất

```text
1–3 RIR
```

### Video

Video hướng dẫn.

### Hình ảnh

Ảnh minh họa.

### Lỗi thường gặp

* Flare elbow quá nhiều.
* Nhấc hông khỏi ghế.
* Bounce bar trên ngực.

---

# 12. AI tạo nội dung Exercise

Chỉ **Admin** sử dụng.

Flow:

```text
Admin tạo Exercise
        ↓
Nhập tên bài
        ↓
AI Generate Content
        ↓
AI tạo:
- Description
- Muscle
- Equipment
- Instructions
- Tips
- Common mistakes
        ↓
Admin review
        ↓
Generate image/video nếu cần
        ↓
Publish
```

Text generation dùng:

```text
gemini-3.5-flash-lite
```

Google hiện liệt kê `gemini-3.5-flash-lite` là model stable, tập trung vào tốc độ, chi phí thấp và high-throughput execution.

---

# 13. AI Image

Không dùng Gemini 3.5 Flash-Lite để generate ảnh.

Đề xuất:

```text
gemini-3.1-flash-lite-image
```

hoặc:

```text
gemini-3.1-flash-image
```

Google hiện cung cấp Nano Banana 2 Lite cho generation chi phí/latency thấp và Nano Banana 2 cho chất lượng cao hơn.

### MVP

Ưu tiên:

```text
gemini-3.1-flash-lite-image
```

---

# 14. AI Video

Video exercise chỉ Admin generate.

Không generate tự động cho toàn bộ exercises.

Flow:

```text
Exercise
 ↓
Admin
 ↓
Generate Video
 ↓
AI Video Job
 ↓
Review
 ↓
Approve
 ↓
Storage
```

Có thể dùng Veo 3.1 family khi cần video generation. Gemini API hiện cung cấp Veo riêng cho video thay vì sử dụng model text chính.

**Video AI không phải feature bắt buộc của MVP đầu tiên.**

---

# 15. Equipment Library

Admin quản lý equipment chuẩn.

Ví dụ:

```text
Dumbbell
Barbell
Bench
Cable Machine
Smith Machine
Lat Pulldown
Leg Press
Leg Extension
Leg Curl
Hack Squat
Squat Rack
Pull-up Bar
EZ Bar
Chest Press Machine
Pec Deck
```

Exercise liên kết với equipment.

Quan hệ:

```text
Exercise
    ↓
Exercise Equipment
    ↓
Equipment
```

---

# 16. Gym Management

User có thể tạo nhiều gym.

Ví dụ:

```text
VinUni Gym

Gym gần nhà

Home Gym
```

Mỗi Gym có:

```text
Tên
Mô tả
Equipment
Note
```

---

# 17. Gym Equipment

Ví dụ:

## VinUni Gym

```text
Dumbbell          ✓
Barbell           ✓
Bench             ✓
Cable             ✓
Smith Machine     ✓
Leg Press         ✓
Leg Extension     ✓
Hack Squat        ✗
```

Thông tin này được sử dụng khi AI tạo workout.

---

# 18. Daily Workout Flow

Luồng chính:

```text
User vào Dashboard
        ↓
Hệ thống xác định hôm nay:
Upper Day
        ↓
User chọn Gym
        ↓
VinUni Gym
        ↓
Generate với AI
        ↓
Constraint Engine lọc bài
        ↓
AI tạo Workout
        ↓
User Review
        ↓
Accept
        ↓
Start Workout
```

---

# 19. Constraint Engine

AI không được tự do chọn mọi exercise.

Backend lọc trước:

```text
Workout Day
        ↓
Muscle target
        ↓
Equipment available
        ↓
Exercise Library
        ↓
User preferences
        ↓
Previous performance
        ↓
Candidate exercises
```

Ví dụ:

```text
Push Day

Chest
Shoulder
Triceps

Gym:
VinUni Gym

Equipment:
Barbell
Dumbbell
Cable
```

Candidate:

```text
Bench Press
Incline DB Press
Cable Fly
Shoulder Press
Lateral Raise
Triceps Pushdown
```

Sau đó mới đưa cho Gemini.

---

# 20. AI Architecture

Có đầy đủ **3 AI Layer**.

---

## Layer 1 — AI Workout Planner

Input:

```text
User Goal

Experience

Workout Split

Training Day

Gym

Equipment

Time Available
```

Output:

```text
Exercises
Sets
Rep range
Weight recommendation
Rest time
Exercise order
```

---

# 21. Layer 2 — Personalized AI

Sử dụng thêm:

```text
Previous workouts

Weight

Reps

RIR

Progress

Exercise preferences

Body weight

Performance trend
```

Ví dụ:

```text
Bench Press

Previous:
60kg

8
8
8
8

RIR:
3
2
2
2
```

System có thể suggest:

```text
62.5kg
6–8 reps
```

---

# 22. Layer 3 — AI Coach

Theo dõi nhiều tuần.

Có thể phát hiện:

```text
Plateau

Progress

Volume quá thấp

Volume quá cao

Exercise không tiến bộ

Strength tăng

Buổi tập thường xuyên không hoàn thành
```

Ví dụ:

> Bench Press đã đạt 10 reps ở tất cả working sets trong 2 buổi gần nhất.

Đề xuất:

> Tăng từ 60kg → 62.5kg.

---

# 23. AI không tự sửa lịch

Nguyên tắc quan trọng:

```text
AI Suggest
     ↓
User Review
     ↓
Accept / Reject
```

AI không được:

```text
Tự tăng tạ
Tự đổi exercise
Tự đổi lịch
Tự đổi volume
```

mà không có user confirmation.

---

# 24. Recommendation Engine

Không để LLM tự quyết định toàn bộ.

Kiến trúc:

```text
Training Data
      ↓
Rule Engine
      ↓
Recommendation
      ↓
Gemini
      ↓
Explanation
```

Ví dụ:

```text
Target:
8–10 reps

Actual:
10
10
10

RIR:
2
2
1
```

Rule Engine:

```text
eligible_for_progression = true
```

Gemini:

> Bạn đã đạt giới hạn trên của rep range ở cả 3 set. Buổi tới có thể tăng mức tạ khoảng 2.5kg.

---

# 25. Progressive Overload

Rule cơ bản:

```text
Nếu hoàn thành tất cả set
+
reps >= upper rep range
+
RIR hợp lý

→ suggest tăng weight
```

Ví dụ:

```text
3 × 8–10

60kg

10
10
10

RIR 2
```

→ đề xuất tăng.

---

Nếu:

```text
8
7
5

RIR:
1
0
0
```

→ giữ hoặc giảm intensity.

---

# 26. Workout Logger

Đây là màn hình ưu tiên mobile.

Mỗi bài tập có:

```text
Tên bài tập

Previous Performance

Target
```

Ví dụ:

```text
Bench Press

Buổi trước:
60kg × 8
60kg × 8
60kg × 7

Hôm nay:
62.5kg
6–8 reps
4 set
```

---

# 27. Dữ liệu từng set

User nhập:

### Mức tạ

Khối lượng sử dụng cho set.

Ví dụ:

```text
62.5kg
```

### Số lần

Số lần thực hiện thành công.

Ví dụ:

```text
8 reps
```

### RIR

**Reps In Reserve — số lần bạn cảm thấy vẫn còn có thể thực hiện thêm với kỹ thuật đúng trước khi thất bại.**

Ví dụ:

```text
RIR 3
Có thể làm thêm khoảng 3 reps.

RIR 2
Có thể làm thêm khoảng 2 reps.

RIR 1
Có thể làm thêm khoảng 1 rep.

RIR 0
Không thể thực hiện thêm rep đúng kỹ thuật.
```

UI nên có tooltip giải thích.

---

# 28. Loại Set

UI dùng tiếng Việt.

### Khởi động

Set nhẹ để:

* Làm nóng.
* Chuẩn bị cơ.
* Làm quen chuyển động.

Không tính như working volume chính.

---

### Set chính

Set tập luyện chính của exercise.

Được sử dụng khi tính:

```text
Volume
Progress
Performance
```

---

### Drop Set

Sau một set:

* Giảm mức tạ.
* Tiếp tục thực hiện reps.

---

### Đến thất bại

User thực hiện cho đến khi không thể hoàn thành thêm rep đúng kỹ thuật.

---

# 29. Note

Optional.

Ví dụ:

```text
Set cuối hơi đau cổ tay.

Form tốt.

Máy hơi khác gym trước.

Có thể tăng tạ buổi sau.
```

---

# 30. Rest Timer

Sau khi user hoàn thành một set:

```text
Complete Set
      ↓
Start Timer
```

Ví dụ:

```text
02:00

01:59
01:58
...
```

User có thể:

```text
+30 giây

Bỏ qua

Pause
```

Exercise có default rest:

```text
Bench Press
180s

Lateral Raise
90s
```

AI có thể recommend rest duration.

---

# 31. Workout Completion

Sau khi hoàn thành:

```text
Workout completed
```

Hiển thị:

```text
Duration

Exercises

Total Sets

Total Reps

Training Volume

Personal Records
```

---

# 32. Workout Feedback

Sau buổi tập:

### Độ khó

```text
1 — Rất dễ

2 — Dễ

3 — Vừa

4 — Khó

5 — Rất khó
```

### Năng lượng

```text
1 — Rất thấp
...
5 — Rất tốt
```

### Chất lượng buổi tập

```text
1–5
```

### Note

Optional.

---

# 33. Dashboard

Desktop:

```text
Sidebar
+
Main Dashboard
```

Mobile:

```text
Bottom navigation
```

Dashboard gồm:

### Buổi tập hôm nay

```text
Upper

VinUni Gym

75 phút

[ Tạo buổi tập với AI ]
```

### Weekly Schedule

```text
T2 Upper ✓

T3 Lower ✓

T4 Rest

T5 Upper

T6 Lower
```

### AI Coach

```text
Bench Press

+6.4% trong 4 tuần

Đề xuất:
Tăng lên 62.5kg.
```

### Body Weight

Graph.

### Training Volume

Graph theo muscle group.

---

# 34. Các màn hình chính

## Public

```text
/login

/register

/forgot-password
```

## User

```text
/dashboard

/workout/today

/workout/[id]

/workout/[id]/active

/workout/history

/programs

/programs/[id]

/exercises

/exercises/[id]

/gyms

/gyms/[id]

/progress

/ai-coach

/profile

/settings
```

## Admin

```text
/admin

/admin/exercises

/admin/exercises/new

/admin/equipment

/admin/muscles

/admin/programs

/admin/ai-content
```

---

# 35. Mobile UX

Workout Logger phải thiết kế mobile-first.

Một màn hình tập:

```text
← Bench Press

Exercise 1 / 6

Target
62.5kg
6–8 reps

Previous
60kg × 8
60kg × 8
60kg × 7

----------------

Set 1

Tạ
[ 62.5 ]

Reps
[ 8 ]

RIR
[ 2 ]

Loại set
[ Set chính ▼ ]

Ghi chú
[...................]

[ ✓ Hoàn thành set ]

----------------

Rest

01:47
```

Các button phải đủ lớn để thao tác khi đang tập.

---

# 36. Database Core

Sử dụng PostgreSQL trong Supabase.

Core entities:

```text
auth.users

profiles

body_weight_logs

muscles

equipment

exercises

exercise_muscles

exercise_equipment

exercise_media

exercise_alternatives

gyms

gym_equipment

training_programs

training_program_days

training_day_targets

user_programs

workouts

workout_exercises

workout_sets

workout_feedback

exercise_user_stats

personal_records

ai_recommendations

ai_interactions
```

---

# 37. profiles

```text
id

user_id

display_name

avatar_url

birthday

height_cm

current_weight_kg

unit_system

experience_level

goal

preferred_training_days

preferred_session_duration

created_at

updated_at
```

---

# 38. exercises

```text
id

owner_user_id nullable

type
SYSTEM
CUSTOM

name

name_vi

slug

description

difficulty

exercise_type

instructions

tips

common_mistakes

status

created_at
```

Nếu:

```text
owner_user_id = null
```

→ System Exercise.

---

# 39. workouts

```text
id

user_id

training_program_day_id

gym_id

date

status

planned_duration

started_at

completed_at

ai_generated

created_at
```

---

# 40. workout_exercises

```text
id

workout_id

exercise_id

order_index

target_sets

target_rep_min

target_rep_max

target_weight

target_rir

rest_seconds

ai_reason
```

---

# 41. workout_sets

```text
id

workout_exercise_id

set_number

weight

reps

rir

set_type

note

completed

completed_at
```

`set_type`:

```text
WARMUP

WORKING

DROP

FAILURE
```

UI translate:

```text
Khởi động

Set chính

Drop Set

Đến thất bại
```

---

# 42. AI Recommendation

Table:

```text
ai_recommendations
```

Fields:

```text
id

user_id

recommendation_type

target_type

target_id

current_value

suggested_value

reason

confidence

status

created_at

reviewed_at
```

Status:

```text
PENDING

ACCEPTED

REJECTED
```

---

# 43. AI Model

Primary AI:

```text
Gemini 3.5 Flash-Lite
```

Model endpoint:

```text
gemini-3.5-flash-lite
```

Dùng cho:

* Workout generation.
* Recommendation.
* Workout analysis.
* Weekly review.
* Exercise description.
* AI Coach.
* Exercise substitution.
* Explanation.

Google hiện khuyến nghị Interactions API cho các project Gemini mới; API `generateContent` cũ vẫn tiếp tục được hỗ trợ.

---

# 44. Structured Output

AI không nên trả plain text cho Planner.

Output phải theo schema.

Ví dụ:

```json
{
  "workout": {
    "name": "Upper",
    "estimatedDuration": 75,
    "exercises": [
      {
        "exerciseId": "uuid",
        "sets": 4,
        "repMin": 6,
        "repMax": 8,
        "weight": 62.5,
        "rir": 2,
        "restSeconds": 180,
        "reason": "..."
      }
    ]
  }
}
```

Backend validate trước khi lưu database.

---

# 45. AI Context Builder

Không gửi toàn bộ database cho Gemini.

Backend tạo context có kiểm soát.

```text
User Profile

+

Today's Training Day

+

Available Equipment

+

Candidate Exercises

+

Recent Exercise Performance

+

Body Weight Trend

+

Recent Workout Feedback
```

→ Gemini.

---

# 46. AI Memory

Không để chatbot tự quản lý memory.

Memory lấy từ structured database.

Ví dụ:

```text
Bench Press

Current working weight:
62.5kg

Last 5 sessions:
...

Trend:
Improving
```

AI nhận context khi cần.

---

# 47. AI Coach Chat

User có thể hỏi:

> Hôm nay tôi thấy yếu hơn bình thường, có nên giảm tạ không?

AI được cung cấp:

```text
User profile

Today's workout

Previous performance

Recent training

Body weight trend
```

AI trả lời trong context của user.

Không có Voice Live ở MVP.

---

# 48. Exercise Replacement

Trong Workout:

```text
Lat Pulldown

[ Đổi bài ]
```

Backend tìm:

```text
Primary muscle giống nhau

+

Equipment hiện có

+

Không trùng exercise

+

Phù hợp day target
```

AI rank candidates.

Ví dụ:

```text
Lat Pulldown
↓
Chest Supported Row

Single Arm Cable Pulldown

Pull Up
```

User chọn.

---

# 49. Tech Stack

## Frontend

```text
Next.js
TypeScript
React
```

## UI

```text
Tailwind CSS
shadcn/ui
Lucide Icons
```

## Charts

```text
Recharts
```

## Backend

Không tách FastAPI ở MVP.

```text
Next.js
Route Handlers
Server Actions
```

---

# 50. Hosting

```text
Cloudflare Workers
```

Next.js có thể deploy lên Cloudflare Workers thông qua OpenNext adapter. Cloudflare hiện hỗ trợ App Router, Route Handlers, Server Components, SSR, Server Actions và response streaming.

Deployment:

```text
Next.js
   ↓
OpenNext
   ↓
Cloudflare Workers
```

---

# 51. Database

```text
Supabase PostgreSQL
```

---

# 52. Authentication

```text
Supabase Auth
```

Providers:

```text
Email / Password

Google OAuth
```

---

# 53. Storage

```text
Supabase Storage
```

Lưu:

```text
Avatar

Exercise Images

Exercise Videos

Custom exercise media
```

---

# 54. AI

```text
Google Gemini API
```

Primary:

```text
gemini-3.5-flash-lite
```

Media:

```text
Image
gemini-3.1-flash-lite-image
```

Video:

```text
Veo
```

Video generation có thể triển khai sau.

---

# 55. Architecture

```text
                   USER
                     │
                     ▼
                Next.js UI
                     │
              Cloudflare Workers
                     │
       ┌─────────────┼─────────────┐
       │             │             │
       ▼             ▼             ▼
   Supabase       Gemini API     Storage
       │
       ▼
  PostgreSQL
```

AI Flow:

```text
Request
   ↓
Next.js Backend
   ↓
Auth
   ↓
Fetch User Context
   ↓
Constraint Engine
   ↓
Gemini 3.5 Flash-Lite
   ↓
Structured JSON
   ↓
Validate
   ↓
Save
   ↓
Return UI
```

---

# 56. Security

Bắt buộc sử dụng:

```text
Supabase Row Level Security
```

User A không được đọc:

```text
workout
gym
body weight
AI history
```

của User B.

Admin được phân quyền riêng.

Gemini API Key:

**Không bao giờ expose ra browser.**

Flow:

```text
Browser
 ↓
Server
 ↓
Gemini
```

---

# 57. MVP Scope — Phase 1

Ưu tiên làm hoàn chỉnh core loop.

### Authentication

* Email.
* Password.
* Google.

### Profile

* Onboarding.
* Goal.
* Experience.
* Height.
* Weight.
* Training frequency.
* Session duration.

### Exercise

* System exercise.
* Custom exercise.
* Search.
* Filter.
* Detail.

### Gym

* Create gym.
* Edit gym.
* Equipment.

### Program

* Templates.
* Custom split.
* Weekly schedule.

### Workout

* Generate AI.
* Edit plan.
* Start.
* Log.
* Rest timer.
* Finish.

### AI

Full 3 layers ở mức cơ bản:

```text
Planner
Personalization
Coach
```

### Progress

* Weight history.
* Workout history.
* Exercise progress.
* Volume.
* Estimated 1RM.

---

# 58. Phase 2

Sau khi trải nghiệm MVP:

```text
Advanced AI Coach

Plateau Detection

Deload Suggestion

Advanced Volume Management

PR Detection

Exercise Preference Learning

Exercise AI Images

AI Exercise Content Admin

Weekly AI Report
```

---

# 59. Phase 3

Nếu phát triển thành sản phẩm:

```text
AI video exercise

Social

Trainer account

Coach dashboard

Program marketplace

Gym database

Subscription

Payments

Push notifications

PWA

Voice AI
```

---

# 60. Core MVP User Journey

Đây là flow quan trọng nhất phải chạy hoàn chỉnh:

```text
Đăng ký
   ↓
Onboarding
   ↓
Chọn PPL + UL
   ↓
Tạo VinUni Gym
   ↓
Chọn equipment
   ↓
Hôm nay = Push
   ↓
Chọn VinUni Gym
   ↓
AI Generate
   ↓
Review Workout
   ↓
Accept
   ↓
Start
   ↓
Log Weight + Reps + RIR
   ↓
Rest Timer
   ↓
Exercise tiếp theo
   ↓
Finish Workout
   ↓
Feedback
   ↓
AI Analyze
   ↓
Recommendation
   ↓
User Accept / Reject
   ↓
Buổi sau AI sử dụng dữ liệu mới
```

Nếu flow này hoạt động tốt, MVP đã chứng minh được core value của sản phẩm.

---

# 61. Nguyên tắc kiến trúc quan trọng

**AI không phải database.**

PostgreSQL giữ trạng thái thật.

**AI không phải rule engine.**

Backend xử lý constraint và progression rule.

**AI không tự sửa dữ liệu quan trọng.**

User phải Accept.

**AI không được tự bịa exercise.**

Chỉ chọn từ candidate exercise IDs do backend cung cấp.

**AI phải trả structured output.**

Backend validate trước khi lưu.

---

# 62. Giá trị cốt lõi của sản phẩm

GymAI Coach không nên được định vị đơn giản là:

> AI tạo lịch tập gym.

Mà là:

> **AI Personal Trainer hiểu lịch tập, lịch sử tiến bộ, mức tạ, RIR, cân nặng cơ thể và thiết bị của phòng gym bạn đang tập để xây dựng và liên tục điều chỉnh từng buổi tập.**

Core loop:

```text
PLAN
 ↓
TRAIN
 ↓
LOG
 ↓
LEARN
 ↓
ADAPT
 ↓
PLAN
```

Đây sẽ là nền tảng cho toàn bộ sản phẩm.
