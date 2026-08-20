# GymAI Coach — UI/UX Design Specification v0.1

## 1. Mục tiêu tài liệu

Tài liệu này định nghĩa cách xây dựng giao diện cho **GymAI Coach**.

Mục tiêu:

* Giao diện có cá tính riêng, không giống dashboard SaaS thông thường.
* Responsive tốt trên desktop và mobile.
* Mobile ưu tiên cho quá trình tập và ghi log.
* Desktop ưu tiên quản lý, phân tích và lập kế hoạch.
* Component tái sử dụng được.
* Có design token thống nhất.
* Dễ triển khai bằng Next.js + Tailwind + shadcn/ui.
* Giữ phong cách **Industrial Skeuomorphism** xuyên suốt toàn bộ ứng dụng.

---

# 2. Design Direction

## Concept

GymAI Coach được hình dung như một:

> **Smart Training Control System**

Thay vì giao diện fitness nhiều gradient, glassmorphism hoặc neon, sản phẩm mang cảm giác giống:

* bảng điều khiển máy,
* thiết bị công nghiệp,
* thiết bị đo hiệu suất,
* bộ điều khiển phòng gym thông minh.

UI cần truyền tải:

```text
Precision
Control
Strength
Mechanical
Reliable
Tactile
Technical
```

Không nên truyền tải cảm giác:

```text
Gaming
Crypto
Cyberpunk
Generic SaaS
Social fitness app
```

---

# 3. Design Philosophy

Phong cách chính:

# Industrial Skeuomorphism

Các component không nên trông như những hình chữ nhật phẳng.

Mỗi element cần có cảm giác:

```text
Raised
Recessed
Pressed
Mounted
Bolted
Mechanical
```

Hệ thống dùng ánh sáng giả lập từ:

```text
Top Left
45°
```

Do đó:

* Highlight nằm phía trên/trái.
* Shadow nằm phía dưới/phải.

Mọi component phải tuân thủ cùng hướng ánh sáng.

---

# 4. Elevation System

UI có 4 level.

## Level -1 — Recessed

Các thành phần lõm xuống bề mặt.

Dùng cho:

```text
Input
Search
Workout logger input
Timer screen
Weight input
Rep input
RIR selector
Charts screen
```

Visual:

```text
Inner shadow
Darker background
```

---

## Level 0 — Chassis

Lớp nền chính.

```text
App Background
Dashboard Background
Workout Background
```

Màu:

```css
#e0e5ec
```

---

## Level +1 — Panel

Dùng cho:

```text
Cards
Dashboard modules
Workout modules
Exercise cards
AI recommendation cards
Gym cards
```

Có dual shadow tạo cảm giác nổi.

---

## Level +2 — Control

Các thành phần tương tác nổi bật.

Ví dụ:

```text
Start Workout
Generate with AI
Complete Set
Save
Accept AI Suggestion
```

Có shadow mạnh hơn Level +1.

---

# 5. Color System

## Background

### Main Chassis

```css
--background: #e0e5ec;
```

Dùng làm background toàn bộ app.

---

### Raised Panel

```css
--panel: #f0f2f5;
```

Dùng cho một số panel cần contrast.

---

### Recessed Area

```css
--muted: #d1d9e6;
```

Dùng cho:

* Input.
* Screen.
* Timer.
* Search.
* Table header.
* Log field.

---

# 6. Typography Colors

### Primary Text

```css
--text-primary: #2d3436;
```

Dùng cho:

* Heading.
* Exercise name.
* Workout title.
* Main metric.

---

### Secondary Text

```css
--text-muted: #4a5568;
```

Dùng cho:

* Labels.
* Metadata.
* Descriptions.
* Previous workout.

---

# 7. Brand Accent

Accent chính:

```css
--accent: #ff4757;
```

Màu này được sử dụng hạn chế.

Chỉ dùng cho:

```text
Primary CTA
Active state
AI trigger
Active LED
Important metric
Warning
Critical action
Selected item
```

Không được phủ đỏ toàn giao diện.

Accent phải có cảm giác giống:

> Emergency / mechanical control button.

---

# 8. Functional Colors

Ngoài màu accent cần các màu trạng thái.

### Success

```css
#22c55e
```

Dùng cho:

```text
Workout Completed
PR
Progress
Online
Success
```

---

### Warning

```css
#f59e0b
```

Dùng cho:

```text
Plateau
Recovery warning
Incomplete workout
```

---

### Error

```css
#ef4444
```

Dùng cho:

```text
Validation
Workout issue
Failed generation
```

---

### Information

```css
#3b82f6
```

Dùng cho:

```text
AI insight
Technical information
Neutral recommendation
```

---

# 9. Typography

## Primary Font

```text
Inter
```

Dùng cho:

```text
Heading
Body
Navigation
Exercise name
Buttons
Descriptions
```

Weights:

```text
400
500
600
700
800
```

---

## Technical Font

```text
JetBrains Mono
```

Dùng cho số liệu.

Ví dụ:

```text
62.5 KG

08 REPS

RIR 2

01:45

8,420 KG

92.5 KG 1RM
```

Ngoài ra dùng cho metadata:

```text
SESSION ACTIVE

SET 03

SYSTEM READY

AI ANALYSIS

WORKOUT #124
```

Việc dùng Inter cho UI chính và JetBrains Mono cho dữ liệu kỹ thuật bám theo typography system của design prompt gốc.

---

# 10. Typography Hierarchy

## Page title

Desktop:

```text
32–40px
700
```

Mobile:

```text
26–32px
700
```

---

## Dashboard Metric

```text
32–48px
JetBrains Mono
700
```

Ví dụ:

```text
92.5 KG
```

---

## Card Title

```text
18–20px
600–700
```

---

## Body

```text
16px
400–500
line-height 1.6
```

Không dùng text nhỏ hơn 16px cho nội dung quan trọng trên mobile.

---

## Technical Label

```text
12–13px
JetBrains Mono
700
uppercase
letter spacing .05em
```

Ví dụ:

```text
CURRENT WORKOUT
PREVIOUS SESSION
AI RECOMMENDATION
```

---

# 11. Border Radius

Dùng scale cố định:

```text
4px   Small technical badge
8px   Input / button nhỏ
16px  Standard card
24px  Large module
30px  Hero / workout panel
999px Circular indicator
```

Các bo góc nên mềm giống vỏ nhựa injection molded thay vì kim loại sắc cạnh.

---

# 12. Shadow System

Đây là thành phần quan trọng nhất.

## Raised Card

```css
box-shadow:
8px 8px 16px #babecc,
-8px -8px 16px #ffffff;
```

---

## Floating Control

```css
box-shadow:
12px 12px 24px #babecc,
-12px -12px 24px #ffffff,
inset 1px 1px 0 rgba(255,255,255,.5);
```

---

## Pressed

```css
box-shadow:
inset 6px 6px 12px #babecc,
inset -6px -6px 12px #ffffff;
```

---

## Recessed

```css
box-shadow:
inset 4px 4px 8px #babecc,
inset -4px -4px 8px #ffffff;
```

Những shadow này phải dùng qua token thay vì viết lại từng component. Đây cũng là core visual signature của design system gốc.

---

# 13. Proposed CSS Tokens

```css
:root {
  --background: #e0e5ec;
  --panel: #f0f2f5;
  --muted: #d1d9e6;

  --text-primary: #2d3436;
  --text-secondary: #4a5568;

  --accent: #ff4757;
  --accent-foreground: #ffffff;

  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;

  --shadow-dark: #babecc;
  --shadow-light: #ffffff;

  --shadow-card:
    8px 8px 16px #babecc,
    -8px -8px 16px #ffffff;

  --shadow-floating:
    12px 12px 24px #babecc,
    -12px -12px 24px #ffffff;

  --shadow-recessed:
    inset 4px 4px 8px #babecc,
    inset -4px -4px 8px #ffffff;

  --shadow-pressed:
    inset 6px 6px 12px #babecc,
    inset -6px -6px 12px #ffffff;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-xl: 24px;
}
```

---

# 14. Icon System

Sử dụng duy nhất:

```text
lucide-react
```

Không trộn nhiều icon library.

---

## Icon sizes

```text
16–18px inline

20–24px navigation

28–32px feature

32–40px main action
```

---

## Icon Housing

Icon quan trọng không đứng một mình.

Ví dụ:

```text
[ Raised circular housing ]
           ↓
         icon
```

Ví dụ AI:

```text
◉ Sparkles
AI COACH
```

Ví dụ workout:

```text
◉ Dumbbell
WORKOUT
```

Lucide được quy định là icon library chính trong design system nguồn.

---

# 15. Navigation Architecture

## Desktop

Layout:

```text
┌───────────┬─────────────────────────────┐
│           │                             │
│ SIDEBAR   │          CONTENT            │
│           │                             │
│           │                             │
└───────────┴─────────────────────────────┘
```

Sidebar width:

```text
240–260px
```

---

## Navigation Items

```text
Tổng quan

Buổi tập hôm nay

Lịch tập

Bài tập

Phòng tập

Tiến độ

AI Coach

Lịch sử
```

Bottom:

```text
Profile

Settings
```

---

# 16. Sidebar Visual

Sidebar không cần một panel trắng tách biệt mạnh.

Có thể cùng material với chassis.

Active item:

```text
Pressed surface

+

Accent LED
```

Ví dụ:

```text
● TỔNG QUAN
```

LED đỏ nhỏ phía trái.

---

# 17. Mobile Navigation

Trong mobile ưu tiên:

```text
Bottom Navigation
```

5 item:

```text
Home

Lịch

Tập

Progress

AI
```

`Tập` là action trung tâm.

Có thể làm button nổi vật lý:

```text
   ┌───┐
   │ ● │
───┴───┴───
```

Tap mở:

```text
Workout Today
```

---

# 18. Dashboard Layout

## Desktop

```text
┌────────────────────────────────────────────┐
│ GOOD AFTERNOON                       USER  │
├──────────────────────────┬─────────────────┤
│                          │                 │
│ TODAY WORKOUT            │ GYM             │
│                          │                 │
├──────────────────────────┼─────────────────┤
│ WEEK SCHEDULE            │ AI COACH        │
├──────────────────────────┴─────────────────┤
│                                            │
│ PROGRESS                                   │
│                                            │
├───────────────────────┬────────────────────┤
│ WEIGHT                │ WEEKLY VOLUME      │
└───────────────────────┴────────────────────┘
```

---

# 19. Dashboard — Hero Module

Hero chính:

```text
TODAY'S SESSION
```

Hiển thị:

```text
Upper Day

VinUni Gym

75 MIN

6 Exercises

21 Sets
```

Primary action:

```text
GENERATE WITH AI
```

hoặc nếu đã có workout:

```text
START WORKOUT
```

---

# 20. Workout Hero Visual

Không sử dụng ảnh bodybuilder stock.

Nên thiết kế giống:

```text
Training Control Module
```

Ví dụ:

```text
┌───────────────────────┐
│ ● SYSTEM READY        │
│                       │
│ UPPER                 │
│                       │
│ 06 EXERCISES          │
│ 21 SETS               │
│ 75 MIN                │
│                       │
│ [ START WORKOUT ]     │
└───────────────────────┘
```

Có:

* Screw details.
* LED.
* Vent slots.
* Physical button.

---

# 21. Card Component

Base component:

```text
IndustrialCard
```

Props:

```ts
variant:
"default"
"raised"
"technical"
"dark"

interactive?: boolean

screws?: boolean

vents?: boolean
```

---

# 22. Card Manufacturing Details

Desktop cards quan trọng có thể thêm:

```text
• Corner screws
• Vent slots
• Small technical labels
```

Ví dụ:

```text
●──────────────────────●
│                      │
│ WORKOUT VOLUME       │
│                      │
│     8,420 KG         │
│                      │
●──────────────────────●
```

Screw heads và vent slots là signature detail được yêu cầu rõ trong design prompt.

Không cần thêm screws vào mọi card nhỏ trên mobile để tránh visual noise.

---

# 23. Button System

## Primary

Ví dụ:

```text
START WORKOUT

GENERATE WITH AI

COMPLETE SET

ACCEPT
```

Visual:

```text
Safety Red
Raised
Physical
```

---

## Interaction

### Default

Button nổi.

### Hover

```text
slightly elevated
brightness +5–10%
```

### Active

```text
translateY(2px)
```

Shadow đổi sang inset.

Button phải thật sự có cảm giác được nhấn xuống.

---

# 24. Mobile Touch Target

Mọi interactive element:

```text
minimum 48px
```

Workout action:

```text
56px
```

Primary action có thể:

```text
60px
```

Design prompt gốc cũng yêu cầu tối thiểu 48px cho control trên mobile.

---

# 25. Input System

Input cần trông như một khe dữ liệu.

Không dùng border truyền thống.

Ví dụ:

```text
TẠ

┌────────────────┐
│    62.5 KG     │
└────────────────┘
```

Input:

```text
recessed
JetBrains Mono
large numeric display
```

---

# 26. Workout Logger — UX Priority

Đây là màn hình quan trọng nhất trên mobile.

Design phải cho phép thao tác:

```text
1 tay
đang đứng
giữa set
mồ hôi
ít thời gian
```

Do đó:

* Không quá nhiều field cùng lúc.
* Number input lớn.
* CTA cố định dễ bấm.
* Previous workout luôn nhìn thấy.
* Rest timer tự bật.

---

# 27. Mobile Workout Screen

```text
┌───────────────────────┐

 ← UPPER        01 / 06

 BENCH PRESS

 PREVIOUS
 60 KG × 8
 60 KG × 8
 60 KG × 7

 TARGET

 62.5 KG
 6–8 REPS
 RIR 2

─────────────────────────

 SET 03

 TẠ
 ┌─────────────────────┐
 │       62.5          │
 └─────────────────────┘

 REPS
 ┌─────────────────────┐
 │         8           │
 └─────────────────────┘

 RIR

 [0] [1] [2] [3] [4+]

 LOẠI SET

 [ SET CHÍNH ▼ ]

 [ HOÀN THÀNH SET ]

─────────────────────────

 REST

        01:42

      +30s   SKIP

└───────────────────────┘
```

---

# 28. RIR Control

Không dùng dropdown.

Dùng physical segmented buttons:

```text
[0] [1] [2] [3] [4+]
```

Selected:

```text
pressed state
accent LED
```

Tooltip:

```text
RIR = số rep bạn nghĩ mình còn có thể làm thêm.
```

---

# 29. Set Type

Options:

```text
Khởi động

Set chính

Drop Set

Đến thất bại
```

Default:

```text
Set chính
```

---

# 30. Rest Timer

Rest Timer phải trông như một digital machine display.

Ví dụ:

```text
┌──────────────────┐
│ REST TIMER       │
│                  │
│     01:42        │
│                  │
│   +30   PAUSE    │
└──────────────────┘
```

Có thể thêm:

```text
scanline subtle
monospace
dark panel
```

---

# 31. Active Workout Header

Khi user đang tập:

```text
● SESSION ACTIVE
```

LED:

```text
Green blinking
```

Metadata:

```text
00:37:24

Exercise 3 / 6
```

---

# 32. Exercise Library Page

Desktop:

```text
Search

Filters

Muscle
Equipment
Difficulty
Type
```

Grid:

```text
3 columns
```

Tablet:

```text
2 columns
```

Mobile:

```text
1 column
```

---

# 33. Exercise Card

```text
┌────────────────────────┐
│                        │
│       IMAGE            │
│                        │
├────────────────────────┤
│ BENCH PRESS            │
│                        │
│ Chest                  │
│ Triceps · Front Delt   │
│                        │
│ BARBELL     COMPOUND   │
└────────────────────────┘
```

Hover desktop:

```text
lift
image grayscale → color
```

---

# 34. Exercise Detail

Layout desktop:

```text
LEFT 60%

Video/Image

RIGHT 40%

Exercise Info
```

Sections:

```text
Tên bài

Muscle

Equipment

Instructions

Tips

Common Mistakes

Alternatives
```

---

# 35. Exercise Instruction UI

Không render instructions thành một block text dài.

Dùng:

```text
STEP 01

STEP 02

STEP 03
```

Mỗi step như một module cơ khí.

Ví dụ:

```text
[01]
Đặt chân chắc chắn trên mặt sàn.

        │
        │ mechanical connector
        ▼

[02]
Kéo bả vai về sau.
```

---

# 36. Workout Program Page

Có 2 tab:

```text
MẪU

LỊCH CỦA TÔI
```

Cards:

```text
UPPER / LOWER

4 DAYS

Intermediate

Hypertrophy
```

---

# 37. Program Builder

Desktop:

```text
MON
Upper

TUE
Lower

WED
Rest

THU
Upper

FRI
Lower
```

Drag/drop có thể triển khai sau.

MVP:

```text
Select day
Select workout type
```

---

# 38. Gym Management

Page:

```text
MY GYMS
```

Gym Card:

```text
VINUNI GYM

● ACTIVE

12 EQUIPMENT

Dumbbell
Barbell
Cable
Smith
...

[ EDIT ]
```

---

# 39. Equipment Selector

Không dùng giant checkbox list.

Dùng searchable chip grid.

Ví dụ:

```text
[✓ Dumbbell]

[✓ Barbell]

[  Hack Squat]

[✓ Cable]

[✓ Smith Machine]
```

Selected:

```text
Pressed appearance
accent indicator
```

---

# 40. AI Coach Page

AI Coach không nên giống ChatGPT clone.

Layout:

```text
TRAINING ANALYSIS TERMINAL
```

Desktop:

```text
┌────────────────────────────┐
│ AI TRAINING STATUS         │
├────────────────────────────┤
│                            │
│ Insights                   │
│                            │
├────────────────────────────┤
│ Recommendation Queue       │
├────────────────────────────┤
│                            │
│ Ask AI                     │
│                            │
└────────────────────────────┘
```

---

# 41. AI Recommendation Card

Ví dụ:

```text
AI RECOMMENDATION

BENCH PRESS

Current:
60 KG

Suggested:
62.5 KG

Confidence:
HIGH

Reason:

Bạn đã đạt 10 reps
ở cả 3 working sets
với RIR trung bình 1.7.

[ REJECT ]   [ ACCEPT ]
```

AI không tự áp dụng.

---

# 42. AI Confidence Display

Không cần hiển thị phần trăm giả chính xác như:

```text
92.73%
```

Thay vào đó:

```text
LOW
MEDIUM
HIGH
```

UI:

```text
●●●○
```

---

# 43. Progress Page

Bao gồm:

```text
Strength

Volume

Body Weight

Workout Consistency

Personal Records
```

---

# 44. Strength Chart

Ví dụ:

```text
BENCH PRESS

ESTIMATED 1RM

92.5 KG
↑ 6.4%

       ╭────
   ╭───╯
───╯
```

Chart container nên trông giống screen.

Tức:

```text
dark or recessed panel
```

không phải graph nằm trực tiếp trên card.

---

# 45. Weekly Volume

```text
CHEST       16 SETS

BACK        18 SETS

SHOULDER    12 SETS

QUADS       14 SETS
```

Bar nên giống:

```text
mechanical meter
```

thay vì generic progress bar.

---

# 46. Body Weight Chart

Cards:

```text
CURRENT

72.4 KG

30 DAYS

+0.8 KG
```

Sau đó graph.

---

# 47. Empty States

Không dùng:

> No data found.

Nên theo theme.

Ví dụ:

```text
NO TRAINING DATA

Hệ thống chưa có đủ dữ liệu
để phân tích tiến độ.

[ START FIRST WORKOUT ]
```

---

# 48. Loading States

Loading AI:

```text
● AI PROCESSING
```

Có:

```text
spinner
progress indicator
technical status
```

Ví dụ:

```text
READING TRAINING HISTORY...

CHECKING EQUIPMENT...

BUILDING WORKOUT...

FINALIZING PLAN...
```

Không giả progress % nếu backend không có progress thực.

---

# 49. Toast

Success:

```text
● SET SAVED
```

Error:

```text
● FAILED TO SAVE SET
```

AI:

```text
● WORKOUT GENERATED
```

Toast nhỏ, technical.

---

# 50. Modal

Modal:

```text
Raised panel
```

Backdrop:

```text
semi-transparent
```

Không dùng glass blur quá mạnh.

---

# 51. Confirmation Pattern

Các action quan trọng:

```text
Delete Workout

Reset Program

Delete Gym

Reject AI program change
```

cần modal.

---

# 52. Responsive Breakpoints

Mobile-first.

```text
< 768px
Mobile

768+
Tablet

1024+
Desktop

1280+
Large Desktop
```

Đây cũng là breakpoint strategy trong design prompt nguồn.

---

# 53. Desktop Content Width

Dashboard có thể sử dụng:

```text
max-width: 1440px
```

Thay vì giới hạn 1152px tuyệt đối vì đây là application dashboard.

Content detail pages:

```text
1152–1280px
```

---

# 54. Mobile Padding

```text
16px
```

hoặc:

```text
20px
```

Workout logger:

```text
16px
```

để tối đa không gian nhập liệu.

---

# 55. Desktop Grid

Dùng grid 12 columns.

Ví dụ Dashboard:

```text
Workout Hero
8 columns

Gym
4 columns
```

Progress:

```text
Strength
8 columns

AI Insight
4 columns
```

---

# 56. Animation

Motion cần có cảm giác cơ khí.

Main curve:

```css
cubic-bezier(
  0.175,
  0.885,
  0.32,
  1.275
)
```

Đây là easing curve spring/bounce được chỉ định trong prompt design system.

---

# 57. Button Press

```text
150ms

translate-y: 2px

raised
↓
pressed
```

---

# 58. Card Hover

Desktop only:

```text
300ms

translateY(-4px)
```

Shadow:

```text
card
↓
floating
```

Không hover animate nhiều trên Workout Logger vì có thể gây phân tâm.

---

# 59. LED Animation

Active workout:

```text
green pulse
```

AI processing:

```text
red / blue subtle pulse
```

Warning:

```text
yellow static
```

---

# 60. Reduce Motion

Phải hỗ trợ:

```css
@media (prefers-reduced-motion: reduce)
```

Disable:

```text
bounce

rotation

card elevation animation
```

---

# 61. Accessibility

Bắt buộc:

* WCAG AA text contrast.
* Keyboard navigation.
* Visible focus states.
* `aria-label` cho icon button.
* Không dùng màu làm indicator duy nhất.
* Form input có label.
* Error message rõ ràng.
* Touch target ≥ 48px mobile.

Prompt gốc nhấn mạnh việc duy trì accessibility và responsive usability khi tích hợp design system.

---

# 62. AI Accessibility

Ví dụ Recommendation:

Không chỉ:

```text
GREEN
```

mà phải:

```text
● HIGH CONFIDENCE
```

---

# 63. Component Architecture

Đề xuất:

```text
components/

  ui/

  industrial/

  workout/

  exercise/

  gym/

  program/

  progress/

  ai/

  layout/
```

---

# 64. Industrial Components

```text
industrial/

IndustrialCard.tsx

IndustrialButton.tsx

IndustrialInput.tsx

IndustrialScreen.tsx

LedIndicator.tsx

TechnicalLabel.tsx

MetricDisplay.tsx

PhysicalToggle.tsx

SegmentControl.tsx

ScrewDecoration.tsx

VentDecoration.tsx
```

---

# 65. Workout Components

```text
workout/

WorkoutHero.tsx

WorkoutExerciseCard.tsx

WorkoutSetLogger.tsx

SetRow.tsx

RIRSelector.tsx

SetTypeSelector.tsx

RestTimer.tsx

PreviousPerformance.tsx

WorkoutProgress.tsx

FinishWorkoutModal.tsx
```

---

# 66. AI Components

```text
ai/

AIRecommendation.tsx

AIInsightCard.tsx

AIStatus.tsx

AIChat.tsx

AIWorkoutGenerator.tsx
```

---

# 67. Progress Components

```text
progress/

StrengthChart.tsx

VolumeChart.tsx

BodyWeightChart.tsx

PRCard.tsx

TrainingConsistency.tsx
```

---

# 68. Layout Components

```text
layout/

AppShell.tsx

Sidebar.tsx

MobileNavigation.tsx

TopBar.tsx

PageContainer.tsx

PageHeader.tsx
```

---

# 69. Suggested Route UI

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

---

# 70. Dashboard UI Priority

Priority order:

```text
1. Today's Workout

2. AI Recommendation

3. Weekly Training

4. Progress

5. Body Weight

6. Gym

7. History
```

Không đưa tất cả data lên dashboard.

---

# 71. Mobile UI Priority

Khi đang tập:

```text
1. Exercise

2. Current Set

3. Weight

4. Reps

5. RIR

6. Complete Set

7. Rest Timer

8. Previous Performance
```

Các analytics khác không xuất hiện trong Active Workout.

---

# 72. Technical Visual Labels

Nên tận dụng technical language.

Ví dụ:

```text
SESSION ACTIVE

AI READY

SYSTEM EXERCISE

CUSTOM EXERCISE

WORKING SET

REST TIMER

TARGET LOAD

PREVIOUS SESSION

WEEK 04

PROGRAM ACTIVE
```

Label kỹ thuật để English có thể tạo cá tính.

Nội dung user-facing chính vẫn bằng tiếng Việt.

---

# 73. Language Rule

### Vietnamese

Dùng cho:

```text
Instructions

Explanation

Buttons quan trọng

Form labels

AI response
```

Ví dụ:

```text
Hoàn thành set

Tạo buổi tập với AI

Tăng mức tạ

Đổi bài
```

---

### Technical English

Có thể dùng cho micro labels:

```text
SESSION ACTIVE

AI COACH

TARGET

PREVIOUS

RIR

1RM
```

---

# 74. Do Not Do

Không dùng:

```text
glassmorphism

gradient tím-xanh generic

neon cyberpunk

giant rounded SaaS cards

emoji làm icon chính

stock bodybuilding photos

quá nhiều accent colors

random shadows

inconsistent border radius
```

---

# 75. Visual Identity Rule

Mỗi screen phải có ít nhất một trong các signature:

```text
LED

Screw

Vent

Recessed Screen

Physical Button

Technical Label

Mechanical Meter
```

Nhưng không cần tất cả cùng lúc.

---

# 76. Performance

Không dùng image texture dung lượng lớn.

Texture:

```text
CSS

SVG

small repeating PNG
```

Animation chỉ nên chủ yếu dùng:

```text
transform

opacity
```

Design system gốc cũng ưu tiên CSS-only neumorphic shadow và transform/opacity để giữ hiệu năng.

---

# 77. UI Implementation Order

Không nên xây tất cả screen cùng lúc.

## Phase UI-1

Build Design System:

```text
Tokens

Typography

Button

Input

Card

Screen

LED

Navigation
```

---

## Phase UI-2

Build:

```text
Dashboard

Exercise Library

Gym Management

Program
```

---

## Phase UI-3

Build core UX:

```text
Today's Workout

AI Workout Plan

Active Workout

Set Logger

Rest Timer

Finish Workout
```

---

## Phase UI-4

Build:

```text
Progress

AI Coach

Workout History

Profile
```

---

# 78. First Screens Agent Nên Build

Thứ tự:

```text
01 Dashboard

02 Workout Today

03 Active Workout Mobile

04 Exercise Library

05 Exercise Detail

06 Program

07 Gym

08 Progress

09 AI Coach
```

---

# 79. Acceptance Criteria — Design System

Một UI được xem là đúng nếu:

### Visual

* Background industrial grey.
* Có physical elevation rõ.
* Shadows cùng hướng.
* Accent red dùng hạn chế.
* Data dùng JetBrains Mono.
* Interactive control có pressed state.

### Responsive

* Không horizontal overflow.
* Touch ≥ 48px.
* Active Workout hoạt động tốt ở 375px width.
* Dashboard chuyển thành single column hợp lý.

### Consistency

* Không hard-code random color.
* Không tự tạo shadow riêng.
* Không tạo radius ngoài token.
* Component dùng chung design tokens.

### Accessibility

* Keyboard accessible.
* Focus visible.
* Form label đầy đủ.
* Contrast đạt yêu cầu.

---

# 80. Core UX Acceptance Test

Test quan trọng nhất:

User mở app bằng điện thoại ở phòng gym.

Trong tối đa vài thao tác có thể:

```text
Mở Workout
    ↓
Xem bài hiện tại
    ↓
Nhập 62.5kg
    ↓
Nhập 8 reps
    ↓
Chọn RIR 2
    ↓
Hoàn thành Set
    ↓
Timer tự chạy
```

Luồng này phải nhanh hơn việc ghi bằng Notes hoặc spreadsheet.

Nếu UI đẹp nhưng logging chậm, UX thất bại.

---

# 81. UI Design Principle Cuối Cùng

GymAI Coach cần tạo cảm giác:

> Người dùng không đơn thuần mở một website fitness.

Mà giống như:

> **họ đang vận hành một hệ thống điều khiển quá trình tập luyện của chính mình.**

Visual metaphor:

```text
BODY
  ↓
TRAINING DATA
  ↓
CONTROL SYSTEM
  ↓
AI ANALYSIS
  ↓
ADJUSTMENT
  ↓
PROGRESS
```

Do đó:

```text
Dashboard = Control Panel

Workout = Active Session

Set Logger = Data Entry Module

Progress = Performance Monitor

AI Coach = Analysis System

Gym Equipment = Hardware Configuration

Program = Training Configuration
```

Đây là ngôn ngữ thiết kế cần được duy trì xuyên suốt sản phẩm.

---

# 82. Final UI Direction

Phong cách tổng thể:

**Industrial Skeuomorphism × Training Control System**

với:

```text
Grey Chassis

Physical Panels

Recessed Screens

Safety Red Controls

Mechanical Typography

Technical Metrics

LED Indicators

Industrial Details

Mobile-first Workout Logger
```

Ưu tiên cuối cùng:

```text
Usability
>
Consistency
>
Visual personality
>
Decoration
```

Các chi tiết công nghiệp phải giúp UI có cảm giác vật lý và nhận diện mạnh, nhưng không được làm chậm thao tác tập luyện.
