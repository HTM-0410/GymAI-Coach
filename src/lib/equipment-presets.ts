export type EquipmentPresetId =
  | 'none'
  | 'home_basic'
  | 'home_gym'
  | 'gym_standard'
  | 'gym_full'
  | 'custom';

export type EquipmentItemSummary = {
  id: string;
  slug: string;
  name: string;
  name_vi: string | null;
  category: string | null;
  image_url?: string | null;
};

export type EquipmentPresetDefinition = {
  id: EquipmentPresetId;
  title: string;
  subtitle: string;
  description: string;
  examples: string;
  slugs?: string[];
  isFullCatalog?: boolean;
};

export const EQUIPMENT_PRESETS: EquipmentPresetDefinition[] = [
  {
    id: 'none',
    title: 'Không thiết bị',
    subtitle: 'Tập bằng trọng lượng cơ thể',
    description: 'Tập luyện Calisthenics & Bodyweight thuần túy, hoàn toàn không cần dụng cụ hay máy móc.',
    examples: 'Chống đẩy (Push-up), Squat tự trọng, Plank, Lunge, Burpee...',
    slugs: [],
  },
  {
    id: 'home_basic',
    title: 'Tập tại nhà cơ bản',
    subtitle: 'Tạ đơn & thảm tập tại nhà',
    description: 'Góc tập tối giản tại nhà với tạ đơn và thảm tập.',
    examples: 'Tạ đơn, Thảm tập',
    slugs: ['dumbbell', 'exercise-mat'],
  },
  {
    id: 'home_gym',
    title: 'Home Gym',
    subtitle: 'Góc tập tự do tại nhà',
    description: 'Không gian tập tại nhà đầy đủ tạ tự do, ghế tập và khung đỡ hoặc xà đơn tiện lợi.',
    examples: 'Tạ đơn, Tạ đòn, Ghế phẳng/nghiêng, Khung squat, Xà đơn, Tạ chuông...',
    slugs: [
      'dumbbell',
      'barbell',
      'bench',
      'incline-bench',
      'squat-rack',
      'pull-up-bar',
      'kettlebell',
      'resistance-band',
      'exercise-mat',
      'ez-bar',
      'dip-station',
    ],
  },
  {
    id: 'gym_standard',
    title: 'Gym tiêu chuẩn',
    subtitle: 'Phòng tập thể hình phổ thông',
    description: 'Phòng gym thương mại với đầy đủ khu tạ tự do và các dàn máy khối, kéo cáp cơ bản.',
    examples: 'Tạ đòn/đơn, Ghế tập, Máy cáp, Kéo xô (Lat Pulldown), Đạp đùi (Leg Press), Duỗi/cuộn đùi, Máy chạy...',
    slugs: [
      'barbell',
      'dumbbell',
      'bench',
      'incline-bench',
      'squat-rack',
      'cable',
      'lat-pulldown',
      'leg-press',
      'leg-curl',
      'leg-extension',
      'pull-up-bar',
      'dip-station',
      'smith-machine',
      'treadmill',
      'stationary-bike',
      'pec-deck',
      'shoulder-press-machine',
      'chest-press-machine',
      'rowing-machine',
    ],
  },
  {
    id: 'gym_full',
    title: 'Gym đầy đủ',
    subtitle: 'Toàn bộ dàn máy & tạ chuyên nghiệp',
    description: 'Phòng gym quy mô lớn với toàn bộ danh mục máy đòn bẩy, tạ tự do và phụ kiện trong hệ thống.',
    examples: 'Tất cả thiết bị vật lý có trong danh mục GymAI Coach.',
    isFullCatalog: true,
  },
  {
    id: 'custom',
    title: 'Tùy chỉnh riêng',
    subtitle: 'Tự chọn hoặc Quét ảnh AI',
    description: 'Tự tay chọn lọc từng món thiết bị bạn có hoặc dùng camera/thư viện để AI quét tự động.',
    examples: 'Tìm kiếm theo tên, lọc theo nhóm, quét ảnh AI...',
  },
];

/**
 * Resolves a preset into an array of equipment UUIDs from the given catalog.
 */
export function resolvePresetEquipmentIds(
  presetId: EquipmentPresetId,
  catalog: EquipmentItemSummary[],
): string[] {
  if (presetId === 'none') {
    return [];
  }

  if (presetId === 'gym_full') {
    // `bodyweight` is a compatibility sentinel used by workout matching, not
    // a piece of equipment a gym can own. Physical stations such as pull-up
    // bars still remain included even though their category is bodyweight.
    return catalog.filter((item) => item.slug !== 'bodyweight').map((item) => item.id);
  }

  if (presetId === 'custom') {
    return [];
  }

  const preset = EQUIPMENT_PRESETS.find((p) => p.id === presetId);
  if (!preset || !preset.slugs || preset.slugs.length === 0) {
    return [];
  }

  const slugSet = new Set(preset.slugs);
  return catalog.filter((item) => slugSet.has(item.slug)).map((item) => item.id);
}

/**
 * Infers the matching preset from a list of selected equipment IDs.
 * Returns 'custom' if the selected set doesn't exactly match a preset.
 */
export function inferPresetFromEquipmentIds(
  selectedIds: string[],
  catalog: EquipmentItemSummary[],
): EquipmentPresetId {
  if (!selectedIds || selectedIds.length === 0) {
    return 'none';
  }

  const selectedSet = new Set(selectedIds);
  const catalogIds = resolvePresetEquipmentIds('gym_full', catalog);

  // Check gym_full: matches all catalog items
  if (
    catalogIds.length > 0 &&
    catalogIds.length === selectedSet.size &&
    catalogIds.every((id) => selectedSet.has(id))
  ) {
    return 'gym_full';
  }

  // Check fixed presets in order
  const checkPresets: EquipmentPresetId[] = ['gym_standard', 'home_gym', 'home_basic'];
  for (const pid of checkPresets) {
    const presetIds = resolvePresetEquipmentIds(pid, catalog);
    if (
      presetIds.length > 0 &&
      presetIds.length === selectedSet.size &&
      presetIds.every((id) => selectedSet.has(id))
    ) {
      return pid;
    }
  }

  return 'custom';
}
