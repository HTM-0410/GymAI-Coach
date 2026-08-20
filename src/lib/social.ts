// Phase 3: Social feed — public workout/PR sharing
import { createClient } from '@/lib/supabase/server';

export type SharedPost = {
  id: string;
  user_id: string;
  type: 'workout_completed' | 'pr_achieved' | 'streak';
  title: string;
  body: string;
  payload: any;
  likes: number;
  is_public: boolean;
  created_at: string;
};

// Phase 3: would need a `shared_posts` table.
// For now we mark workouts as shareable and provide a "generate share image" endpoint

export async function generateShareableWorkoutSummary(workoutId: string, userId: string) {
  const supabase = await createClient();
  const { data: workout } = await supabase
    .from('workouts')
    .select('id, date, workout_exercises(workout_sets(weight, reps, completed, set_type), exercises(name_vi, name))')
    .eq('id', workoutId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!workout) return null;

  const sets = (workout.workout_exercises ?? []).flatMap((we: any) => (we.workout_sets ?? []).map((s: any) => ({ ...s, exercise: we.exercises?.name_vi })));
  const totalVolume = sets.filter((s: any) => s.completed && s.set_type !== 'warmup').reduce((acc: number, s: any) => acc + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);

  return {
    title: `Hoàn thành buổi tập ${new Date(workout.date).toLocaleDateString('vi-VN')}`,
    summary: `${workout.workout_exercises?.length ?? 0} bài · ${sets.filter((s: any) => s.completed).length} sets · ${Math.round(totalVolume)}kg volume`,
    exercises: (workout.workout_exercises ?? []).map((we: any) => ({
      name: we.exercises?.name_vi,
      topSet: (we.workout_sets ?? []).filter((s: any) => s.completed && s.set_type === 'working').reduce((best: any, s: any) =>
        !best || (s.weight ?? 0) > (best.weight ?? 0) ? s : best, null),
    })),
  };
}