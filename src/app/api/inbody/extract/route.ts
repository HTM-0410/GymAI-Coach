import { NextRequest, NextResponse } from 'next/server';
import { callGemini, GeminiApiError, getGeminiModel } from '@/lib/ai/gemini';
import { createClient } from '@/lib/supabase/server';
import {
  BODY_COMPOSITION_POLICY_VERSION,
  InBodyProviderExtractionSchema,
  INBODY_EXTRACTION_FLAGS,
  INBODY_IMAGE_MIME_TYPES,
  MAX_INBODY_IMAGE_BYTES,
  buildInBodyPrompt,
  buildInBodyResponseSchema,
  normalizeInBodyExtractionPayload,
} from '@/lib/personalization/body-composition';
import { createInBodyScanFingerprint } from '@/lib/personalization/inbody-deduplication.server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await request.formData();
  const image = form.get('image');
  const consent = form.get('consent');
  if (!(image instanceof File)) return NextResponse.json({ error: 'no_image' }, { status: 400 });
  if (consent !== INBODY_EXTRACTION_FLAGS.consent) return NextResponse.json({ error: 'consent_required' }, { status: 400 });
  if (image.size <= 0 || image.size > MAX_INBODY_IMAGE_BYTES) return NextResponse.json({ error: 'invalid_size' }, { status: 413 });
  if (!(INBODY_IMAGE_MIME_TYPES as readonly string[]).includes(image.type)) return NextResponse.json({ error: 'bad_mime' }, { status: 400 });

  const grantedAt = new Date().toISOString();
  const { error: consentError } = await supabase.from('data_consents').insert({
    user_id: user.id,
    purpose: 'body_composition_external_processing',
    provider: 'google_gemini',
    data_categories: ['user_selected_inbody_image'],
    policy_version: BODY_COMPOSITION_POLICY_VERSION,
    granted_at: grantedAt,
    withdrawn_at: null,
  });
  if (consentError) return NextResponse.json({ error: 'consent_record_failed' }, { status: 500 });

  try {
    const base64 = Buffer.from(await image.arrayBuffer()).toString('base64');
    const raw = await callGemini({
      prompt: buildInBodyPrompt(),
      images: [{ base64, mimeType: image.type, mediaResolution: 'MEDIA_RESOLUTION_HIGH' }],
      responseSchema: buildInBodyResponseSchema(),
      temperature: 0,
      maxOutputTokens: 4200,
    });
    const providerExtraction = InBodyProviderExtractionSchema.parse(normalizeInBodyExtractionPayload(JSON.parse(raw)));
    const { phoneNumber, ...extraction } = providerExtraction;
    if (!Object.values(extraction.values).some((value) => typeof value === 'number')) {
      throw new Error('No readable body-composition metrics');
    }
    const scanFingerprint = createInBodyScanFingerprint({
      userId: user.id,
      phoneNumber,
      measuredAt: extraction.measuredAt,
    });
    if (scanFingerprint) {
      const { data: duplicate, error: duplicateError } = await supabase.from('body_composition_measurements')
        .select('id, measured_at').eq('user_id', user.id).eq('scan_fingerprint', scanFingerprint).maybeSingle();
      if (duplicateError) return NextResponse.json({ error: 'duplicate_check_failed' }, { status: 500 });
      if (duplicate) return NextResponse.json({
        error: 'duplicate_scan',
        measuredAt: duplicate.measured_at,
        model: getGeminiModel(),
      }, { status: 409 });
    }
    return NextResponse.json({ extraction, scanFingerprint, model: getGeminiModel(), policyVersion: BODY_COMPOSITION_POLICY_VERSION });
  } catch (error) {
    const reason = error instanceof GeminiApiError ? `provider_${error.status}` : error instanceof SyntaxError ? 'invalid_json' : 'invalid_model_output';
    console.error(`[inbody/extract] model=${getGeminiModel()} reason=${reason}`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'extraction_failed', reason, model: getGeminiModel() }, { status: 502 });
  }
}
