import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const Body = z.object({
  recommendationId: z.string().uuid(),
  decision: z.enum(['accepted', 'rejected']),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = Body.parse(await req.json());

  // Verify ownership
  const { data: rec } = await supabase
    .from('ai_recommendations')
    .select('user_id, status')
    .eq('id', body.recommendationId)
    .maybeSingle();
  if (!rec || rec.user_id !== user.id) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (rec.status !== 'pending') return NextResponse.json({ error: 'already_reviewed' }, { status: 400 });

  await supabase.from('ai_recommendations').update({
    status: body.decision,
    reviewed_at: new Date().toISOString(),
  }).eq('id', body.recommendationId);

  return NextResponse.json({ ok: true });
}