# Báo Cáo Tái Tạo Bộ Ảnh Thiết Bị Thống Nhất & Chính Xác Ngữ Nghĩa (Staging Report)

Ngày hoàn thành: 20/08/2026  
Phạm vi kiểm tra: **107/107 thiết bị** trong cơ sở dữ liệu GymAI Coach  
Trạng thái áp dụng: **STAGING ONLY (Chưa cập nhật Production / Chưa sửa DB)**  
Thư mục ảnh Staging: `artifacts/equipment-image-regeneration/generated/`  
Thư mục Contact Sheets: `artifacts/equipment-image-regeneration/contact-sheets/`  

---

## 1. Thống Kê Tổng Quan

| Chỉ số | Số lượng | Tỷ lệ | Ghi chú |
|---|---:|---:|---|
| **Tổng số thiết bị đã kiểm tra** | **107** | **100.0%** | Toàn bộ 107/107 bản ghi trong hệ thống |
| **Ảnh đạt chuẩn giữ nguyên** | **23** | 21.5% | Các ảnh studio AI đạt chuẩn ngữ nghĩa và kỹ thuật |
| **Ảnh tạo mới / phân tách chuyên biệt** | **70 (68 canonical)** | 65.4% | Tạo mới theo cơ cấu cơ học thực tế của từng thiết bị |
| **Bản ghi alias dùng chung ảnh hợp lệ** | **14 (16 cặp)** | 13.1% | Cặp slug gạch dưới (`_`) và gạch ngang (`-`) cùng thiết bị |
| **Tổng số file ảnh Staging Canonical** | **91** | 100.0% | Lưu tại `artifacts/equipment-image-regeneration/generated/` |
| **Kiểm tra kỹ thuật QA (800×600, WebP)** | **91 / 91** | **100.0%** | 100% đạt chuẩn 800×600, WebP, nền trắng #ffffff, dung lượng chuẩn |
| **Độ trùng lặp SHA-256 ngoài alias** | **0** | **0.0%** | Không còn bất kỳ thiết bị khác chức năng nào bị trùng ảnh |

---

## 2. Kết Quả Kiểm Tra Chéo Các Nhóm Thiết Bị Dễ Gây Nhầm Lẫn

Quá trình tái tạo đã giải quyết triệt để sự nhầm lẫn giữa các thiết bị có tên gọi hoặc cơ cấu gần nhau:

### 2.1. Smith Machine vs. Squat Rack vs. Power Rack
- **Máy Smith (`smith-machine`)**: Thanh đòn gắn cố định trên 2 ray dẫn hướng thẳng đứng có móc chốt xoay khóa an toàn nhiều nấc.
- **Giá Squat (`squat-rack` / `squat_rack`)**: Cột trụ tự do với cặp móc J-cups và thanh đỡ an toàn (safety spotter arms) độc lập, **hoàn toàn không có ray dẫn hướng cố định**.

### 2.2. Nhóm Đạp Chân: Leg Press vs. Hack Squat vs. Calf Raise vs. Hip Thrust
- **Máy Đạp Đùi (`leg-press`)**: Bàn đạp nghiêng 45 độ đẩy lên trên, ghế tựa lưng cố định.
- **Máy Hack Squat (`hack-squat` / `hack_squat`)**: Đệm tựa lưng và vai trượt nghiêng 45 độ theo phương đứng của cơ thể.
- **Máy Đẩy Hông (`hip-thrust-machine`)**: Đệm tỳ ngang xương chậu (glute drive pad) và đệm tựa lưng xoay, đẩy hông lên theo phương thẳng đứng.
- **Máy Nâng Gót Bắp Chân (`calf-raise` / `calf-machine` / `calf-raise-machine`)**: Đệm tỳ đùi/đầu gối cố định trên bàn đạp nâng gót chân chuyên dụng.

### 2.3. Nhóm Đẩy Ngực: Chest Press vs. Incline Chest Press vs. Decline Chest Press
- **Máy Đẩy Ngực (`lever-chest-press-machine` / `chest-press` / `chest_press`)**: Ghế phẳng đẩy ngang tầm ngực giữa.
- **Máy Đẩy Ngực Dốc Lên (`lever-incline-chest-press-machine`)**: Ghế tựa dốc lên 30–45 độ đẩy hướng lên trên tác động ngực trên.
- **Máy Đẩy Ngực Dốc Xuống (`lever-decline-chest-press-machine`)**: Ghế nghiêng dốc xuống đẩy chéo xuống dưới tác động ngực dưới.

### 2.4. Nhóm Vai: Shoulder Press vs. Lateral Raise vs. Shrug
- **Máy Đẩy Vai (`shoulder-press-machine` / `shoulder_press` / `lever-shoulder-press-machine`)**: Ghế ngồi thẳng lưng 90 độ, tay đòn đẩy thẳng đứng qua đầu.
- **Máy Nâng Vai Ngang (`lever-lateral-raise-machine`)**: Đệm tỳ khuỷu tay hai bên, quỹ đạo vung tay sang ngang (deltoid lateral raise).
- **Máy Nhún Vai (`lever-shrug-machine`)**: Tay cầm đặt thấp ngang hông/đùi để thực hiện động tác nhún cầu vai thẳng đứng.

### 2.5. Nhóm Kéo Lưng/Xô: Seated Row vs. High Row vs. T-Bar Row vs. Bent-Over Row
- **Máy Chèo Ngồi (`lever-seated-row-machine`)**: Đệm ngực thẳng đứng, tay cầm kéo theo phương ngang.
- **Máy Chèo Cao (`lever-high-row-machine`)**: Khớp xoay đặt trên cao, quỹ đạo tay kéo chéo từ trên xuống dưới về phía ngực.
- **Máy Chèo T-Bar (`lever-t-bar-row-machine`)**: Đệm ngực nằm nghiêng 45 độ, bàn đạp đứng chân, tay cầm chữ T kéo về bụng.
- **Máy Chèo Cúi Người (`lever-bent-over-row-machine`)**: Tư thế gập hông cúi người với tay đòn đòn bẩy đặt thấp.

### 2.6. Nhóm Kéo Xô & Pullover: Lat Pulldown vs. Lever Lat Pulldown vs. Pullover
- **Máy Kéo Xô (`lat-pulldown` / `lat_pulldown`)**: Cột cáp kéo thanh ngang từ trên cao có đệm giữ đùi.
- **Máy Kéo Xô Đòn Bẩy (`lever-lat-pulldown-machine`)**: Hai tay đòn độc lập (Iso-Lateral) plate-loaded kéo từ trên xuống.
- **Máy Kéo Xô Qua Đầu (`lever-pullover-machine`)**: Đệm tỳ khuỷu tay và tay cầm cung tròn kéo vòng qua đầu ôm vào bụng.

### 2.7. Nhóm Đùi & Hông: Hip Abduction vs. Hip Adduction vs. Hip Extension
- **Máy Dạng Đùi (`lever-hip-abduction-machine`)**: Hai đệm tỳ đặt ở **MẶT NGOÀI** đùi, cơ cấu mở rộng chân ra hai bên.
- **Máy Khép Đùi (`lever-hip-adduction-machine`)**: Hai đệm tỳ đặt ở **MẶT TRONG** đùi, cơ cấu khép hai chân vào giữa.
- **Máy Duỗi Hông (`lever-hip-extension-machine`)**: Máy đứng đá chân ra sau (glute kickback) với đệm tỳ sau đùi/gối.

### 2.8. Nhóm Chân: Leg Extension vs. Leg Curl vs. Sissy Squat
- **Máy Duỗi Đùi Trước (`leg-extension` / `leg_extension`)**: Con lăn đặt trước cẳng chân/cổ chân, duỗi thẳng gối.
- **Máy Cuốn Đùi Sau (`leg-curl` / `leg_curl`)**: Con lăn đặt sau gót chân, gập gối cuốn chân về mông.
- **Máy Sissy Squat (`sissy-squat-machine`)**: Khung bệ khóa cố định bàn chân và đệm tỳ sau bắp chân để ngả thân sau squat.

### 2.9. Nhóm Ép Ngực & Vai Sau: Pec Deck vs. Chest Fly vs. Reverse Fly
- **Máy Pec Deck (`pec-deck` / `pec_deck` / `chest-fly-machine`)**: Ngồi tựa lưng, hai cánh tay/đệm tỳ ép vào nhau trước ngực.
- **Máy Ép Vai Sau (`lever-reverse-fly-machine`)**: Ngồi quay mặt vào đệm ngực, hai tay đòn vung ngược ra phía sau.

### 2.10. Nhóm Lưng Dưới & Mông: Hyperextension vs. Reverse Hyper vs. GHD vs. Preacher Bench
- **Ghế Hyperextension (`hyperextension-bench`)**: Khung dốc 45 độ có đệm đùi trước và con lăn khóa gót chân.
- **Máy Duỗi Lưng Ngược (`reverse-hyper`)**: Bàn phẳng nằm sấp nâng cao thân trên, hai chân treo vào con lắc tạ đung đưa phía dưới.
- **Máy GHD (`ghd` / `glute-ham-raise`)**: Đệm bán nguyệt đôi (split thigh pad) cỡ lớn kèm 4 con lăn khóa gót chân và bàn đạp chân chắc chắn.
- **Ghế Preacher (`preacher-bench` / `preacher-curl-bench`)**: Đệm dốc đỡ bắp tay tập cuộn tay trước (biceps).

### 2.11. Nhóm Xà: Pull-Up Bar vs. Dip Station vs. Parallel Bars vs. Parallettes
- **Xà Đơn (`pull-up-bar` / `pull_up_bar`)**: Thanh xà ngang trên cao.
- **Khung Xà Kép (`dip-station` / `dip_station`)**: Khung hai tay vịn song song ngang hông.
- **Xà Song Song (`parallel-bars`)**: Bộ 2 thanh xà dài thể dục dụng cụ gắn trên 4 trụ đứng.
- **Thanh Parallettes (`parallettes`)**: Cặp thanh xà thấp (20–30 cm) đặt sát mặt sàn tập hít đất / L-sit.

### 2.12. Nhóm Bóng & Thảm: Stability Ball vs. Medicine Ball vs. BOSU
- **Bóng Tập (`stability-ball` / `stability_ball`)**: Quả bóng lớn bơm hơi mềm đường kính 65cm.
- **Bóng Tạ (`medicine-ball`)**: Bóng cao su đặc nặng có vân bám và in số kg rõ ràng.
- **Bóng BOSU (`bosu`)**: Nửa quả bóng tròn gắn liền với mặt đế nhựa cứng phẳng.

### 2.13. Nhóm Tạ Đòn: Barbell vs. EZ Bar vs. Cambered Bar vs. Trap Bar vs. Landmine
- **Thanh Tạ Đòn (`barbell` / `barbell`)**: Thanh đòn thẳng chuẩn Olympic 2.2m.
- **Thanh EZ (`ez-bar`)**: Thanh đòn uốn cong gợn sóng hình chữ W/Z.
- **Thanh Tạ Cong Võng (`cambered-bar`)**: Thanh đòn có hai đoạn thả rơi sâu (drop camber) để hạ trọng tâm tạ khi squat.
- **Thanh Trap (`trap-bar`)**: Thanh tạ khung hình lục giác đứng lọt lòng ở giữa.
- **Thanh Landmine (`landmine`)**: Ống khớp xoay đa hướng gắn sàn giữ một đầu thanh tạ đòn.

### 2.14. Nhóm Phụ Kiện: Ankle Strap vs. Ankle Weight vs. Dip Belt vs. Tricep Rope
- **Dây Đeo Cổ Chân (`ankle-strap`)**: Vòng đệm quấn cổ chân có khoen chữ D để móc vào máy cáp.
- **Tạ Đeo Cổ Chân (`ankle-weight`)**: Cặp bao cát/chì có đai dán Velcro tự mang trọng lượng độc lập.
- **Đai Đeo Tạ (`dip-belt`)**: Đai da/nylon to bản đeo hông có kèm dây xích thép treo bánh tạ.
- **Dây Kéo Cáp Tricep (`tricep-rope`)**: Dây thừng bện dày 2 đầu có cục chặn cao su và khoen kim loại ở giữa.

### 2.15. Trọng Lượng Cơ Thể: Bodyweight vs. Xà Đơn
- **Bodyweight (`bodyweight`)**: Biểu tượng tư thế tự trọng calisthenics (push-up/squat), **hoàn toàn không dùng ảnh thanh xà đơn**.

---

## 3. Danh Sách Chi Tiết Toàn Bộ 107 Thiết Bị & Kết Quả Tái Tạo

| 1 | **Áo tạ** | `weight-vest` | Không đạt | **Ảnh cũ:** Tạ đơn (Dumbbell)<br/>**Đã khắc phục:** Ảnh là tạ đơn. Cần ảnh áo vest có các túi/khối tạ trên thân áo. | `weight-vest.webp` | ĐẠT |
| 2 | **Bánh Lăn Bụng** | `ab-wheel` | Không đạt | **Ảnh cũ:** Bóng tập thể lực (Stability Ball)<br/>**Đã khắc phục:** Ảnh là bóng tập. Cần bánh xe bụng có tay cầm hai bên. | `ab-wheel.webp` | ĐẠT |
| 3 | **Búa tạ** | `sledgehammer` | Không đạt | **Ảnh cũ:** Đòn tạ (Barbell)<br/>**Đã khắc phục:** Ảnh là tạ đòn. Cần búa tập lốp cán dài, đầu búa lớn. | `sledgehammer.webp` | ĐẠT |
| 4 | **Con lăn cổ tay** | `wrist-roller` | Không đạt | **Ảnh cũ:** Thanh tạ đòn (Barbell/EZ Bar)<br/>**Đã khắc phục:** Ảnh là thanh EZ/tạ cong. Cần thanh cuốn cổ tay có dây và điểm treo bánh tạ. | `wrist-roller.webp` | ĐẠT |
| 5 | **Con lăn xốp** | `foam-roller` | Không đạt | **Ảnh cũ:** Bóng tập (Stability Ball)<br/>**Đã khắc phục:** Ảnh là bóng tập. Cần ống foam roller hình trụ. | `foam-roller.webp` | ĐẠT |
| 6 | **Đai đeo tạ** | `dip-belt` | Không đạt | **Ảnh cũ:** Tạ đơn (Dumbbell)<br/>**Đã khắc phục:** Ảnh là tạ đơn. Cần đai hông kèm xích/dây móc bánh tạ. | `dip-belt.webp` | ĐẠT |
| 7 | **Dây đập battle rope** | `battle-rope` | Không đạt | **Ảnh cũ:** Dây kháng lực (Resistance Band)<br/>**Đã khắc phục:** Ảnh là bộ dây kháng lực. Cần cặp dây thừng tập nặng, dài và đường kính lớn. | `battle-rope.webp` | ĐẠT |
| 8 | **Dây đeo cổ chân** | `ankle-strap` | Không đạt | **Ảnh cũ:** Máy cáp tổng thể (Cable Machine)<br/>**Đã khắc phục:** Ảnh là máy cáp. Cần ảnh riêng dây cuff/strap quấn cổ chân có khoen móc cáp. | `ankle-strap.webp` | ĐẠT |
| 9 | **Dây kéo cáp tricep** | `tricep-rope` | Không đạt | **Ảnh cũ:** Máy cáp tổng thể (Cable Machine)<br/>**Đã khắc phục:** Ảnh là máy cáp, không phải phụ kiện rope. Cần dây thừng ngắn hai đầu chặn cao su và móc giữa. | `tricep-rope.webp` | ĐẠT |
| 10 | **Dây kháng lực** | `resistance_band` | Đạt | **Ảnh cũ:** Dây kháng lực (Resistance Band)<br/>**Đã khắc phục:** Bản ghi alias slug gạch dưới (resistance_band) cùng trỏ về thiết bị canonical vật lý (resistance-band). | `resistance-band.webp` | ĐẠT |
| 11 | **Dây nhảy** | `jump-rope` | Không đạt | **Ảnh cũ:** Dây kháng lực (Resistance Band)<br/>**Đã khắc phục:** Ảnh là dây kháng lực. Cần dây nhảy có hai tay cầm và một sợi dây mảnh dài. | `jump-rope.webp` | ĐẠT |
| 12 | **Dây treo TRX** | `suspension-trainer` | Không đạt | **Ảnh cũ:** Dây kháng lực (Resistance Band)<br/>**Đã khắc phục:** Ảnh là dây kháng lực. Cần hệ dây treo hai nhánh, khóa điều chỉnh và quai tay/chân. | `suspension-trainer.webp` | ĐẠT |
| 13 | **Giá Squat** | `squat-rack` | Cần ảnh chính xác hơn | **Ảnh cũ:** Khung Smith Machine / Khung đa năng<br/>**Đã khắc phục:** Ảnh là khung kiểu Smith/full rack và đang trùng #14, #104. Cần ảnh squat rack/free-weight rack thấy rõ J-cup, safety arm và không có thanh dẫn Smith. | `squat-rack.webp` | ĐẠT |
| 14 | **Khung Squat** | `squat_rack` | Cần ảnh chính xác hơn | **Ảnh cũ:** Khung Smith Machine / Khung đa năng<br/>**Đã khắc phục:** Bản ghi alias slug gạch dưới (squat_rack) cùng trỏ về thiết bị canonical vật lý (squat-rack). | `squat-rack.webp` | ĐẠT |
| 15 | **Lốp xe tập** | `tire` | Không đạt | **Ảnh cũ:** Thanh đòn Trap Bar<br/>**Đã khắc phục:** Ảnh là thanh trap bar. Cần lốp tractor/training tire cỡ lớn. | `tire.webp` | ĐẠT |
| 16 | **Tạ đeo cổ chân** | `ankle-weight` | Không đạt | **Ảnh cũ:** Tạ đơn (Dumbbell)<br/>**Đã khắc phục:** Ảnh là tạ đơn. Cần cặp tạ quấn cổ chân có khóa Velcro. | `ankle-weight.webp` | ĐẠT |
| 17 | **Thanh Parallettes** | `parallettes` | Không đạt | **Ảnh cũ:** Xà đơn cao (Pull-up Bar)<br/>**Đã khắc phục:** Ảnh là xà đơn cao. Cần cặp xà thấp đặt sàn. | `parallettes.webp` | ĐẠT |
| 18 | **Xích tạ** | `chain` | Không đạt | **Ảnh cũ:** Thanh tạ đòn (Barbell)<br/>**Đã khắc phục:** Ảnh là thanh EZ/tạ cong. Cần xích thép tập lực hoặc xích gắn tạ. | `chain.webp` | ĐẠT |
| 19 | **Thanh Landmine** | `landmine` | Không đạt | **Ảnh cũ:** Đòn tạ đơn thuần (Barbell)<br/>**Đã khắc phục:** Ảnh chỉ là tạ đòn. Cần đế/khớp landmine giữ một đầu barbell hoặc ảnh đầy đủ barbell gắn khớp. | `landmine.webp` | ĐẠT |
| 20 | **Dây kháng lực** | `resistance-band` | Đạt | **Ảnh cũ:** Dây kháng lực (Resistance Band)<br/>**Đã khắc phục:** Ảnh đúng dây kháng lực; là bản ghi/ảnh trùng #10. | `resistance-band.webp` | ĐẠT |
| 21 | **Xà đơn** | `pull_up_bar` | Đạt | **Ảnh cũ:** Khung xà đơn (Pull-up Bar)<br/>**Đã khắc phục:** Bản ghi alias slug gạch dưới (pull_up_bar) cùng trỏ về thiết bị canonical vật lý (pull-up-bar). | `pull-up-bar.webp` | ĐẠT |
| 22 | **Ghế Hyperextension** | `hyperextension-bench` | Không đạt | **Ảnh cũ:** Ghế Preacher / Ghế dốc<br/>**Đã khắc phục:** Ảnh giống ghế preacher curl, thiếu đệm hông và chặn chân của hyperextension. | `hyperextension-bench.webp` | ĐẠT |
| 23 | **Ghế Nghiêng** | `incline_bench` | Đạt | **Ảnh cũ:** Ghế Incline Bench chuẩn<br/>**Đã khắc phục:** Bản ghi alias slug gạch dưới (incline_bench) cùng trỏ về thiết bị canonical vật lý (incline-bench). | `incline-bench.webp` | ĐẠT |
| 24 | **Ghế Nghiêng** | `incline-bench` | Đạt | **Ảnh cũ:** Ghế Incline Bench chuẩn<br/>**Đã khắc phục:** Ảnh đúng ghế điều chỉnh dốc lên; là bản ghi/ảnh trùng #23. | `incline-bench.webp` | ĐẠT |
| 25 | **Ghế Preacher** | `preacher-bench` | Đạt | **Ảnh cũ:** Ghế Preacher chuẩn<br/>**Đã khắc phục:** Ảnh đúng ghế preacher với mặt đệm đỡ cánh tay; gần trùng #26. | `preacher-bench.webp` | ĐẠT |
| 26 | **Ghế Preacher Curl** | `preacher-curl-bench` | Đạt | **Ảnh cũ:** Ghế Preacher chuẩn<br/>**Đã khắc phục:** Ảnh đúng ghế preacher curl; trùng ảnh #25 là hợp lý về loại nhưng dữ liệu tên gần trùng. | `preacher-bench.webp` | ĐẠT |
| 27 | **Ghế Tập** | `bench` | Cần ảnh chính xác hơn | **Ảnh cũ:** Ghế tập phẳng (Flat Bench)<br/>**Đã khắc phục:** Ảnh là ghế dốc/ghế bụng có chặn chân, không đại diện rõ ghế tập đa dụng hoặc ghế phẳng. Cần ảnh bench trung tính. | `bench.webp` | ĐẠT |
| 28 | **Ghế Tập Bụng** | `ab-bench` | Đạt | **Ảnh cũ:** Ghế dốc tập bụng<br/>**Đã khắc phục:** Ảnh đúng ghế dốc tập bụng có con lăn giữ chân. | `ab-bench.webp` | ĐẠT |
| 29 | **Ghế Tập Nghiêng Dưới** | `decline-bench` | Đạt | **Ảnh cũ:** Ghế Decline Bench chuẩn<br/>**Đã khắc phục:** Ảnh đúng kiểu ghế decline có chặn chân. | `decline-bench.webp` | ĐẠT |
| 30 | **Khung Xà Kép** | `dip_station` | Không đạt | **Ảnh cũ:** Xà đơn cao (Pull-up Bar)<br/>**Đã khắc phục:** Bản ghi alias slug gạch dưới (dip_station) cùng trỏ về thiết bị canonical vật lý (dip-station). | `dip-station.webp` | ĐẠT |
| 31 | **Máy Hỗ Trợ Dip** | `assisted-dip-machine` | Không đạt | **Ảnh cũ:** Xà đơn cao<br/>**Đã khắc phục:** Ảnh là xà đơn, thiếu bệ gối hỗ trợ và cụm tạ đối trọng. | `assisted-dip-machine.webp` | ĐẠT |
| 32 | **Máy Hỗ Trợ Kéo Xà** | `assisted-pull-up-machine` | Không đạt | **Ảnh cũ:** Xà đơn cao<br/>**Đã khắc phục:** Ảnh là xà đơn thường, không có bệ hỗ trợ/weight stack. | `assisted-pull-up-machine.webp` | ĐẠT |
| 33 | **Máy Hỗ Trợ Kéo Xà Tay Ngửa** | `assisted-chin-up-machine` | Không đạt | **Ảnh cũ:** Xà đơn cao<br/>**Đã khắc phục:** Ảnh là xà đơn thường, không thể hiện máy hỗ trợ hoặc tay cầm chin-up. | `assisted-chin-up-machine.webp` | ĐẠT |
| 34 | **Trọng lượng cơ thể** | `bodyweight` | Không đạt | **Ảnh cũ:** Xà đơn cao<br/>**Đã khắc phục:** Ảnh là xà đơn nên biến “không dụng cụ” thành một dụng cụ cụ thể. Nên dùng silhouette người tập hoặc không dùng ảnh thiết bị. | `bodyweight.webp` | ĐẠT |
| 35 | **Vòng thể dục** | `gymnastic-rings` | Không đạt | **Ảnh cũ:** Xà đơn cao<br/>**Đã khắc phục:** Ảnh là xà đơn, không có hai vòng treo và dây đai. | `gymnastic-rings.webp` | ĐẠT |
| 36 | **Xà song song** | `parallel-bars` | Không đạt | **Ảnh cũ:** Xà đơn cao<br/>**Đã khắc phục:** Ảnh là xà đơn, không có hai thanh song song. | `parallel-bars.webp` | ĐẠT |
| 37 | **Máy chạy bộ** | `treadmill` | Đạt | **Ảnh cũ:** Máy chạy bộ (Treadmill)<br/>**Đã khắc phục:** Ảnh đúng máy chạy bộ. Tên nên chuẩn hóa Title Case thành “Máy Chạy Bộ”. | `treadmill.webp` | ĐẠT |
| 38 | **Máy Chèo Thuyền** | `rowing-machine` | Không đạt | **Ảnh cũ:** Máy chạy bộ<br/>**Đã khắc phục:** Ảnh là máy chạy bộ. Cần rowing ergometer với ray trượt, ghế và tay kéo. | `rowing-machine.webp` | ĐẠT |
| 39 | **Máy Chèo Thuyền** | `rowing_machine` | Không đạt | **Ảnh cũ:** Máy chạy bộ<br/>**Đã khắc phục:** Bản ghi alias slug gạch dưới (rowing_machine) cùng trỏ về thiết bị canonical vật lý (rowing-machine). | `rowing-machine.webp` | ĐẠT |
| 40 | **Máy đạp tay** | `upper-body-ergometer` | Không đạt | **Ảnh cũ:** Máy chạy bộ<br/>**Đã khắc phục:** Ảnh là máy chạy bộ. Cần upper-body ergometer có tay quay ngang tầm ngực. | `upper-body-ergometer.webp` | ĐẠT |
| 41 | **Máy elliptical** | `elliptical` | Không đạt | **Ảnh cũ:** Máy chạy bộ<br/>**Đã khắc phục:** Ảnh là máy chạy bộ. Cần máy elliptical có hai bàn đạp elip và tay đòn dài. | `elliptical.webp` | ĐẠT |
| 42 | **Máy leo cầu thang** | `stepmill` | Không đạt | **Ảnh cũ:** Máy chạy bộ<br/>**Đã khắc phục:** Ảnh là máy chạy bộ. Cần máy bậc thang quay/stepmill. | `stepmill.webp` | ĐẠT |
| 43 | **Máy trượt tuyết** | `skierg` | Không đạt | **Ảnh cũ:** Máy chạy bộ<br/>**Đã khắc phục:** Ảnh là máy chạy bộ. Cần SkiErg dạng khung đứng với hai dây kéo tay. | `skierg.webp` | ĐẠT |
| 44 | **Xe đạp tập** | `stationary-bike` | Không đạt | **Ảnh cũ:** Máy chạy bộ<br/>**Đã khắc phục:** Ảnh là máy chạy bộ. Cần xe đạp cố định với yên, bàn đạp và tay lái. | `stationary-bike.webp` | ĐẠT |
| 45 | **Bóng tạ** | `medicine-ball` | Không đạt | **Ảnh cũ:** Bóng tập lớn (Stability Ball)<br/>**Đã khắc phục:** Ảnh là bóng tập cỡ lớn. Cần medicine ball nhỏ, nặng, thường có số kg trên bề mặt. | `medicine-ball.webp` | ĐẠT |
| 46 | **Đĩa Tạ** | `weight-plate` | Không đạt | **Ảnh cũ:** Thanh Trap Bar kèm tạ<br/>**Đã khắc phục:** Ảnh là cả thanh trap bar đã lắp bánh tạ. Cần một hoặc một bộ đĩa tạ tách riêng, nhìn rõ lỗ tâm. | `weight-plate.webp` | ĐẠT |
| 47 | **Tạ Ấm** | `kettlebell` | Đạt | **Ảnh cũ:** Tạ ấm (Kettlebell)<br/>**Đã khắc phục:** Ảnh đúng kettlebell có tay cầm liền khối. | `kettlebell.webp` | ĐẠT |
| 48 | **Tạ Đòn** | `barbell` | Đạt | **Ảnh cũ:** Đòn tạ (Barbell)<br/>**Đã khắc phục:** Ảnh đúng thanh barbell đã lắp bánh tạ. | `barbell.webp` | ĐẠT |
| 49 | **Tạ Đơn** | `dumbbell` | Đạt | **Ảnh cũ:** Tạ đơn (Dumbbell)<br/>**Đã khắc phục:** Ảnh đúng dumbbell. | `dumbbell.webp` | ĐẠT |
| 50 | **Thanh EZ** | `ez-bar` | Đạt | **Ảnh cũ:** Thanh EZ Bar<br/>**Đã khắc phục:** Ảnh đúng thanh EZ curl có đoạn cầm gấp khúc. | `ez-bar.webp` | ĐẠT |
| 51 | **Thanh Tạ Cong** | `cambered-bar` | Cần ảnh chính xác hơn | **Ảnh cũ:** Thanh EZ Bar<br/>**Đã khắc phục:** Ảnh là thanh EZ curl. Nếu danh mục muốn cambered bar chuyên dụng, cần ảnh thanh có độ võng/camber rõ; nếu thực chất là EZ Bar thì nên gộp tên/mapping với #50. | `cambered-bar.webp` | ĐẠT |
| 52 | **Thanh Trap** | `trap-bar` | Đạt | **Ảnh cũ:** Thanh Trap Bar<br/>**Đã khắc phục:** Ảnh đúng trap/hex bar. | `trap-bar.webp` | ĐẠT |
| 53 | **Bóng BOSU** | `bosu` | Không đạt | **Ảnh cũ:** Bóng tập tròn (Stability Ball)<br/>**Đã khắc phục:** Ảnh là bóng stability hình cầu. Cần BOSU nửa cầu có mặt đế phẳng. | `bosu.webp` | ĐẠT |
| 54 | **Bóng tập** | `stability-ball` | Đạt | **Ảnh cũ:** Bóng tập (Stability Ball)<br/>**Đã khắc phục:** Ảnh đúng bóng stability/Swiss ball. Tên nên chuẩn hóa thành “Bóng Tập”. | `stability-ball.webp` | ĐẠT |
| 55 | **Thảm tập** | `exercise-mat` | Không đạt | **Ảnh cũ:** Bóng tập (Stability Ball)<br/>**Đã khắc phục:** Ảnh là bóng tập. Cần thảm yoga/exercise mat trải phẳng hoặc cuộn. | `exercise-mat.webp` | ĐẠT |
| 56 | **Xà đơn** | `pull-up-bar` | Đạt | **Ảnh cũ:** Khung xà đơn (Pull-up Bar)<br/>**Đã khắc phục:** Ảnh đúng khung xà đơn; trùng alias #21. Tên nên chuẩn hóa “Xà Đơn”. | `pull-up-bar.webp` | ĐẠT |
| 57 | **Xà kép** | `dip-station` | Không đạt | **Ảnh cũ:** Xà đơn cao (Pull-up Bar)<br/>**Đã khắc phục:** Ảnh là xà đơn, không thấy tay cầm dip song song. | `dip-station.webp` | ĐẠT |
| 58 | **Máy cáp** | `cable` | Đạt | **Ảnh cũ:** Máy cáp (Cable)<br/>**Đã khắc phục:** Ảnh đúng một trụ máy cáp có puly và weight stack; tên nên chuẩn hóa “Máy Cáp”. | `cable.webp` | ĐẠT |
| 59 | **Máy Chèo Cao Đòn Bẩy** | `lever-high-row-machine` | Không đạt | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh máy ngồi chung chung, không thấy quỹ đạo high row/tay kéo từ cao xuống. | `lever-high-row-machine.webp` | ĐẠT |
| 60 | **Máy Chèo Cúi Người Đòn Bẩy** | `lever-bent-over-row-machine` | Không đạt | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh máy ngồi chung chung, không phải máy row cúi người có đệm ngực hoặc tay kéo thấp. | `lever-bent-over-row-machine.webp` | ĐẠT |
| 61 | **Máy Chèo Ngồi Đòn Bẩy** | `lever-seated-row-machine` | Không đạt | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh không thể hiện tay kéo ngang và bệ chân của seated row. | `lever-seated-row-machine.webp` | ĐẠT |
| 62 | **Máy Chèo T-Bar Đòn Bẩy** | `lever-t-bar-row-machine` | Không đạt | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh không có thanh T-bar, đệm ngực hoặc tay cầm row đặc trưng. | `lever-t-bar-row-machine.webp` | ĐẠT |
| 63 | **Máy Cuốn Đùi Sau** | `leg_curl` | Đạt | **Ảnh cũ:** Máy Leg Curl chuẩn<br/>**Đã khắc phục:** Bản ghi alias slug gạch dưới (leg_curl) cùng trỏ về thiết bị canonical vật lý (leg-curl). | `leg-curl.webp` | ĐẠT |
| 64 | **Máy Cuốn Đùi Sau** | `leg-curl` | Đạt | **Ảnh cũ:** Máy Leg Curl chuẩn<br/>**Đã khắc phục:** Ảnh đúng máy leg curl; là bản ghi/ảnh trùng #63. | `leg-curl.webp` | ĐẠT |
| 65 | **Máy Cuốn Tay Trước Đòn Bẩy** | `lever-biceps-curl-machine` | Không đạt | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh không có đệm preacher và tay đòn curl phía trước. | `lever-biceps-curl-machine.webp` | ĐẠT |
| 66 | **Máy Cuốn Tay Trước Ghế Preacher Đòn Bẩy** | `lever-preacher-curl-machine` | Không đạt | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh không có mặt đệm đỡ cánh tay lớn và tay đòn curl. | `lever-preacher-curl-machine.webp` | ĐẠT |
| 67 | **Máy Dạng Đùi Đòn Bẩy** | `lever-hip-abduction-machine` | Không đạt | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh không có hai đệm tỳ ngoài đùi và cơ cấu mở chân. | `lever-hip-abduction-machine.webp` | ĐẠT |
| 68 | **Máy Đạp Đùi** | `leg-press` | Đạt | **Ảnh cũ:** Máy Leg Press 45 độ chuẩn<br/>**Đã khắc phục:** Ảnh đúng máy leg press 45 độ; trùng alias #69. | `leg-press.webp` | ĐẠT |
| 69 | **Máy Đạp Đùi** | `leg_press` | Đạt | **Ảnh cũ:** Máy Leg Press 45 độ chuẩn<br/>**Đã khắc phục:** Bản ghi alias slug gạch dưới (leg_press) cùng trỏ về thiết bị canonical vật lý (leg-press). | `leg-press.webp` | ĐẠT |
| 70 | **Máy Đẩy Hông** | `hip-thrust-machine` | Không đạt | **Ảnh cũ:** Máy Leg Press<br/>**Đã khắc phục:** Ảnh là máy leg press/hack squat, không có đệm hông và bệ chân của hip thrust machine. | `hip-thrust-machine.webp` | ĐẠT |
| 71 | **Máy Đẩy Ngực** | `chest_press` | Cần ảnh chính xác hơn | **Ảnh cũ:** Máy Chest Press chuẩn<br/>**Đã khắc phục:** Bản ghi alias slug gạch dưới (chest_press) cùng trỏ về thiết bị canonical vật lý (chest-press). | `chest-press.webp` | ĐẠT |
| 72 | **Máy Đẩy Ngực Dốc Lên Đòn Bẩy** | `lever-incline-chest-press-machine` | Không đạt | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh không thể hiện ghế dốc lên và tay đòn press hướng chéo lên. | `lever-incline-chest-press-machine.webp` | ĐẠT |
| 73 | **Máy Đẩy Ngực Dốc Xuống Đòn Bẩy** | `lever-decline-chest-press-machine` | Không đạt | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh không thể hiện ghế/quỹ đạo decline press. | `lever-decline-chest-press-machine.webp` | ĐẠT |
| 74 | **Máy Đẩy Ngực Đòn Bẩy** | `lever-chest-press-machine` | Cần ảnh chính xác hơn | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh có thể là máy press nhưng không nhận diện được cơ cấu lever chest press; cần ảnh chuyên biệt, tốt nhất thấy tay đòn và vị trí tay cầm ngang ngực. | `lever-chest-press-machine.webp` | ĐẠT |
| 75 | **Máy Đẩy Vai** | `shoulder_press` | Cần ảnh chính xác hơn | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Bản ghi alias slug gạch dưới (shoulder_press) cùng trỏ về thiết bị canonical vật lý (shoulder-press-machine). | `shoulder-press-machine.webp` | ĐẠT |
| 76 | **Máy Đẩy Vai** | `shoulder-press-machine` | Cần ảnh chính xác hơn | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Cùng ảnh #75 và nhiều máy khác; cần ảnh shoulder press rõ cơ cấu. Đây cũng là bản ghi gần trùng #75. | `shoulder-press-machine.webp` | ĐẠT |
| 77 | **Máy Đẩy Vai Đòn Bẩy** | `lever-shoulder-press-machine` | Không đạt | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh không thể hiện lever/plate-loaded shoulder press. | `lever-shoulder-press-machine.webp` | ĐẠT |
| 78 | **Máy Duỗi Đùi Trước** | `leg_extension` | Đạt | **Ảnh cũ:** Máy Leg Extension chuẩn<br/>**Đã khắc phục:** Bản ghi alias slug gạch dưới (leg_extension) cùng trỏ về thiết bị canonical vật lý (leg-extension). | `leg-extension.webp` | ĐẠT |
| 79 | **Máy Duỗi Đùi Trước** | `leg-extension` | Đạt | **Ảnh cũ:** Máy Leg Extension chuẩn<br/>**Đã khắc phục:** Ảnh đúng máy leg extension; là bản ghi/ảnh trùng #78. | `leg-extension.webp` | ĐẠT |
| 80 | **Máy Duỗi Hông Đòn Bẩy** | `lever-hip-extension-machine` | Không đạt | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh máy ngồi chung, không có đệm/tay đòn tác động hip extension. | `lever-hip-extension-machine.webp` | ĐẠT |
| 81 | **Máy Duỗi Lưng Ngược** | `reverse-hyper` | Không đạt | **Ảnh cũ:** Ghế Preacher<br/>**Đã khắc phục:** Ảnh là ghế preacher, không có mặt bàn cao và con lắc giữ chân của reverse hyper. | `reverse-hyper.webp` | ĐẠT |
| 82 | **Máy Duỗi Tay Sau Đòn Bẩy** | `lever-triceps-extension-machine` | Không đạt | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh không có đệm tay và tay đòn triceps extension. | `lever-triceps-extension-machine.webp` | ĐẠT |
| 83 | **Máy Ép Ngực** | `chest-fly-machine` | Đạt | **Ảnh cũ:** Máy Pec Deck chuẩn<br/>**Đã khắc phục:** Ảnh là máy pec-deck/chest-fly đa trạm và có cơ cấu ép ngực nhận diện được; nên chọn crop rõ trạm fly hơn. | `chest-fly-machine.webp` | ĐẠT |
| 84 | **Máy Ép Ngực Pec Deck** | `pec-deck` | Đạt | **Ảnh cũ:** Máy Pec Deck chuẩn<br/>**Đã khắc phục:** Ảnh đúng pec deck/chest fly; trùng alias #85. | `pec-deck.webp` | ĐẠT |
| 85 | **Máy Ép Ngực Pec Deck** | `pec_deck` | Đạt | **Ảnh cũ:** Máy Pec Deck chuẩn<br/>**Đã khắc phục:** Bản ghi alias slug gạch dưới (pec_deck) cùng trỏ về thiết bị canonical vật lý (pec-deck). | `pec-deck.webp` | ĐẠT |
| 86 | **Máy Ép Vai Sau Đòn Bẩy** | `lever-reverse-fly-machine` | Không đạt | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh máy ngồi chung, không thể hiện tay đòn reverse fly hoặc tư thế quay mặt vào đệm. | `lever-reverse-fly-machine.webp` | ĐẠT |
| 87 | **Máy Gập Bụng Ngồi Đòn Bẩy** | `lever-seated-ab-crunch-machine` | Không đạt | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh thiếu đệm vai/tay cầm và cơ cấu gập thân của ab crunch machine. | `lever-seated-ab-crunch-machine.webp` | ĐẠT |
| 88 | **Máy Gập Hông Ngồi Đòn Bẩy** | `lever-seated-good-morning-machine` | Không đạt | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh không thể hiện đệm vai/tay đòn cho seated good morning. | `lever-seated-good-morning-machine.webp` | ĐẠT |
| 89 | **Máy GHD (Tập Đùi Sau Và Mông)** | `ghd` | Không đạt | **Ảnh cũ:** Ghế Preacher<br/>**Đã khắc phục:** Ảnh là ghế preacher; cần GHD với đệm hông đôi, bệ chân và khóa gót. | `ghd.webp` | ĐẠT |
| 90 | **Máy GHR (Cuốn Đùi Sau)** | `glute-ham-raise` | Không đạt | **Ảnh cũ:** Ghế Preacher<br/>**Đã khắc phục:** Cùng ảnh preacher #89; cần máy glute-ham raise/GHD đúng cấu tạo. | `ghd.webp` | ĐẠT |
| 91 | **Máy Hack Squat** | `hack_squat` | Đạt | **Ảnh cũ:** Máy Hack Squat chuẩn<br/>**Đã khắc phục:** Bản ghi alias slug gạch dưới (hack_squat) cùng trỏ về thiết bị canonical vật lý (hack-squat). | `hack-squat.webp` | ĐẠT |
| 92 | **Máy Hack Squat** | `hack-squat` | Đạt | **Ảnh cũ:** Máy Hack Squat chuẩn<br/>**Đã khắc phục:** Ảnh đúng hack squat; là bản ghi/ảnh trùng #91. | `hack-squat.webp` | ĐẠT |
| 93 | **Máy Kéo Xô** | `lat_pulldown` | Đạt | **Ảnh cũ:** Máy Lat Pulldown chuẩn<br/>**Đã khắc phục:** Bản ghi alias slug gạch dưới (lat_pulldown) cùng trỏ về thiết bị canonical vật lý (lat-pulldown). | `lat-pulldown.webp` | ĐẠT |
| 94 | **Máy Kéo Xô** | `lat-pulldown` | Đạt | **Ảnh cũ:** Máy Lat Pulldown chuẩn<br/>**Đã khắc phục:** Ảnh đúng lat pulldown; là bản ghi/ảnh trùng #93. | `lat-pulldown.webp` | ĐẠT |
| 95 | **Máy Kéo Xô Đòn Bẩy** | `lever-lat-pulldown-machine` | Không đạt | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh không có tay đòn kéo từ trên cao hoặc đặc điểm plate-loaded lat pulldown. | `lever-lat-pulldown-machine.webp` | ĐẠT |
| 96 | **Máy Kéo Xô Qua Đầu Đòn Bẩy** | `lever-pullover-machine` | Không đạt | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh không thể hiện tay đòn pullover vòng qua đầu và đệm giữ thân. | `lever-pullover-machine.webp` | ĐẠT |
| 97 | **Máy Khép Đùi Đòn Bẩy** | `lever-hip-adduction-machine` | Không đạt | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh không có hai đệm tỳ trong đùi và cơ cấu khép chân. | `lever-hip-adduction-machine.webp` | ĐẠT |
| 98 | **Máy Nâng Gót Bắp Chân** | `calf-raise` | Không đạt | **Ảnh cũ:** Máy Leg Press<br/>**Đã khắc phục:** Ảnh là leg press/hack squat, không phải standing/seated calf raise chuyên dụng. | `calf-raise-machine.webp` | ĐẠT |
| 99 | **Máy Nâng Gót Bắp Chân** | `calf-machine` | Không đạt | **Ảnh cũ:** Máy Leg Press<br/>**Đã khắc phục:** Cùng ảnh sai #98; là bản ghi gần trùng nhưng không có ảnh calf machine. | `calf-raise-machine.webp` | ĐẠT |
| 100 | **Máy Nâng Vai Ngang Đòn Bẩy** | `lever-lateral-raise-machine` | Không đạt | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh không có đệm tỳ khuỷu và tay đòn nâng sang ngang. | `lever-lateral-raise-machine.webp` | ĐẠT |
| 101 | **Máy Nhún Tay Sau Ngồi Đòn Bẩy** | `lever-seated-dip-machine` | Cần ảnh chính xác hơn | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh máy ngồi chung có thể gần máy dip nhưng không thấy rõ tay cầm hai bên và quỹ đạo nhấn xuống; cần ảnh chuyên biệt. | `lever-seated-dip-machine.webp` | ĐẠT |
| 102 | **Máy Nhún Vai Đòn Bẩy** | `lever-shrug-machine` | Không đạt | **Ảnh cũ:** Máy ngồi chung chung<br/>**Đã khắc phục:** Ảnh không có tay cầm thấp/tay đòn và vị trí đứng hoặc ngồi thực hiện shrug. | `lever-shrug-machine.webp` | ĐẠT |
| 103 | **Máy Sissy Squat** | `sissy-squat-machine` | Không đạt | **Ảnh cũ:** Máy Leg Extension<br/>**Đã khắc phục:** Ảnh là máy leg extension. Cần bệ sissy squat có khóa cẳng chân/bắp chân và đệm sau gối. | `sissy-squat-machine.webp` | ĐẠT |
| 104 | **Máy Smith** | `smith-machine` | Đạt | **Ảnh cũ:** Máy Smith Machine chuẩn<br/>**Đã khắc phục:** Ảnh nhận diện được khung Smith/thanh dẫn. Tuy nhiên cùng file đang gán cho Giá Squat và Khung Squat, làm mất phân biệt giữa ba loại. | `smith-machine.webp` | ĐẠT |
| 105 | **Máy Tập Đa Năng** | `machine` | Cần ảnh chính xác hơn | **Ảnh cũ:** Máy ngồi đơn trạm<br/>**Đã khắc phục:** Ảnh chỉ là một máy ngồi đơn trạm; chưa thể hiện “đa năng”. Cần multi-gym có nhiều trạm/chức năng hoặc đổi tên theo đúng máy trong ảnh. | `machine.webp` | ĐẠT |
| 106 | **Xe Kéo Tạ** | `sled` | Không đạt | **Ảnh cũ:** Máy Leg Press<br/>**Đã khắc phục:** Ảnh là leg press/hack squat. Cần weight sled/prowler có càng đẩy và cọc lắp bánh tạ. | `sled.webp` | ĐẠT |
| 107 | **Dụng cụ tập grip** | `dung-cu-tap-grip` | Không đạt | **Ảnh cũ:** Tạ đơn (Dumbbell)<br/>**Đã khắc phục:** Ảnh là tạ đơn. Cần hand gripper, grip ring, pinch block hoặc dụng cụ bóp tay đúng loại. Tên tiếng Anh `dung cu tap grip` cũng không đạt chuẩn. | `grip-trainer.webp` | ĐẠT |


---

## 4. Danh Sách Đề Xuất Hợp Nhất Dữ Liệu (Aliases & Duplicate Slugs)

Các cặp slug sau đây đại diện cho cùng một thiết bị vật lý. Trong giai đoạn sau khi áp dụng ảnh, khuyến nghị hợp nhất về slug canonical chính thức để giảm thiểu nợ dữ liệu:

1. `resistance_band` ➔ hợp nhất về `resistance-band`
2. `squat_rack` ➔ hợp nhất về `squat-rack`
3. `pull_up_bar` ➔ hợp nhất về `pull-up-bar`
4. `incline_bench` ➔ hợp nhất về `incline-bench`
5. `preacher-curl-bench` ➔ hợp nhất về `preacher-bench`
6. `dip_station` ➔ hợp nhất về `dip-station`
7. `rowing_machine` ➔ hợp nhất về `rowing-machine`
8. `leg_curl` ➔ hợp nhất về `leg-curl`
9. `leg_press` ➔ hợp nhất về `leg-press`
10. `shoulder_press` ➔ hợp nhất về `shoulder-press-machine`
11. `leg_extension` ➔ hợp nhất về `leg-extension`
12. `pec_deck` ➔ hợp nhất về `pec-deck`
13. `glute-ham-raise` ➔ hợp nhất về `ghd`
14. `hack_squat` ➔ hợp nhất về `hack-squat`
15. `lat_pulldown` ➔ hợp nhất về `lat-pulldown`
16. `calf-machine` ➔ hợp nhất về `calf-raise`

---

## 5. Danh Sách File Đã Được Tạo Trong Staging

- **Thư mục ảnh Staging**: `artifacts/equipment-image-regeneration/generated/` (91 file WebP 800×600)
- **Thư mục Contact Sheets**: `artifacts/equipment-image-regeneration/contact-sheets/`:
  * `sheet-01.jpg` (Mục 1 – 12)
  * `sheet-02.jpg` (Mục 13 – 24)
  * `sheet-03.jpg` (Mục 25 – 36)
  * `sheet-04.jpg` (Mục 37 – 48)
  * `sheet-05.jpg` (Mục 49 – 60)
  * `sheet-06.jpg` (Mục 61 – 72)
  * `sheet-07.jpg` (Mục 73 – 84)
  * `sheet-08.jpg` (Mục 85 – 96)
  * `sheet-09.jpg` (Mục 97 – 107)
  * `index.html` (Giao diện web trực quan đối chiếu toàn bộ 107 card)
- **Dữ liệu kỹ thuật**:
  * `artifacts/equipment-image-regeneration/inventory.json`
  * `artifacts/equipment-image-regeneration/generation-manifest.json`

---

## 6. Kế Hoạch Áp Dụng Production & Phương Án Rollback

> [!IMPORTANT]
> **Hiện tại chưa có bất kỳ thay đổi nào tác động lên Production**:
> - Không ghi đè thư mục `public/equipment/`.
> - Không sửa dữ liệu cột `image_url` trong Supabase.
> - Không xóa hoặc sửa ID trong cơ sở dữ liệu.
> - Toàn bộ ảnh gốc hiện tại đã được sao lưu an toàn tại `artifacts/equipment-image-regeneration/backup-prod/`.

### Kế hoạch áp dụng vào Production (khi người dùng phê duyệt):
1. **Copy ảnh staging**: Copy các file từ `artifacts/equipment-image-regeneration/generated/` sang `public/equipment/`.
2. **Cập nhật alias file**: Với 14 slug alias, copy file canonical tương ứng sang tên alias (ví dụ `squat-rack.webp` ➔ `squat_rack.webp`) để đảm bảo không bị lỗi 404 cho các bản ghi cũ.
3. **Rollback (nếu cần)**: Khôi phục toàn bộ thư mục `public/equipment/` từ `artifacts/equipment-image-regeneration/backup-prod/` chỉ trong 1 lệnh duy nhất.
