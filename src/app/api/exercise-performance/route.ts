import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const exerciseSlug = searchParams.get('exerciseSlug');

  if (!exerciseSlug) {
    return NextResponse.json({ error: 'Missing exerciseSlug' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Lấy exercise_id từ slug
  const { data: exercise } = await supabase
    .from('exercises')
    .select('id, name_vi, name')
    .eq('slug', exerciseSlug)
    .single();

  if (!exercise) {
    return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
  }

  // Lấy các set hoàn thành của user cho bài tập này
  const { data: setsRaw } = await supabase
    .from('workout_sets')
    .select(`
      weight, reps, rir, set_type, completed, completed_at,
      workout_exercises!inner(
        workouts!inner(user_id, date, status)
      )
    `)
    .eq('completed', true)
    .eq('workout_exercises.exercise_id', exercise.id)
    .eq('workout_exercises.workouts.user_id', user.id)
    .eq('workout_exercises.workouts.status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(50);

  if (!setsRaw || setsRaw.length === 0) {
    return NextResponse.json({
      exercise_name: exercise.name_vi ?? exercise.name,
      hasData: false,
      message: 'Chưa có dữ liệu hiệu suất cho bài tập này',
    });
  }

  // Nhóm theo ngày
  const byDate = new Map<string, any[]>();
  setsRaw.forEach((row: any) => {
    const date = row.workout_exercises.workouts.date;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(row);
  });

  const sortedDates = [...byDate.keys()].sort();
  const lastDate = sortedDates[sortedDates.length - 1];
  const lastSets = byDate.get(lastDate) ?? [];

  // Tính metrics
  const currentWeight = Math.max(...lastSets.map((s: any) => s.weight ?? 0));
  const avgReps = Math.round(lastSets.reduce((sum: number, s: any) => sum + (s.reps ?? 0), 0) / lastSets.length);
  const avgRir = Math.round(lastSets.reduce((sum: number, s: any) => sum + (s.rir ?? 0), 0) / lastSets.length);

  // 1RM Brzycki: weight × (36 / (37 - reps))
  const estimated1RM = lastSets.reduce((max: number, s: any) => {
    const rep = s.reps ?? 0;
    const w = s.weight ?? 0;
    if (rep === 0 || rep > 12) return max;
    const calc = w * (36 / (37 - rep));
    return Math.max(max, calc);
  }, 0);

  // Chart data: top 6 sessions
  const chartData = sortedDates
    .slice(-6)
    .map((date) => {
      const daySets = byDate.get(date)!;
      const maxWeight = Math.max(...daySets.map((s: any) => s.weight ?? 0));
      const avgRepsDay = Math.round(daySets.reduce((sum: number, s: any) => sum + (s.reps ?? 0), 0) / daySets.length);
      return {
        date,
        label: new Date(date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' }),
        weight: maxWeight,
        reps: avgRepsDay,
      };
    })
    .reverse();

  // Trend
  const firstWeight = chartData[0]?.weight ?? 0;
  const lastWeightChart = chartData[chartData.length - 1]?.weight ?? 0;
  const trend = firstWeight > 0 ? lastWeightChart - firstWeight : 0;

  return NextResponse.json({
    exercise_name: exercise.name_vi ?? exercise.name,
    hasData: true,
    metrics: {
      current_weight_kg: currentWeight,
      rep_range: `${avgReps}–${avgReps + 2}`,
      estimated_1rm_kg: Math.round(estimated1RM),
      avg_rir: avgRir,
      sessions_count: sortedDates.length,
    },
    chart: chartData,
    trend_kg: trend,
  });
}
