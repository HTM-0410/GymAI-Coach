# TIP P04 - Đơn giản hoá cá nhân hoá và InBody

## Mục tiêu

Giảm tải nhận thức và số lần xác nhận trong luồng InBody, đồng thời chuyển trang cá nhân hoá sang kiểu xem tóm tắt trước, chỉ mở biểu mẫu khi người dùng thật sự muốn chỉnh sửa.

## Quyết định sản phẩm

- Luồng InBody chính: **Chụp/tải ảnh → tự che vùng định danh và phân tích → kiểm tra nhanh → lưu**.
- Việc chọn ảnh là hành động chủ động khởi tạo xử lý. Thông báo ngắn về Gemini và việc không lưu ảnh phải nằm ngay cạnh nút chọn ảnh; không cần checkbox đồng ý và nút phân tích riêng.
- Nút `Lưu kết quả` là xác nhận của người dùng đối với dữ liệu OCR đã chỉnh sửa; bỏ checkbox xác nhận riêng.
- Quyền dùng kết quả cho AI được thể hiện bằng một công tắc dễ hiểu, ánh xạ nội bộ tới toàn bộ bề mặt AI hiện có.
- Đây là tinh chỉnh UX đã được người dùng yêu cầu trực tiếp; không đổi kiến trúc hay schema nên không cần checkpoint Blueprint mới.

## Phạm vi triển khai

### P04-REQ-001 - Một hành động để bắt đầu

- Có một CTA rõ ràng: `Chụp hoặc tải ảnh InBody`.
- Sau khi người dùng chọn ảnh hợp lệ, client tự tạo bản đã che vùng định danh và gọi API phân tích ngay.
- Không còn checkbox đồng ý xử lý ngoài hệ thống và không còn nút `Phân tích bản đã che`.
- Hiển thị trạng thái tuần tự, ngắn gọn: đang che thông tin, đang đọc chỉ số, đã sẵn sàng kiểm tra.

### P04-REQ-002 - Minh bạch và riêng tư

- Gần CTA phải ghi rõ: ảnh được che vùng định danh trên thiết bị, bản đã che được gửi Google Gemini để đọc chỉ số và GymAI không lưu ảnh.
- API vẫn bắt buộc cờ consent và bằng chứng redaction; client tự gửi các cờ này sau hành động chọn ảnh.
- Không lưu hoặc log ảnh gốc/bản dẫn xuất.

### P04-REQ-003 - Kiểm tra nhanh

- Mặc định chỉ hiển thị các trường chính: thời điểm đo, cân nặng, khối cơ xương và tỷ lệ mỡ cơ thể.
- Các chỉ số còn lại, thông tin thiết bị và khả năng so sánh đặt trong vùng `Chỉ số khác (tuỳ chọn)` đóng mặc định.
- Trường thiếu hoặc độ tin cậy thấp được báo gọn, không tạo thêm một khối hướng dẫn dài.

### P04-REQ-004 - Một lần xác nhận cuối

- Bỏ checkbox xác nhận đã kiểm tra.
- `Lưu kết quả` là hành động xác nhận; request lưu vẫn gửi `reviewed: true` để giữ contract server.
- Khi lỗi phân tích, có hành động `Thử lại` hoặc `Chọn ảnh khác` mà không cần tải lại trang.

### P04-REQ-005 - Quyền cá nhân hoá AI đơn giản

- Thay ba công tắc theo từng AI bằng một công tắc: `Dùng kết quả đã xác nhận để cá nhân hoá AI`.
- Bật ánh xạ tới cả ba `allowedUses`; tắt ánh xạ thành danh sách rỗng.
- Trạng thái hiện tại phải được đọc từ server và không tự nâng quyền nếu người dùng chưa bật.

### P04-REQ-006 - Hồ sơ cá nhân hoá tóm tắt trước

- Mỗi nhóm chỉ hiện tên thân thiện và trạng thái/tóm tắt ngắn khi đóng:
  - `Có gì cần tránh?`
  - `Bạn thích tập thế nào?`
  - `Hôm nay bạn thế nào?`
- Các biểu mẫu đóng mặc định; người dùng mở đúng nhóm cần sửa.
- Loại bỏ giải thích lặp lại, thuật ngữ kỹ thuật và CTA thừa; giữ nguyên khả năng thêm/cập nhật dữ liệu hiện có.

### P04-REQ-007 - Chất lượng giao diện

- Hoạt động tốt trên mobile và desktop, không tràn ngang.
- Có focus state, label và trạng thái loading/disabled dễ hiểu.
- Không làm giảm khả năng sửa dữ liệu OCR trước khi lưu.

### P04-REQ-008 - Giới hạn kỹ thuật

- Không thay migration hoặc schema Supabase.
- Không thay contract API trừ phần client tự động gửi consent/redaction/reviewed hiện có.
- Không gọi Gemini hay ghi dữ liệu thật trong unit/component test.

## Tiêu chí nghiệm thu

1. Chọn ảnh hợp lệ bắt đầu phân tích mà không cần thao tác xác nhận trung gian.
2. Người dùng nhìn thấy thông báo xử lý dữ liệu trước khi chọn ảnh.
3. Kết quả chính dễ đọc; trường nâng cao đóng mặc định nhưng vẫn sửa được.
4. Chỉ cần nhấn `Lưu kết quả` để xác nhận và lưu.
5. Một công tắc quản lý toàn bộ quyền dùng kết quả InBody cho AI.
6. Ba nhóm cá nhân hoá đóng mặc định và có tóm tắt hữu ích.
7. Test tập trung, TypeScript và build không phát sinh lỗi mới.
8. E2E đăng nhập thật trên local xác nhận luồng mới; không gọi Gemini nếu việc gọi có thể phát sinh chi phí khi chưa cần thiết cho nghiệm thu UI.

## Ngoài phạm vi

- Thay đổi mô hình phân tích Gemini hoặc prompt trích xuất.
- Tư vấn/chẩn đoán y khoa từ chỉ số InBody.
- Migration, seed hoặc thay đổi RLS.
- Thiết kế lại toàn bộ trang Profile.
