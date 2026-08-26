export type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[];

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type GoalType = 'muscle_gain' | 'strength_gain' | 'fat_loss' | 'maintenance';
export type ProfileGender = 'male' | 'female' | 'other';
export type InjuryArea = 'knee' | 'shoulder' | 'lower_back' | 'wrist' | 'ankle' | 'other';
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
export type PerceivedEffort = 'too_hard' | 'hard' | 'appropriate' | 'easy';
export type MuscleRecoveryConfidence = 'low' | 'medium' | 'high';
export type WorkoutPhase = 'warmup' | 'main' | 'cooldown';
export type TrackingMode = 'weight_reps' | 'reps' | 'duration' | 'duration_distance';
export type PrescriptionMode = TrackingMode | 'time' | 'hold';
export type DurationStyle = 'active' | 'hold';
export type LoadBasis = 'external_total' | 'per_implement' | 'assistance' | 'none';
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
export type ConstraintSide = 'left' | 'right' | 'both';
export type ConstraintStatus = 'active' | 'resolved' | 'dismissed';
export type ConstraintSource = 'user' | 'professional_note';
export type PreferenceTargetType = 'exercise' | 'pattern' | 'equipment' | 'style';
export type ExercisePreferenceValue = 'prefer' | 'avoid' | 'exclude';
export type PreferenceSource = 'explicit' | 'inferred';
export type BodyCompositionSource = 'manual' | 'inbody_sheet' | 'other_device';
export type BodyCompositionReviewStatus = 'draft' | 'needs_review' | 'confirmed' | 'rejected';
export type BodyCompositionComparability = 'high' | 'medium' | 'low';
export type BodyCompositionAllowedUse = 'planner' | 'coach' | 'weekly_report';
export type BodyCompositionSegment = 'left_arm' | 'right_arm' | 'trunk' | 'left_leg' | 'right_leg';
export type BodyCompositionTissueType = 'lean' | 'fat';
export type ExtractionMethod = 'manual' | 'ocr' | 'vision';
export type ConsentPurpose =
  | 'body_composition_planner' | 'body_composition_coach'
  | 'body_composition_weekly_report' | 'body_composition_external_processing';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string; user_id: string; display_name: string | null;
          avatar_url: string | null; birthday: string | null; age: number | null;
          gender: ProfileGender | null;
          height_cm: number | null; current_weight_kg: number | null;
          unit_system: UnitSystem; experience_level: ExperienceLevel | null;
          goal: GoalType | null; secondary_goal: GoalType | null;
          injury_areas: InjuryArea[]; injury_note: string | null;
          preferred_training_days: number | null;
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
          default_tracking_mode: TrackingMode;
          allowed_tracking_modes: TrackingMode[];
          tracking_mode_review_status: WorkoutRoleReviewStatus;
          tracking_mode_source: string;
          load_basis: LoadBasis;
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
      exercise_muscles: {
        Row: {
          exercise_id: string; muscle_id: string; role: MuscleRole;
          contribution: number | null; sort_order: number;
        };
        Insert: Omit<Database['public']['Tables']['exercise_muscles']['Row'], 'contribution' | 'sort_order'> & {
          contribution?: number | null; sort_order?: number;
        };
        Update: Partial<Database['public']['Tables']['exercise_muscles']['Row']>;
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
          ai_generated: boolean; recovery_processed_at: string | null;
          recovery_model_version: string | null; created_at: string;
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
          tracking_mode: TrackingMode | null; duration_style: DurationStyle | null;
          target_duration_seconds: number | null; target_distance_meters: number | null;
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
          duration_seconds: number | null; distance_meters: number | null;
          set_type: SetType; perceived_effort: PerceivedEffort | null;
          note: string | null; completed: boolean;
          started_at: string | null; completed_at: string | null; actual_rest_seconds: number | null;
        };
        Insert: Partial<Database['public']['Tables']['workout_sets']['Row']> & {
          workout_exercise_id: string; set_number: number;
        };
        Update: Partial<Database['public']['Tables']['workout_sets']['Row']>;
        Relationships: [];
      };
      muscle_training_loads: {
        Row: {
          id: string; user_id: string; workout_id: string; workout_exercise_id: string;
          muscle_id: string; completed_set_count: number; fatigue_points: number;
          new_fatigue: number; input_quality: MuscleRecoveryConfidence;
          occurred_at: string; model_version: string; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['muscle_training_loads']['Row'], 'id' | 'created_at'> & {
          id?: string; created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['muscle_training_loads']['Row']>;
        Relationships: [];
      };
      muscle_recovery_states: {
        Row: {
          user_id: string; muscle_id: string; fatigue_score: number; fatigue_at: string;
          half_life_hours: number; confidence: MuscleRecoveryConfidence;
          last_workout_id: string | null; model_version: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['muscle_recovery_states']['Row'], 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['muscle_recovery_states']['Row']>;
        Relationships: [];
      };
      training_constraints: {
        Row: {
          id: string; user_id: string; region: string; side: ConstraintSide | null;
          severity: number; triggers: string[]; excluded_exercise_slugs: string[];
          status: ConstraintStatus; source: ConstraintSource; valid_from: string;
          expires_at: string | null; user_confirmed_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['training_constraints']['Row']> & {
          user_id: string; region: string; severity: number;
        };
        Update: Partial<Database['public']['Tables']['training_constraints']['Row']>;
        Relationships: [];
      };
      exercise_preferences: {
        Row: {
          id: string; user_id: string; target_type: PreferenceTargetType; target_key: string;
          preference: ExercisePreferenceValue; strength: number; source: PreferenceSource;
          confidence: number; last_confirmed_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['exercise_preferences']['Row']> & {
          user_id: string; target_type: PreferenceTargetType; target_key: string;
          preference: ExercisePreferenceValue; source: PreferenceSource;
        };
        Update: Partial<Database['public']['Tables']['exercise_preferences']['Row']>;
        Relationships: [];
      };
      readiness_checkins: {
        Row: {
          id: string; user_id: string; workout_id: string | null; energy: number;
          sleep_quality: number | null; sleep_hours: number | null; stress: number | null;
          discomfort_regions: string[]; available_minutes: number; intent: string | null;
          checked_at: string; expires_at: string; created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['readiness_checkins']['Row']> & {
          user_id: string; energy: number; available_minutes: number; expires_at: string;
        };
        Update: Partial<Database['public']['Tables']['readiness_checkins']['Row']>;
        Relationships: [];
      };
      body_composition_measurements: {
        Row: {
          id: string; user_id: string; source: BodyCompositionSource;
          measured_at: string; measured_timezone: string | null; device_brand: string | null;
          device_model: string | null; location_label: string | null; weight_kg: number | null;
          total_body_water_l: number | null; protein_kg: number | null; mineral_kg: number | null;
          body_fat_mass_kg: number | null; skeletal_muscle_mass_kg: number | null;
          percent_body_fat: number | null; bmi: number | null; fat_free_mass_kg: number | null;
          basal_metabolic_rate_kcal: number | null; waist_hip_ratio: number | null;
          visceral_fat_level: number | null; skeletal_muscle_index: number | null;
          device_score: number | null; device_target_values: Json; preparation_metadata: Json;
          scan_fingerprint: string | null;
          extraction_method: ExtractionMethod; extraction_provider: string | null;
          extraction_confidence: number | null; review_status: BodyCompositionReviewStatus;
          confirmed_at: string | null; comparability: BodyCompositionComparability;
          allowed_uses: BodyCompositionAllowedUse[]; created_at: string; updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['body_composition_measurements']['Row']> & {
          user_id: string; source: BodyCompositionSource; measured_at: string;
        };
        Update: Partial<Database['public']['Tables']['body_composition_measurements']['Row']>;
        Relationships: [];
      };
      body_composition_segments: {
        Row: {
          id: string; measurement_id: string; user_id: string; segment: BodyCompositionSegment;
          tissue_type: BodyCompositionTissueType; mass_kg: number;
          percent_of_reference: number | null; device_evaluation: string | null; created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['body_composition_segments']['Row']> & {
          measurement_id: string; user_id: string; segment: BodyCompositionSegment;
          tissue_type: BodyCompositionTissueType; mass_kg: number;
        };
        Update: Partial<Database['public']['Tables']['body_composition_segments']['Row']>;
        Relationships: [];
      };
      data_consents: {
        Row: {
          id: string; user_id: string; purpose: ConsentPurpose; provider: string | null;
          data_categories: string[]; policy_version: string; granted_at: string;
          withdrawn_at: string | null; created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['data_consents']['Row']> & {
          user_id: string; purpose: ConsentPurpose; policy_version: string; granted_at: string;
        };
        Update: Partial<Database['public']['Tables']['data_consents']['Row']>;
        Relationships: [];
      };
      ai_decision_contexts: {
        Row: {
          id: string; user_id: string; surface: BodyCompositionAllowedUse; context_version: string;
          factor_keys_used: string[]; factor_keys_ignored: string[];
          training_constraint_ids: string[]; exercise_preference_ids: string[];
          readiness_checkin_id: string | null; body_composition_measurement_ids: string[];
          workout_ids: string[];
          confidence: number | null; generated_at: string; valid_until: string | null; created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ai_decision_contexts']['Row']> & {
          user_id: string; surface: BodyCompositionAllowedUse;
        };
        Update: Partial<Database['public']['Tables']['ai_decision_contexts']['Row']>;
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
