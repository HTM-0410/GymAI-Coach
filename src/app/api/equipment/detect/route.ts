import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callGemini } from '@/lib/ai/gemini';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import {
  buildEquipmentDetectionPrompt,
  buildEquipmentDetectionResponseSchema,
  normalizeEquipmentWeightKg,
} from '@/lib/equipment-detection';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

const DetectedSchema = z.object({
  detected: z.array(z.object({
    equipment_slug: z.string(),
    quantity: z.number().int().min(1).max(1000).default(1),
    confidence: z.number().min(0).max(1).default(0.5),
    evidence_vi: z.string().max(240).default(''),
  })),
  dumbbells: z.array(z.object({
    raw_weight: z.number().positive().max(500),
    raw_unit: z.enum(['kg', 'lb']),
    quantity: z.number().int().min(1).max(1000),
    confidence: z.number().min(0).max(1).default(0.5),
    label_read: z.string().max(80).default(''),
  })).default([]),
});

type NormalizedDetection = {
  detected: z.infer<typeof DetectedSchema>['detected'];
  dumbbells: Array<{
    raw_weight: number;
    raw_unit: 'kg' | 'lb';
    weight_kg: number;
    quantity: number;
    confidence: number;
    label_read: string;
  }>;
};

export async function POST(req: NextRequest) {
  // Auth
  const serverSupabase = await createClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('image') as File | null;
  const rawGymId = form.get('gymId');
  const gymId = typeof rawGymId === 'string' && rawGymId ? rawGymId : null;
  if (!file) return NextResponse.json({ error: 'no_image' }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'too_large' }, { status: 413 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'bad_mime' }, { status: 400 });
  if (gymId && !z.string().uuid().safeParse(gymId).success) {
    return NextResponse.json({ error: 'invalid_gym_id' }, { status: 400 });
  }
  if (gymId) {
    const { data: ownedGym } = await serverSupabase
      .from('gyms')
      .select('id')
      .eq('id', gymId)
      .eq('owner_user_id', user.id)
      .maybeSingle();
    if (!ownedGym) return NextResponse.json({ error: 'gym_not_found' }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');

  // Catalog of equipment to map against
  const serverSupabase2 = await createClient();
  const { data: equipment } = await serverSupabase2
    .from('equipment')
    .select('slug, name_vi, category')
    .order('slug');
  const catalog = equipment ?? [];
  const validSlugs = new Set(catalog.map((item: any) => item.slug));
  const prompt = buildEquipmentDetectionPrompt(catalog as any);
  const responseSchema = buildEquipmentDetectionResponseSchema([...validSlugs]);

  let parsed: NormalizedDetection;
  const startMs = Date.now();
  try {
    const raw = await callGemini({
      prompt,
      images: [{ base64, mimeType: file.type }],
      responseSchema,
      temperature: 0.1,
      maxOutputTokens: 1400,
    });
    const modelOutput = DetectedSchema.parse(JSON.parse(raw));

    const deduped = new Map<string, z.infer<typeof DetectedSchema>['detected'][number]>();
    modelOutput.detected.forEach((item) => {
      if (!validSlugs.has(item.equipment_slug)) return;
      const previous = deduped.get(item.equipment_slug);
      if (!previous) {
        deduped.set(item.equipment_slug, item);
      } else {
        deduped.set(item.equipment_slug, {
          ...previous,
          quantity: previous.quantity + item.quantity,
          confidence: Math.max(previous.confidence, item.confidence),
        });
      }
    });

    const normalizedByWeight = new Map<number, {
      raw_weight: number;
      raw_unit: 'kg' | 'lb';
      weight_kg: number;
      quantity: number;
      confidence: number;
      label_read: string;
    }>();
    modelOutput.dumbbells.forEach((item) => {
      const weightKg = normalizeEquipmentWeightKg(item.raw_weight, item.raw_unit);
      if (weightKg <= 0 || weightKg > 200) return;
      const previous = normalizedByWeight.get(weightKg);
      if (previous) {
        previous.quantity += item.quantity;
        previous.confidence = Math.max(previous.confidence, item.confidence);
      } else {
        normalizedByWeight.set(weightKg, { ...item, weight_kg: weightKg });
      }
    });

    parsed = {
      detected: [...deduped.values()],
      dumbbells: [...normalizedByWeight.values()].sort((a, b) => a.weight_kg - b.weight_kg),
    };
  } catch (e: any) {
    return NextResponse.json({ error: 'ai_failed', detail: String(e?.message ?? e) }, { status: 500 });
  }

  // Upload original to storage (private bucket)
  const svc = createServiceClient();
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${user.id}/${Date.now()}.${extension}`;
  const { error: uploadError } = await svc.storage
    .from('equipment-scans')
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (uploadError) {
    return NextResponse.json({ error: 'scan_upload_failed', detail: uploadError.message }, { status: 500 });
  }
  const imageUrl = svc.storage.from('equipment-scans').getPublicUrl(path).data.publicUrl;

  // Log scan
  const { data: scan } = await svc.from('equipment_scans').insert({
    user_id: user.id,
    gym_id: gymId ?? null,
    image_url: imageUrl,
    detected_json: parsed,
  }).select('id').single();

  // Log ai_interactions
  await svc.from('ai_interactions').insert({
    user_id: user.id,
    endpoint: 'equipment_detect',
    latency_ms: Date.now() - startMs,
    status: 'ok',
    model: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite',
    request_json: { prompt_version: 'equipment_scan_v2', mime: file.type, catalog_count: catalog.length },
    response_json: parsed,
  });

  return NextResponse.json({ ...parsed, scanId: scan?.id ?? null, imageUrl });
}
