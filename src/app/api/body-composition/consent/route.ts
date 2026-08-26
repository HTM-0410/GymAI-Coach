import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { BODY_COMPOSITION_POLICY_VERSION } from '@/lib/personalization/body-composition';

const RequestSchema = z.object({ allowedUses: z.array(z.enum(['planner', 'coach', 'weekly_report'])).max(3) });
const PURPOSES = {
  planner: 'body_composition_planner',
  coach: 'body_composition_coach',
  weekly_report: 'body_composition_weekly_report',
} as const;

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  const now = new Date().toISOString();
  const selected = new Set(parsed.data.allowedUses);

  const { data: active, error: loadError } = await supabase.from('data_consents').select('id,purpose')
    .eq('user_id', user.id).in('purpose', Object.values(PURPOSES)).is('withdrawn_at', null);
  if (loadError) return NextResponse.json({ error: 'consent_load_failed' }, { status: 500 });

  const currentlyActive = new Set((active ?? []).map((item) => item.purpose));
  const withdrawIds = (active ?? []).filter((item) => {
    const surface = (Object.entries(PURPOSES).find(([, purpose]) => purpose === item.purpose)?.[0] ?? '') as keyof typeof PURPOSES;
    return !selected.has(surface);
  }).map((item) => item.id);
  if (withdrawIds.length) {
    const { error } = await supabase.from('data_consents').update({ withdrawn_at: now }).eq('user_id', user.id).in('id', withdrawIds);
    if (error) return NextResponse.json({ error: 'withdraw_failed' }, { status: 500 });
  }

  const grants = parsed.data.allowedUses.filter((surface) => !currentlyActive.has(PURPOSES[surface]));
  if (grants.length) {
    const { error } = await supabase.from('data_consents').insert(grants.map((surface) => ({
      user_id: user.id,
      purpose: PURPOSES[surface],
      provider: null,
      data_categories: ['reviewed_body_composition'],
      policy_version: BODY_COMPOSITION_POLICY_VERSION,
      granted_at: now,
      withdrawn_at: null,
    })));
    if (error) return NextResponse.json({ error: 'grant_failed' }, { status: 500 });
  }

  const { error: measurementError } = await supabase.from('body_composition_measurements')
    .update({ allowed_uses: parsed.data.allowedUses, updated_at: now }).eq('user_id', user.id);
  if (measurementError) return NextResponse.json({ error: 'measurement_update_failed' }, { status: 500 });
  return NextResponse.json({ allowedUses: parsed.data.allowedUses });
}
