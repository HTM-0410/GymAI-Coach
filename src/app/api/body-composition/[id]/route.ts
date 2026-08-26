import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!z.string().uuid().safeParse(params.id).success) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  const { data, error } = await supabase.from('body_composition_measurements')
    .delete().eq('id', params.id).eq('user_id', user.id).select('id').maybeSingle();
  if (error) return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
