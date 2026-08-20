/**
 * Muscle Category Mapping
 *
 * Map free-text primary_muscle (Gemini-generated, 50+ variants) → 8 nhóm lớn
 * dựa trên ảnh muscle body từ exerciselibrary.app.
 */

export type MuscleCategoryId =
  | 'shoulders'
  | 'chest'
  | 'back'
  | 'triceps'
  | 'abs'
  | 'legs'
  | 'glutes'
  | 'biceps'
  | 'forearms';

export type MuscleCategory = {
  id: MuscleCategoryId;
  name_vi: string;
  /** Match keywords (lowercase, contains) để phân loại primary_muscle text. */
  keywords: string[];
  /** Image path trong /public/muscle-groups/. */
  imagePath: string;
  /** LED intensity (1-3). */
  intensity: 1 | 2 | 3;
};

export const MUSCLE_CATEGORIES: MuscleCategory[] = [
  {
    id: 'shoulders',
    name_vi: 'Vai',
    keywords: ['vai', 'delta'],
    imagePath: '/muscle-groups/shoulders.png',
    intensity: 3,
  },
  {
    id: 'chest',
    name_vi: 'Ngực',
    keywords: ['ngực'],
    imagePath: '/muscle-groups/chest.png',
    intensity: 3,
  },
  {
    id: 'back',
    name_vi: 'Lưng',
    keywords: ['lưng', 'xô', 'lats', 'upper back', 'spine', 'trap', 'rhomboid', 'levator'],
    imagePath: '/muscle-groups/back.png',
    intensity: 3,
  },
  {
    id: 'triceps',
    name_vi: 'Tay sau',
    keywords: ['tay sau', 'tam đầu'],
    imagePath: '/muscle-groups/triceps.png',
    intensity: 2,
  },
  {
    id: 'abs',
    name_vi: 'Bụng',
    keywords: ['bụng', 'liên sườn', 'core'],
    imagePath: '/muscle-groups/core.png',
    intensity: 2,
  },
  {
    id: 'legs',
    name_vi: 'Chân',
    keywords: ['chân', 'đùi', 'bắp chân', 'bắp đùi', 'quad', 'hamstring', 'calf'],
    imagePath: '/muscle-groups/quads.png',
    intensity: 3,
  },
  {
    id: 'glutes',
    name_vi: 'Mông',
    keywords: ['mông', 'glute'],
    imagePath: '/muscle-groups/glutes.png',
    intensity: 2,
  },
  {
    id: 'biceps',
    name_vi: 'Tay trước',
    keywords: ['tay trước', 'bắp tay', 'bicep', 'cánh tay trước'],
    imagePath: '/muscle-groups/biceps.png',
    intensity: 1,
  },
  {
    id: 'forearms',
    name_vi: 'Cẳng tay',
    keywords: ['cẳng tay', 'forearm', 'wrist', 'cổ tay'],
    imagePath: '/muscle-groups/forearms.png',
    intensity: 1,
  },
];

/** Phân loại một bài tập theo primary_muscle → category. */
export function classifyMuscle(primaryMuscle: string | null | undefined): MuscleCategory | null {
  if (!primaryMuscle) return null;
  const text = primaryMuscle.toLowerCase();
  for (const cat of MUSCLE_CATEGORIES) {
    if (cat.keywords.some((kw) => text.includes(kw))) return cat;
  }
  return null;
}

/** Group exercises theo category. */
export function groupByCategory<T extends { primary_muscle?: string | null }>(
  items: T[]
): Map<MuscleCategoryId, { category: MuscleCategory; items: T[] }> {
  const map = new Map<MuscleCategoryId, { category: MuscleCategory; items: T[] }>();
  for (const cat of MUSCLE_CATEGORIES) {
    map.set(cat.id, { category: cat, items: [] });
  }
  for (const item of items) {
    const cat = classifyMuscle(item.primary_muscle);
    if (!cat) continue;
    const bucket = map.get(cat.id);
    if (bucket) bucket.items.push(item);
  }
  return map;
}
