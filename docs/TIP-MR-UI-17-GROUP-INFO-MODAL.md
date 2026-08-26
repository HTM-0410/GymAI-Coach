# TIP-MR-UI-17: Popup thông tin nhóm cơ

## Mục tiêu

Khi người dùng bấm vào một nhóm cơ trên sơ đồ hoặc trong danh sách, hiển thị thông tin ngay trong popup trên trang hiện tại. Không điều hướng sang trang chi tiết mới và không thay đổi URL.

## Phạm vi

- Tạo một popup dùng chung cho màn hình Phục hồi cơ bắp.
- Mở popup khi bấm vùng cơ trên sơ đồ tại `/recovery`.
- Mở cùng popup khi bấm một hàng trong danh sách nhóm cơ.
- Giữ route chi tiết hiện có để tương thích với deep link, nhưng không dùng route đó cho các thao tác bấm trong UI nêu trên.
- Dùng dữ liệu thật từ API chi tiết nhóm cơ hiện có.

## Nội dung bắt buộc

Popup phải hiển thị:

1. Tên nhóm cơ đang chọn và điểm phục hồi hiện tại.
2. Mục `Nhóm cơ này là gì?`.
3. Mô tả giải phẫu hoặc vai trò của nhóm cơ từ metadata hiện có.
4. Mục `Các bài tập gần đây ảnh hưởng đến nhóm cơ này`.
5. Với mỗi bài gần đây: tên bài, số hiệp đã hoàn thành và thời gian tương đối.
6. Trạng thái rỗng rõ ràng khi chưa có bài tập gần đây.

Popup chỉ hiển thị duy nhất nhóm cơ vừa được bấm. Không hiển thị danh sách, tab hoặc chip để xem tất cả nhóm cơ trong cùng popup và không cho chuyển nhóm ngay bên trong popup.

## Hành vi và trạng thái

- URL giữ nguyên khi mở hoặc đóng popup.
- Popup có overlay, nút đóng rõ ràng và đóng được bằng phím Escape.
- Focus được giữ trong popup khi mở và trả về phần tử đã bấm khi đóng.
- Có trạng thái loading khi tải chi tiết.
- Có trạng thái lỗi kèm nút thử lại.
- Khi người dùng đổi nhóm cơ nhanh, dữ liệu cũ không được ghi đè lên nhóm đang chọn.
- Danh sách hoạt động được loại trùng theo workout exercise bằng helper hiện có.
- Popup cuộn nội dung bên trong khi nội dung dài, không làm trang nền nhảy bố cục.
- Desktop dùng dialog căn giữa. Mobile dùng bố cục gần bottom sheet, vừa màn hình và có vùng bấm tối thiểu 44 px.

## Yêu cầu kỹ thuật

- Ưu tiên Radix Dialog đã có trong dự án, không thêm dependency.
- Tạo component dùng chung trong `src/components/recovery/`.
- Tái sử dụng API `/api/recovery/[group]`, metadata và helper định dạng thời gian hiện có.
- Không sao chép logic fetch hoặc định dạng nếu có thể tách và tái sử dụng an toàn.
- Không thay đổi schema, migration, dữ liệu live, deploy, commit hoặc push.
- Không dùng dấu gạch ngang dài trong source, UI hoặc tài liệu.

## Acceptance Criteria

- [ ] Bấm vùng cơ trên mặt trước hoặc mặt sau mở popup đúng nhóm cơ.
- [ ] Bấm hàng nhóm cơ trong danh sách mở cùng popup.
- [ ] URL trước và sau khi mở popup giống nhau.
- [ ] Popup có tên nhóm cơ, điểm phục hồi, mục giải thích và mô tả.
- [ ] Popup chỉ chứa thông tin của đúng một nhóm cơ vừa chọn, không chứa danh sách tất cả nhóm cơ.
- [ ] Popup hiển thị các bài tập gần đây bằng dữ liệu API thật.
- [ ] Không có hoạt động thì hiển thị trạng thái rỗng, không giả lập lịch sử tập.
- [ ] Loading, lỗi, thử lại và đổi nhóm nhanh hoạt động đúng.
- [ ] Escape, overlay, nút đóng và focus restore hoạt động đúng.
- [ ] Route chi tiết cũ vẫn build được và truy cập trực tiếp được.
- [ ] Test tập trung, TypeScript và production build đều đạt.

## Bằng chứng bàn giao

Builder phải tạo `docs/reports/TIP-MR-UI-17-COMPLETION.md` gồm:

- Danh sách file thay đổi.
- Ánh xạ từng Acceptance Criterion tới code hoặc test.
- Lệnh kiểm tra và kết quả thực tế.
- Giới hạn chưa xác minh, nếu có.
