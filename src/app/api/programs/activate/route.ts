import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { evaluateProgramCompatibility } from '@/lib/programs/compatibility';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const programId = payload?.programId;
  const confirmedOverride = Boolean(payload?.confirmedOverride);
  const overrideReason = typeof payload?.overrideReason === 'string' ? payload.overrideReason.trim() : null;

  if (!programId || typeof programId !== 'string') {
    return NextResponse.json({ error: 'invalid_program_id' }, { status: 400 });
  }

  // 1. Fetch program and user profile
  const [progRes, profileRes, constraintsRes] = await Promise.all([
    supabase
      .from('training_programs')
      .select('id, name, name_vi, description, duration_weeks, training_program_days(id)')
      .eq('id', programId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('experience_level, preferred_training_days, preferred_session_duration')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('training_constraints')
      .select('region')
      .eq('user_id', user.id)
      .eq('status', 'active'),
  ]);

  if (progRes.error || !progRes.data) {
    return NextResponse.json({ error: 'program_not_found' }, { status: 404 });
  }

  const program = progRes.data;
  const profile = profileRes.data;
  const injuryAreas = (constraintsRes.data ?? []).map((c) => c.region);

  // 2. Evaluate compatibility
  const evaluation = evaluateProgramCompatibility(
    {
      ...program,
      days_count: program.training_program_days?.length ?? 3,
    },
    {
      experienceLevel: profile?.experience_level ?? 'beginner',
      preferredTrainingDays: profile?.preferred_training_days ?? 2,
      preferredSessionMinutes: profile?.preferred_session_duration ?? 30,
      injuryAreas,
      screeningDisposition: 'clear',
    }
  );

  if (evaluation.status === 'blocked') {
    return NextResponse.json(
      {
        error: 'activation_blocked',
        reasons: evaluation.reasonsVi,
        evaluation,
      },
      { status: 403 }
    );
  }

  if (evaluation.status === 'requires_confirmation' && !confirmedOverride) {
    return NextResponse.json(
      {
        error: 'confirmation_required',
        message: 'Giáo án có sự khác biệt so với hồ sơ của bạn. Vui lòng xác nhận trước khi kích hoạt.',
        reasons: evaluation.reasonsVi,
        evaluation,
      },
      { status: 422 }
    );
  }

  // 3. Atomic activation
  const now = new Date().toISOString();

  // Deactivate current active programs
  const { error: deactivateErr } = await supabase
    .from('user_programs')
    .update({ is_active: false })
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (deactivateErr) {
    return NextResponse.json({ error: 'deactivate_failed', detail: deactivateErr.message }, { status: 500 });
  }

  // Activate new program
  const { data: activated, error: activateErr } = await supabase
    .from('user_programs')
    .insert({
      user_id: user.id,
      program_id: program.id,
      is_active: true,
      started_at: now,
    })
    .select('id, program_id, is_active, started_at')
    .single();

  if (activateErr) {
    return NextResponse.json({ error: 'activate_failed', detail: activateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    userProgram: activated,
    evaluation,
    overrideReason,
  });
}
