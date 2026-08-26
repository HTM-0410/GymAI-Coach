# TIP-MR-UI-19: Vẽ lại mô hình cơ thể giải phẫu

## Header

- TIP-ID: TIP-MR-UI-19
- Module: Muscle Readiness UI
- Depends on: TIP-MR-UI-18
- Priority: P0

## Context

- Working directory: `D:/GymAI-Coach`
- Component chính: `src/components/ui/MuscleBody.tsx`
- Màn hình nghiệm thu: `/recovery`
- Mẫu người dùng cung cấp: hình thể nam thể thao, mặt trước và mặt sau, nhóm cơ tách thành từng khối rõ, đối xứng, đường nét sạch và màu trạng thái nổi trên nền tối.

## Vision

Vẽ lại bằng SVG code, không dùng ảnh raster. Hình thể phải gần phong cách ứng dụng fitness cao cấp: tỷ lệ nam thể thao, vai rộng, eo gọn, tay và chân có cấu trúc cơ rõ, mặt trước và mặt sau nhất quán. Màu phục hồi phải dễ đọc nhưng vẫn giữ cảm giác giải phẫu.

## Requirements

### REQ-MB-01: Hình thể

- Silhouette nam thể thao cân đối, đối xứng và nhìn tự nhiên hơn bản hiện tại.
- Đầu, cổ, vai, ngực, eo, hông, tay, bàn tay, đùi, gối, bắp chân và bàn chân đều có contour rõ.
- Mặt trước và mặt sau dùng cùng tỷ lệ tổng thể.

### REQ-MB-02: Phân vùng cơ mặt trước

- Ngực trái và phải có khối riêng, bo theo lồng ngực.
- Vai tạo mũ vai rõ.
- Tay trước và cẳng tay có hình thoi hoặc bó cơ tự nhiên.
- Cơ bụng có line giữa, các múi riêng và phần bụng dưới.
- Đùi có nhiều bó cơ, có khoảng gối hợp lý.
- Bắp chân tách rõ khỏi đùi và ống chân.

### REQ-MB-03: Phân vùng cơ mặt sau

- Cầu vai và vùng lưng trên có đường trục cột sống rõ.
- Xô trái và phải tạo hình chữ V như mẫu.
- Vai sau, tay sau và cẳng tay có bó cơ riêng.
- Mông trái và phải tách rõ.
- Đùi sau và bắp chân sau có nhiều bó cơ, đối xứng.

### REQ-MB-04: Độ sắc nét và thẩm mỹ

- Dùng `shapeRendering="geometricPrecision"` và non-scaling stroke.
- Có khoảng hở hoặc stroke nền giữa các khối cơ để không dính thành mảng lớn.
- Vùng không có dữ liệu dùng màu slate tối có phân lớp, không phẳng hoàn toàn.
- Màu trạng thái đỏ, cam, xanh dương và xanh lá giữ đúng thresholds hiện tại.
- Hover, focus và selected có phản hồi tinh tế, không glow quá mạnh làm nhòe đường cơ.
- Có chiều sâu nhẹ bằng gradient hoặc highlight, nhưng không làm sai màu trạng thái.

### REQ-MB-05: Tương tác và tương thích

- Giữ nguyên public props và các tên nhóm cơ hiện có.
- Mọi vùng cơ đang click hoặc keyboard được vẫn hoạt động.
- Trigger element vẫn được truyền cho popup để focus restore.
- Popup vẫn chỉ hiển thị nhóm vừa chọn và URL không đổi.
- `day-muscle-map` và các nơi dùng không có readiness vẫn render đúng.

### REQ-MB-06: Responsive

- Không bị cắt đầu, tay, bàn chân ở mobile 390 x 844.
- Hình thể đủ lớn và sắc nét ở desktop.
- Front và back căn giữa trong vùng hiển thị, không làm thay đổi chiều cao layout hiện tại.

## Acceptance Criteria

- [ ] Front và back có silhouette mới, cùng viewBox và tỷ lệ nhất quán.
- [ ] Front có ít nhất 30 path giải phẫu hoặc trang trí, không tính contour ngoài.
- [ ] Back có ít nhất 28 path giải phẫu hoặc trang trí, không tính contour ngoài.
- [ ] Tất cả 10 group canonical vẫn có ít nhất một vùng hiển thị ở mặt phù hợp.
- [ ] Chest, shoulders, abs, back, glutes, legs và calves có phân vùng trái phải rõ.
- [ ] Các khối không bị dính màu thành một blob lớn, có divider sắc nét.
- [ ] Readiness colors và accessibility contracts không đổi.
- [ ] Bấm Ngực ở front mở popup Ngực, bấm Lưng ở back mở popup Lưng, URL không đổi.
- [ ] Focus restore đạt sau khi đóng popup.
- [ ] Mobile và desktop không clipping hoặc overflow ngang.
- [ ] Focused tests, TypeScript và production build đạt.

## Constraints

- Vẽ bằng SVG/React code trong component, không thay bằng PNG, JPG hoặc ảnh AI.
- Không thêm dependency.
- Không thay đổi API, database, migration hoặc business rule phục hồi.
- Không live write, deploy, commit hoặc push.
- Giữ dirty work không liên quan.
- Không dùng em dash.

## Decisions Log

- Bỏ checkpoint Blueprint riêng vì người dùng đã cung cấp mẫu trực quan và yêu cầu code trực tiếp.
- Giữ taxonomy 10 nhóm hiện tại, ưu tiên nâng chất lượng vector thay vì đổi business model.

## Report

Tạo `docs/reports/TIP-MR-UI-19-COMPLETION.md` với file thay đổi, số path front/back, mapping requirements, test results và giới hạn visual chưa xác minh.
