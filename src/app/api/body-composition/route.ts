import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  ALL_BODY_COMPOSITION_ALLOWED_USES,
  SaveBodyCompositionSchema,
  bodyCompositionInsert,
  bodyCompositionSegmentInserts,
} from '@/lib/personalization/body-composition';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: measurements, error } = await supabase.from('body_composition_measurements')
    .select('*, body_composition_segments(*)').eq('user_id', user.id).eq('review_status', 'confirmed').order('measured_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  return NextResponse.json({ measurements: measurements ?? [], consents: [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = SaveBodyCompositionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_payload', issues: parsed.error.flatten() }, { status: 400 });

  const value = parsed.data;
  const now = new Date().toISOString();
  const { data: measurement, error } = await supabase.from('body_composition_measurements').insert({
    user_id: user.id,
    source: value.source,
    measured_at: value.measuredAt,
    measured_timezone: value.measuredTimezone ?? null,
    device_brand: value.deviceBrand ?? null,
    device_model: value.deviceModel ?? null,
    ...bodyCompositionInsert(value.values),
    device_target_values: {
      ...(value.targetValues ?? {}),
      ...(value.analysis ? { aiAnalysis: value.analysis } : {}),
    },
    preparation_metadata: {},
    scan_fingerprint: value.scanFingerprint ?? null,
    extraction_method: value.extractionMethod,
    extraction_provider: value.extractionProvider ?? null,
    extraction_confidence: value.extractionConfidence ?? null,
    review_status: 'confirmed',
    confirmed_at: now,
    comparability: value.comparability,
    allowed_uses: [...ALL_BODY_COMPOSITION_ALLOWED_USES],
    updated_at: now,
  }).select('*').single();
  if (error?.code === '23505') return NextResponse.json({ error: 'duplicate_scan' }, { status: 409 });
  if (error || !measurement) return NextResponse.json({ error: 'save_failed' }, { status: 500 });

  const segments = value.segments ? bodyCompositionSegmentInserts(value.segments) : [];
  if (segments.length) {
    const { error: segmentError } = await supabase.from('body_composition_segments').insert(
      segments.map((segment) => ({ ...segment, measurement_id: measurement.id, user_id: user.id })),
    );
    if (segmentError) {
      await supabase.from('body_composition_measurements').delete().eq('id', measurement.id).eq('user_id', user.id);
      return NextResponse.json({ error: 'segment_save_failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ measurement: { ...measurement, body_composition_segments: segments } }, { status: 201 });
}
