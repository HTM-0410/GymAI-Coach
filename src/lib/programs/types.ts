export type ProgramSummary = {
  id: string;
  name: string;
  name_vi: string | null;
  description: string | null;
  duration_weeks: number | null;
  days_count: number;
};

export type ProgramDay = {
  id: string;
  program_id: string;
  day_of_week: number;
  name: string;
  name_vi: string | null;
  order_index: number;
  target_muscles: { muscle_name_vi: string | null; muscle_name: string; role: string; target_sets: number }[];
  exercises: ProgramDayExercise[];
};

export type ProgramDayExercise = {
  id: string;
  order_index: number;
  target_sets: number;
  target_rep_min: number;
  target_rep_max: number;
  target_rir: number | null;
  rest_seconds: number | null;
  exercise: {
    id: string;
    slug: string;
    name: string;
    name_vi: string | null;
    difficulty: string | null;
    exercise_type: string | null;
  };
};

export type ProgramDetail = {
  id: string;
  name: string;
  name_vi: string | null;
  description: string | null;
  duration_weeks: number | null;
  type: string;
  days: ProgramDay[];
};

export const DAY_OF_WEEK_LABELS_VI = [
  'CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7',
];
