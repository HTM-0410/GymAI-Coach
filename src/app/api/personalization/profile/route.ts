import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PersonalizationProfileSchema } from '@/lib/personalization/body-composition';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [constraints, preferences, readiness, profileRes] = await Promise.all([
    supabase.from('training_constraints').select('*').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false }),
    supabase.from('exercise_preferences').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('readiness_checkins').select('*').eq('user_id', user.id).order('checked_at', { ascending: false }).limit(1),
    supabase.from('profiles').select('injury_areas').eq('user_id', user.id).maybeSingle(),
  ]);
  const error = constraints.error ?? preferences.error ?? readiness.error;
  if (error) return NextResponse.json({ error: 'load_failed' }, { status: 500 });

  let constraintList = constraints.data ?? [];
  if (constraintList.length === 0 && profileRes.data?.injury_areas && Array.isArray(profileRes.data.injury_areas) && profileRes.data.injury_areas.length > 0) {
    const nowIso = new Date().toISOString();
    const rowsToInsert = profileRes.data.injury_areas.map((region: string) => ({
      user_id: user.id,
      region,
      side: 'both',
      severity: 3,
      triggers: region === 'knee'
        ? ['deep_flexion', 'high_impact', 'kneeling', 'squat', 'lunge', 'leg_press']
        : ['overhead_load', 'excessive_strain'],
      excluded_exercise_slugs: [],
      status: 'active',
      source: 'user',
      valid_from: nowIso,
      user_confirmed_at: nowIso,
      updated_at: nowIso,
    }));
    const { data: inserted } = await supabase.from('training_constraints').upsert(rowsToInsert, { onConflict: 'user_id,region' }).select('*');
    if (inserted && inserted.length > 0) {
      constraintList = inserted;
    }
  }

  return NextResponse.json({ constraints: constraintList, preferences: preferences.data ?? [], readiness: readiness.data?.[0] ?? null });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = PersonalizationProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_payload', issues: parsed.error.flatten() }, { status: 400 });
  const now = new Date();

  if (parsed.data.constraint) {
    const value = parsed.data.constraint;
    const { data, error } = await supabase.from('training_constraints').insert({
      user_id: user.id,
      region: value.region,
      side: value.side,
      severity: value.severity,
      triggers: value.triggers,
      excluded_exercise_slugs: [],
      status: 'active',
      source: 'user',
      valid_from: now.toISOString(),
      expires_at: value.expiresAt,
      user_confirmed_at: now.toISOString(),
    }).select('*').single();
    if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });
    return NextResponse.json({ kind: 'constraint', data }, { status: 201 });
  }

  if (parsed.data.preference) {
    const value = parsed.data.preference;
    const { data, error } = await supabase.from('exercise_preferences').upsert({
      user_id: user.id,
      target_type: value.targetType,
      target_key: value.targetKey,
      preference: value.preference,
      strength: value.strength,
      source: 'explicit',
      confidence: 1,
      last_confirmed_at: now.toISOString(),
      updated_at: now.toISOString(),
    }, { onConflict: 'user_id,target_type,target_key' }).select('*').single();
    if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });
    return NextResponse.json({ kind: 'preference', data }, { status: 201 });
  }

  const value = parsed.data.readiness!;
  const expiresAt = new Date(now.getTime() + 18 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from('readiness_checkins').insert({
    user_id: user.id,
    energy: value.energy,
    sleep_quality: value.sleepQuality,
    sleep_hours: value.sleepHours,
    stress: value.stress,
    discomfort_regions: value.discomfortRegions,
    available_minutes: value.availableMinutes,
    intent: value.intent,
    checked_at: now.toISOString(),
    expires_at: expiresAt,
  }).select('*').single();
  if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  return NextResponse.json({ kind: 'readiness', data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const kind = request.nextUrl.searchParams.get('kind');
  const id = request.nextUrl.searchParams.get('id');
  if (!id || !['constraint', 'preference'].includes(kind ?? '')) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const table = kind === 'constraint' ? 'training_constraints' : 'exercise_preferences';
  const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
