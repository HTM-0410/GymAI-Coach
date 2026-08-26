# TIP-MR-UI-20: Refine mô hình theo atlas mẫu

## Header

- TIP-ID: TIP-MR-UI-20
- Depends on: TIP-MR-UI-19
- Priority: P0
- Status đầu vào: TIP-MR-UI-19 visual FAIL

## Contractor Visual Findings

- Hình thể vẫn giống robot, không giống anatomy mẫu.
- Ngực và bụng quá vuông.
- Đùi là các thanh dọc, không có cấu trúc cơ đùi tự nhiên.
- Bàn tay và bàn chân là khối tối.
- Mặt sau sai hình cầu vai, xô và lưng dưới.
- Các mảng xanh phủ quá phẳng, thiếu nền toàn thân xám phân múi như mẫu.

## Reference Atlas

Dự án đã có dependency `body-highlighter`. File `node_modules/body-highlighter/src/assets/index.ts` chứa `anteriorData` và `posteriorData` với atlas polygon đúng gần mẫu đầu tiên của người dùng. Dùng geometry này làm nguồn tham chiếu chính để phân vùng cơ, thay vì tự vẽ các mảng robot.

Không render package component trực tiếp nếu làm mất readiness, accessibility hoặc trigger contract. Có thể chuyển đổi polygon atlas thành dữ liệu React nội bộ và ánh xạ về 10 canonical groups.

## Required Mapping

### Front

- CHEST: chest
- SHOULDERS: front-deltoids
- BICEPS: biceps
- TRICEPS: triceps
- FOREARMS: forearm
- ABS: abs và obliques
- LEGS: quadriceps, abductors và knees
- CALVES: calves
- Head và neck: decorative gray

### Back

- SHOULDERS: back-deltoids
- BACK: trapezius, upper-back và lower-back
- TRICEPS: triceps
- FOREARMS: forearm
- GLUTES: gluteal
- LEGS: hamstring, adductor và knees
- CALVES: calves, left-soleus và right-soleus
- Head: decorative gray

## Visual Requirements

- Toàn bộ anatomy atlas luôn được render thành nền xám phân múi.
- Mỗi polygon mapped group nhận màu readiness riêng khi có score.
- Giữ khe hoặc stroke tối 1 đến 1.5 px giữa polygon để nhóm cơ sắc nét, không thành blob.
- Không dùng glow mạnh, không dùng các thanh dọc nhân tạo.
- Silhouette hoặc contour phụ chỉ được bổ sung để hoàn thiện cổ, tay, bàn tay, ống chân và bàn chân, không được che atlas.
- Tỷ lệ front và back phải gần mẫu, thanh hơn TIP19, vai rộng vừa phải, eo và chân tự nhiên.
- Mặt sau phải nhìn rõ trapezius, xô trái phải, lower back, glutes và hamstrings.

## Functional Requirements

- Giữ public props `MuscleBody` và canonical `MuscleName`.
- Một canonical group có thể gom nhiều atlas muscle, nhưng click bất kỳ polygon nào phải mở đúng một popup canonical group.
- Keyboard, aria-label, trigger ref và focus restore giữ nguyên.
- Threshold màu và URL contract giữ nguyên.
- Không thay đổi API hoặc business rules.

## Acceptance Criteria

- [ ] Contractor visual QA xác nhận hình không còn dáng robot.
- [ ] Geometry nhóm cơ front/back bám atlas từ dependency hiện có.
- [ ] Nền xám phân múi nhìn thấy rõ ở các vùng không được tô readiness.
- [ ] Ngực, abs, quadriceps, trapezius, lats, glutes và hamstrings có hình anatomy tự nhiên.
- [ ] Không còn bàn tay hoặc bàn chân dạng khối đen lớn.
- [ ] Front/back không clipping ở desktop và mobile.
- [ ] Click hoặc Enter trên Ngực và Lưng mở đúng popup, URL không đổi, focus restore đạt.
- [ ] Focused tests, TypeScript và build đạt.

## Constraints

- Không dùng raster.
- Không thêm dependency mới.
- Không migration, live write, deploy, commit hoặc push.
- Không em dash.

## Report

Tạo `docs/reports/TIP-MR-UI-20-COMPLETION.md` và ghi rõ TIP19 bị thay thế phần geometry nào.
