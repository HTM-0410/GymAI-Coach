import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { chatWithCoach } from '@/lib/ai/coach';

const Body = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(2000),
  })).min(1).max(20),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = Body.parse(await req.json());
  try {
    const reply = await chatWithCoach(user.id, body.messages);
    return NextResponse.json({ reply });
  } catch (e: any) {
    return NextResponse.json({ error: 'ai_failed', detail: String(e?.message ?? e) }, { status: 500 });
  }
}