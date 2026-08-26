export const COACH_WORKOUT_HANDOFF_STORAGE_KEY = 'gymai:coach-workout-handoff:v1';

export type CoachWorkoutHandoff = {
  suggestion: string;
};

export type HandoffProgram = {
  id: string;
  training_program_days: Array<{
    id: string;
    name: string;
    name_vi?: string | null;
    training_day_targets?: Array<{ muscles?: { slug?: string; name_vi?: string | null } | null }>;
  }>;
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .toLocaleLowerCase('vi')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function meaningfulTokens(value: string) {
  const ignored = new Set(['buoi', 'tap', 'than', 'tren', 'duoi', 'ngay', 'co', 'chinh']);
  return normalize(value).split(' ').filter((token) => token.length > 1 && !/^\d+$/.test(token) && !ignored.has(token));
}

export function parseCoachWorkoutHandoff(raw: string | null): CoachWorkoutHandoff | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CoachWorkoutHandoff>;
    if (typeof parsed.suggestion !== 'string' || !parsed.suggestion.trim()) return null;
    return { suggestion: parsed.suggestion.trim().slice(0, 8000) };
  } catch {
    return null;
  }
}

export function workoutHandoffPrompt(suggestion: string) {
  const prefix = 'Tạo buổi tập bám sát đề xuất AI Coach sau đây. Ưu tiên đúng nhóm cơ, bài tập, số hiệp và khoảng lặp nếu các bài phù hợp lịch tập, thiết bị và quy tắc an toàn: ';
  const compact = suggestion.replace(/\s+/g, ' ').trim().slice(0, 4000 - prefix.length);
  return `${prefix}${compact}`;
}

export function selectProgramDayForSuggestion(
  suggestion: string,
  programs: HandoffProgram[],
  activeProgramId: string | null,
) {
  const orderedPrograms = [...programs].sort((a, b) => Number(b.id === activeProgramId) - Number(a.id === activeProgramId));
  const normalizedSuggestion = normalize(suggestion);
  let best: { programId: string; dayId: string; score: number } | null = null;

  for (const program of orderedPrograms) {
    for (const day of program.training_program_days ?? []) {
      const targetText = (day.training_day_targets ?? [])
        .map((target) => `${target.muscles?.name_vi ?? ''} ${target.muscles?.slug ?? ''}`)
        .join(' ');
      const tokens = new Set(meaningfulTokens(`${day.name_vi ?? ''} ${day.name} ${targetText}`));
      let score = 0;
      for (const token of tokens) {
        if (normalizedSuggestion.includes(token)) score += token.length >= 4 ? 3 : 1;
      }
      if (program.id === activeProgramId) score += 1;
      if (!best || score > best.score) best = { programId: program.id, dayId: day.id, score };
    }
  }

  return best ? { programId: best.programId, dayId: best.dayId } : null;
}
