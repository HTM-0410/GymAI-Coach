import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { projectWorkoutActualsV1 } from '@/lib/workouts/actuals';
import { estimateSessionRecovery } from '@/lib/programs/recovery';
import type { PreviousExercisePerformance } from '@/lib/workouts/summary-insights';
import { cleanDashes } from '@/lib/utils';
import WorkoutDoneView from './workout-done-view';
import { normalizeTrackingMode } from '@/lib/workouts/metrics';

export default async function WorkoutDonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: fullWorkout } = await supabase
    .from('workouts')
    .select(`
      id,
      status,
      started_at,
      completed_at,
      planned_duration,
      workout_feedback (
        difficulty,
        energy,
        quality,
        note
      ),
      training_program_days:training_program_day_id (
        id,
        name,
        name_vi,
        day_of_week,
        training_programs (
          id,
          name,
          name_vi
        )
      ),
      workout_exercises (
        id,
        exercise_id,
        target_sets,
        target_rep_min,
        target_rep_max,
        target_weight,
        target_rir,
        rest_seconds,
        phase,
        prescription_mode,
        tracking_mode,
        duration_style,
        duration_seconds,
        hold_seconds,
        target_duration_seconds,
        target_distance_meters,
        per_side,
        started_at,
        completed_at,
        exercises (
          id,
          slug,
          name,
          name_vi,
          exercise_type,
          default_tracking_mode,
          allowed_tracking_modes,
          gallery_json,
          exercise_muscles (
            role,
            muscles (
              id,
              name,
              name_vi,
              slug
            )
          )
        ),
        workout_sets (
          id,
          set_number,
          weight,
          reps,
          duration_seconds,
          distance_meters,
          rir,
          perceived_effort,
          set_type,
          note,
          completed,
          started_at,
          completed_at,
          actual_rest_seconds
        )
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (!fullWorkout) notFound();

  const workout = fullWorkout;
  const actuals = projectWorkoutActualsV1(workout);

  const exercises = workout.workout_exercises ?? [];
  const mainExercises = exercises.filter((we: any) => (we.phase ?? 'main') === 'main');
  const totalPlannedSets = mainExercises.reduce((acc: number, we: any) => acc + (we.target_sets ?? 0), 0);
  const completionRate = totalPlannedSets > 0
    ? Math.min(100, Math.round((actuals.completedMainWorkingSets / totalPlannedSets) * 100))
    : 100;

  const durationMin = actuals.actualDurationMinutes ?? actuals.plannedDurationMinutes ?? 30;

  // Muscle Volume Distribution calculation (Primary Target Muscles only)
  const primaryMusclesMap: Record<string, { name: string; sets: number; volume: number }> = {};

  for (const we of mainExercises) {
    const exMuscles = (we.exercises as any)?.exercise_muscles ?? [];
    const weCompleted = (we.workout_sets ?? []).filter((s: any) => s.completed && s.set_type !== 'warmup');
    if (weCompleted.length === 0) continue;
    const weVol = weCompleted.reduce((acc: number, s: any) => acc + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);

    const primaryEm = exMuscles.filter((em: any) => em.role === 'primary');
    const targets = primaryEm.length > 0 ? primaryEm : exMuscles;

    for (const em of targets) {
      const mName = em.muscles?.name_vi || em.muscles?.name;
      if (!mName) continue;
      if (!primaryMusclesMap[mName]) {
        primaryMusclesMap[mName] = { name: mName, sets: 0, volume: 0 };
      }
      primaryMusclesMap[mName].sets += weCompleted.length;
      primaryMusclesMap[mName].volume += weVol;
    }
  }

  const primaryBreakdown = Object.values(primaryMusclesMap).filter((m) => m.sets > 0).sort((a, b) => b.sets - a.sets);

  const phaseSummary = (['warmup', 'main', 'cooldown'] as const).map((phase) => {
    const phaseExercises = exercises.filter((we: any) => (we.phase ?? 'main') === phase);
    const completed = phaseExercises.filter((we: any) => {
      return (we.workout_sets ?? []).some((set: any) => set.completed);
    }).length;
    const prescribedSeconds = phaseExercises.reduce((total: number, we: any) => {
      const mode = normalizeTrackingMode(we.tracking_mode ?? we.prescription_mode, { targetWeight: we.target_weight });
      const seconds = mode === 'duration' || mode === 'duration_distance'
        ? we.target_duration_seconds ?? we.duration_seconds ?? we.hold_seconds
        : 0;
      return total + (Number(seconds) || 0) * (we.per_side ? 2 : 1);
    }, 0);
    return { phase, count: phaseExercises.length, completed, prescribedSeconds };
  }).filter((summary) => summary.count > 0);

  const completedExercises = exercises.filter((we: any) => {
    return (we.workout_sets ?? []).some((s: any) => s.completed);
  });

  const skippedExercises = exercises.filter((we: any) => {
    return !(we.workout_sets ?? []).some((s: any) => s.completed);
  });

  const recoveryEstimate = estimateSessionRecovery(
    primaryBreakdown.map((muscle) => ({ role: 'primary', target_sets: muscle.sets })),
    mainExercises.map((exercise: any) => {
      const completedWorkingSets = (exercise.workout_sets ?? []).filter(
        (set: any) => set.completed && set.set_type !== 'warmup',
      );
      const actualRirs = completedWorkingSets
        .map((set: any) => set.rir)
        .filter((rir: unknown) => rir !== null && rir !== undefined && Number.isFinite(Number(rir)))
        .map((rir: unknown) => Number(rir));
      const representativeRir = actualRirs.length > 0
        ? Math.round(actualRirs.reduce((sum: number, rir: number) => sum + rir, 0) / actualRirs.length)
        : exercise.target_rir ?? null;
      return {
        target_sets: completedWorkingSets.length,
        target_rep_max: exercise.target_rep_max ?? 0,
        target_rir: representativeRir,
        rest_seconds: exercise.rest_seconds ?? null,
        exercise: { exercise_type: exercise.exercises?.exercise_type ?? null },
      };
    }),
  );

  // Query real personal records and previous matching exercise sessions.
  const { data: { user } } = await supabase.auth.getUser();
  let recentPrs: any[] = [];
  const previousByExercise: Record<string, PreviousExercisePerformance> = {};
  if (user) {
    const exerciseIds = mainExercises.map((exercise: any) => exercise.exercise_id).filter(Boolean);
    const [{ data: prs }, { data: previousSets }] = await Promise.all([
      supabase
        .from('personal_records')
        .select('id, record_type, value, achieved_at, exercises(id, slug, name_vi, name)')
        .eq('user_id', user.id)
        .gte('achieved_at', workout.started_at || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('achieved_at', { ascending: false })
        .limit(5),
      exerciseIds.length > 0
        ? supabase
          .from('workout_sets')
          .select(`
            weight,
            reps,
            completed,
            set_type,
            workout_exercises!inner(
              exercise_id,
              phase,
              prescription_mode,
              workouts!inner(id, user_id, status, completed_at, date)
            )
          `)
          .eq('completed', true)
          .neq('set_type', 'warmup')
          .eq('workout_exercises.phase', 'main')
          .eq('workout_exercises.prescription_mode', 'reps')
          .eq('workout_exercises.workouts.user_id', user.id)
          .eq('workout_exercises.workouts.status', 'completed')
          .neq('workout_exercises.workouts.id', workout.id)
          .in('workout_exercises.exercise_id', exerciseIds)
          .limit(300)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    recentPrs = prs ?? [];

    const grouped = new Map<string, {
      exerciseId: string;
      workoutId: string;
      completedAt: string | null;
      totalVolumeKg: number;
      totalReps: number;
      topWeightKg: number;
    }>();
    for (const row of previousSets ?? []) {
      const relation = (row as any).workout_exercises;
      const previousWorkout = relation?.workouts;
      const exerciseId = relation?.exercise_id;
      const workoutId = previousWorkout?.id;
      if (!exerciseId || !workoutId) continue;
      const key = `${exerciseId}:${workoutId}`;
      const existing = grouped.get(key) ?? {
        exerciseId,
        workoutId,
        completedAt: previousWorkout.completed_at ?? previousWorkout.date ?? null,
        totalVolumeKg: 0,
        totalReps: 0,
        topWeightKg: 0,
      };
      const weight = Number((row as any).weight) || 0;
      const reps = Number((row as any).reps) || 0;
      existing.totalVolumeKg += weight * reps;
      existing.totalReps += reps;
      existing.topWeightKg = Math.max(existing.topWeightKg, weight);
      grouped.set(key, existing);
    }

    for (const performance of grouped.values()) {
      const current = previousByExercise[performance.exerciseId];
      const currentTime = current?.completedAt ? new Date(current.completedAt).getTime() : 0;
      const candidateTime = performance.completedAt ? new Date(performance.completedAt).getTime() : 0;
      if (!current || candidateTime > currentTime) {
        previousByExercise[performance.exerciseId] = {
          workoutId: performance.workoutId,
          completedAt: performance.completedAt,
          totalVolumeKg: performance.totalVolumeKg,
          totalReps: performance.totalReps,
          topWeightKg: performance.topWeightKg,
        };
      }
    }
  }

  const { data: profile } = user
    ? await supabase.from('profiles').select('unit_system').eq('user_id', user.id).maybeSingle()
    : { data: null };
  const unitSystem = profile?.unit_system === 'imperial' ? 'imperial' : 'metric';

  const dayData = workout.training_program_days as any;
  const programData = dayData?.training_programs as any;
  const sessionTitle = cleanDashes(dayData?.name_vi || dayData?.name || 'Buổi tập');
  const programTitle = cleanDashes(programData?.name_vi || programData?.name || 'GymAI Training Program');

  return (
    <WorkoutDoneView
      workout={workout}
      actuals={actuals}
      sessionTitle={sessionTitle}
      programTitle={programTitle}
      durationMin={durationMin}
      totalPlannedSets={totalPlannedSets}
      completionRate={completionRate}
      phaseSummary={phaseSummary}
      completedExercises={completedExercises}
      skippedExercises={skippedExercises}
      recentPrs={recentPrs}
      previousByExercise={previousByExercise}
      recoveryEstimate={recoveryEstimate}
      unitSystem={unitSystem}
    />
  );
}
