# TIP-MR-UI-18: Căn giữa popup và nền kính mờ

## Header

- TIP-ID: TIP-MR-UI-18
- Module: Muscle Readiness UI
- Depends on: TIP-MR-UI-17
- Priority: P0

## Root Cause Evidence

Browser QA tại viewport 1280 x 720 đo được dialog có `position: relative`, `top: 792px` và `y: 1023px`, nên popup xuất hiện phía dưới nội dung thay vì theo viewport.

Nguyên nhân là portal của Radix được gắn trực tiếp dưới phần tử có class `noise-overlay`. Rule toàn cục `.noise-overlay > * { position: relative; z-index: 1; }` có độ ưu tiên cao hơn utility `fixed` của popup. Dự án đã có tiền lệ dùng inline positioning để tránh xung đột này.

## Task

Sửa popup thông tin nhóm cơ để:

1. Luôn nằm giữa viewport trên tablet và desktop, không phụ thuộc vị trí scroll.
2. Vẫn dùng bottom sheet trên mobile nhỏ nếu phù hợp, nhưng phải nằm trong viewport và không rơi xuống cuối document.
3. Panel popup có nền hơi trong suốt, blur nhẹ kiểu glass, vẫn đủ tương phản để đọc.
4. Overlay nền tối vừa phải và blur nhẹ, không làm mất hoàn toàn ngữ cảnh trang phía sau.

## Specifications

- Dùng inline positioning cho portal children hoặc giải pháp có độ ưu tiên chắc chắn trước `.noise-overlay > *`.
- Desktop từ breakpoint `sm`: tâm dialog phải gần tâm viewport theo cả trục X và Y.
- Mobile: dialog bám đáy viewport, không bám đáy document.
- Nền panel đề xuất độ đục khoảng 88% đến 94%, có `backdrop-filter` blur.
- Border và shadow phải giữ popup tách biệt với nền.
- Nội dung, API, focus restore và hành vi chỉ một nhóm cơ của TIP-MR-UI-17 không được thay đổi.
- Không thêm dependency, migration, live write, deploy, commit hoặc push.
- Không dùng em dash.

## Acceptance Criteria

- [ ] Tại 1280 x 720, computed `position` của dialog là `fixed`.
- [ ] Tại 1280 x 720, tâm dialog lệch tâm viewport không quá 8 px mỗi trục khi chiều cao dialog vừa viewport.
- [ ] Popup không xuất hiện dưới phần nội dung đang scroll.
- [ ] Panel có nền alpha nhỏ hơn 1 và backdrop blur khác `none`.
- [ ] Overlay phủ viewport, tối vừa phải và có blur nhẹ.
- [ ] Tại mobile, popup nằm trong viewport và dùng bố cục bottom sheet.
- [ ] Popup vẫn chỉ hiển thị nhóm vừa bấm, URL không đổi và focus restore vẫn đạt.
- [ ] Focused tests, TypeScript và production build đạt.

## Report

Tạo `docs/reports/TIP-MR-UI-18-COMPLETION.md` với root cause, file thay đổi, ánh xạ AC và kết quả đo browser hoặc test có thể tái lập.
