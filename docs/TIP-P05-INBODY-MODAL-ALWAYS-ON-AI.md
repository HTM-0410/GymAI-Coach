# TIP P05 - InBody modal và AI cá nhân hoá luôn bật

## Mục tiêu

Trang thành phần cơ thể chỉ hiển thị lịch sử/insight và một hành động thêm dữ liệu. Toàn bộ nhập ảnh, trạng thái phân tích, kiểm tra và lưu diễn ra trong popup. Dữ liệu thành phần cơ thể đã xác nhận luôn là một phần của hồ sơ cá nhân hoá AI, không yêu cầu người dùng quản lý thêm công tắc.

## Quyết định sản phẩm

- Bỏ card và công tắc `Cá nhân hoá AI` khỏi UI.
- Measurement đã xác nhận luôn được phép dùng cho `planner`, `coach` và `weekly_report`.
- Cơ chế opt-in theo từng AI của body composition bị thay thế bởi always-on. Consent cho việc gửi bản ảnh đã che tới Gemini vẫn được audit riêng ở API extract.
- Trang chính có đúng một CTA thêm dữ liệu; workflow nằm trong modal, không render section form dài dưới trang.

## Yêu cầu

### P05-REQ-001 - Một CTA trên trang

- CTA chính `Thêm kết quả InBody` nằm gần lịch sử đo.
- Không render scan/manual form inline trên trang.
- Bấm CTA mở modal có title rõ ràng, nút đóng và focus phù hợp.

### P05-REQ-002 - Upload và tự phân tích trong modal

- Modal mặc định hiển thị một CTA `Chụp hoặc tải ảnh` cùng disclosure ngắn.
- Chọn ảnh tự che định danh và tự gọi extract như P04.
- Preview, loading, lỗi/retry và kết quả OCR đều nằm trong modal.
- Không có checkbox consent hoặc nút phân tích trung gian.

### P05-REQ-003 - Review và lưu trong modal

- Sau extract, hiện bốn trường chính; chỉ số khác đóng mặc định.
- `Lưu kết quả` là xác nhận cuối. Lưu thành công đóng modal, làm mới lịch sử và hiển thị feedback ngắn trên trang.
- Có đường dẫn nhỏ `Nhập thủ công` trong modal để giữ fallback hiện có; không tạo CTA thứ hai trên trang chính.

### P05-REQ-004 - Modal accessible/responsive

- Dùng semantic dialog với `aria-modal`, title association, close label và Escape/backdrop close khi không bận.
- Khoá scroll nền khi modal mở; modal cuộn nội bộ trên mobile.
- Không tràn ngang ở viewport 390 px.

### P05-REQ-005 - AI always-on

- Xoá state, helper và API call chỉ phục vụ master AI toggle khỏi client.
- Request lưu luôn dùng đủ ba allowed uses.
- Context AI coi measurement confirmed là available cho cả ba surface mà không phụ thuộc consent toggle cũ.
- Không hiển thị card/công tắc quyền AI trên trang.

### P05-REQ-006 - Privacy boundary

- Ảnh vẫn được che ở client, chỉ gửi bản dẫn xuất và không lưu ảnh.
- API extract vẫn yêu cầu `consent=true` và `header_masked_v1`, ghi audit external processing như hiện tại.
- AI chỉ dùng số liệu người dùng đã nhấn lưu; không nhận ảnh và không chẩn đoán y khoa.

### P05-REQ-007 - Giới hạn kỹ thuật

- Không migration/schema change.
- Có focused tests cập nhật cho modal, removal toggle và always-on projection.
- Không gọi Gemini hoặc ghi Supabase thật trong unit/E2E nghiệm thu.

## Acceptance

1. Trang không còn card `Cá nhân hoá AI`, toggle hoặc form phép đo inline.
2. Một CTA mở modal; chọn ảnh phát đúng một extract request tự động.
3. Review và save nằm trong modal; save success đóng modal.
4. Dữ liệu confirmed đi vào planner/coach/weekly report dù không có legacy body-composition consent.
5. External processing guard và redaction guard vẫn nguyên vẹn.
6. Focused tests, TypeScript, lint, build và authenticated local E2E pass.

## Ngoài phạm vi

- Thay Gemini model/prompt.
- Migration hoặc xoá bảng consent lịch sử.
- Thiết kế lại lịch sử/trend.
- Tư vấn y khoa.
