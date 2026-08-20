import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WorkoutLogger from './workout-logger';

export default async function WorkoutActivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: workout } = await supabase
    .from('workouts')
    .select(`
      id, user_id, date, status, planned_duration, started_at, completed_at,
      workout_exercises(
        id, order_index, target_sets, target_rep_min, target_rep_max,
        target_weight, target_rir, rest_seconds, ai_reason,
        exercises(slug, name, name_vi, default_rest_seconds, default_rir),
        workout_sets(id, set_number, weight, reps, rir, set_type, completed)
      )
    `)
    .eq('id', id).maybeSingle();

  if (!workout) notFound();

  // Mark as in_progress if first time
  if (workout.status === 'planned') {
    await supabase.from('workouts').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', id);
    workout.status = 'in_progress';
  }

  // Fetch previous performance for each exercise (last 1 completed session)
  const exerciseIds = (workout.workout_exercises ?? []).map((we: any) => we.exercise_id);
  let previousMap = new Map<string, { date: string; sets: { weight: number; reps: number; rir: number | null }[] }>();

  if (exerciseIds.length > 0) {
    const { data: prevSets } = await supabase
      .from('workout_sets')
      .select('weight, reps, rir, workout_exercises!inner(exercise_id, workouts!inner(user_id, date, status))')
      .eq('completed', true)
      .eq('workout_exercises.workouts.user_id', workout.user_id)
      .eq('workout_exercises.workouts.status', 'completed')
      .in('workout_exercises.exercise_id', exerciseIds)
      .order('workout_exercises.workouts.date', { ascending: false })
      .limit(200);

    const grouped = new Map<string, Map<string, any[]>>();
    (prevSets ?? []).forEach((s: any) => {
      const exId = s.workout_exercises.exercise_id;
      const date = s.workout_exercises.workouts.date;
      if (!grouped.has(exId)) grouped.set(exId, new Map());
      const byDate = grouped.get(exId)!;
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push(s);
    });

    grouped.forEach((byDate, exId) => {
      // Pick the most recent date that is < current workout.date
      const candidates = [...byDate.entries()]
        .filter(([d]) => d < workout.date)
        .sort((a, b) => b[0].localeCompare(a[0]));
      if (candidates.length > 0) {
        const [date, sets] = candidates[0];
        previousMap.set(exId, {
          date,
          sets: sets.map((s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, rir: s.rir })),
        });
      }
    });
  }

  // Attach previous to each we
  const exercisesWithPrev = (workout.workout_exercises ?? []).map((we: any) => ({
    ...we,
    previous_performance: previousMap.get(we.exercise_id) ?? null,
  }));

  return (
    <main className="md:pl-60 pb-20 md:pb-6">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <WorkoutLogger workout={{ ...(workout as any), workout_exercises: exercisesWithPrev }} />
      </div>
    </main>
  );
}