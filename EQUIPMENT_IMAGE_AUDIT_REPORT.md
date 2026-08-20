# Báo Cáo Kiểm Tra Ảnh Và Tên Thiết Bị

Ngày kiểm tra: 20/08/2026  
Phạm vi: toàn bộ 107 bản ghi trong danh mục `equipment` hiện tại  
Hình thức: đọc dữ liệu và kiểm tra trực quan từng ảnh; không sửa database, tên hoặc file ảnh

## 1. Kết Luận Tổng Quan

| Kết luận | Số lượng | Tỷ lệ |
|---|---:|---:|
| Đạt | 32 | 29,9% |
| Cần ảnh chính xác hơn | 10 | 9,3% |
| Không đạt | 65 | 60,7% |
| **Tổng** | **107** | **100%** |

Tất cả 107 ảnh đều tải được, không có URL hỏng và đều có kích thước 800×600. Chất lượng trình bày khá đồng nhất: nền trắng/xám nhạt, vật thể tách nền, góc chụp sản phẩm. Tuy nhiên, độ chính xác ngữ nghĩa rất thấp: chỉ 32 ảnh mô tả đúng thiết bị; 65 ảnh đang hiển thị sai loại thiết bị và có thể khiến người dùng chọn nhầm.

Phát hiện kỹ thuật quan trọng:

- Có 22 nhóm ảnh trùng tuyệt đối theo SHA-256; đây không chỉ là ảnh gần giống mà là cùng một file ảnh được gán cho nhiều bản ghi.
- 25 bản ghi máy đòn bẩy/máy tập khác chức năng cùng dùng một ảnh máy ngồi chung chung.
- 8 bản ghi cardio cùng dùng ảnh máy chạy bộ; chỉ bản ghi Máy Chạy Bộ là đúng.
- 11 bản ghi xà, máy hỗ trợ, vòng thể dục và bodyweight cùng dùng ảnh xà đơn; chỉ hai bản ghi Xà Đơn là đúng.
- 6 bản ghi phụ kiện/bóng/thảm cùng dùng ảnh bóng tập; chỉ Bóng Tập là đúng.
- Một số cặp slug gạch ngang/gạch dưới là bản ghi trùng hợp lệ về ảnh nhưng vẫn là nợ dữ liệu: `incline_bench`/`incline-bench`, `leg_press`/`leg-press`, `pec_deck`/`pec-deck`, v.v.

Quy ước đánh giá:

- **Đạt**: nhìn ảnh có thể nhận diện đúng thiết bị được ghi trong tên.
- **Cần ảnh chính xác hơn**: ảnh gần đúng nhóm hoặc có thể dùng tạm, nhưng không thể hiện rõ biến thể/chức năng ghi trong tên.
- **Không đạt**: ảnh là thiết bị khác hoặc thiếu đặc điểm bắt buộc, có nguy cơ mapping sai.

## 2. Kiểm Tra Chi Tiết Từng Thiết Bị

### Phụ Kiện, Attachment, Dây Và Thanh

| # | Tên / slug | Kết luận | Đối chiếu ảnh với tên và yêu cầu thay |
|---:|---|---|---|
| 1 | Áo tạ (`weight-vest`) | **Không đạt** | Ảnh là tạ đơn. Cần ảnh áo vest có các túi/khối tạ trên thân áo. |
| 2 | Bánh Lăn Bụng (`ab-wheel`) | **Không đạt** | Ảnh là bóng tập. Cần bánh xe bụng có tay cầm hai bên. |
| 3 | Búa tạ (`sledgehammer`) | **Không đạt** | Ảnh là tạ đòn. Cần búa tập lốp cán dài, đầu búa lớn. |
| 4 | Con lăn cổ tay (`wrist-roller`) | **Không đạt** | Ảnh là thanh EZ/tạ cong. Cần thanh cuốn cổ tay có dây và điểm treo bánh tạ. |
| 5 | Con lăn xốp (`foam-roller`) | **Không đạt** | Ảnh là bóng tập. Cần ống foam roller hình trụ. |
| 6 | Đai đeo tạ (`dip-belt`) | **Không đạt** | Ảnh là tạ đơn. Cần đai hông kèm xích/dây móc bánh tạ. |
| 7 | Dây đập battle rope (`battle-rope`) | **Không đạt** | Ảnh là bộ dây kháng lực. Cần cặp dây thừng tập nặng, dài và đường kính lớn. |
| 8 | Dây đeo cổ chân (`ankle-strap`) | **Không đạt** | Ảnh là máy cáp. Cần ảnh riêng dây cuff/strap quấn cổ chân có khoen móc cáp. |
| 9 | Dây kéo cáp tricep (`tricep-rope`) | **Không đạt** | Ảnh là máy cáp, không phải phụ kiện rope. Cần dây thừng ngắn hai đầu chặn cao su và móc giữa. |
| 10 | Dây kháng lực (`resistance_band`) | **Đạt** | Ảnh đúng bộ dây kháng lực. Tuy nhiên trùng nội dung với #20. |
| 11 | Dây nhảy (`jump-rope`) | **Không đạt** | Ảnh là dây kháng lực. Cần dây nhảy có hai tay cầm và một sợi dây mảnh dài. |
| 12 | Dây treo TRX (`suspension-trainer`) | **Không đạt** | Ảnh là dây kháng lực. Cần hệ dây treo hai nhánh, khóa điều chỉnh và quai tay/chân. |
| 13 | Giá Squat (`squat-rack`) | **Cần ảnh chính xác hơn** | Ảnh là khung kiểu Smith/full rack và đang trùng #14, #104. Cần ảnh squat rack/free-weight rack thấy rõ J-cup, safety arm và không có thanh dẫn Smith. |
| 14 | Khung Squat (`squat_rack`) | **Cần ảnh chính xác hơn** | Có thể hiểu là rack, nhưng ảnh không phân biệt được rack tự do với Smith; còn là bản ghi gần trùng #13. |
| 15 | Lốp xe tập (`tire`) | **Không đạt** | Ảnh là thanh trap bar. Cần lốp tractor/training tire cỡ lớn. |
| 16 | Tạ đeo cổ chân (`ankle-weight`) | **Không đạt** | Ảnh là tạ đơn. Cần cặp tạ quấn cổ chân có khóa Velcro. |
| 17 | Thanh Parallettes (`parallettes`) | **Không đạt** | Ảnh là xà đơn cao. Cần cặp xà thấp đặt sàn. |
| 18 | Xích tạ (`chain`) | **Không đạt** | Ảnh là thanh EZ/tạ cong. Cần xích thép tập lực hoặc xích gắn tạ. |
| 19 | Thanh Landmine (`landmine`) | **Không đạt** | Ảnh chỉ là tạ đòn. Cần đế/khớp landmine giữ một đầu barbell hoặc ảnh đầy đủ barbell gắn khớp. |
| 20 | Dây kháng lực (`resistance-band`) | **Đạt** | Ảnh đúng dây kháng lực; là bản ghi/ảnh trùng #10. |
| 21 | Xà đơn (`pull_up_bar`) | **Đạt** | Ảnh đúng khung xà đơn; trùng alias #56. |

### Ghế Tập

| # | Tên / slug | Kết luận | Đối chiếu ảnh với tên và yêu cầu thay |
|---:|---|---|---|
| 22 | Ghế Hyperextension (`hyperextension-bench`) | **Không đạt** | Ảnh giống ghế preacher curl, thiếu đệm hông và chặn chân của hyperextension. |
| 23 | Ghế Nghiêng (`incline_bench`) | **Đạt** | Ảnh đúng ghế điều chỉnh dốc lên; trùng alias #24. |
| 24 | Ghế Nghiêng (`incline-bench`) | **Đạt** | Ảnh đúng ghế điều chỉnh dốc lên; là bản ghi/ảnh trùng #23. |
| 25 | Ghế Preacher (`preacher-bench`) | **Đạt** | Ảnh đúng ghế preacher với mặt đệm đỡ cánh tay; gần trùng #26. |
| 26 | Ghế Preacher Curl (`preacher-curl-bench`) | **Đạt** | Ảnh đúng ghế preacher curl; trùng ảnh #25 là hợp lý về loại nhưng dữ liệu tên gần trùng. |
| 27 | Ghế Tập (`bench`) | **Cần ảnh chính xác hơn** | Ảnh là ghế dốc/ghế bụng có chặn chân, không đại diện rõ ghế tập đa dụng hoặc ghế phẳng. Cần ảnh bench trung tính. |
| 28 | Ghế Tập Bụng (`ab-bench`) | **Đạt** | Ảnh đúng ghế dốc tập bụng có con lăn giữ chân. |
| 29 | Ghế Tập Nghiêng Dưới (`decline-bench`) | **Đạt** | Ảnh đúng kiểu ghế decline có chặn chân. |

### Bodyweight, Xà Và Máy Hỗ Trợ

| # | Tên / slug | Kết luận | Đối chiếu ảnh với tên và yêu cầu thay |
|---:|---|---|---|
| 30 | Khung Xà Kép (`dip_station`) | **Không đạt** | Ảnh chỉ thể hiện xà đơn cao, không có hai tay dip song song. |
| 31 | Máy Hỗ Trợ Dip (`assisted-dip-machine`) | **Không đạt** | Ảnh là xà đơn, thiếu bệ gối hỗ trợ và cụm tạ đối trọng. |
| 32 | Máy Hỗ Trợ Kéo Xà (`assisted-pull-up-machine`) | **Không đạt** | Ảnh là xà đơn thường, không có bệ hỗ trợ/weight stack. |
| 33 | Máy Hỗ Trợ Kéo Xà Tay Ngửa (`assisted-chin-up-machine`) | **Không đạt** | Ảnh là xà đơn thường, không thể hiện máy hỗ trợ hoặc tay cầm chin-up. |
| 34 | Trọng lượng cơ thể (`bodyweight`) | **Không đạt** | Ảnh là xà đơn nên biến “không dụng cụ” thành một dụng cụ cụ thể. Nên dùng silhouette người tập hoặc không dùng ảnh thiết bị. |
| 35 | Vòng thể dục (`gymnastic-rings`) | **Không đạt** | Ảnh là xà đơn, không có hai vòng treo và dây đai. |
| 36 | Xà song song (`parallel-bars`) | **Không đạt** | Ảnh là xà đơn, không có hai thanh song song. |

### Máy Cardio

| # | Tên / slug | Kết luận | Đối chiếu ảnh với tên và yêu cầu thay |
|---:|---|---|---|
| 37 | Máy chạy bộ (`treadmill`) | **Đạt** | Ảnh đúng máy chạy bộ. Tên nên chuẩn hóa Title Case thành “Máy Chạy Bộ”. |
| 38 | Máy Chèo Thuyền (`rowing-machine`) | **Không đạt** | Ảnh là máy chạy bộ. Cần rowing ergometer với ray trượt, ghế và tay kéo. |
| 39 | Máy Chèo Thuyền (`rowing_machine`) | **Không đạt** | Ảnh là máy chạy bộ; là bản ghi trùng #38 nhưng cả hai đều sai ảnh. |
| 40 | Máy đạp tay (`upper-body-ergometer`) | **Không đạt** | Ảnh là máy chạy bộ. Cần upper-body ergometer có tay quay ngang tầm ngực. |
| 41 | Máy elliptical (`elliptical`) | **Không đạt** | Ảnh là máy chạy bộ. Cần máy elliptical có hai bàn đạp elip và tay đòn dài. |
| 42 | Máy leo cầu thang (`stepmill`) | **Không đạt** | Ảnh là máy chạy bộ. Cần máy bậc thang quay/stepmill. |
| 43 | Máy trượt tuyết (`skierg`) | **Không đạt** | Ảnh là máy chạy bộ. Cần SkiErg dạng khung đứng với hai dây kéo tay. |
| 44 | Xe đạp tập (`stationary-bike`) | **Không đạt** | Ảnh là máy chạy bộ. Cần xe đạp cố định với yên, bàn đạp và tay lái. |

### Tạ Tự Do

| # | Tên / slug | Kết luận | Đối chiếu ảnh với tên và yêu cầu thay |
|---:|---|---|---|
| 45 | Bóng tạ (`medicine-ball`) | **Không đạt** | Ảnh là bóng tập cỡ lớn. Cần medicine ball nhỏ, nặng, thường có số kg trên bề mặt. |
| 46 | Đĩa Tạ (`weight-plate`) | **Không đạt** | Ảnh là cả thanh trap bar đã lắp bánh tạ. Cần một hoặc một bộ đĩa tạ tách riêng, nhìn rõ lỗ tâm. |
| 47 | Tạ Ấm (`kettlebell`) | **Đạt** | Ảnh đúng kettlebell có tay cầm liền khối. |
| 48 | Tạ Đòn (`barbell`) | **Đạt** | Ảnh đúng thanh barbell đã lắp bánh tạ. |
| 49 | Tạ Đơn (`dumbbell`) | **Đạt** | Ảnh đúng dumbbell. |
| 50 | Thanh EZ (`ez-bar`) | **Đạt** | Ảnh đúng thanh EZ curl có đoạn cầm gấp khúc. |
| 51 | Thanh Tạ Cong (`cambered-bar`) | **Cần ảnh chính xác hơn** | Ảnh là thanh EZ curl. Nếu danh mục muốn cambered bar chuyên dụng, cần ảnh thanh có độ võng/camber rõ; nếu thực chất là EZ Bar thì nên gộp tên/mapping với #50. |
| 52 | Thanh Trap (`trap-bar`) | **Đạt** | Ảnh đúng trap/hex bar. |

### Bóng, Thảm Và Nội Thất Tập

| # | Tên / slug | Kết luận | Đối chiếu ảnh với tên và yêu cầu thay |
|---:|---|---|---|
| 53 | Bóng BOSU (`bosu`) | **Không đạt** | Ảnh là bóng stability hình cầu. Cần BOSU nửa cầu có mặt đế phẳng. |
| 54 | Bóng tập (`stability-ball`) | **Đạt** | Ảnh đúng bóng stability/Swiss ball. Tên nên chuẩn hóa thành “Bóng Tập”. |
| 55 | Thảm tập (`exercise-mat`) | **Không đạt** | Ảnh là bóng tập. Cần thảm yoga/exercise mat trải phẳng hoặc cuộn. |
| 56 | Xà đơn (`pull-up-bar`) | **Đạt** | Ảnh đúng khung xà đơn; trùng alias #21. Tên nên chuẩn hóa “Xà Đơn”. |
| 57 | Xà kép (`dip-station`) | **Không đạt** | Ảnh là xà đơn, không thấy tay cầm dip song song. |

### Máy Cáp Và Máy Tập

| # | Tên / slug | Kết luận | Đối chiếu ảnh với tên và yêu cầu thay |
|---:|---|---|---|
| 58 | Máy cáp (`cable`) | **Đạt** | Ảnh đúng một trụ máy cáp có puly và weight stack; tên nên chuẩn hóa “Máy Cáp”. |
| 59 | Máy Chèo Cao Đòn Bẩy (`lever-high-row-machine`) | **Không đạt** | Ảnh máy ngồi chung chung, không thấy quỹ đạo high row/tay kéo từ cao xuống. |
| 60 | Máy Chèo Cúi Người Đòn Bẩy (`lever-bent-over-row-machine`) | **Không đạt** | Ảnh máy ngồi chung chung, không phải máy row cúi người có đệm ngực hoặc tay kéo thấp. |
| 61 | Máy Chèo Ngồi Đòn Bẩy (`lever-seated-row-machine`) | **Không đạt** | Ảnh không thể hiện tay kéo ngang và bệ chân của seated row. |
| 62 | Máy Chèo T-Bar Đòn Bẩy (`lever-t-bar-row-machine`) | **Không đạt** | Ảnh không có thanh T-bar, đệm ngực hoặc tay cầm row đặc trưng. |
| 63 | Máy Cuốn Đùi Sau (`leg_curl`) | **Đạt** | Ảnh đúng máy leg curl nằm sấp; trùng alias #64. |
| 64 | Máy Cuốn Đùi Sau (`leg-curl`) | **Đạt** | Ảnh đúng máy leg curl; là bản ghi/ảnh trùng #63. |
| 65 | Máy Cuốn Tay Trước Đòn Bẩy (`lever-biceps-curl-machine`) | **Không đạt** | Ảnh không có đệm preacher và tay đòn curl phía trước. |
| 66 | Máy Cuốn Tay Trước Ghế Preacher Đòn Bẩy (`lever-preacher-curl-machine`) | **Không đạt** | Ảnh không có mặt đệm đỡ cánh tay lớn và tay đòn curl. |
| 67 | Máy Dạng Đùi Đòn Bẩy (`lever-hip-abduction-machine`) | **Không đạt** | Ảnh không có hai đệm tỳ ngoài đùi và cơ cấu mở chân. |
| 68 | Máy Đạp Đùi (`leg-press`) | **Đạt** | Ảnh đúng máy leg press 45 độ; trùng alias #69. |
| 69 | Máy Đạp Đùi (`leg_press`) | **Đạt** | Ảnh đúng máy leg press; là bản ghi/ảnh trùng #68. |
| 70 | Máy Đẩy Hông (`hip-thrust-machine`) | **Không đạt** | Ảnh là máy leg press/hack squat, không có đệm hông và bệ chân của hip thrust machine. |
| 71 | Máy Đẩy Ngực (`chest_press`) | **Cần ảnh chính xác hơn** | Ảnh là máy ngồi selectorized chung; có thể gần chest press nhưng tay đòn/quỹ đạo không đủ rõ và đang trùng 24 thiết bị khác. |
| 72 | Máy Đẩy Ngực Dốc Lên Đòn Bẩy (`lever-incline-chest-press-machine`) | **Không đạt** | Ảnh không thể hiện ghế dốc lên và tay đòn press hướng chéo lên. |
| 73 | Máy Đẩy Ngực Dốc Xuống Đòn Bẩy (`lever-decline-chest-press-machine`) | **Không đạt** | Ảnh không thể hiện ghế/quỹ đạo decline press. |
| 74 | Máy Đẩy Ngực Đòn Bẩy (`lever-chest-press-machine`) | **Cần ảnh chính xác hơn** | Ảnh có thể là máy press nhưng không nhận diện được cơ cấu lever chest press; cần ảnh chuyên biệt, tốt nhất thấy tay đòn và vị trí tay cầm ngang ngực. |
| 75 | Máy Đẩy Vai (`shoulder_press`) | **Cần ảnh chính xác hơn** | Ảnh máy ngồi chung không thấy rõ tay cầm xuất phát ngang vai và quỹ đạo đẩy lên đầu. |
| 76 | Máy Đẩy Vai (`shoulder-press-machine`) | **Cần ảnh chính xác hơn** | Cùng ảnh #75 và nhiều máy khác; cần ảnh shoulder press rõ cơ cấu. Đây cũng là bản ghi gần trùng #75. |
| 77 | Máy Đẩy Vai Đòn Bẩy (`lever-shoulder-press-machine`) | **Không đạt** | Ảnh không thể hiện lever/plate-loaded shoulder press. |
| 78 | Máy Duỗi Đùi Trước (`leg_extension`) | **Đạt** | Ảnh đúng máy leg extension với con lăn trước cổ chân; trùng alias #79. |
| 79 | Máy Duỗi Đùi Trước (`leg-extension`) | **Đạt** | Ảnh đúng máy leg extension; là bản ghi/ảnh trùng #78. |
| 80 | Máy Duỗi Hông Đòn Bẩy (`lever-hip-extension-machine`) | **Không đạt** | Ảnh máy ngồi chung, không có đệm/tay đòn tác động hip extension. |
| 81 | Máy Duỗi Lưng Ngược (`reverse-hyper`) | **Không đạt** | Ảnh là ghế preacher, không có mặt bàn cao và con lắc giữ chân của reverse hyper. |
| 82 | Máy Duỗi Tay Sau Đòn Bẩy (`lever-triceps-extension-machine`) | **Không đạt** | Ảnh không có đệm tay và tay đòn triceps extension. |
| 83 | Máy Ép Ngực (`chest-fly-machine`) | **Đạt** | Ảnh là máy pec-deck/chest-fly đa trạm và có cơ cấu ép ngực nhận diện được; nên chọn crop rõ trạm fly hơn. |
| 84 | Máy Ép Ngực Pec Deck (`pec-deck`) | **Đạt** | Ảnh đúng pec deck/chest fly; trùng alias #85. |
| 85 | Máy Ép Ngực Pec Deck (`pec_deck`) | **Đạt** | Ảnh đúng pec deck; là bản ghi/ảnh trùng #84. |
| 86 | Máy Ép Vai Sau Đòn Bẩy (`lever-reverse-fly-machine`) | **Không đạt** | Ảnh máy ngồi chung, không thể hiện tay đòn reverse fly hoặc tư thế quay mặt vào đệm. |
| 87 | Máy Gập Bụng Ngồi Đòn Bẩy (`lever-seated-ab-crunch-machine`) | **Không đạt** | Ảnh thiếu đệm vai/tay cầm và cơ cấu gập thân của ab crunch machine. |
| 88 | Máy Gập Hông Ngồi Đòn Bẩy (`lever-seated-good-morning-machine`) | **Không đạt** | Ảnh không thể hiện đệm vai/tay đòn cho seated good morning. |
| 89 | Máy GHD (Tập Đùi Sau Và Mông) (`ghd`) | **Không đạt** | Ảnh là ghế preacher; cần GHD với đệm hông đôi, bệ chân và khóa gót. |
| 90 | Máy GHR (Cuốn Đùi Sau) (`glute-ham-raise`) | **Không đạt** | Cùng ảnh preacher #89; cần máy glute-ham raise/GHD đúng cấu tạo. |
| 91 | Máy Hack Squat (`hack_squat`) | **Đạt** | Ảnh đúng máy hack squat plate-loaded; trùng alias #92. |
| 92 | Máy Hack Squat (`hack-squat`) | **Đạt** | Ảnh đúng hack squat; là bản ghi/ảnh trùng #91. |
| 93 | Máy Kéo Xô (`lat_pulldown`) | **Đạt** | Ảnh đúng máy lat pulldown với thanh kéo cao; trùng alias #94. |
| 94 | Máy Kéo Xô (`lat-pulldown`) | **Đạt** | Ảnh đúng lat pulldown; là bản ghi/ảnh trùng #93. |
| 95 | Máy Kéo Xô Đòn Bẩy (`lever-lat-pulldown-machine`) | **Không đạt** | Ảnh không có tay đòn kéo từ trên cao hoặc đặc điểm plate-loaded lat pulldown. |
| 96 | Máy Kéo Xô Qua Đầu Đòn Bẩy (`lever-pullover-machine`) | **Không đạt** | Ảnh không thể hiện tay đòn pullover vòng qua đầu và đệm giữ thân. |
| 97 | Máy Khép Đùi Đòn Bẩy (`lever-hip-adduction-machine`) | **Không đạt** | Ảnh không có hai đệm tỳ trong đùi và cơ cấu khép chân. |
| 98 | Máy Nâng Gót Bắp Chân (`calf-raise`) | **Không đạt** | Ảnh là leg press/hack squat, không phải standing/seated calf raise chuyên dụng. |
| 99 | Máy Nâng Gót Bắp Chân (`calf-machine`) | **Không đạt** | Cùng ảnh sai #98; là bản ghi gần trùng nhưng không có ảnh calf machine. |
| 100 | Máy Nâng Vai Ngang Đòn Bẩy (`lever-lateral-raise-machine`) | **Không đạt** | Ảnh không có đệm tỳ khuỷu và tay đòn nâng sang ngang. |
| 101 | Máy Nhún Tay Sau Ngồi Đòn Bẩy (`lever-seated-dip-machine`) | **Cần ảnh chính xác hơn** | Ảnh máy ngồi chung có thể gần máy dip nhưng không thấy rõ tay cầm hai bên và quỹ đạo nhấn xuống; cần ảnh chuyên biệt. |
| 102 | Máy Nhún Vai Đòn Bẩy (`lever-shrug-machine`) | **Không đạt** | Ảnh không có tay cầm thấp/tay đòn và vị trí đứng hoặc ngồi thực hiện shrug. |
| 103 | Máy Sissy Squat (`sissy-squat-machine`) | **Không đạt** | Ảnh là máy leg extension. Cần bệ sissy squat có khóa cẳng chân/bắp chân và đệm sau gối. |
| 104 | Máy Smith (`smith-machine`) | **Đạt** | Ảnh nhận diện được khung Smith/thanh dẫn. Tuy nhiên cùng file đang gán cho Giá Squat và Khung Squat, làm mất phân biệt giữa ba loại. |
| 105 | Máy Tập Đa Năng (`machine`) | **Cần ảnh chính xác hơn** | Ảnh chỉ là một máy ngồi đơn trạm; chưa thể hiện “đa năng”. Cần multi-gym có nhiều trạm/chức năng hoặc đổi tên theo đúng máy trong ảnh. |
| 106 | Xe Kéo Tạ (`sled`) | **Không đạt** | Ảnh là leg press/hack squat. Cần weight sled/prowler có càng đẩy và cọc lắp bánh tạ. |
| 107 | Dụng cụ tập grip (`dung-cu-tap-grip`) | **Không đạt** | Ảnh là tạ đơn. Cần hand gripper, grip ring, pinch block hoặc dụng cụ bóp tay đúng loại. Tên tiếng Anh `dung cu tap grip` cũng không đạt chuẩn. |

## 3. Vấn Đề Về Tên Và Dữ Liệu Danh Mục

Ngoài ảnh sai, tên hiện tại còn các vấn đề cần xử lý cùng đợt chuẩn hóa:

1. **Viết hoa không đồng nhất**: “Áo tạ”, “Búa tạ”, “Con lăn cổ tay”, “Máy chạy bộ”, “Máy đạp tay”, “Máy elliptical”, “Máy leo cầu thang”, “Máy trượt tuyết”, “Xe đạp tập”, “Bóng tập”, “Thảm tập”, “Xà đơn”, “Xà kép”, “Máy cáp” chưa theo quy tắc viết hoa chữ đầu từng từ mà hệ thống đang yêu cầu.
2. **Trộn Việt–Anh thiếu nhất quán**: “Dây đập battle rope”, “Máy elliptical”, “Thanh Parallettes”, “Thanh Landmine”. Nên chọn một tên Việt chính thức và giữ thuật ngữ Anh trong ngoặc khi cần.
3. **Tên tiếng Anh sai chuẩn**: bản ghi #107 dùng `dung cu tap grip`, không phải tên tiếng Anh tự nhiên; đề xuất `Grip Trainer` hoặc tên cụ thể hơn theo ảnh thật.
4. **Alias/bản ghi trùng**: các cặp slug dùng `_` và `-` đang tồn tại song song. Việc dùng cùng ảnh là hợp lý nếu chúng thực sự là alias, nhưng nên hợp nhất ID/mapping thay vì hiển thị hai lựa chọn cho người dùng.
5. **Tên quá rộng**: `Bench`, `Machine`, `Bodyweight` không đủ cụ thể để chọn ảnh duy nhất. Cần quy ước ảnh đại diện hoặc đổi thành loại thiết bị rõ ràng hơn.

## 4. Thứ Tự Ưu Tiên Khắc Phục

### P0 — thay ngay vì ảnh hoàn toàn sai và ảnh hưởng chọn bài tập

- Toàn bộ cardio #38–#44.
- Toàn bộ nhóm máy đòn bẩy đang dùng ảnh chung: #59–#62, #65–#67, #72–#73, #77, #80, #82, #86–#88, #95–#97, #100, #102.
- Nhóm máy hỗ trợ/bodyweight #30–#36.
- Các máy chuyên dụng bị thay bằng thiết bị khác: #70, #81, #89–#90, #98–#99, #103, #106.
- Các phụ kiện sai hoàn toàn: #1–#9, #11–#12, #15–#19, #107.

### P1 — thay để tránh nhầm biến thể

- Squat rack/Smith #13, #14, #104 phải có ba ảnh phân biệt rõ nếu vẫn giữ ba bản ghi.
- Bench chung #27, Cambered Bar #51, Chest/Shoulder Press #71, #74–#76, Seated Dip #101 và Máy Tập Đa Năng #105.
- Weight Plate #46 cần ảnh đĩa tạ độc lập để hỗ trợ nhận diện số lượng/trọng lượng.

### P2 — dọn dữ liệu sau khi ảnh đã đúng

- Hợp nhất alias `_`/`-` và bảo toàn mapping bài tập.
- Chuẩn hóa Title Case tiếng Việt.
- Định nghĩa một từ điển tên chính thức Việt/Anh/slug để luồng LLM nhận diện ảnh chỉ trả về ID canonical.

## 5. Tiêu Chuẩn Ảnh Đề Xuất Cho Lần Thay Tiếp Theo

- Mỗi ảnh chỉ chứa một loại thiết bị chính, không dùng một máy tổng quát cho các chức năng khác nhau.
- Nền trắng hoặc xám rất nhạt, ánh sáng studio, cùng tỷ lệ 4:3 và cùng góc chụp ba phần tư.
- Toàn bộ thiết bị nằm gọn trong khung, không cắt tay đòn, weight stack, bệ chân hay phụ kiện nhận diện.
- Không có người, logo thương hiệu nổi bật, chữ quảng cáo hoặc phụ kiện gây hiểu nhầm.
- Với biến thể máy đòn bẩy, ảnh phải cho thấy rõ vị trí ghế/đệm, hướng tay đòn, tay cầm và vùng cơ thể tiếp xúc.
- Với tạ đơn/đĩa tạ, ảnh chuẩn danh mục nên trung tính; ảnh do người dùng quét để nhập kho mới được dùng OCR/LLM xác định kg/lb và số lượng.

## 6. Bằng Chứng Kiểm Tra

- Dữ liệu kỹ thuật từng ảnh: `artifacts/equipment-image-audit/technical-audit.json`
- Nhóm ảnh trùng: `artifacts/equipment-image-audit/duplicate-groups.json`
- 9 bảng ảnh đã dùng để kiểm tra trực quan: `artifacts/equipment-image-audit/sheets/sheet-01.jpg` đến `sheet-09.jpg`
- Script kiểm tra chỉ đọc dữ liệu: `scripts/audit-equipment-images.ts`

Kết luận cuối: bộ ảnh hiện tại đạt yêu cầu đồng nhất về kích thước và phong cách, nhưng **chưa đạt yêu cầu nhận diện thiết bị**. Cần thay ít nhất 65 ảnh sai hoàn toàn và rà soát/chọn ảnh chuyên biệt hơn cho 10 bản ghi còn mơ hồ trước khi dùng ảnh cho lựa chọn thiết bị hoặc mapping bài tập.
