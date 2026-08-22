export type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[];

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type GoalType = 'muscle_gain' | 'strength_gain' | 'fat_loss' | 'maintenance';
export type UnitSystem = 'metric' | 'imperial';
export type ExerciseType = 'compound' | 'isolation';
export type DifficultyLevel = ExperienceLevel;
export type OwnerType = 'system' | 'custom';
export type ExerciseStatus = 'draft' | 'published' | 'archived';
export type MuscleRole = 'primary' | 'secondary';
export type MediaType = 'image' | 'video';
export type MediaSource = 'web_search_grounding' | 'manual' | 'ai_generated_flux' | 'ai_generated_veo';
export type WorkoutStatus = 'planned' | 'in_progress' | 'completed' | 'skipped';
export type SetType = 'warmup' | 'working' | 'drop' | 'failure';
export type WorkoutPhase = 'warmup' | 'main' | 'cooldown';
export type PrescriptionMode = 'reps' | 'time' | 'hold';
export type ExerciseWorkoutRole =
  | 'general_warmup' | 'dynamic_mobility' | 'activation'
  | 'main_strength' | 'cooldown_aerobic' | 'static_stretch';
export type WorkoutRoleReviewStatus = 'reviewed' | 'needs_review';
export type ProgramType = 'system' | 'custom';
export type DayTargetMuscleRole = 'primary' | 'secondary';
export type RecommendationType =
  | 'weight_progression' | 'exercise_substitution' | 'program_modification'
  | 'workout_regeneration' | 'rest_adjustment';
export type RecommendationTarget = 'workout' | 'workout_exercise' | 'program' | 'exercise';
export type RecommendationStatus = 'pending' | 'accepted' | 'rejected';
export type AiEndpoint =
  | 'workout_generate' | 'equipment_detect' | 'exercise_content'
  | 'exercise_alternative' | 'coach_chat' | 'image_search_seed';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string; user_id: string; display_name: string | null;
          avatar_url: string | null; birthday: string | null;
          height_cm: number | null; current_weight_kg: number | null;
          unit_system: UnitSystem; experience_level: ExperienceLevel | null;
          goal: GoalType | null; preferred_training_days: number | null;
          preferred_session_duration: number | null;
          onboarding_step: number;
          created_at: string; updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { user_id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string; owner_user_id: string | null; type: OwnerType;
          name: string; name_vi: string | null; slug: string;
          description: string | null; difficulty: DifficultyLevel | null;
          exercise_type: ExerciseType | null;
          instructions: string | null; tips: string | null;
          common_mistakes: string | null; status: ExerciseStatus;
          default_rest_seconds: number | null; default_rir: number | null;
          workout_role: ExerciseWorkoutRole;
          workout_role_review_status: WorkoutRoleReviewStatus;
          workout_role_confidence: number | null;
          workout_role_source: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['exercises']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['exercises']['Row']>;
        Relationships: [];
      };
      muscles: {
        Row: { id: string; slug: string; name: string; name_vi: string | null; body_region: string | null; created_at: string };
        Insert: Omit<Database['public']['Tables']['muscles']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['muscles']['Row']>;
        Relationships: [];
      };
      equipment: {
        Row: { id: string; slug: string; name: string; name_vi: string | null; category: string | null; image_url: string | null; owner_user_id: string | null; created_at: string };
        Insert: Omit<Database['public']['Tables']['equipment']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['equipment']['Row']>;
        Relationships: [];
      };
      profile_equipment: {
        Row: { profile_id: string; equipment_id: string; created_at: string };
        Insert: Omit<Database['public']['Tables']['profile_equipment']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['profile_equipment']['Row']>;
        Relationships: [];
      };
      gyms: {
        Row: { id: string; owner_user_id: string; name: string; description: string | null; note: string | null; created_at: string; updated_at: string };
        Insert: Omit<Database['public']['Tables']['gyms']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['gyms']['Row']>;
        Relationships: [];
      };
      gym_dumbbell_inventory: {
        Row: {
          id: string; gym_id: string; weight_kg: number; quantity: number;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['gym_dumbbell_inventory']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['gym_dumbbell_inventory']['Row']>;
        Relationships: [];
      };
      workouts: {
        Row: {
          id: string; user_id: string;
          training_program_day_id: string | null; gym_id: string | null;
          date: string; status: WorkoutStatus; planned_duration: number | null;
          started_at: string | null; completed_at: string | null;
          ai_generated: boolean; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['workouts']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['workouts']['Row']>;
        Relationships: [];
      };
      workout_exercises: {
        Row: {
          id: string; workout_id: string; exercise_id: string; order_index: number;
          target_sets: number | null; target_rep_min: number | null; target_rep_max: number | null;
          target_weight: number | null; target_rir: number | null; rest_seconds: number | null;
          ai_reason: string | null; phase: WorkoutPhase; prescription_mode: PrescriptionMode;
          duration_seconds: number | null; hold_seconds: number | null; per_side: boolean;
          started_at: string | null; completed_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['workout_exercises']['Row']> & {
          workout_id: string; exercise_id: string; order_index: number;
        };
        Update: Partial<Database['public']['Tables']['workout_exercises']['Row']>;
        Relationships: [];
      };
      workout_sets: {
        Row: {
          id: string; workout_exercise_id: string; set_number: number;
          weight: number | null; reps: number | null; rir: number | null;
          set_type: SetType; note: string | null; completed: boolean;
          started_at: string | null; completed_at: string | null; actual_rest_seconds: number | null;
        };
        Insert: Partial<Database['public']['Tables']['workout_sets']['Row']> & {
          workout_exercise_id: string; set_number: number;
        };
        Update: Partial<Database['public']['Tables']['workout_sets']['Row']>;
        Relationships: [];
      };
    };
    Views: { [k: string]: never };
    Functions: { [k: string]: never };
    Enums: {
      experience_level: ExperienceLevel;
      goal_type: GoalType;
      unit_system: UnitSystem;
      owner_type: OwnerType;
      exercise_status: ExerciseStatus;
      workout_status: WorkoutStatus;
      set_type: SetType;
      program_type: ProgramType;
      recommendation_status: RecommendationStatus;
      recommendation_type: RecommendationType;
      recommendation_target: RecommendationTarget;
      ai_endpoint: AiEndpoint;
      media_type: MediaType;
      media_source: MediaSource;
      muscle_role: MuscleRole;
      exercise_type: ExerciseType;
      difficulty_level: DifficultyLevel;
      day_target_muscle_role: DayTargetMuscleRole;
    };
    CompositeTypes: { [k: string]: never };
  };
}
