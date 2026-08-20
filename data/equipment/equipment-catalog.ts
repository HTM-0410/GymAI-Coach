/**
 * EQUIPMENT CATALOG — GymAI Coach
 * ════════════════════════════════════════════════════════════════════════════════
 * Source-of-truth cho tất cả dụng cụ tập gym trong hệ thống.
 *
 * Convention:
 *   - slug:     kebab-case, bất biến — dùng làm FK giữa các bảng (equipment,
 *               exercise_equipment, gym_equipment, profile_equipment) và để
 *               match với Gemini output.
 *   - name:     tên tiếng Anh canonical (NSCA / ACSM convention). Không dịch,
 *               không phiên bản hoá ("V2", "mới"). Đây là display name khi UI
 *               tiếng Anh.
 *   - name_vi:  tên tiếng Việt chuẩn, dùng trong UI tiếng Việt và làm key
 *               resolve từ JSON exercise data.
 *   - category: nhóm chính — drive filter UI + onboarding grid.
 *   - description_vi: 1 câu ngắn giải thích dụng cụ, dùng cho tooltip /
 *                     onboarding / help text.
 *
 * Mapping rules:
 *   1. Mỗi exercise JSON có `equipment: string[]` (Vietnamese display names).
 *      → resolve về `slug` qua equipment-resolver (xem scripts/sync-exercises.ts
 *        `EQUIPMENT_ALIASES`).
 *   2. Slug từ catalog → row.id trong bảng `equipment` (Supabase).
 *   3. Tên hiển thị: ưu tiên `name_vi` cho UI VN, `name` cho UI EN.
 *
 * Cập nhật catalog này KHI:
 *   - Thêm dụng cụ mới chưa có trong DB.
 *   - Đổi tên hiển thị (giữ slug cũ để không phá FK).
 *   - Thêm category mới (cần migration SQL).
 *
 * KHÔNG cập nhật khi chỉ thêm alias mapping — sửa `EQUIPMENT_ALIASES` trong
 * sync-exercises.ts.
 *
 * Categories taxonomy:
 *   free_weight  Tạ tự do (dumbbell, barbell, kettlebell, plate...)
 *   machine      Máy tập (cable, smith, leg press, pec deck...)
 *   bodyweight   Dụng cụ tự trọng / treo (pull-up bar, dip station, parallel bars)
 *   cardio       Máy cardio (treadmill, bike, rower, ski erg...)
 *   furniture    Nội thất tập (bench, mat, stability ball, bosu, medicine ball...)
 *   accessory    Phụ kiện nhỏ (band, ab wheel, roller, rope, plate...)
 */

export type EquipmentCategory =
  | 'free_weight'
  | 'machine'
  | 'bodyweight'
  | 'cardio'
  | 'furniture'
  | 'accessory';

export type EquipmentCatalogRow = {
  slug: string;
  name: string;                 // English canonical (NSCA/ACSM)
  name_vi: string;              // Vietnamese standard
  category: EquipmentCategory;
  description_vi: string;       // 1 sentence, ≤ 80 chars
  aliases_vi?: string[];        // Vietnamese surface variants seen in exercise data
  aliases_en?: string[];        // English variants (e.g. "incline bench" ↔ "incline-bench")
};

// ─── CATALOG ─────────────────────────────────────────────────────────────────
const RAW_EQUIPMENT_CATALOG: EquipmentCatalogRow[] = [
  // ─── FREE WEIGHTS ─────────────────────────────────────────────────────────
  {
    slug: 'barbell',
    name: 'Barbell',
    name_vi: 'Thanh tạ đòn',
    category: 'free_weight',
    description_vi: 'Thanh tạ dài chuẩn Olympic, dùng cho các bài compound đa khớp.',
    aliases_vi: ['Thanh đòn', 'Tạ đòn', 'tạ đòn', 'thanh đòn'],
    aliases_en: ['barbell', 'olympic barbell', 'standard barbell'],
  },
  {
    slug: 'dumbbell',
    name: 'Dumbbell',
    name_vi: 'Tạ đơn',
    category: 'free_weight',
    description_vi: 'Tạ cầm tay hai bên, linh hoạt cho cả bài đơn khớp và đa khớp.',
    aliases_vi: ['Tạ đôi', 'Tạ đơn', 'tạ đôi', 'tạ đơn'],
    aliases_en: ['db'],
  },
  {
    slug: 'ez-bar',
    name: 'EZ Bar',
    name_vi: 'Tạ EZ',
    category: 'free_weight',
    description_vi: 'Thanh tạ cong hình chữ Z, giảm áp lực cổ tay so với tạ đòn thẳng.',
    aliases_vi: ['tạ EZ'],
    aliases_en: ['ez barbell', 'ez-barbell', 'ez-bar', 'ez curl bar'],
  },
  {
    slug: 'trap-bar',
    name: 'Trap Bar',
    name_vi: 'Tạ Trap',
    category: 'free_weight',
    description_vi: 'Thanh tạ hình lục giác với tay cầm ở giữa, thân thiện với lưng dưới.',
    aliases_vi: ['tạ trap', 'Trap Bar'],
    aliases_en: ['trap bar', 'trap-bar', 'hex bar'],
  },
  {
    slug: 'kettlebell',
    name: 'Kettlebell',
    name_vi: 'Tạ ấm',
    category: 'free_weight',
    description_vi: 'Quả tạ có tay cầm, trọng lượng tập trung ở đáy, phù hợp swing và ballistic.',
    aliases_vi: ['Tạ ấm', 'Quả tạ tròn'],
    aliases_en: ['kb'],
  },
  {
    slug: 'weight-plate',
    name: 'Weight Plate',
    name_vi: 'Đĩa tạ',
    category: 'free_weight',
    description_vi: 'Đĩa sắt/cao su dùng nạp lên thanh tạ hoặc cầm tay cho carry/raise.',
    aliases_vi: ['Đĩa tạ đòn'],
    aliases_en: ['plate', 'plates'],
  },
  {
    slug: 'medicine-ball',
    name: 'Medicine Ball',
    name_vi: 'Bóng tạ',
    category: 'free_weight',
    description_vi: 'Bóng nặng dùng cho ném, slam và core rotation.',
    aliases_vi: ['Bóng tạ', 'Bóng y tế'],
    aliases_en: ['med ball', 'medicine ball', 'medicine-ball'],
  },

  // ─── WEIGHT ACCESSORIES ───────────────────────────────────────────────────
  {
    slug: 'weight-vest',
    name: 'Weight Vest',
    name_vi: 'Áo gắn tạ',
    category: 'accessory',
    description_vi: 'Áo có túi đựng tạ, mặc khi bodyweight exercises (push-up, pull-up, squat).',
    aliases_en: ['weight vest', 'weighted vest', 'vest'],
  },
  {
    slug: 'ankle-weight',
    name: 'Ankle Weight',
    name_vi: 'Tạ đeo cổ chân',
    category: 'accessory',
    description_vi: 'Vòng đeo tạ ở cổ chân, dùng cho leg curl, leg lift, donkey calf raise.',
    aliases_en: ['ankle weight', 'ankle weights', 'ankle-weight'],
  },

  // ─── MACHINES ─────────────────────────────────────────────────────────────
  {
    slug: 'cable',
    name: 'Cable Machine',
    name_vi: 'Máy cáp',
    category: 'machine',
    description_vi: 'Máy với hệ ròng rọc cáp, tạo lực kéo liên tục suốt chuyển động.',
    aliases_vi: ['Cáp', 'Máy cáp', 'cáp'],
    aliases_en: ['cable machine', 'cable-machine'],
  },
  {
    slug: 'smith-machine',
    name: 'Smith Machine',
    name_vi: 'Máy Smith',
    category: 'machine',
    description_vi: 'Thanh tạ trượt trên rãnh cố định, an toàn cho người tập một mình.',
    aliases_vi: [
      'Máy Smith',
      'Tạ Smith',
      'Máy Smith đẩy ngực',
      'Máy Smith đẩy ngực nghiêng',
      'Máy Smith đẩy vai',
      'Máy Smith squat',
      'Máy Smith kéo lưng',
      'Máy Smith cuốn tay',
      'Máy Smith duỗi tay sau',
      'Máy Smith dang vai',
      'Máy Smith nhún vai',
      'Máy Smith nâng gót',
    ],
    aliases_en: [
      'smith machine',
      'smith',
      'smith-machine',
      'smith_machine',
      'smith bench press',
      'smith incline press',
      'smith shoulder press',
      'smith squat',
      'smith row',
      'smith curl',
      'smith triceps extension',
      'smith lateral raise',
      'smith shrug',
      'smith calf raise',
    ],
  },
  {
    slug: 'leg-press',
    name: 'Leg Press',
    name_vi: 'Máy đạp chân',
    category: 'machine',
    description_vi: 'Máy đạp chân nghiêng, tập trung vào cơ đùi trước và mông.',
    aliases_vi: ['Máy đạp đùi'],
    aliases_en: ['leg press machine', 'plate loaded leg press'],
  },
  {
    slug: 'hack-squat',
    name: 'Hack Squat Machine',
    name_vi: 'Máy Hack Squat',
    category: 'machine',
    description_vi: 'Máy squat dẫn đường nghiêng, cô lập cơ đùi trước tốt hơn squat tự do.',
    aliases_vi: ['Máy hack', 'Hack Squat'],
    aliases_en: ['plate loaded hack squat'],
  },
  {
    slug: 'calf-machine',
    name: 'Calf Raise Machine',
    name_vi: 'Máy nâng gót',
    category: 'machine',
    description_vi: 'Máy chuyên cô lập cơ bắp chân qua chuyển động nâng gót.',
    aliases_vi: ['Máy nâng gót'],
  },
  {
    slug: 'hip-thrust-machine',
    name: 'Hip Thrust Machine',
    name_vi: 'Máy giật hông',
    category: 'machine',
    description_vi: 'Máy chuyên cho bài giật hông, cô lập cơ mông.',
    aliases_vi: ['Máy đẩy hông', 'máy giật hông'],
  },
  {
    slug: 'pec-deck',
    name: 'Pec Deck',
    name_vi: 'Máy ép ngực',
    category: 'machine',
    description_vi: 'Máy ép ngực với hai cánh tay xoay, cô lập cơ ngực hiệu quả.',
    aliases_vi: ['Máy pec deck', 'Đập ngực máy', 'máy ép ngực'],
    aliases_en: ['pec deck machine', 'chest fly machine', 'machine fly', 'plate loaded pec deck'],
  },
  {
    slug: 'chest-press-machine',
    name: 'Chest Press Machine',
    name_vi: 'Máy đẩy ngực',
    category: 'machine',
    description_vi: 'Máy đẩy ngực selectorized với ghế và tay đẩy dẫn hướng.',
    aliases_en: ['chest press machine', 'selectorized chest press'],
  },
  {
    slug: 'shoulder-press-machine',
    name: 'Shoulder Press Machine',
    name_vi: 'Máy đẩy vai',
    category: 'machine',
    description_vi: 'Máy đẩy vai selectorized với ghế tựa và tay đẩy qua đầu.',
    aliases_en: ['shoulder press machine', 'selectorized shoulder press'],
  },
  {
    slug: 'lat-pulldown',
    name: 'Lat Pulldown',
    name_vi: 'Máy kéo xà ngang',
    category: 'machine',
    description_vi: 'Máy kéo xà từ trên xuống, thay thế pull-up cho người chưa kéo được xà.',
    aliases_vi: ['Máy kéo xà'],
  },
  {
    slug: 'rowing-machine',
    name: 'Rowing Machine',
    name_vi: 'Máy chèo thuyền',
    category: 'cardio',
    description_vi: 'Máy mô phỏng chèo thuyền, tập toàn thân với lực cản từ quạt gió.',
    aliases_vi: ['Máy chèo', 'Máy kéo'],
  },
  {
    slug: 'sled',
    name: 'Sled',
    name_vi: 'Xe kéo tạ',
    category: 'machine',
    description_vi: 'Xe có tải trọng, đ�y/kéo trên sàn cho bài conditioning và power.',
    aliases_vi: ['Xe đẩy tạ', 'Sled machine'],
    aliases_en: ['sled machine', 'sled-machine'],
  },
  {
    slug: 'landmine',
    name: 'Landmine',
    name_vi: 'Thanh đứng Landmine',
    category: 'free_weight',
    description_vi: 'Một đầu thanh tạ cố định vào khớp xoay, tạo chuyển động cung.',
    aliases_vi: ['Thanh đứng'],
    aliases_en: ['landmine attachment'],
  },

  // ─── BODYWEIGHT / STATIONS ────────────────────────────────────────────────
  {
    slug: 'bodyweight',
    name: 'Bodyweight',
    name_vi: 'Trọng lượng cơ thể',
    category: 'bodyweight',
    description_vi: 'Bài tập chỉ dùng trọng lượng cơ thể, không cần dụng cụ.',
    aliases_vi: ['Trọng lượng cơ thể', 'Không'],
  },
  {
    slug: 'pull-up-bar',
    name: 'Pull-up Bar',
    name_vi: 'Xà đơn',
    category: 'bodyweight',
    description_vi: 'Thanh ngang treo cố định, dùng cho kéo xà và treo người.',
    aliases_vi: ['Xà đơn', 'xà đơn'],
  },
  {
    slug: 'dip-station',
    name: 'Dip Station',
    name_vi: 'Xà kép',
    category: 'bodyweight',
    description_vi: 'Hai thanh song song cố định, dùng cho hít xà kép và L-sit.',
    aliases_vi: ['Xà kép', 'Khung hít đất'],
  },
  {
    slug: 'parallel-bars',
    name: 'Parallel Bars',
    name_vi: 'Xà song song',
    category: 'bodyweight',
    description_vi: 'Hai thanh song song, dùng cho dips, L-sit và các bài calisthenic.',
  },

  // ─── CARDIO ───────────────────────────────────────────────────────────────
  {
    slug: 'treadmill',
    name: 'Treadmill',
    name_vi: 'Máy chạy bộ',
    category: 'cardio',
    description_vi: 'Máy chạy bộ với băng tải chuyển động.',
  },
  {
    slug: 'stationary-bike',
    name: 'Stationary Bike',
    name_vi: 'Xe đạp tập',
    category: 'cardio',
    description_vi: 'Xe đạp cố định cho cardio và phục hồi.',
    aliases_vi: ['stationary bike', 'Xe Đạp Gió'],
    aliases_en: ['air bike', 'assault bike', 'fan bike'],
  },
  {
    slug: 'elliptical',
    name: 'Elliptical',
    name_vi: 'Máy elliptical',
    category: 'cardio',
    description_vi: 'Máy tập cardio tác động thấp lên khớp, chuyển động elip.',
    aliases_vi: ['elliptical machine'],
  },
  {
    slug: 'stepmill',
    name: 'StepMill',
    name_vi: 'Máy leo cầu thang',
    category: 'cardio',
    description_vi: 'Máy leo bậc liên tục, cường độ cao cho cơ đùi và tim mạch.',
    aliases_vi: ['stepmill machine'],
  },
  {
    slug: 'skierg',
    name: 'SkiErg',
    name_vi: 'Máy trượt tuyết',
    category: 'cardio',
    description_vi: 'Máy mô phỏng trượt tuyết, kéo cáp kép từ trên xuống.',
    aliases_vi: ['skierg machine'],
  },
  {
    slug: 'upper-body-ergometer',
    name: 'Upper Body Ergometer',
    name_vi: 'Máy đạp tay',
    category: 'cardio',
    description_vi: 'Máy đạp tay cho cardio phần thân trên.',
    aliases_vi: ['upper body ergometer'],
    aliases_en: ['UBE'],
  },
  // ─── FURNITURE (larger training surfaces) ─────────────────────────────────

  {
    slug: 'bench',
    name: 'Flat Bench',
    name_vi: 'Ghế tập phẳng',
    category: 'furniture',
    description_vi: 'Ghế tập mặt ph�ng, dùng cho đẩy ngực, gập bụng, row có tựa.',
    aliases_vi: ['Ghế tập', 'Ghế phẳng', 'Ghế dài', 'Ghế tập tạ'],
  },
  {
    slug: 'incline-bench',
    name: 'Incline Bench',
    name_vi: 'Ghế tập nghiêng',
    category: 'furniture',
    description_vi: 'Ghế tập điều chỉnh góc nghiêng, thường 30–45° cho ngực trên.',
    aliases_vi: ['Ghế nghiêng'],
  },
  {
    slug: 'stability-ball',
    name: 'Stability Ball',
    name_vi: 'Bóng tập',
    category: 'furniture',
    description_vi: 'Bóng cao su lớn, tạo mặt phẳng không ổn định cho core.',
    aliases_vi: ['Bóng tập', 'Bóng thăng bằng', 'stability ball'],
    aliases_en: ['swiss ball', 'exercise ball', 'physioball', 'fitball'],
  },
  {
    slug: 'bosu',
    name: 'BOSU Ball',
    name_vi: 'Bóng BOSU',
    category: 'furniture',
    description_vi: 'Nửa bóng tập trên nền phẳng, dùng cho balance và core.',
    aliases_vi: ['bosu ball', 'BOSU'],
  },
  {
    slug: 'exercise-mat',
    name: 'Exercise Mat',
    name_vi: 'Thảm tập',
    category: 'furniture',
    description_vi: 'Thảm mềm cho floor work, yoga, stretching.',
    aliases_vi: ['Thảm'],
    aliases_en: ['mat', 'yoga mat'],
  },
  {
    slug: 'squat-rack',
    name: 'Squat Rack',
    name_vi: 'Khung squat',
    category: 'accessory',
    description_vi: 'Khung chữ H hoặc power rack với thanh an toàn, dùng cho squat và rack-pull.',
    aliases_vi: ['Khung squat', 'Giá đỡ', 'khung squat'],
    aliases_en: ['squat rack', 'power rack', 'half rack'],
  },

  // ─── ACCESSORY (small add-ons) ────────────────────────────────────────────
  {
    slug: 'resistance-band',
    name: 'Resistance Band',
    name_vi: 'Dây kháng lực',
    category: 'accessory',
    description_vi: 'Dây cao su tạo lực kéo, dùng cho warm-up, mobility và resistance.',
    aliases_vi: ['Dây kháng lực', 'Dải kháng lực', 'resistance band'],
    aliases_en: ['band', 'loop band', 'pull-up band'],
  },
  {
    slug: 'ab-wheel',
    name: 'Ab Wheel',
    name_vi: 'Con lăn bụng',
    category: 'accessory',
    description_vi: 'Bánh xe có tay cầm, lăn ra trước để cô lập cơ bụng.',
    aliases_vi: ['Bánh lăn bụng', 'Bánh xe ab', 'Con lăn tập bụng', 'wheel roller'],
  },
  {
    slug: 'foam-roller',
    name: 'Foam Roller',
    name_vi: 'Con lăn xốp',
    category: 'accessory',
    description_vi: 'Ống xốp dùng cho self-myofascial release và phục hồi.',
    aliases_vi: ['Con lăn xốp', 'Foam Roller', 'roller'],
    aliases_en: ['roller'],
  },
  {
    slug: 'jump-rope',
    name: 'Jump Rope',
    name_vi: 'Dây nhảy',
    category: 'accessory',
    description_vi: 'Dây nhảy cardio và conditioning.',
    aliases_vi: ['Dây nhảy', 'rope'],
    aliases_en: ['rope', 'skipping rope'],
  },
  {
    slug: 'tire',
    name: 'Training Tire',
    name_vi: 'Lốp xe tập',
    category: 'accessory',
    description_vi: 'Lốp xe lớn dùng cho bài tire flip và hammer strike.',
    aliases_vi: ['Lốp xe'],
  },
  {
    slug: 'sledgehammer',
    name: 'Sledgehammer',
    name_vi: 'Búa tạ',
    category: 'accessory',
    description_vi: 'Búa lớn đập vào lốp xe cho power và conditioning.',
    aliases_vi: ['Búa tạ', 'hammer'],
  },
  {
    slug: 'tricep-rope',
    name: 'Tricep Rope',
    name_vi: 'Dây kéo cáp tricep',
    category: 'accessory',
    description_vi: 'Phụ kiện cáp có hai đầu dây, dùng cho đấm cáp tricep và pull-down.',
    aliases_en: ['tricep rope', 'triceps rope', 'rope attachment'],
  },
  {
    slug: 'ankle-strap',
    name: 'Ankle Strap',
    name_vi: 'Dây đeo cổ chân',
    category: 'accessory',
    description_vi: 'Vòng đeo cổ chân gắn vào cáp, dùng cho kickback và abduction.',
    aliases_en: ['ankle strap', 'ankle cuff', 'cable ankle strap'],
  },
  {
    slug: 'wrist-roller',
    name: 'Wrist Roller',
    name_vi: 'Con lăn cổ tay',
    category: 'accessory',
    description_vi: 'Thanh có dây cuốn, quay để tập cổ tay với tạ treo.',
    aliases_en: ['wrist roller', 'wrist-roller'],
  },
  {
    slug: 'dip-belt',
    name: 'Dip Belt',
    name_vi: 'Đai đeo tạ',
    category: 'accessory',
    description_vi: 'Đai da/vải quấn hông, treo đĩa tạ cho dip/pull-up tăng tải.',
    aliases_en: ['dip belt', 'weight belt', 'chain belt'],
  },
  {
    slug: 'chain',
    name: 'Chain',
    name_vi: 'Xích tạ',
    category: 'accessory',
    description_vi: 'Xích sắt nối đĩa tạ, tăng trở lực dần theo chuyển động.',
    aliases_en: ['chains', 'chain', 'iron chain'],
  },
  {
    slug: 'battle-rope',
    name: 'Battle Rope',
    name_vi: 'Dây đập battle rope',
    category: 'accessory',
    description_vi: 'Dây dày dài 10-15m, vung tạo sóng cho cardio và power.',
    aliases_en: ['battle rope', 'battling rope', 'battling ropes', 'battle ropes'],
  },
  {
    slug: 'parallettes',
    name: 'Parallettes',
    name_vi: 'Thanh Parallettes',
    category: 'accessory',
    description_vi: 'Thanh tay nắm thấp song song, dùng cho L-sit, planche và push-up.',
    aliases_en: ['parallettes', 'parallette', 'paralettes'],
  },
  {
    slug: 'suspension-trainer',
    name: 'Suspension Trainer (TRX)',
    name_vi: 'Dây treo TRX',
    category: 'accessory',
    description_vi: 'Dây treo anchor trên cao, tạo lực bất ổn cho push-up, row, pistol.',
    aliases_en: ['trx', 'suspension trainer', 'suspension-trainer'],
  },
  {
    slug: 'gymnastic-rings',
    name: 'Gymnastic Rings',
    name_vi: 'Vòng thể dục',
    category: 'bodyweight',
    description_vi: 'Hai vòng kim loại treo dây, dùng cho muscle-up, dips, inverted row.',
    aliases_en: ['gymnastic rings', 'rings', 'wooden rings'],
  },
  {
    slug: 'reverse-hyper',
    name: 'Reverse Hyper',
    name_vi: 'Máy Reverse Hyper',
    category: 'machine',
    description_vi: 'Máy chuyên tác động lên lưng dưới, mông và gân kheo.',
    aliases_en: ['reverse hyper', 'reverse-hyper', 'reverse hyper machine', 'lever reverse hyperextension'],
  },
  {
    slug: 'cambered-bar',
    name: 'Cambered Bar',
    name_vi: 'Thanh tạ cambered',
    category: 'free_weight',
    description_vi: 'Thanh tạ cong hình camber, dành cho bench press với ROM lớn hơn.',
    aliases_en: ['cambered bar', 'camber bar', 'cambered-bar'],
  },
  {
    slug: 'sissy-squat-machine',
    name: 'Sissy Squat Machine',
    name_vi: 'Máy Sissy Squat',
    category: 'machine',
    description_vi: 'Máy cố định bàn chân cho bài sissy squat, cô lập cơ đùi trước.',
    aliases_en: ['sissy squat machine', 'sissy-squat-machine', 'sissy squat'],
  },

  // ─── LEVER PLATE-LOADED MACHINE (subtypes) ─────────────────────────────────
  {
    slug: 'lever-chest-press',
    name: 'Lever Chest Press',
    name_vi: 'Máy ép ngực đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy ép ngực phẳng, dẫn đường chuyển động ngang.',
    aliases_en: ['lever chest press', 'plate-loaded chest press'],
  },
  {
    slug: 'lever-incline-chest-press',
    name: 'Lever Incline Chest Press',
    name_vi: 'Máy ép ngực nghiêng đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy ép ngực ghế nghiêng trên.',
    aliases_en: ['lever incline chest press', 'plate-loaded incline press'],
  },
  {
    slug: 'lever-decline-chest-press',
    name: 'Lever Decline Chest Press',
    name_vi: 'Máy ép ngực nghiêng dưới đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy ép ngực ghế nghiêng dưới.',
    aliases_en: ['lever decline chest press'],
  },
  {
    slug: 'lever-shoulder-press',
    name: 'Lever Shoulder Press',
    name_vi: 'Máy đẩy vai đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy đẩy vai lên trên, cô lập vai trước và giữa.',
    aliases_en: ['lever shoulder press', 'plate-loaded shoulder press'],
  },
  {
    slug: 'lever-lateral-raise',
    name: 'Lever Lateral Raise',
    name_vi: 'Máy dang vai ngang đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy dang vai sang ngang, cô lập vai giữa.',
    aliases_en: ['lever lateral raise'],
  },
  {
    slug: 'lever-reverse-fly',
    name: 'Lever Reverse Fly',
    name_vi: 'Máy dang ngược đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy dang ngược, tập cơ xô sau và vai sau.',
    aliases_en: ['lever reverse fly', 'lever rear delt'],
  },
  {
    slug: 'lever-pulldown',
    name: 'Lever Pulldown',
    name_vi: 'Máy kéo xà đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy kéo xà xuống từ trên cao.',
    aliases_en: ['lever pulldown', 'lever lat pulldown'],
  },
  {
    slug: 'lever-seated-row',
    name: 'Lever Seated Row',
    name_vi: 'Máy chèo ngồi đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy kéo lưng giữa từ tư thế ngồi.',
    aliases_en: ['lever seated row'],
  },
  {
    slug: 'lever-bent-over-row',
    name: 'Lever Bent-Over Row',
    name_vi: 'Máy chèo cúi đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy kéo lưng từ tư thế cúi.',
    aliases_en: ['lever bent over row'],
  },
  {
    slug: 'lever-t-bar-row',
    name: 'Lever T-Bar Row',
    name_vi: 'Máy chèo T-bar đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy thanh T-bar kéo lưng.',
    aliases_en: ['lever t bar row'],
  },
  {
    slug: 'lever-pullover',
    name: 'Lever Pullover',
    name_vi: 'Máy pullover đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy pullover, kéo cơ xô.',
    aliases_en: ['lever pullover'],
  },
  {
    slug: 'lever-high-row',
    name: 'Lever High Row',
    name_vi: 'Máy kéo cao đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy kéo cao hướng ngực.',
    aliases_en: ['lever high row'],
  },
  {
    slug: 'lever-bicep-curl',
    name: 'Lever Bicep Curl',
    name_vi: 'Máy cuốn tay trước đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy cuốn tay trước, cô lập biceps.',
    aliases_en: ['lever bicep curl'],
  },
  {
    slug: 'lever-preacher-curl',
    name: 'Lever Preacher Curl',
    name_vi: 'Máy cuốn tay ghế preacher đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy cuốn tay với tựa tay preacher.',
    aliases_en: ['lever preacher curl'],
  },
  {
    slug: 'lever-triceps-extension',
    name: 'Lever Triceps Extension',
    name_vi: 'Máy duỗi tay sau đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy duỗi tay sau, cô lập triceps.',
    aliases_en: ['lever triceps extension'],
  },
  {
    slug: 'lever-seated-dip',
    name: 'Lever Seated Dip',
    name_vi: 'Máy dip ngồi đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy dip ngồi, tập triceps và ngực dưới.',
    aliases_en: ['lever seated dip', 'plate loaded dip'],
  },
  {
    slug: 'leg-extension',
    name: 'Leg Extension',
    name_vi: 'Máy duỗi đùi',
    category: 'machine',
    description_vi: 'Máy duỗi đùi trước, cô lập cơ quadriceps.',
    aliases_en: ['leg extension', 'quad extension'],
  },
  {
    slug: 'leg-curl',
    name: 'Leg Curl',
    name_vi: 'Máy cuộn đùi',
    category: 'machine',
    description_vi: 'Máy cuộn đùi sau, cô lập cơ hamstring.',
    aliases_vi: ['Cuộn/Duỗi chân', 'Máy gập đùi', 'Máy cuốn đùi sau', 'Máy cuộn/duỗi đùi'],
    aliases_en: ['leg curl', 'hamstring curl', 'leg curl / leg extension'],
  },
  {
    slug: 'lever-calf-raise',
    name: 'Lever Calf Raise',
    name_vi: 'Máy nâng gót đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy nâng gót chân, cô lập bắp chân.',
    aliases_en: ['lever calf raise'],
  },
  {
    slug: 'lever-calf-press',
    name: 'Lever Calf Press',
    name_vi: 'Máy đạp bắp chân đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy đạp bắp chân kiểu seated press.',
    aliases_en: ['lever calf press'],
  },
  {
    slug: 'lever-hip-abduction',
    name: 'Lever Hip Abduction',
    name_vi: 'Máy dạng hông đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy dạng hông, tập cơ mông giữa.',
    aliases_en: ['lever hip abduction'],
  },
  {
    slug: 'lever-hip-adduction',
    name: 'Lever Hip Adduction',
    name_vi: 'Máy khép hông đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy khép hông, tập cơ adductor.',
    aliases_en: ['lever hip adduction'],
  },
  {
    slug: 'lever-hip-extension',
    name: 'Lever Hip Extension',
    name_vi: 'Máy duỗi hông đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy duỗi hông, tập mông và gân kheo.',
    aliases_en: ['lever hip extension'],
  },
  {
    slug: 'lever-shrug',
    name: 'Lever Shrug',
    name_vi: 'Máy nhún vai đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy nhún vai, tập cơ trapezius.',
    aliases_en: ['lever shrug'],
  },
  {
    slug: 'lever-back-extension',
    name: 'Lever Back Extension',
    name_vi: 'Máy siết lưng đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy siết lưng, tập cơ lưng dưới.',
    aliases_en: ['lever back extension'],
  },
  {
    slug: 'lever-seated-crunch',
    name: 'Lever Seated Crunch',
    name_vi: 'Máy gập bụng ngồi đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy gập bụng ngồi.',
    aliases_en: ['lever seated crunch'],
  },
  {
    slug: 'lever-seated-good-morning',
    name: 'Lever Seated Good Morning',
    name_vi: 'Máy good morning ngồi đòn bẩy',
    category: 'machine',
    description_vi: 'Máy đòn bẩy good morning tư thế ngồi.',
    aliases_en: ['lever seated good morning'],
  },

  {
    slug: 'grip-strengthener',
    name: 'Grip Strengthener',
    name_vi: 'Dụng cụ tập grip',
    category: 'accessory',
    description_vi: 'Dụng cụ bóp tay tăng sức mạnh cổ tay và cẳng tay.',
    aliases_en: ['grip strengthener', 'hand gripper', 'gripper'],
  },

  // ─── ASSISTED MACHINES ─────────────────────────────────────────────────────
  {
    slug: 'assisted-pull-up-machine',
    name: 'Assisted Pull-Up/Dip Machine',
    name_vi: 'Máy hỗ trợ kéo xà và dip',
    category: 'machine',
    description_vi: 'Máy đệm gối trợ lực dùng chung cho pull-up, chin-up và dip.',
    aliases_vi: ['Máy hỗ trợ kéo xà', 'Máy hỗ trợ kéo xà ngược', 'Máy hỗ trợ dip'],
    aliases_en: [
      'assisted pull up machine',
      'assisted chin up machine',
      'assisted dip machine',
      'pull-up assist',
      'chin-up assist',
      'dip assist',
    ],
  },
  {
    slug: 'decline-bench',
    name: 'Decline Bench',
    name_vi: 'Ghế tập nghiêng dưới',
    category: 'furniture',
    description_vi: 'Ghế điều chỉnh nghiêng xuống, dùng cho decline bench press và sit-up.',
    aliases_en: ['decline bench', 'decline-bench'],
  },
  {
    slug: 'preacher-curl-bench',
    name: 'Preacher Curl Bench',
    name_vi: 'Ghế Preacher Curl',
    category: 'furniture',
    description_vi: 'Ghế có tựa tay chéo, cô lập cơ biceps cho bài curl tập trung.',
    aliases_en: ['preacher curl bench', 'preacher bench', 'preacher-curl-bench'],
  },
  {
    slug: 'ab-bench',
    name: 'Ab Bench',
    name_vi: 'Ghế tập bụng',
    category: 'furniture',
    description_vi: 'Ghế chuyên tập bụng với góc nghiêng và chỗ cố định chân.',
    aliases_en: ['ab bench', 'ab-bench', 'sit-up bench'],
  },
  {
    slug: 'hyperextension-bench',
    name: 'Hyperextension Bench',
    name_vi: 'Ghế hyperextension',
    category: 'furniture',
    description_vi: 'Ghế chuyên cho bài duỗi lưng/ngược, cô lập cơ lưng dưới và mông.',
    aliases_en: ['hyperextension bench', 'hyperextension-bench', 'back extension bench'],
  },
  {
    slug: 'ghd',
    name: 'Glute Ham Developer (GHD)',
    name_vi: 'Máy GHD',
    category: 'machine',
    description_vi: 'Máy phát triển cơ mông-gân kheo, có footplate xoay cho sit-up.',
    aliases_vi: ['Máy GHR'],
    aliases_en: ['ghd', 'ghr', 'glute ham developer', 'glute ham raise', 'glute-ham raise'],
  },
];

/**
 * Chuẩn hiển thị tiếng Việt: viết hoa chữ đầu của từng từ nhưng giữ nguyên
 * phần còn lại để không phá tên riêng/acronym như Smith, BOSU, TRX và GHD.
 */
export function toVietnameseTitleCase(value: string): string {
  return value.replace(/(^|[\s/(-])(\p{L})/gu, (_match, separator: string, letter: string) =>
    `${separator}${letter.toLocaleUpperCase('vi-VN')}`,
  );
}

export const EQUIPMENT_CATALOG: EquipmentCatalogRow[] = RAW_EQUIPMENT_CATALOG.map((row) => ({
  ...row,
  name_vi: toVietnameseTitleCase(row.name_vi),
}));

// ─── LOOKUPS ─────────────────────────────────────────────────────────────────
const BY_SLUG = new Map(EQUIPMENT_CATALOG.map((e) => [e.slug, e]));

/**
 * Equipment MODIFIERS — không phải dụng cụ độc lập, mà là modifier áp lên bài.
 * Ví dụ: "weighted pull-up" = pull-up-bar + modifier weighted
 *        "assisted pull-up" = pull-up-bar + modifier assisted (đã có máy h� trợ)
 *
 * Khi chuẩn hoá JSON exercise, modifier tách riêng, equipment chỉ giữ actual gear.
 */
export type EquipmentModifier = 'weighted' | 'assisted';

export const EQUIPMENT_MODIFIERS: Record<EquipmentModifier, { name: string; name_vi: string; description_vi: string }> = {
  weighted: {
    name: 'Weighted',
    name_vi: 'Có thêm tạ',
    description_vi: 'Bài biến thể có thêm tạ (vest/đĩa/đai) để tăng tải.',
  },
  assisted: {
    name: 'Assisted',
    name_vi: 'Có hỗ trợ',
    description_vi: 'Bài biến thể dùng dây kháng lực hoặc máy hỗ tr� để giảm tải.',
  },
};

export function getEquipmentBySlug(slug: string): EquipmentCatalogRow | undefined {
  return BY_SLUG.get(slug);
}

export function listByCategory(cat: EquipmentCategory): EquipmentCatalogRow[] {
  return EQUIPMENT_CATALOG.filter((e) => e.category === cat);
}

/**
 * Build lookup from any surface form (Vietnamese name_vi, alias_vi, English
 * name + aliases_en, slug) → slug. Case-insensitive.
 * Dùng khi cần resolve equipment string từ JSON exercise về slug chuẩn.
 */
export function buildVietnameseSlugMap(): Map<string, string> {
  const m = new Map<string, string>();
  for (const row of EQUIPMENT_CATALOG) {
    const keys = [row.name_vi, row.name, ...(row.aliases_vi ?? []), ...(row.aliases_en ?? [])];
    for (const k of keys) m.set(k.toLowerCase().trim(), row.slug);
    // also accept slug itself
    m.set(row.slug, row.slug);
  }
  return m;
}
