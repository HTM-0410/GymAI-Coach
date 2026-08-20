import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { generateWorkoutPlan } from '@/lib/ai/planner';
import { z } from 'zod';

const Body = z.object({
  programDayId: z.string().uuid(),
  gymId: z.string().uuid().nullable(),
  durationMinutes: z.number().int().min(15).max(240).default(60),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const json = Body.parse(await req.json());

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
  if (!profile?.experience_level) return NextResponse.json({ error: 'profile_incomplete' }, { status: 400 });

  const startMs = Date.now();
  let plan;
  try {
    plan = await generateWorkoutPlan({
      userId: user.id, profile, ...json,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'ai_failed', detail: String(e?.message ?? e) }, { status: 500 });
  }

  // Lookup exercise IDs
  const slugs = plan.exercises.map((e) => e.exercise_slug);
  const serverSupabase2 = await createClient();
  const { data: exRows } = await serverSupabase2
    .from('exercises').select('id, slug, default_rest_seconds, default_rir')
    .in('slug', slugs);
  const exMap = new Map((exRows ?? []).map((e: any) => [e.slug, e]));

  // Create workout (planned, ai_generated=true)
  const svc = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: workout, error: wErr } = await svc.from('workouts').insert({
    user_id: user.id,
    training_program_day_id: json.programDayId,
    gym_id: json.gymId,
    date: today,
    status: 'planned',
    planned_duration: json.durationMinutes,
    ai_generated: true,
  }).select('id').single();
  if (wErr) return NextResponse.json({ error: 'db_error', detail: wErr.message }, { status: 500 });

  // Insert workout_exercises
  const weRows = plan.exercises
    .filter((e) => exMap.has(e.exercise_slug))
    .map((e, idx) => {
      const ex = exMap.get(e.exercise_slug);
      return {
        workout_id: workout.id,
        exercise_id: ex.id,
        order_index: idx,
        target_sets: e.target_sets,
        target_rep_min: e.target_rep_min,
        target_rep_max: e.target_rep_max,
        target_weight: e.target_weight,
        target_rir: e.target_rir,
        rest_seconds: e.rest_seconds ?? ex.default_rest_seconds ?? 120,
        ai_reason: e.ai_reason,
      };
    });
  await svc.from('workout_exercises').insert(weRows);

  // Log ai_interaction
  await svc.from('ai_interactions').insert({
    user_id: user.id,
    endpoint: 'workout_generate',
    latency_ms: Date.now() - startMs,
    status: 'ok',
    model: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite',
    request_json: json,
    response_json: plan,
  });

  return NextResponse.json({ workoutId: workout.id, plan });
}
