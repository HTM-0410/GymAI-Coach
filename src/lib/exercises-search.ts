/**
 * Helper chuẩn hóa và tìm kiếm bài tập thông minh song ngữ (Tiếng Việt & Tiếng Anh).
 * Hỗ trợ:
 * 1. Bỏ dấu tiếng Việt (unaccented search: "day nguc" -> "Đẩy ngực").
 * 2. Tìm kiếm theo tên tiếng Anh (English name: "bench press", "squat", "lat pulldown").
 * 3. Tìm kiếm theo từ khóa / thuật ngữ chuyên ngành (Bilingual synonyms: "chest" -> "ngực", "bicep" -> "tay trước").
 * 4. Tách đa từ (Multi-token match: "dumbbell chest" -> khớp bài có "dumbbell" và "chest").
 */

export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/** Từ điển ánh xạ từ khóa tiếng Anh/viết tắt thông dụng sang tiếng Việt */
const FITNESS_SYNONYMS: Record<string, string[]> = {
  // Nhóm cơ
  chest: ['nguc', 'ngực', 'day nguc', 'ep nguc'],
  pec: ['nguc', 'ngực'],
  pecs: ['nguc', 'ngực'],
  back: ['lung', 'lưng', 'xo', 'xô', 'keo lung', 'keo xo'],
  lat: ['xo', 'xô', 'lung', 'lưng'],
  lats: ['xo', 'xô', 'lung', 'lưng'],
  traps: ['cau vai', 'cầu vai'],
  trap: ['cau vai', 'cầu vai'],
  shoulder: ['vai', 'day vai', 'nang vai'],
  shoulders: ['vai', 'day vai', 'nang vai'],
  delt: ['vai', 'co vai'],
  delts: ['vai', 'co vai'],
  arm: ['tay', 'bap tay'],
  arms: ['tay', 'bap tay'],
  bicep: ['tay truoc', 'tay trước', 'cuon tay'],
  biceps: ['tay truoc', 'tay trước', 'cuon tay'],
  tricep: ['tay sau', 'duoi tay'],
  triceps: ['tay sau', 'duoi tay'],
  forearm: ['cang tay', 'cẳng tay'],
  forearms: ['cang tay', 'cẳng tay'],
  leg: ['chan', 'chân', 'dui', 'đùi'],
  legs: ['chan', 'chân', 'dui', 'đùi'],
  quad: ['dui truoc', 'đùi trước'],
  quads: ['dui truoc', 'đùi trước'],
  hamstring: ['dui sau', 'đùi sau'],
  hamstrings: ['dui sau', 'đùi sau'],
  hams: ['dui sau', 'đùi sau'],
  glute: ['mong', 'mông'],
  glutes: ['mong', 'mông'],
  butt: ['mong', 'mông'],
  calf: ['bap chan', 'bắp chân'],
  calves: ['bap chan', 'bắp chân'],
  abs: ['bung', 'bụng', 'co bung', 'cơ bụng'],
  abdominal: ['bung', 'bụng'],
  core: ['bung', 'bụng', 'co loi', 'cơ lõi', 'lien suon'],

  // Thiết bị
  dumbbell: ['ta don', 'tạ đơn', 'dumbbell', 'db'],
  db: ['ta don', 'tạ đơn', 'dumbbell'],
  barbell: ['ta don', 'tạ đòn', 'barbell', 'bb'],
  bb: ['ta don', 'tạ đòn', 'barbell'],
  cable: ['cap', 'cáp', 'keo cap', 'may cap'],
  machine: ['may', 'máy', 'may khoi'],
  bench: ['ghe', 'ghế', 'ghe tap', 'nam day'],
  kettlebell: ['ta am', 'tạ ấm', 'kettlebell'],
  band: ['day khang luc', 'dây kháng lực', 'resistance band'],
  bodyweight: ['khong dung cu', 'không dụng cụ', 'the trong', 'the luc'],
  smith: ['may smith', 'khung smith', 'smith machine'],

  // Bài tập nổi tiếng & Từ viết tắt
  benchpress: ['day nguc', 'bench press'],
  rdl: ['romanian deadlift', 'dui sau'],
  ohp: ['overhead press', 'day vai qua dau', 'day vai'],
  pullup: ['hit xa', 'xa don', 'keo xa'],
  pushup: ['chong day', 'hit dat'],
  dip: ['xa kep', 'chong xa kep'],
  dips: ['xa kep', 'chong xa kep'],
  squat: ['ganh dui', 'squat'],
  deadlift: ['keo ta', 'deadlift'],
  lunge: ['buoc chan', 'lunge'],
  curl: ['cuon tay', 'biceps curl'],
  fly: ['ep nguc', 'flyes', 'chest fly'],
  row: ['keo lung', 'cheo thuyen', 'barbell row', 'dumbbell row'],
  pulldown: ['keo xo', 'lat pulldown', 'keo cap'],
  pushdown: ['day tay sau', 'triceps pushdown'],
};

export type SearchableExercise = {
  name?: string | null;
  name_vi?: string | null;
  slug?: string | null;
  primary_muscle?: string | null;
  primary_muscle_vi?: string | null;
  secondary_muscles?: string[] | null;
  secondary_muscles_vi?: string[] | null;
  equipment?: string[] | null;
  equipment_vi?: string[] | null;
  tags?: string[] | null;
  movement_pattern?: string | null;
};

/**
 * Kiểm tra xem một bài tập có khớp với chuỗi tìm kiếm (Anh / Việt / Không dấu / Đa từ) hay không.
 */
export function matchExerciseSearch(rawQuery: string, exercise: SearchableExercise): boolean {
  if (!rawQuery || !rawQuery.trim()) return true;

  const query = rawQuery.trim().toLowerCase();
  const unaccentedQuery = removeVietnameseTones(query);

  // Xây dựng kho ngữ liệu tìm kiếm từ bài tập
  const nameVi = exercise.name_vi || '';
  const nameEn = exercise.name || '';
  const slug = (exercise.slug || '').replace(/[-_]/g, ' ');
  const primaryMuscle = exercise.primary_muscle || exercise.primary_muscle_vi || '';
  const secondaryMuscles = [
    ...(exercise.secondary_muscles || []),
    ...(exercise.secondary_muscles_vi || []),
  ].join(' ');
  const equipment = [
    ...(exercise.equipment || []),
    ...(exercise.equipment_vi || []),
  ].join(' ');
  const tags = (exercise.tags || []).join(' ');
  const movement = exercise.movement_pattern || '';

  // Bản gốc & Bản không dấu
  const rawCorpus = `${nameVi} ${nameEn} ${slug} ${primaryMuscle} ${secondaryMuscles} ${equipment} ${tags} ${movement}`.toLowerCase();
  const unaccentedCorpus = removeVietnameseTones(rawCorpus);

  // Tách query thành các từ khóa (tokens)
  const tokens = unaccentedQuery.split(/\s+/).filter(Boolean);

  // Kiểm tra: MỌI từ khóa trong query đều phải tìm thấy trong bài tập (hoặc từ đồng nghĩa)
  return tokens.every((token) => {
    // 1. Khớp trực tiếp có dấu hoặc không dấu
    if (unaccentedCorpus.includes(token) || rawCorpus.includes(token)) {
      return true;
    }

    // 2. Khớp từ đồng nghĩa (ví dụ: gõ "chest" -> tìm thấy "nguc" trong corpus)
    const synonyms = FITNESS_SYNONYMS[token];
    if (synonyms && synonyms.some((syn) => unaccentedCorpus.includes(syn) || rawCorpus.includes(syn))) {
      return true;
    }

    return false;
  });
}
