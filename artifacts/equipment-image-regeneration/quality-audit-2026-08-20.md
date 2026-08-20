# Audit chất lượng ảnh thiết bị

Ngày kiểm tra: 2026-08-20

## Phạm vi

- Đã kiểm tra 84 ảnh trong `chatgpt-plus-full` và 4 ảnh pilot trong `chatgpt-plus-test`.
- Tổng hiện có: 88/91 mã thiết bị (96,7%). Còn thiếu: `machine`, `sled`, `grip-trainer`.
- Kiểm tra kỹ thuật bằng PIL: kích thước, tỉ lệ khung, nền trắng, vùng ảnh trống và dấu hiệu ảnh hỏng.
- Kiểm tra trực quan qua contact sheet: [quality-audit-contact-sheet.png](quality-audit-contact-sheet.png).

## Kết quả kỹ thuật

- 77 ảnh đạt kích thước đồng bộ 1448×1086.
- 11 ảnh là bản screenshot đã cắt, kích thước thấp hơn chuẩn:
  `ab-bench`, `assisted-chin-up-machine`, `assisted-pull-up-machine`, `bench`,
  `calf-raise-machine`, `decline-bench`, `dip-station`, `hyperextension-bench`,
  `incline-bench`, `preacher-bench`, `pull-up-bar`.
- Không phát hiện ảnh trắng/trống, nền không trắng nghiêm trọng, hoặc ảnh bị cắt mất toàn bộ vật thể.
- 11 ảnh screenshot vẫn xem được, nhưng không đồng nhất độ phân giải và nên gen lại ở 1448×1086 trước khi đưa lên UI production.

## Lỗi nhận diện/semantic cần sửa

### P0 — Không được dùng ảnh hiện tại

1. `landmine.png`: ảnh thực tế là xích tạ kèm vòng khóa, gần như trùng ngữ nghĩa với `chain.png`; không phải đế landmine gắn thanh đòn.
2. `lever-seated-dip-machine.png`: ảnh giống máy chest/shoulder press plate-loaded, không thể hiện rõ tay cầm dip hoặc cơ cấu dip ngồi.

### P1 — Nên gen lại

1. `bodyweight.png`: ảnh là người chống đẩy. Nếu mã này đại diện “Không Dụng Cụ” thì nên dùng ảnh minh họa nhất quán hoặc cho phép ngoại lệ; nếu coi là ảnh thiết bị thì không đạt vì không có thiết bị.
2. `calf-raise-machine.png`: nội dung có vẻ là máy calf raise ngồi, nhưng bản screenshot chỉ 662×496 nên chất lượng thấp hơn toàn bộ bộ ảnh.
3. Toàn bộ 11 ảnh screenshot nêu ở phần kỹ thuật nên gen lại cùng model/kích thước với 77 ảnh còn lại.

### P2 — Cần rà lại khi duyệt semantic cuối

- `assisted-chin-up-machine.png` và `assisted-pull-up-machine.png` dùng render khá tương tự; cần bảo đảm grip/knee-pad phân biệt đúng tên.
- Các cặp máy lever cùng nhóm (hip abduction/adduction, chest press, row) cần đối chiếu lại hướng chuyển động khi mapping bài tập, không chỉ dựa vào tên file.

## Kết luận

Bộ ảnh hiện tại chưa đạt chuẩn production hoàn toàn. Chất lượng kỹ thuật phần lớn tốt, nhưng cần xử lý ít nhất 2 lỗi semantic P0, gen lại 11 ảnh độ phân giải thấp và hoàn tất 3 mã còn thiếu trước khi cập nhật vào DB/UI.
