import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WorkoutLogger from './workout-logger';
import { sortWorkoutExercises } from '@/lib/training/workout-phases';

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    return toStringArray(JSON.parse(value));
  } catch {
    return value
      .split(/\r?\n/)
      .map((item) => item.replace(/^[-*\d.)\s]+/, '').trim())
      .filter(Boolean);
  }
}

function enrichExercise(workoutExercise: any) {
  const exercise = workoutExercise.exercises ?? {};
  const content = exercise.content_json && typeof exercise.content_json === 'object'
    ? exercise.content_json
    : {};
  const gallery = exercise.gallery_json && typeof exercise.gallery_json === 'object'
    ? exercise.gallery_json
    : (content.gallery ?? {});
  const views = Array.isArray(gallery.views) ? gallery.views : [];
  const animatedView = views.find((view: any) =>
    typeof view?.src === 'string' && /\.(gif|webm|mp4)(?:\?|$)/i.test(view.src),
  );

  const directInstructions = toStringArray(exercise.instructions);
  const directTips = toStringArray(exercise.tips);
  const directMistakes = toStringArray(exercise.common_mistakes);

  return {
    ...workoutExercise,
    exercises: {
      ...exercise,
      animation_url: gallery.animation ?? animatedView?.src ?? null,
      thumbnail_url: gallery.main ?? views[0]?.src ?? null,
      instructions_list: directInstructions.length > 0
        ? directInstructions
        : toStringArray(content.instructions),
      tips_list: directTips.length > 0 ? directTips : toStringArray(content.tips),
      common_mistakes_list: directMistakes.length > 0
        ? directMistakes
        : toStringArray(content.common_mistakes),
    },
  };
}

export default async function WorkoutActivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: workout } = await supabase
    .from('workouts')
    .select(`
      id, user_id, date, status, planned_duration, started_at, completed_at,
      gym_id,
      workout_exercises(
        id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max,
        target_weight, target_rir, rest_seconds, ai_reason, started_at, completed_at,
        phase, prescription_mode, duration_seconds, hold_seconds, per_side,
        exercises(
          slug, name, name_vi, default_rest_seconds, default_rir,
          gallery_json, content_json, instructions, tips, common_mistakes,
          exercise_equipment(equipment(slug))
        ),
        workout_sets(
          id, set_number, weight, reps, rir, set_type, completed,
          started_at, completed_at, actual_rest_seconds
        )
      )
    `)
    .eq('id', id).maybeSingle();

  if (!workout) notFound();
  const orderedWorkoutExercises = sortWorkoutExercises(workout.workout_exercises ?? []);

  let availableDumbbellWeights: number[] = [];
  if (workout.gym_id) {
    const { data: inventory } = await supabase
      .from('gym_dumbbell_inventory')
      .select('weight_kg')
      .eq('gym_id', workout.gym_id)
      .gt('quantity', 0)
      .order('weight_kg');
    availableDumbbellWeights = (inventory ?? []).map((item) => Number(item.weight_kg)).filter(Number.isFinite);
  }

  // Fetch previous performance for each exercise (last 1 completed session)
  const exerciseIds = orderedWorkoutExercises.map((we: any) => we.exercise_id);
  const previousMap = new Map<string, { date: string; sets: { weight: number; reps: number }[] }>();

  if (exerciseIds.length > 0) {
    const { data: prevSets } = await supabase
      .from('workout_sets')
      .select('weight, reps, workout_exercises!inner(exercise_id, phase, prescription_mode, workouts!inner(user_id, date, status))')
      .eq('completed', true)
      .eq('workout_exercises.workouts.user_id', workout.user_id)
      .eq('workout_exercises.workouts.status', 'completed')
      .in('workout_exercises.exercise_id', exerciseIds)
      .order('workout_exercises.workouts.date', { ascending: false })
      .limit(200);

    const grouped = new Map<string, Map<string, any[]>>();
    (prevSets ?? []).forEach((s: any) => {
      const phase = s.workout_exercises.phase ?? 'main';
      const mode = s.workout_exercises.prescription_mode ?? 'reps';
      if (phase !== 'main' || mode !== 'reps') return;
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
          sets: sets.map((s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 })),
        });
      }
    });
  }

  // Ensure default target sets exist for all exercises in this workout
  const missingSets: any[] = [];
  for (const we of orderedWorkoutExercises) {
    const prescriptionMode = we.prescription_mode ?? 'reps';
    if (prescriptionMode === 'reps' && (!we.workout_sets || we.workout_sets.length === 0)) {
      const targetCount = we.target_sets || 3;
      for (let i = 1; i <= targetCount; i++) {
        missingSets.push({
          workout_exercise_id: we.id,
          set_number: i,
          set_type: 'working',
          weight: we.target_weight ?? null,
          reps: we.target_rep_min ?? 10,
          rir: null,
          completed: false,
        });
      }
    }
  }
  if (missingSets.length > 0) {
    const { data: inserted } = await supabase.from('workout_sets').insert(missingSets).select();
    if (inserted) {
      for (const s of inserted) {
        const we = orderedWorkoutExercises.find((w: any) => w.id === s.workout_exercise_id);
        if (we) {
          if (!we.workout_sets) we.workout_sets = [];
          we.workout_sets.push(s);
        }
      }
    }
  }

  // Attach previous to each we
  const exercisesWithPrev = orderedWorkoutExercises.map((we: any) => ({
    ...enrichExercise(we),
    workout_sets: [...(we.workout_sets ?? [])].sort((a, b) => a.set_number - b.set_number),
    previous_performance: previousMap.get(we.exercise_id) ?? null,
  }));

  return (
    <main className="md:pl-60 pb-20 md:pb-6">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <WorkoutLogger
          workout={{ ...(workout as any), workout_exercises: exercisesWithPrev }}
          availableDumbbellWeights={availableDumbbellWeights}
        />
      </div>
    </main>
  );
}
