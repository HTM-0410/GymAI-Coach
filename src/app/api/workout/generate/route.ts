import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { generateWorkoutPlan } from '@/lib/ai/planner';
import {
  WorkoutDraftRequestSchema,
  WorkoutGenerateRequestSchema,
} from '@/lib/ai/workout-contract';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsedBody = WorkoutGenerateRequestSchema.safeParse(await req.json());
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: 'invalid_request', detail: parsedBody.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const json = parsedBody.data;

  const [{ data: dayData }, { data: profile }, gymResult] = await Promise.all([
    supabase
      .from('training_program_days')
      .select('id, program_id, training_programs(id, type, owner_user_id)')
      .eq('id', json.programDayId)
      .maybeSingle(),
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    json.gymId
      ? supabase
          .from('gyms')
          .select('id')
          .eq('id', json.gymId)
          .eq('owner_user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const prog = dayData?.training_programs as any;
  if (!dayData || !prog || (prog.type !== 'system' && prog.owner_user_id !== user.id)) {
    return NextResponse.json({ error: 'program_day_not_allowed' }, { status: 403 });
  }
  if (json.gymId && !gymResult.data) {
    return NextResponse.json({ error: 'gym_not_allowed' }, { status: 403 });
  }
  if (!profile?.experience_level) {
    return NextResponse.json({ error: 'profile_incomplete' }, { status: 400 });
  }

  const startMs = Date.now();
  let plan;
  try {
    plan = await generateWorkoutPlan({
      userId: user.id,
      profile,
      ...json,
    });
  } catch (error: any) {
    const detail = String(error?.message ?? error);
    const domainFailure = /Thời lượng|Chưa có bài|Không thể tự tạo buổi tập|Không có bài tập phù hợp/.test(detail);
    return NextResponse.json(
      { error: domainFailure ? 'workout_constraints_failed' : 'ai_failed', detail },
      { status: domainFailure ? 422 : 500 },
    );
  }

  const slugs = [...new Set(plan.exercises.map((exercise) => exercise.exercise_slug))];
  const { data: exerciseRows, error: exerciseError } = await supabase
    .from('exercises')
    .select(
      'id, slug, name, name_vi, difficulty, exercise_type, owner_user_id, default_rest_seconds, default_rir, gallery_json',
    )
    .in('slug', slugs)
    .eq('status', 'published');

  if (exerciseError) {
    return NextResponse.json(
      { error: 'exercise_lookup_failed', detail: exerciseError.message },
      { status: 500 },
    );
  }

  const exerciseMap = new Map<string, any>();
  for (const exercise of exerciseRows ?? []) {
    if (exercise.owner_user_id && exercise.owner_user_id !== user.id) continue;
    const current = exerciseMap.get(exercise.slug);
    if (!current || exercise.owner_user_id === user.id) exerciseMap.set(exercise.slug, exercise);
  }

  const unresolved = slugs.filter((slug) => !exerciseMap.has(slug));
  if (unresolved.length > 0) {
    return NextResponse.json(
      { error: 'plan_unresolvable', detail: `Không tìm thấy bài: ${unresolved.join(', ')}` },
      { status: 500 },
    );
  }

  const exercises = plan.exercises.map((item) => {
    const exercise = exerciseMap.get(item.exercise_slug);
    const gallery = exercise.gallery_json as {
      main?: string | null;
      animation?: string | null;
      views?: Array<{ src?: string | null }>;
    } | null;
    const views = Array.isArray(gallery?.views) ? gallery.views : [];
    const animatedView = views.find((view) =>
      typeof view?.src === 'string' && /\.(gif|webm|mp4)(?:\?|$)/i.test(view.src),
    );
    return {
      exerciseId: exercise.id,
      exerciseSlug: item.exercise_slug,
      name: exercise.name,
      nameVi: exercise.name_vi,
      difficulty: exercise.difficulty,
      exerciseType: exercise.exercise_type,
      animationUrl: gallery?.animation ?? animatedView?.src ?? null,
      thumbnailUrl: gallery?.main ?? views[0]?.src ?? null,
      targetSets: item.target_sets,
      targetRepMin: item.target_rep_min,
      targetRepMax: item.target_rep_max,
      targetWeight: item.target_weight,
      targetRir: item.target_rir,
      restSeconds: item.rest_seconds ?? exercise.default_rest_seconds ?? 120,
      phase: item.phase,
      prescriptionMode: item.prescription_mode,
      durationSeconds: item.duration_seconds,
      holdSeconds: item.hold_seconds,
      perSide: item.per_side,
      aiReason: item.ai_reason,
    };
  });

  const auditClient = createServiceClient();
  await auditClient.from('ai_interactions').insert({
    user_id: user.id,
    endpoint: 'workout_generate',
    latency_ms: Date.now() - startMs,
    status: 'draft',
    model: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite',
    request_json: json,
    response_json: plan,
  });

  const draftResult = WorkoutDraftRequestSchema.safeParse({
    programDayId: json.programDayId,
    gymId: json.gymId,
    durationMinutes: json.durationMinutes,
    options: plan.options,
    phaseBudgets: plan.phase_budgets,
    exercises,
  });
  if (!draftResult.success) {
    return NextResponse.json(
      { error: 'plan_invalid', detail: draftResult.error.issues[0]?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ draft: draftResult.data });
}
