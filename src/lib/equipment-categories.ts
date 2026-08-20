/**
 * Mapping từ equipment_vi trong DB sang các nhóm hiển thị ổn định.
 * Phân chia đầy đủ 13 nhóm thiết bị theo chuẩn phòng tập (Tạ Đòn, Tạ Đơn, Tạ Ấm, Ghế Tập...).
 *
 * Mỗi exercise có thể match nhiều category nếu có nhiều equipment_vi trùng —
 * nhưng trong sidebar ta đếm unique exercise, không cộng dồn.
 */

export type EquipmentCategoryId =
  | 'barbells'
  | 'dumbbells'
  | 'kettlebells'
  | 'bench'
  | 'no-equipment'
  | 'cables'
  | 'machines'
  | 'pull-up-dip'
  | 'bands'
  | 'balls'
  | 'cardio-machines'
  | 'accessories'
  | 'other';

export type EquipmentCategory = {
  id: EquipmentCategoryId;
  /** Tiếng Anh (dùng cho debug/fallback). */
  label: string;
  /** Tiếng Việt (hiển thị chính). */
  label_vi: string;
  /** Path tới icon PNG trong /public/equipment/categories/. */
  iconPath: string;
  /** Mảng equipment_vi values trong DB thuộc category này (substring match). */
  matchPatterns: string[];
};

/**
 * Map viết thường + bỏ dấu → category id. Dùng để match `equipment_vi` nhanh.
 */
const RULES: Array<{ id: EquipmentCategoryId; needles: string[] }> = [
  // Dumbbells (Tạ đơn)
  { id: 'dumbbells', needles: ['tạ đơn', 'dumbbell', 'dumbbells'] },

  // Kettlebells (Tạ ấm)
  { id: 'kettlebells', needles: ['tạ ấm', 'kettlebell', 'kettlebells'] },

  // Barbells (Tạ đòn)
  {
    id: 'barbells',
    needles: [
      'thanh tạ đòn',
      'tạ đòn',
      'tạ ez',
      'tạ trap',
      'đĩa tạ',
      'landmine',
      'khung squat',
      'barbell',
      'thanh tạ cong',
      'thanh trap',
      'thanh ez',
      'đòn tạ',
    ],
  },

  // Pull-up / Dip trước machines
  {
    id: 'pull-up-dip',
    needles: [
      'xà đơn',
      'xà kép',
      'xà song song',
      'máy kéo xà',
      'hỗ trợ dip',
      'hỗ trợ kéo xà',
      'vòng thể dục',
      'pull-up',
      'dip station',
    ],
  },

  // Machines (đòn bẩy / lever / smith)
  {
    id: 'machines',
    needles: [
      'máy tập',
      'máy smith',
      'smith machine',
      'máy đạp chân',
      'máy đạp đùi',
      'máy nâng gót',
      'máy cuộn',
      'máy duỗi',
      'máy đẩy vai',
      'máy gập bụng',
      'máy ép ngực',
      'máy cuốn tay',
      'máy t-bar',
      'máy chèo cúi',
      'máy ghr',
      'máy ghd',
      'máy hỗ trợ',
      'máy sissy',
      'máy reverse hyper',
      'máy ép đùi',
      'máy banh đùi',
    ],
  },

  // Cables
  { id: 'cables', needles: ['máy cáp', 'cáp', 'tay cầm cáp', 'dây thừng kéo cáp', 'cable'] },

  // Bands / TRX
  { id: 'bands', needles: ['dây kháng lực', 'trx', 'dây treo', 'dây chun', 'resistance band'] },

  // No Equipment (bodyweight)
  { id: 'no-equipment', needles: ['trọng lượng cơ thể', 'cơ thể', 'bodyweight'] },

  // Balls
  {
    id: 'balls',
    needles: ['bóng tập', 'bóng tạ', 'bóng bosu', 'bóng med', 'medicine ball', 'swiss ball'],
  },

  // Bench
  {
    id: 'bench',
    needles: [
      'ghế tập',
      'ghế nghiêng',
      'ghế preacher',
      'ghế hyperextension',
      'ghế phẳng',
      'ghế dốc',
      'bench',
    ],
  },

  // Cardio Machines
  {
    id: 'cardio-machines',
    needles: [
      'máy chạy bộ',
      'xe đạp tập',
      'xe đạp gió',
      'xe đạp spinning',
      'xe đạp tựa lưng',
      'máy elliptical',
      'máy leo cầu thang',
      'máy trượt tuyết',
      'máy đạp tay',
      'máy cardio',
      'máy chèo thuyền',
      'dây nhảy',
      'cardiovascular',
    ],
  },

  // Accessories
  {
    id: 'accessories',
    needles: [
      'con lăn',
      'đai',
      'áo gắn tạ',
      'tạ đeo',
      'lốp xe',
      'búa tạ',
      'xích tạ',
      'dụng cụ tập grip',
      'thảm tập',
      'dây đeo cổ chân',
      'dây kéo cáp',
      'bục nhảy',
      'con lăn bọt',
      'gậy xoay',
    ],
  },
];

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  {
    id: 'barbells',
    label: 'Barbells',
    label_vi: 'Tạ Đòn',
    iconPath: '/equipment/categories/barbell.png',
    matchPatterns: [],
  },
  {
    id: 'dumbbells',
    label: 'Dumbbells',
    label_vi: 'Tạ Đơn',
    iconPath: '/equipment/categories/dumbbells.png',
    matchPatterns: [],
  },
  {
    id: 'kettlebells',
    label: 'Kettlebells',
    label_vi: 'Tạ Ấm',
    iconPath: '/equipment/categories/kettlebells.png',
    matchPatterns: [],
  },
  {
    id: 'bench',
    label: 'Bench',
    label_vi: 'Ghế Tập',
    iconPath: '/equipment/categories/bench.png',
    matchPatterns: [],
  },
  {
    id: 'no-equipment',
    label: 'No Equipment',
    label_vi: 'Không Dụng Cụ',
    iconPath: '/equipment/categories/no-equipment.png',
    matchPatterns: [],
  },
  {
    id: 'cables',
    label: 'Cables',
    label_vi: 'Máy Cáp',
    iconPath: '/equipment/categories/cables.png',
    matchPatterns: [],
  },
  {
    id: 'machines',
    label: 'Machines',
    label_vi: 'Máy Khối',
    iconPath: '/equipment/categories/machines.png',
    matchPatterns: [],
  },
  {
    id: 'pull-up-dip',
    label: 'Pull-up & Dip',
    label_vi: 'Xà Đơn & Dip',
    iconPath: '/equipment/categories/pull-up-dip.png',
    matchPatterns: [],
  },
  {
    id: 'bands',
    label: 'Bands',
    label_vi: 'Dây Kháng Lực',
    iconPath: '/equipment/categories/bands.png',
    matchPatterns: [],
  },
  {
    id: 'balls',
    label: 'Balls',
    label_vi: 'Bóng Tập',
    iconPath: '/equipment/categories/balls.png',
    matchPatterns: [],
  },
  {
    id: 'cardio-machines',
    label: 'Cardio Machines',
    label_vi: 'Máy Cardio',
    iconPath: '/equipment/categories/cardio-machines.png',
    matchPatterns: [],
  },
  {
    id: 'accessories',
    label: 'Accessories',
    label_vi: 'Phụ Kiện',
    iconPath: '/equipment/categories/other.png',
    matchPatterns: [],
  },
  {
    id: 'other',
    label: 'Other',
    label_vi: 'Khác',
    iconPath: '/equipment/categories/other.png',
    matchPatterns: [],
  },
];

export type EquipmentClassificationInput = {
  slug: string;
  name_vi?: string | null;
  category?: string | null;
};

const SLUG_GROUPS: Partial<Record<EquipmentCategoryId, Set<string>>> = {
  'no-equipment': new Set(['bodyweight']),
  'barbells': new Set([
    'barbell',
    'ez-bar',
    'trap-bar',
    'weight-plate',
    'cambered-bar',
    'landmine',
  ]),
  'dumbbells': new Set(['dumbbell']),
  'kettlebells': new Set(['kettlebell']),
  'cables': new Set(['cable', 'tricep-rope', 'ankle-strap']),
  'bands': new Set(['resistance-band', 'suspension-trainer']),
  'bench': new Set([
    'bench',
    'incline-bench',
    'decline-bench',
    'preacher-curl-bench',
    'ab-bench',
    'hyperextension-bench',
  ]),
  'pull-up-dip': new Set([
    'pull-up-bar',
    'dip-station',
    'parallel-bars',
    'parallettes',
    'gymnastic-rings',
    'assisted-pull-up-machine',
  ]),
  'balls': new Set(['medicine-ball', 'stability-ball', 'bosu']),
  'cardio-machines': new Set(['rowing-machine']),
  'accessories': new Set(['ab-wheel', 'squat-rack']),
};

export type WeightSubcategoryId = 'dumbbells' | 'kettlebells' | 'barbells';

export const WEIGHT_SUBCATEGORIES: Array<{ id: WeightSubcategoryId; label_vi: string }> = [
  { id: 'dumbbells', label_vi: 'Tạ Đơn' },
  { id: 'kettlebells', label_vi: 'Tạ Ấm' },
  { id: 'barbells', label_vi: 'Tạ Đòn' },
];

export function classifyWeightSubcategory(input: EquipmentClassificationInput): WeightSubcategoryId {
  if (input.slug === 'dumbbell') return 'dumbbells';
  if (input.slug === 'kettlebell') return 'kettlebells';
  return 'barbells';
}

export function classifyEquipment(input: string | EquipmentClassificationInput): EquipmentCategoryId {
  if (typeof input !== 'string') {
    for (const [id, slugs] of Object.entries(SLUG_GROUPS) as Array<[EquipmentCategoryId, Set<string>]>) {
      if (slugs.has(input.slug)) return id;
    }
    if (input.category === 'cardio') return 'cardio-machines';
    if (input.category === 'machine') return 'machines';
    if (input.category === 'accessory' || input.category === 'furniture' || input.category === 'core') return 'accessories';
    if (input.category === 'free_weight') {
      if (input.slug === 'dumbbell') return 'dumbbells';
      if (input.slug === 'kettlebell') return 'kettlebells';
      return 'barbells';
    }
    if (input.category === 'bodyweight' || input.category === 'station') return 'pull-up-dip';
    if (input.slug.startsWith('may-')) return 'machines';
  }

  const name = typeof input === 'string' ? input : input.name_vi || input.slug;
  const n = name.toLowerCase().trim();
  for (const rule of RULES) {
    for (const needle of rule.needles) {
      if (n.includes(needle)) return rule.id;
    }
  }
  return 'other';
}

/**
 * Phân loại cả mảng equipment của 1 exercise → Set category ids
 * (1 exercise có thể thuộc nhiều category, vd vừa dùng tạ đơn vừa dùng ghế tập).
 */
export function classifyEquipments(items: string[]): Set<EquipmentCategoryId> {
  const out = new Set<EquipmentCategoryId>();
  for (const it of items) out.add(classifyEquipment(it));
  return out;
}
