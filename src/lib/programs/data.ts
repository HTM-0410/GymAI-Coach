import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { ProgramDetail, ProgramSummary } from './types';

export async function fetchProgramSummaries(userId: string): Promise<{
  system: ProgramSummary[];
  mine: ProgramSummary[];
  activeId: string | null;
}> {
  const supabase = await createClient();

  const [systemRes, mineRes, activeRes] = await Promise.all([
    supabase
      .from('training_programs')
      .select(
        'id, name, name_vi, description, duration_weeks, training_program_days(id)',
      )
      .eq('type', 'system'),
    supabase
      .from('training_programs')
      .select('id, name, name_vi, description, duration_weeks, training_program_days(id)')
      .eq('type', 'custom')
      .eq('owner_user_id', userId),
    supabase
      .from('user_programs')
      .select('program_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  const toSummary = (p: any): ProgramSummary => ({
    id: p.id,
    name: p.name,
    name_vi: p.name_vi,
    description: p.description,
    duration_weeks: p.duration_weeks,
    days_count: Array.isArray(p.training_program_days) ? p.training_program_days.length : 0,
  });

  return {
    system: (systemRes.data ?? []).map(toSummary),
    mine: (mineRes.data ?? []).map(toSummary),
    activeId: activeRes.data?.program_id ?? null,
  };
}

export async function fetchProgramDetail(programId: string): Promise<ProgramDetail | null> {
  const supabase = await createClient();

  const { data: prog, error: progErr } = await supabase
    .from('training_programs')
    .select('id, name, name_vi, description, duration_weeks, type')
    .eq('id', programId)
    .maybeSingle();

  if (progErr || !prog) return null;

  const { data: days, error: daysErr } = await supabase
    .from('training_program_days')
    .select(`
      id,
      program_id,
      day_of_week,
      name,
      name_vi,
      order_index,
      training_day_targets(target_sets, role, muscles(name, name_vi)),
      program_day_exercises(
        id,
        order_index,
        target_sets,
        target_rep_min,
        target_rep_max,
        target_rir,
        rest_seconds,
        exercises(id, slug, name, name_vi, difficulty, exercise_type)
      )
    `)
    .eq('program_id', programId)
    .order('order_index');

  if (daysErr) return null;

  const detail: ProgramDetail = {
    ...(prog as any),
    days: (days ?? []).map((d: any) => ({
      id: d.id,
      program_id: d.program_id,
      day_of_week: d.day_of_week,
      name: d.name,
      name_vi: d.name_vi,
      order_index: d.order_index,
      target_muscles: (d.training_day_targets ?? []).map((t: any) => ({
        muscle_name: t.muscles?.name,
        muscle_name_vi: t.muscles?.name_vi,
        role: t.role,
        target_sets: t.target_sets,
      })),
      exercises: (d.program_day_exercises ?? [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((e: any) => ({
          id: e.id,
          order_index: e.order_index,
          target_sets: e.target_sets,
          target_rep_min: e.target_rep_min,
          target_rep_max: e.target_rep_max,
          target_rir: e.target_rir,
          rest_seconds: e.rest_seconds,
          exercise: {
            id: e.exercises?.id,
            slug: e.exercises?.slug,
            name: e.exercises?.name,
            name_vi: e.exercises?.name_vi,
            difficulty: e.exercises?.difficulty,
            exercise_type: e.exercises?.exercise_type,
          },
        })),
    })),
  };

  return detail;
}
