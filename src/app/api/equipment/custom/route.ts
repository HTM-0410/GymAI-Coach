import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const BodySchema = z.object({
  gymId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
});

/** Save a user-only equipment item and queue it for admin catalog review. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await req.formData();
  const parsed = BodySchema.safeParse({
    gymId: form.get('gymId'),
    name: form.get('name'),
  });
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const file = form.get('image');
  if (!(file instanceof File)) return NextResponse.json({ error: 'no_image' }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'too_large' }, { status: 413 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'bad_mime' }, { status: 400 });

  const { data: gym } = await supabase
    .from('gyms')
    .select('id')
    .eq('id', parsed.data.gymId)
    .eq('owner_user_id', user.id)
    .maybeSingle();
  if (!gym) return NextResponse.json({ error: 'gym_not_found' }, { status: 404 });

  const equipmentId = crypto.randomUUID();
  const slug = `custom-${user.id.slice(0, 8)}-${equipmentId.slice(0, 8)}`;
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const storagePath = `${user.id}/custom/${equipmentId}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const service = createServiceClient();

  const upload = await service.storage.from('equipment-images').upload(storagePath, buffer, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (upload.error) return NextResponse.json({ error: 'image_upload_failed' }, { status: 500 });
  const imageUrl = service.storage.from('equipment-images').getPublicUrl(storagePath).data.publicUrl;

  const { data: equipment, error: equipmentError } = await service
    .from('equipment')
    .insert({
      id: equipmentId,
      slug,
      name: parsed.data.name,
      name_vi: parsed.data.name,
      category: 'other',
      image_url: imageUrl,
      owner_user_id: user.id,
    })
    .select('id, slug, name, name_vi, category, image_url')
    .single();
  if (equipmentError) {
    await service.storage.from('equipment-images').remove([storagePath]);
    return NextResponse.json({ error: 'equipment_create_failed' }, { status: 500 });
  }

  const { error: gymEquipmentError } = await service
    .from('gym_equipment')
    .insert({ gym_id: parsed.data.gymId, equipment_id: equipmentId, quantity: 1 });
  if (gymEquipmentError) {
    await service.from('equipment').delete().eq('id', equipmentId);
    await service.storage.from('equipment-images').remove([storagePath]);
    return NextResponse.json({ error: 'gym_equipment_create_failed' }, { status: 500 });
  }

  const { data: request, error: requestError } = await service
    .from('equipment_addition_requests')
    .insert({
      user_id: user.id,
      gym_id: parsed.data.gymId,
      equipment_id: equipmentId,
      submitted_name: parsed.data.name,
      image_url: imageUrl,
      status: 'pending',
    })
    .select('id, status, created_at')
    .single();
  if (requestError) {
    await service.from('gym_equipment').delete().eq('gym_id', parsed.data.gymId).eq('equipment_id', equipmentId);
    await service.from('equipment').delete().eq('id', equipmentId);
    await service.storage.from('equipment-images').remove([storagePath]);
    return NextResponse.json({ error: 'request_create_failed' }, { status: 500 });
  }

  return NextResponse.json({ equipment, request });
}
