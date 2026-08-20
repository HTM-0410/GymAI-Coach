/**
 * TypeScript types mirror of data/exercises/exercise.schema.json.
 * Giữ đồng bộ với schema — nếu schema đổi, cập nhật ở đây.
 */

export type MovementPattern =
  | 'squat' | 'hinge' | 'push' | 'pull' | 'lunge' | 'carry' | 'rotation' | 'isolation';

export type ExerciseType = 'compound' | 'isolation';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface GalleryView {
  src: string;
  label: string;
}

export interface Gallery {
  main: string;
  views: GalleryView[];
  caption_vi: string;
  animation?: string;
}

export interface Setup {
  sets: string;
  reps: string;
  rir: string;
  rest_seconds: number;
  tempo: string;
}

export interface PerformanceMetrics {
  current_weight_kg: number;
  rep_range: string;
  estimated_1rm_kg: number;
}

export interface PerformanceChart {
  labels: string[];
  values_kg: number[];
  goal_kg: number;
  min: number;
  max: number;
}

export interface AICoach {
  next_session_vi: string;
  rationale_vi: string;
}

export interface Alternative {
  slug: string;
  name_vi: string;
  image?: string;
}

export interface MediaMetadata {
  version: string;
  last_updated: string;
  source: string;
  language: 'vi';
  reviewer_notes?: string;
}

export interface Exercise {
  slug: string;
  name: string;
  name_vi: string;
  subtitle_vi: string;
  tags: string[];
  movement_pattern: MovementPattern;
  exercise_type: ExerciseType;
  difficulty: Difficulty;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string[];
  gallery: Gallery;
  goal_vi: string;
  instructions: string[];
  tips: string[];
  common_mistakes: string[];
  setup: Setup;
  safety_vi: string;
  performance_metrics: PerformanceMetrics;
  performance_chart: PerformanceChart;
  ai_coach: AICoach;
  alternatives: Alternative[];
  media_metadata: MediaMetadata;
}

/** Summary shape dùng cho library list — không cần full content. */
export interface ExerciseSummary {
  slug: string;
  name: string;
  name_vi: string;
  difficulty: Difficulty;
  exercise_type: ExerciseType;
  movement_pattern: MovementPattern;
  primary_muscle: string;
  equipment: string[];
  tags: string[];
  gallery_main: string;
}