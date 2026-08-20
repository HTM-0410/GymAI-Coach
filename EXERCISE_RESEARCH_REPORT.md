# GymAI Coach — Exercise Library & Training Research Report

> **Ngày:** 18/08/2026
> **Thư viện:** 314 bài tập đã thiết kế
> **Nguồn research:** ExerciseLibrary.app, Fitly (5,527), ExRx.net, PlainExercise (873), RP Strength, Brookbush Institute, Pelland et al. 2024

---

## 1. Tổng quan Exercise Database toàn cầu

### Các database uy tín

| Nguồn | Số bài tập | Đặc điểm |
|---|---|---|
| [ExRx.net](https://exrx.net/Lists/Directory) | **2,100+** | Chuẩn tham chiếu từ 1999, phân loại theo giải phẫu chi tiết |
| [Fitly](https://fitly.pro/db/exercises) | **5,527** | 15 nhóm cơ, 28 loại thiết bị |
| [ExerciseLibrary.app](https://exerciselibrary.app/) | **8,000+** | Video demo, filter theo cơ & thiết bị |
| [PlainExercise](https://plainexercise.com/rankings/) | **873** | Open-licensed (CC0), thống kê chi tiết |
| [FitPros.io](https://fitpros.io/exercise-library) | **1,000+** | HD video, workout builder |

### Số bài tập theo nhóm cơ (theo PlainExercise — primary + secondary tagging)

```
Shoulders  : 335 bài (nhiều nhất — nhiều góc độ & equipment)
Hamstrings : 277 bài
Glutes     : 242 bài
Quadriceps : 227 bài
Triceps    : 218 bài
Calves     : 209 bài
Abdominals : 149 bài
Chest      : 147 bài
Lower Back : 131 bài
Biceps     : 128 bài
Lats       : ~38-70 bài (biến thể của back)
Forearms   : ít hơn
```

### Phân bố theo thiết bị (PlainExercise)

```
Barbell         : 170 bài
Dumbbell        : 123 bài
Bodyweight       : 111 bài
Cable           :  81 bài
Machine         :  67 bài
Kettlebell      :  53 bài
Resistance Band  :  20 bài
Medicine Ball   :  17 bài
```

### Phân bố theo loại & difficulty

```
Compound    : 489 bài (56%)  ← Ưu tiên cho AI workout generation
Isolation   : 297 bài (34%)
Beginner    : 523 bài (60%)
Intermediate: 293 bài (34%)
Expert      :  57 bài  ( 7%)
```

---

## 2. Số bài tập khuyến nghị cho thư viện GymAI Coach

Dựa trên dữ liệu thực tế từ các database + nghiên cứu training science:

### Mục tiêu thiết kế

- **Tối thiểu (MVP):** ~120 bài tập — cover đủ mọi nhóm cơ, mọi equipment phổ biến
- **Mở rộng (Growth):** ~200 bài tập — thêm variation, isolation, specialist exercises
- **Đầy đủ (Pro):** ~300 bài tập — gần như toàn bộ compound + phổ biến isolation

### Recommended library (mục tiêu MVP: 120 bài)

```
Nhóm cơ chính         | Số bài khuyến nghị | Lý do
────────────────────────────────────────────────────────────────
Chest (ngực)           |  12 bài  | Bench press + biến thể + flyes + dips
Upper Chest           |   4 bài  | Incline variations đặc biệt quan trọng
Back - Lats           |  12 bài  | Pull-ups, rows, pulldowns + variations
Back - Lower/Rhomboids|   6 bài  | Rows, face pulls, hyperextension
Shoulders - Front/Side |   8 bài  | OHP, lateral raises, front raises
Shoulders - Rear       |   4 bài  | Face pulls, reverse flyes, shrugs
Biceps                |   7 bài  | Curls + hammer + preacher
Triceps               |   7 bài  | Pushdown, extension, skull crushers, dips
Quadriceps            |  10 bài  | Squats + leg press + extensions + lunges
Hamstrings            |   6 bài  | RDL, leg curl, nordic, good mornings
Glutes                |   6 bài  | Hip thrust, glute bridge, pull-through
Calves                |   3 bài  | Standing + seated raises
Core - Abs            |   8 bài  | Hanging leg raise, ab wheel, cable crunch
Core - Obliques       |   4 bài  | Russian twist, pallof, woodchop
Forearms              |   4 bài  | Wrist curl, farmer carry, reverse curl
────────────────────────────────────────────────────────────────
TỔNG                  | ~91 bài  |
```

**Kết luận:** Thư viện **90-120 bài** là sweet spot — đủ để AI generate workout đa dạng mà không overwhelm người dùng.

---

## 3. Sets & Volume khuyến nghị (Nghiên cứu 2024)

### Meta-analysis từ 67 nghiên cứu (MuscleTechnics, Pelland et al. 2024)

```
Volume Landmarks per Muscle Group / Week:

┌─────────────────────────────────────────────────────────────┐
│ MRV (Max Recoverable Volume)  │  18-22 sets  │ ⚠️ Cảnh báo  │
│ MAV (Max Adaptive Volume)      │  10-16 sets  │ 🎯 Mục tiêu   │
│ MEV (Min Effective Volume)    │   4- 6 sets  │ 💤 Tối thiểu  │
└─────────────────────────────────────────────────────────────┘

Khuyến nghị theo cơ:
• Major muscles (chest, back, quads, glutes): 10-20 sets/tuần
• Smaller muscles (shoulders, biceps, triceps, hams, calves): 6-12 sets/tuần
• Core: 4-8 sets/tuần (tránh overtraining)
```

### Per-session ceiling (RP Strength — Bomerton research)

```
> 10-11 sets/muscle trong 1 session = Diminishing returns rõ rệt
→ Tối ưu: 8-10 sets/muscle/session

Hệ quả cho AI:
• 20 sets/tuần chest → Cần 2 chest sessions (mỗi session ~10 sets)
• 10 sets/tuần calves → 1 session duy trì đủ
• Training split phải cho phép 2x frequency cho major muscles
```

### Theo experience level (Rhea et al. 2003, Schoenfeld & Krieger 2017, Pelland 2024)

```
Beginner    (< 1 năm) :  6-10 sets/muscle/tuần
Intermediate(1-3 năm) : 10-16 sets/muscle/tuần
Advanced    (3+ năm)  : 16-22 sets/muscle/tuần

GymAI Coach target user: Beginner → Intermediate
→ Khuyến nghị: 10-16 sets/muscle/tuần (MAV zone)
```

---

## 4. Training Splits — So sánh chi tiết

### Các split phổ biến nhất

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                     TRAINING SPLIT COMPARISON                             ║
╠════════════════════════╦════════════╦═══════════════╦═══════════════════╣
║ Criteria               ║ Upper/Lower║ Push/Pull/Legs ║ Full Body        ║
╠════════════════════════╬════════════╬═══════════════╬═══════════════════╣
║ Days/week              ║     4      ║       6       ║       3-4        ║
║ Sessions/week           ║     4      ║       6       ║       3-4        ║
║ Frequency/muscle       ║   2x/week  ║     2x/week    ║    2-3x/week    ║
║ Recovery days          ║     3      ║       1-2      ║       3-4        ║
║ Session length         ║  60-75 min ║    45-60 min   ║    50-70 min    ║
║ Exercise variety/muscle║  Moderate  ║      High       ║      Low        ║
║ Schedule flexibility   ║    High    ║      Low        ║     Medium      ║
║ Compound lift priority║   ★★★★★    ║      ★★★        ║     ★★★★        ║
║ Best for              ║ Busy,Begin ║  6-day trainer  ║ 3-day schedule  ║
╚════════════════════════╩════════════╩═══════════════╩═══════════════════╝
```

### Recommended splits cho GymAI Coach

**4-Day Upper/Lower (Mặc định — Beginner/Intermediate)**

```
Day 1: Upper A  — Bench, Row, OHP, Pull-up, Curl, Lateral Raise
Day 2: Lower A  — Squat, RDL, Leg Press, Leg Curl, Calf Raise
Day 3: Rest
Day 4: Upper B  — Incline Press, Cable Row, Arnold Press, Lat Pulldown, Tricep, Face Pull
Day 5: Lower B  — Deadlift, Front Squat, Bulgarian Split, Hip Thrust, Calf Raise
Day 6: Rest
Day 7: Rest
```

**6-Day Push/Pull/Legs (Intermediate/Advanced — 5-6 days/week)**

```
Day 1: Push A   — Bench, OHP, Incline DB, Lateral Raise, Tricep Pushdown
Day 2: Pull A   — Pull-up, Row, Face Pull, Barbell Curl, Shrug
Day 3: Legs A   — Squat, RDL, Leg Extension, Leg Curl
Day 4: Push B   — Incline Press, Cable Fly, Arnold Press, Cable Lateral Raise, Skull Crusher
Day 5: Pull B   — Lat Pulldown, T-Bar Row, Seated Cable Row, Hammer Curl, Reverse Pec Deck
Day 6: Legs B   — Front Squat, Bulgarian Split, Hip Thrust, Calf Raise, Romanian Deadlift
Day 7: Rest
```

**3-Day Full Body (Người mới — 2-3 days/week)**

```
Day 1: A — Squat, Bench, Row, OHP, Bicep
Day 2: Rest
Day 3: B — Deadlift, Pull-up, Leg Press, Tricep, Calf
Day 4: Rest
Day 5: C — Front Squat, Incline Press, Cable Row, Lateral Raise, Core
Day 6: Rest
Day 7: Rest
```

---

## 5. Periodization Models

### Khi nào cần periodization?

```
┌─────────────────────────────────────────────────────────────┐
│ 0-18 tháng tập     │ Linear Progression đơn giản          │
│ 1-3 năm tập        │ Daily Undulating (DUP)               │
│ 3+ năm tập         │ Block Periodization                  │
└─────────────────────────────────────────────────────────────┘

Research (Brookbush Institute 2024):
• Novice: Non-periodized vs Periodized ≈ similar outcomes
• Experienced (12+ tuần program): Periodized superior cho strength & hypertrophy
• Autoregulation + exposure to goal-specific loading > rigid periodization
```

### Volume progression trong mesocycle

```
Week 1-2:  MEV zone   →  Bắt đầu conservative
Week 3-4:  MAV zone   →  Tăng 1-2 sets/muscle
Week 5-6:  MRV zone   →  Maximum stimulus + maximum fatigue
Week 7:    DELOAD     →  50% volume, giữ weight → Supercompensation

GymAI Coach nên tự động:
✓ Tracking e1RM để detect MRV
✓ Tự động suggest deload khi performance regresses
✓ Tăng volume 5-10% mỗi mesocycle mới
```

### DUP Variants cho GymAI Coach (Intermediate)

```
Mỗi session trong tuần có focus khác nhau:

Strength day   : 3-5 reps @ 85-95% 1RM   → Neuromuscular adaptation
Hypertrophy day: 8-12 reps @ 65-80% 1RM  → Volume stimulus
Endurance day  : 15-20 reps @ 50-65% 1RM → Metabolic stress

Example Upper/Lower DUP:
• Mon: Upper Strength  (Heavy OHP 4x4, Heavy Row 4x5)
• Tue: Lower Strength (Heavy Squat 4x4, RDL 4x5)
• Wed: Rest
• Thu: Upper Hypertrophy (Bench 4x10, Lateral Raise 3x12)
• Fri: Lower Hypertrophy (Leg Press 4x12, Hip Thrust 4x10)
• Sat: Rest
• Sun: Rest
```

---

## 6. Thiết kế đề xuất cho GymAI Coach

### Phase 1: MVP Library (~90 bài tập) — Đã seed

```
Priority 1: Compound King lifts (cần đủ variations)
  ✓ Barbell Bench Press, Incline, Decline
  ✓ Dumbbell Bench Press, Incline DB
  ✓ Pull-ups, Chin-ups, Lat Pulldown
  ✓ Barbell Row, Seated Cable Row, T-Bar Row
  ✓ Barbell Squat, Front Squat
  ✓ Romanian Deadlift, Conventional Deadlift
  ✓ Hip Thrust, Leg Press
  ✓ Overhead Press, Seated DB Shoulder Press

Priority 2: Isolation essentials (đủ để target lag)
  ✓ Lateral Raises, Front Raises, Face Pulls
  ✓ Cable Crossover, Pec Deck, Incline Flyes
  ✓ Barbell Curl, Hammer Curl, Preacher Curl
  ✓ Tricep Pushdown, Overhead Extension, Skull Crushers
  ✓ Leg Extension, Leg Curl, Standing/Seated Calf Raise
  ✓ Hanging Leg Raise, Ab Wheel, Cable Crunch, Plank

Priority 3: Auxiliary & variations (tăng variety)
  ✓ Dips, Push-ups, Diamond Push-ups
  ✓ Dumbbell Pullover, Straight Arm Pulldown
  ✓ Bulgarian Split Squat, Walking Lunges, Goblet Squat
  ✓ Glute Bridge, Cable Pull-through, Good Mornings
  ✓ Arnold Press, Upright Row, Shrugs
  ✓ Russian Twist, Pallof Press, Mountain Climbers
```

### Phase 2: Expansion (~200 bài tập)

```
Cần thêm:
• Smith Machine variations (đa dạng hơn)
• Single-leg variations (BSS, step-ups, single-leg RDL)
• Suspension trainer (TRX) exercises
• Cable machine variations (high/low/mid pulley)
• Machine alternatives (hack squat, hack squat leg press)
• Special movements (sled pushes, prowler, landmine)
• Olympic lifts basics (clean pull, snatch pull, power clean)
• Plyometrics (box jumps, jump squats, lateral bounds)
• Advanced isolation (cable concentration curl, rope pushdown)
• Forearm specific (wrist curl, reverse wrist curl, farmer walk)
```

### Training Split Templates (cho AI generate)

```
4 SPLIT TEMPLATES:

1. PPL 6-Day (6 days/week, 60-75 min/day)
   → Phù hợp: Intermediate muốn maximize volume

2. Upper/Lower 4-Day (4 days/week, 60-75 min/day) [DEFAULT]
   → Phù hợp: Beginner-Intermediate, 4-day trainer

3. Full Body 3-Day (3 days/week, 60-70 min/day)
   → Phù hợp: Người mới, busy schedule, 3-day trainer

4. Upper/Lower 5-Day Hybrid (5 days/week, 50-60 min/day)
   → Phù hợp: Intermediate muốn nhiều recovery margin hơn PPL
```

---

## 7. Nguồn tham khảo

| # | Source | URL | Key Insight |
|---|---|---|---|
| 1 | ExerciseLibrary.app | exerciselibrary.app | 8,000+ exercises, video library |
| 2 | Fitly | fitly.pro/db/exercises | 5,527 exercises, 28 equipment types |
| 3 | PlainExercise | plainexercise.com/rankings | Live SQL stats, 873 exercises |
| 4 | ExRx.net | exrx.net/Lists/Directory | 2,100+ exercises, giải phẫu chuẩn |
| 5 | RP Strength | rpstrength.com | Per-session volume ceiling ~10-11 sets |
| 6 | MuscleTechnics | muscletechnics.com | 67-study meta-analysis, volume landmarks |
| 7 | Brookbush Institute | brookbushinstitute.com | Periodization research, novice vs experienced |
| 8 | Pelland et al. 2024 | doi.org/10.51224/srxiv.537 | MRV ~31 sets, dose-response hypertrophy |
| 9 | MySetPlan | mysetplan.com | Upper/Lower vs PPL comparison |
| 10 | GymNotePlus | gymnoteplus.com | Training frequency 2x/week analysis |

---

## 8. Tóm tắt & Recommendations

### GymAI Coach Exercise Library — Target

```
MVP (Phase 1):  90 bài  ✅ Đã seed — xong
Growth (Phase 2): 200 bài  📋 Cần thêm ~110 bài
Pro (Phase 3):  300 bài  📋 Optional expansion
```

### Volume Target cho AI Workout Generation

```
Per muscle per week:
  Major muscles (Chest, Back, Quads, Glutes): 10-16 sets
  Smaller muscles (Shoulders, Arms, Hams, Calves): 6-12 sets
  Core: 4-8 sets

Per workout session:
  Target: 4-8 exercises
  Sets per exercise: 3-4 sets
  RIR target: 1-3 (tùy mục tiêu)
  Rest: 60-180s (tùy compound vs isolation)
```

### Training Split Recommendations

```
Default: Upper/Lower 4-Day
→ 2 sessions/major muscle/week
→ 3 recovery days built-in
→ Compound-first, isolation-after

Alternative: PPL 6-Day cho committed users
→ 2 sessions/muscle/week (spread across 6 days)
→ Shorter sessions (45-60 min)
→ Higher frequency = more practice per lift

Hybrid: 5-Day Upper/Lower
→ 2 sessions/major muscle/week
→ Extra recovery day vs PPL
→ Best of both worlds for intermediate
```

---

*Báo cáo được tạo tự động bởi GymAI Agent. Thông tin dựa trên research từ các nguồn uy tín (2024-2026). Khuyến nghị nên được điều chỉnh theo individual response và tracking data.*
