// Mapping enum English → Tiếng Việt cho UI hiển thị.
// Source-of-truth cho localized labels.

export const EXERCISE_TYPE_VI: Record<string, string> = {
  compound: 'Đa khớp',
  isolation: 'Đơn khớp',
};

export const DIFFICULTY_VI: Record<string, string> = {
  beginner: 'Sơ cấp',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
};

export const MOVEMENT_PATTERN_VI: Record<string, string> = {
  push: 'Đẩy',
  pull: 'Kéo',
  hinge: 'Gập hông',
  squat: 'Squat',
  lunge: 'Bước chân',
  carry: 'Mang vác',
  rotation: 'Xoay',
  isolation: 'Đơn khớp',
};

export const MUSCLE_NAME_VI: Record<string, string> = {
  'upper back': 'Lưng trên',
  'cardiovascular system': 'Tim mạch',
  'cardio': 'Tim mạch',
  'spine': 'Cột sống',
  'adductors': 'Cơ khép đùi',
  'abductors': 'Cơ dạng đùi',
  'serratus anterior': 'Cơ răng cưa',
  'levator scapulae': 'Cơ nâng vai',
  'chest': 'Ngực',
  'shoulders': 'Vai',
  'biceps': 'Tay trước',
  'triceps': 'Tay sau',
  'lats': 'Cơ xô',
  'glutes': 'Mông',
  'quads': 'Đùi trước',
  'quadriceps': 'Đùi trước',
  'hamstrings': 'Đùi sau',
  'calves': 'Bắp chân',
  'forearms': 'Cẳng tay',
  'abs': 'Cơ bụng',
  'core': 'Cơ bụng',
  'trapezius': 'Cơ cầu vai',
  'rhomboids': 'Cơ hình thoi',
  'deltoids': 'Cơ vai',
  'rear deltoids': 'Cơ vai sau',
  'general': 'Toàn thân',
};

export function formatMuscleVi(raw?: string | null): string {
  if (!raw) return 'Toàn thân';
  const lower = raw.trim().toLowerCase();
  return MUSCLE_NAME_VI[lower] ?? raw;
}

export function viLabel(
  raw: string,
  dict: Record<string, string>,
  fallback?: string
): string {
  return dict[raw] ?? fallback ?? raw;
}