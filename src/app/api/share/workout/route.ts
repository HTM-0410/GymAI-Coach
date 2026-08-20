import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { generateShareableWorkoutSummary } from '@/lib/social';

const Body = z.object({
  workoutId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = Body.parse(await req.json());
  const summary = await generateShareableWorkoutSummary(body.workoutId, user.id);
  if (!summary) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  // Phase 3: also create shared_posts row + generate share image (FLUX)
  return NextResponse.json({ summary, shareUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/share/${body.workoutId}` });
}