import {
  BODY_MUSCLE_GROUPS,
  BODY_MUSCLE_GROUP_LABELS,
  type BodyMuscleGroup,
} from '@/lib/recovery/muscle-groups';

export type RecoveryGroupSection = 'main' | 'accessory';
export type RecoveryGroupPreferredView = 'front' | 'back';

export type RecoveryGroupUiMetadata = {
  group: BodyMuscleGroup;
  label: string;
  section: RecoveryGroupSection;
  thumbnailPath: string;
  preferredView: RecoveryGroupPreferredView;
  anatomyDescription: string;
};

export const RECOVERY_GROUP_UI_METADATA = {
  CHEST: {
    group: 'CHEST',
    label: BODY_MUSCLE_GROUP_LABELS.CHEST,
    section: 'main',
    thumbnailPath: '/muscle-groups/full/chest.png',
    preferredView: 'front',
    anatomyDescription: 'Nhóm cơ ngực nằm ở phía trước thân trên, hỗ trợ các động tác đẩy và đưa cánh tay vào gần cơ thể.',
  },
  SHOULDERS: {
    group: 'SHOULDERS',
    label: BODY_MUSCLE_GROUP_LABELS.SHOULDERS,
    section: 'main',
    thumbnailPath: '/muscle-groups/full/shoulders.png',
    preferredView: 'front',
    anatomyDescription: 'Nhóm cơ vai bao quanh khớp vai, hỗ trợ nâng, xoay và giữ ổn định cánh tay theo nhiều hướng.',
  },
  BACK: {
    group: 'BACK',
    label: BODY_MUSCLE_GROUP_LABELS.BACK,
    section: 'main',
    thumbnailPath: '/muscle-groups/full/back.png',
    preferredView: 'back',
    anatomyDescription: 'Nhóm cơ lưng trải dọc mặt sau thân trên, hỗ trợ kéo, giữ tư thế và kiểm soát chuyển động của bả vai.',
  },
  TRICEPS: {
    group: 'TRICEPS',
    label: BODY_MUSCLE_GROUP_LABELS.TRICEPS,
    section: 'main',
    thumbnailPath: '/muscle-groups/full/triceps.png',
    preferredView: 'back',
    anatomyDescription: 'Cơ tay sau nằm ở mặt sau cánh tay trên, có vai trò chính trong động tác duỗi khuỷu tay.',
  },
  BICEPS: {
    group: 'BICEPS',
    label: BODY_MUSCLE_GROUP_LABELS.BICEPS,
    section: 'main',
    thumbnailPath: '/muscle-groups/full/biceps.png',
    preferredView: 'front',
    anatomyDescription: 'Cơ tay trước nằm ở mặt trước cánh tay trên, hỗ trợ gập khuỷu tay và xoay cẳng tay.',
  },
  FOREARMS: {
    group: 'FOREARMS',
    label: BODY_MUSCLE_GROUP_LABELS.FOREARMS,
    section: 'accessory',
    thumbnailPath: '/muscle-groups/full/forearms.png',
    preferredView: 'front',
    anatomyDescription: 'Nhóm cơ cẳng tay điều khiển phần lớn chuyển động cổ tay, bàn tay và góp phần duy trì lực nắm.',
  },
  ABS: {
    group: 'ABS',
    label: BODY_MUSCLE_GROUP_LABELS.ABS,
    section: 'main',
    thumbnailPath: '/muscle-groups/full/core.png',
    preferredView: 'front',
    anatomyDescription: 'Nhóm cơ bụng hỗ trợ gập, xoay và giữ ổn định thân người khi vận động hoặc chịu tải.',
  },
  LEGS: {
    group: 'LEGS',
    label: BODY_MUSCLE_GROUP_LABELS.LEGS,
    section: 'main',
    thumbnailPath: '/muscle-groups/full/quads.png',
    preferredView: 'front',
    anatomyDescription: 'Nhóm cơ đùi hỗ trợ duỗi và gập gối, đồng thời phối hợp kiểm soát hông trong các động tác đứng, bước và ngồi xuống.',
  },
  GLUTES: {
    group: 'GLUTES',
    label: BODY_MUSCLE_GROUP_LABELS.GLUTES,
    section: 'main',
    thumbnailPath: '/muscle-groups/full/glutes.png',
    preferredView: 'back',
    anatomyDescription: 'Nhóm cơ mông nằm ở mặt sau hông, hỗ trợ duỗi hông và giữ ổn định xương chậu khi đứng hoặc di chuyển.',
  },
  CALVES: {
    group: 'CALVES',
    label: BODY_MUSCLE_GROUP_LABELS.CALVES,
    section: 'accessory',
    thumbnailPath: '/muscle-groups/full/calves.png',
    preferredView: 'back',
    anatomyDescription: 'Nhóm cơ bắp chân nằm ở phần dưới cẳng chân, hỗ trợ nhón gót và tạo lực đẩy khi đi, chạy hoặc bật nhảy.',
  },
} as const satisfies Record<BodyMuscleGroup, RecoveryGroupUiMetadata>;

export const RECOVERY_GROUP_UI_ITEMS: readonly RecoveryGroupUiMetadata[] =
  BODY_MUSCLE_GROUPS.map((group) => RECOVERY_GROUP_UI_METADATA[group]);

export function getRecoveryGroupUiMetadata(group: BodyMuscleGroup): RecoveryGroupUiMetadata {
  return RECOVERY_GROUP_UI_METADATA[group];
}
