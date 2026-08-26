export type CoachNavigationAction = {
  type: 'navigate';
  href: string;
  label: string;
  workoutHandoff?: { suggestion: string };
};

export type WorkoutCoachAction =
  | { type: 'apply_weight'; weightKg: number; label: string }
  | { type: 'apply_reps'; reps: number; label: string }
  | { type: 'adjust_rest'; restSeconds: number; label: string }
  | { type: 'add_set'; label: string };

type NavigationDestination = CoachNavigationAction & {
  patterns: RegExp[];
};

const DESTINATIONS: NavigationDestination[] = [
  { type: 'navigate', href: '/profile/body-composition', label: 'Mở trang InBody', patterns: [/\binbody\b/, /thanh phan co the/] },
  { type: 'navigate', href: '/workouts', label: 'Mở nhật ký tập luyện', patterns: [/lich su (?:buoi )?tap/, /nhat ky (?:buoi )?tap/, /cac buoi tap/] },
  { type: 'navigate', href: '/workouts/new', label: 'Mở trang tập luyện AI', patterns: [/trang tap luyen/, /tap luyen ai/, /tao (?:mot )?buoi tap/, /tap ngay/, /\bworkout\b/] },
  { type: 'navigate', href: '/exercises', label: 'Mở thư viện bài tập', patterns: [/thu vien bai tap/, /trang bai tap/] },
  { type: 'navigate', href: '/programs', label: 'Mở chương trình tập', patterns: [/chuong trinh tap/, /giao an/] },
  { type: 'navigate', href: '/gyms', label: 'Mở phòng gym cá nhân', patterns: [/phong gym/, /trang gym/] },
  { type: 'navigate', href: '/progress', label: 'Mở trang tiến độ', patterns: [/tien do/, /ky luc/] },
  { type: 'navigate', href: '/weekly', label: 'Mở báo cáo tuần', patterns: [/bao cao tuan/] },
  { type: 'navigate', href: '/recommendations', label: 'Mở trang đề xuất', patterns: [/trang de xuat/, /khuyen nghi cua ai/] },
  { type: 'navigate', href: '/profile', label: 'Mở hồ sơ cá nhân', patterns: [/ho so ca nhan/, /trang ca nhan/] },
  { type: 'navigate', href: '/dashboard', label: 'Mở trang tổng quan', patterns: [/tong quan/, /\bdashboard\b/] },
];

function normalizeForIntent(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .toLocaleLowerCase('vi')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function resolveCoachNavigationAction(message: string): CoachNavigationAction | null {
  const normalized = normalizeForIntent(message);
  const explicitlyRequestsNavigation = /\b(chuyen|mo|di den|dua toi|dan toi|truy cap|vao|cho toi den)\b/.test(normalized);
  const negatesNavigation = /\b(khong|dung|chua)(?:\s+[a-z0-9]+){0,2}\s+(?:chuyen|mo|di|dua|dan|truy cap|vao)\b/.test(normalized);

  if (!explicitlyRequestsNavigation || negatesNavigation) return null;

  const destination = DESTINATIONS.find(({ patterns }) => patterns.some((pattern) => pattern.test(normalized)));
  if (!destination) return null;

  return { type: destination.type, href: destination.href, label: destination.label };
}

export function navigationReply(action: CoachNavigationAction) {
  if (action.workoutHandoff) {
    return 'Được, mình đang mang **lịch AI vừa gợi ý** sang trang tập luyện và tạo sẵn bản nháp cho bạn.';
  }
  return `Được, mình đang chuyển bạn đến **${action.label.replace(/^Mở\s+/i, '')}**.`;
}

export function requestsSuggestedWorkoutHandoff(message: string) {
  const normalized = normalizeForIntent(message);
  return /\b(?:chuyen|mang|dua)\s+(?:bai tap|lich tap|lich|de xuat)\s+(?:nay|do|tren)\b/.test(normalized)
    || /\b(voi|theo)\s+(?:bai tap|lich tap|lich|de xuat)\s+(?:nay|do|tren)\b/.test(normalized)
    || /\b(voi|theo)\s+(?:bai tap|lich tap|lich|de xuat)(?:\s+ma)?\s+(?:ai\s+)?(?:vua\s+)?goi y\b/.test(normalized)
    || /\b(voi|theo)\s+(?:bai tap|lich tap|lich|de xuat)(?:\s+(?:da|vua))?\s+(?:tao|goi y)(?:\s+cua toi)?\b/.test(normalized)
    || /\b(?:bai tap|lich tap|lich|de xuat)\s+(?:ai\s+)?vua goi y\b/.test(normalized)
    || /\bmang\s+(?:bai tap|lich tap|de xuat)\b/.test(normalized);
}

export function extractWorkoutCoachActions(replyText: string): WorkoutCoachAction[] {
  const actions: WorkoutCoachAction[] = [];

  // Match weight suggestion e.g. "67.5kg", "70 kg"
  const weightMatch = replyText.match(/(?:mức tạ|dùng|tập|hạ xuống|tăng lên|áp dụng)\s*[:：]?\s*(\d+(?:[.,]\d+)?)\s*kg/i);
  if (weightMatch && weightMatch[1]) {
    const w = parseFloat(weightMatch[1].replace(',', '.'));
    if (w > 0 && w <= 500) {
      actions.push({ type: 'apply_weight', weightKg: w, label: `Áp dụng ${w}kg` });
    }
  }

  // Match reps suggestion e.g. "8 reps", "10-12 reps"
  const repsMatch = replyText.match(/(?:khoảng|thực hiện|tập)\s*(\d+)\s*(?:-\s*\d+)?\s*(?:reps|cái|lần)/i);
  if (repsMatch && repsMatch[1]) {
    const r = parseInt(repsMatch[1], 10);
    if (r > 0 && r <= 100) {
      actions.push({ type: 'apply_reps', reps: r, label: `Đặt ${r} reps` });
    }
  }

  // Match rest adjustment e.g. "nghỉ 3 phút", "nghỉ 180s", "nghỉ 90 giây"
  const restMinuteMatch = replyText.match(/nghỉ\s*(\d+(?:[.,]\d+)?)\s*phút/i);
  if (restMinuteMatch && restMinuteMatch[1]) {
    const mins = parseFloat(restMinuteMatch[1].replace(',', '.'));
    const secs = Math.round(mins * 60);
    if (secs >= 30 && secs <= 600) {
      actions.push({ type: 'adjust_rest', restSeconds: secs, label: `Nghỉ ${mins} phút` });
    }
  }

  // Match add set
  if (/(?:thêm 1 set|tập thêm set|thêm một hiệp|tập thêm 1 hiệp)/i.test(replyText)) {
    actions.push({ type: 'add_set', label: 'Thêm 1 hiệp' });
  }

  return actions;
}
