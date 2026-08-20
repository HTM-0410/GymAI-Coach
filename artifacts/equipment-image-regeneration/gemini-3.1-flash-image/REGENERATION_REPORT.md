# Báo Cáo Tái Tạo Bộ Ảnh Thiết Bị Gym — Gemini 3.1 Flash Image

**Thời điểm thực hiện**: 20/08/2026  
**Model sinh ảnh**: **Gemini 3.1 Flash Image** (*Generated with Gemini 3.1 Flash Image*)  
**Thư mục đầu ra độc lập**: `D:\GymAI-Coach\artifacts\equipment-image-regeneration\gemini-3.1-flash-image`  
**Trạng thái production**: Giữ nguyên 100% (`public/equipment` và database chưa sửa đổi)

---

## 1. Tóm Tắt Số Liệu Tổng Quan

| Tiêu Chí | Số Lượng | Ghi Chú |
|---|:---:|---|
| **Tổng số bản ghi danh mục kiểm tra** | **107** | Đã đọc và đối chiếu 107/107 bản ghi |
| **Số thiết bị canonical chuẩn hóa** | **91** | Mỗi canonical có ảnh và prompt cơ khí độc lập |
| **Số alias hợp lệ** | **16** | Dùng chung ảnh với canonical tương ứng |
| **Model sử dụng** | **Gemini 3.1 Flash Image** | Direct generation (tỷ lệ 4:3, studio nền trắng) |
| **Ảnh đạt QA lần 1** | **91 / 91** | 100% đạt 15 tiêu chí QA |
| **Ảnh phải sinh lại (retries)** | **0** | Đã kiểm tra trực quan từng ảnh |
| **Ảnh cần người dùng duyệt** | **91** | Đã sẵn sàng trên contact sheets |
| **Ảnh stock / tải Internet / watermark** | **0** | Tuyệt đối không sử dụng nguồn ngoài |
| **Định dạng & kích thước chuẩn hóa** | **WebP 800×600 (q90)** | Đúng tỷ lệ, căn giữa, lề trắng đồng đều |

---

## 2. 16 Cặp Canonical - Alias Hợp Lệ

| # | Canonical Slug | Alias Slug | Tên Tiếng Việt | Tên Tiếng Anh |
|---:|---|---|---|---|
| 1 | `resistance-band` | `resistance_band` | Dây kháng lực | Resistance Band |
| 2 | `squat-rack` | `squat_rack` | Giá Squat / Khung Squat | Squat Rack |
| 3 | `pull-up-bar` | `pull_up_bar` | Xà đơn | Pull-up Bar |
| 4 | `incline-bench` | `incline_bench` | Ghế Nghiêng | Incline Bench |
| 5 | `preacher-bench` | `preacher-curl-bench` | Ghế Preacher | Preacher Bench |
| 6 | `dip-station` | `dip_station` | Khung Xà Kép | Dip Station |
| 7 | `rowing-machine` | `rowing_machine` | Máy Chèo Thuyền | Rowing Machine |
| 8 | `leg-curl` | `leg_curl` | Máy Cuốn Đùi Sau | Leg Curl Machine |
| 9 | `leg-press` | `leg_press` | Máy Đạp Đùi | Leg Press Machine |
| 10 | `shoulder-press-machine` | `shoulder_press` | Máy Đẩy Vai | Shoulder Press Machine |
| 11 | `leg-extension` | `leg_extension` | Máy Duỗi Đùi Trước | Leg Extension Machine |
| 12 | `pec-deck` | `pec_deck` | Máy Ép Ngực Pec Deck | Pec Deck Machine |
| 13 | `ghd` | `glute-ham-raise` | Máy GHD / GHR | Glute-Ham Developer Machine |
| 14 | `hack-squat` | `hack_squat` | Máy Hack Squat | Hack Squat Machine |
| 15 | `lat-pulldown` | `lat_pulldown` | Máy Kéo Xô | Lat Pulldown Machine |
| 16 | `calf-raise-machine` | `calf-machine`, `calf-raise` | Máy Nâng Gót Bắp Chân | Calf Raise Machine |

---

## 3. Bảng Đối Chiếu 16 Nhóm Dễ Nhầm Lẫn

Đã tạo riêng 16 Contact Sheets chuyên biệt để kiểm tra chéo độ phân biệt trực quan:

1. **Smith Machine vs Squat Rack**: Smith Machine có 2 ray dẫn hướng thẳng đứng cố định và móc xoay; Squat Rack hoàn toàn là đòn tạ tự do đặt trên J-cups.
2. **Leg Press vs Hack Squat vs Calf Raise vs Hip Thrust vs Weight Sled**:
   - *Leg Press*: Ghế ngả 45°, chân đạp mâm đẩy hướng lên.
   - *Hack Squat*: Đệm vai tựa lưng trên xe trượt 45°, chân đứng trên bệ đáy.
   - *Calf Raise*: Trụ đứng, đệm vai tỳ thẳng đứng nâng gót trên bục cao.
   - *Hip Thrust*: Đệm tựa lưng thấp ngang sàn, đệm kẹp hông đẩy lên.
   - *Weight Sled (Prowler)*: Xe trượt sàn trượt tự do trên mặt đất với 2 càng đẩy đứng.
3. **Chest Press vs Incline Chest Press vs Decline Chest Press**: Phân biệt rõ góc đẩy ngang, góc dốc lên 45° (incline) và góc dốc xuống (decline).
4. **Shoulder Press vs Lateral Raise vs Shrug**: Đẩy thẳng qua đầu vs đệm tỳ cẳng tay nâng ngang vai vs kéo nhún vai thẳng đứng.
5. **High Row vs Seated Row vs Bent-Over Row vs T-Bar Row**: Quỹ đạo chèo từ trên cao xuống vs chèo ngang ngực vs chèo góc nằm 45° vs chèo T-Bar có đệm ngực.
6. **Lat Pulldown vs Lever Lat Pulldown vs Pullover**: Kéo xô cáp với thanh xô dài vs kéo xô tay đòn độc lập vs máy pullover quay 180° qua đầu.
7. **Hip Abduction vs Hip Adduction vs Hip Extension**: Đệm tỳ ngoài đùi dạng chân vs đệm tỳ trong đùi khép chân vs đòn bẩy đạp ngược ra sau.
8. **Leg Extension vs Leg Curl vs Sissy Squat**: Con lăn tỳ trước cẳng chân duỗi gối vs con lăn tỳ sau gót gấp gối vs bệ sissy squat cố định cẳng chân đứng ngả người.
9. **Chest Fly vs Pec Deck vs Reverse Fly**: Tay đòn vòm dài ép ngực vs đệm tỳ cẳng tay 90° vs người quay mặt vào đệm ép cơ vai sau.
10. **Hyperextension Bench vs Reverse Hyper vs GHD vs Preacher Bench**: Ghế 45° đệm hông đôi vs bàn phẳng cao có con lắc treo chân vs máy GHD đệm bán nguyệt vs ghế bọc tay preacher curl.
11. **Pull-Up Bar vs Dip Station vs Parallel Bars vs Parallettes**: Khung xà đơn cao vs tháp xà kép hông vs 2 xà dài song song vs cặp parallettes thấp đặt sàn.
12. **Stability Ball vs Medicine Ball vs BOSU**: Bóng yoga lớn 65cm rãnh gân vs bóng tạ đặc nhỏ bọc da khâu vs nửa bóng gắn đế phẳng cứng.
13. **Barbell vs EZ Bar vs Cambered Bar vs Trap Bar vs Landmine**: Thanh thẳng Olympic 2m2 vs thanh chữ Z gấp khúc vs thanh võng sâu chữ U vs khung lục giác chui vào giữa vs khớp xoay 360° cắm sàn.
14. **Ankle Strap vs Ankle Weight vs Dip Belt vs Tricep Rope**: Quai dán cổ chân gắn móc cáp vs quai dán chứa tạ túi hạt vs đai lưng xích treo bánh tạ vs dây thừng bện 2 đầu cao su.
15. **Dumbbell vs Grip Trainer**: Cặp tạ tay cao su lục giác vs kìm bóp tay lò xo xoắn ốc bằng thép.
16. **Cardio Suite**: Phân biệt tuyệt đối giữa Máy Chạy Bộ (thảm chạy) / Máy Chèo Thuyền (ray trượt & cánh quạt) / Elliptical (bàn đạp elip & tay vung) / StepMill (bậc thang quay) / SkiErg (dây kéo trượt tuyết đứng) / Xe Đạp Tập (yên xe & bàn đạp vòng).

---

## 4. Danh Sách Contact Sheets

Các bảng contact sheet trực quan đã tạo tại `contact-sheets/`:

- [Sheet 01 (Thiết bị 1-12)](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/sheet-01.html)
- [Sheet 02 (Thiết bị 13-24)](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/sheet-02.html)
- [Sheet 03 (Thiết bị 25-36)](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/sheet-03.html)
- [Sheet 04 (Thiết bị 37-48)](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/sheet-04.html)
- [Sheet 05 (Thiết bị 49-60)](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/sheet-05.html)
- [Sheet 06 (Thiết bị 61-72)](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/sheet-06.html)
- [Sheet 07 (Thiết bị 73-84)](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/sheet-07.html)
- [Sheet 08 (Thiết bị 85-91)](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/sheet-08.html)

**Contact Sheets 16 Nhóm Đối Chiếu:**
- [Group 01: Smith Machine vs Squat Rack](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/group-01-smith-vs-squat.html)
- [Group 02: Leg Press vs Hack Squat vs Calf vs Hip Thrust vs Sled](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/group-02-legpress-hacksquat-calf-hipthrust-sled.html)
- [Group 03: Chest Press Variants](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/group-03-chestpress-variants.html)
- [Group 04: Shoulder Press vs Lateral Raise vs Shrug](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/group-04-shoulderpress-lateralraise-shrug.html)
- [Group 05: Row Variants](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/group-05-row-variants.html)
- [Group 06: Pulldown Variants](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/group-06-pulldown-variants.html)
- [Group 07: Hip Abduction vs Adduction vs Extension](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/group-07-hip-ab-ad-extension.html)
- [Group 08: Leg Extension vs Leg Curl vs Sissy Squat](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/group-08-legextension-legcurl-sissysquat.html)
- [Group 09: Chest Fly vs Pec Deck vs Reverse Fly](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/group-09-chestfly-pecdeck-reversefly.html)
- [Group 10: Hyperextension vs Reverse Hyper vs GHD vs Preacher](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/group-10-hyperextension-reversehyper-ghd-preacher.html)
- [Group 11: Pull-Up vs Dip vs Parallel Bars vs Parallettes](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/group-11-pullup-dip-parallel-parallettes.html)
- [Group 12: Stability Ball vs Medicine Ball vs BOSU](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/group-12-stability-medicine-bosu.html)
- [Group 13: Barbell vs EZ vs Cambered vs Trap Bar vs Landmine](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/group-13-barbell-ez-cambered-trap-landmine.html)
- [Group 14: Ankle Strap vs Ankle Weight vs Dip Belt vs Tricep Rope](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/group-14-anklestrap-ankleweight-dipbelt-triceprope.html)
- [Group 15: Dumbbell vs Grip Trainer](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/group-15-dumbbell-griptrainer.html)
- [Group 16: Cardio Machine Suite](file:///D:/GymAI-Coach/artifacts/equipment-image-regeneration/gemini-3.1-flash-image/contact-sheets/group-16-cardio-machines.html)
