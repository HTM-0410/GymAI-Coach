import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { evaluatePreparticipationScreening, type ScreeningAnswers } from '@/lib/safety/screening-policy';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const {
    display_name,
    age,
    gender,
    height_cm,
    current_weight_kg,
    experience_level,
    goal,
    secondary_goal,
    injury_areas,
    injury_note,
    preferred_training_days,
    preferred_session_duration,
    selected_equipment_ids,
    screening_answers,
  } = payload as Record<string, any>;

  const now = new Date();

  // 1. Get profile
  const { data: profile, error: profileFetchErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileFetchErr || !profile) {
    return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
  }

  // 2. Evaluate preparticipation screening
  const screeningInput: ScreeningAnswers = {
    ...(screening_answers ?? {}),
    injuryArea: Array.isArray(injury_areas) && injury_areas.length > 0 ? injury_areas[0] : null,
  };
  const screeningResult = evaluatePreparticipationScreening(screeningInput);

  // 3. Update profile
  const { error: profileUpdateErr } = await supabase
    .from('profiles')
    .update({
      display_name: typeof display_name === 'string' ? display_name.trim() : null,
      age: typeof age === 'number' ? age : null,
      gender: typeof gender === 'string' ? gender : null,
      height_cm: typeof height_cm === 'number' ? height_cm : null,
      current_weight_kg: typeof current_weight_kg === 'number' ? current_weight_kg : null,
      experience_level: typeof experience_level === 'string' ? experience_level : null,
      goal: typeof goal === 'string' ? goal : null,
      secondary_goal: typeof secondary_goal === 'string' ? secondary_goal : null,
      injury_areas: Array.isArray(injury_areas) ? injury_areas : [],
      injury_note: typeof injury_note === 'string' ? injury_note.trim() : null,
      preferred_training_days: typeof preferred_training_days === 'number' ? preferred_training_days : 2,
      preferred_session_duration: typeof preferred_session_duration === 'number' ? preferred_session_duration : 30,
      updated_at: now.toISOString(),
    })
    .eq('user_id', user.id);

  if (profileUpdateErr) {
    return NextResponse.json({ error: 'profile_update_failed', message: profileUpdateErr.message }, { status: 500 });
  }

  // 4. Sync training constraints (Canonical Source of Truth)
  const injuryList: string[] = Array.isArray(injury_areas) ? injury_areas : [];
  if (injuryList.length > 0) {
    for (const region of injuryList) {
      const isKnee = region === 'knee';
      const triggers = isKnee
        ? ['deep_flexion', 'high_impact', 'kneeling', 'squat', 'lunge', 'leg_press']
        : ['overhead_load', 'excessive_strain'];

      await supabase.from('training_constraints').upsert(
        {
          user_id: user.id,
          region,
          side: 'both',
          severity: 3, // moderate
          triggers,
          excluded_exercise_slugs: [],
          status: 'active',
          source: 'user',
          valid_from: now.toISOString(),
          user_confirmed_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: 'user_id,region' }
      );
    }
  }

  // 5. Sync profile equipment
  const equipmentIds: string[] = Array.isArray(selected_equipment_ids) ? selected_equipment_ids : [];
  await supabase.from('profile_equipment').delete().eq('profile_id', profile.id);

  if (equipmentIds.length > 0) {
    const equipmentRows = equipmentIds.map((equipment_id) => ({
      profile_id: profile.id,
      equipment_id,
    }));
    const { error: equipErr } = await supabase.from('profile_equipment').insert(equipmentRows);
    if (equipErr) {
      return NextResponse.json({ error: 'equipment_sync_failed', message: equipErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    screening: screeningResult,
    completedAt: now.toISOString(),
  });
}
