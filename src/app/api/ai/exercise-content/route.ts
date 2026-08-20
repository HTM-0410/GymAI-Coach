import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { generateExerciseContent } from '@/lib/ai/exercise-content';

const Body = z.object({
  name: z.string().min(2),
  equipmentHint: z.array(z.string()).optional(),
  muscleHint: z.array(z.string()).optional(),
  saveAsCustom: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = Body.parse(await req.json());
  let content;
  try {
    content = await generateExerciseContent(body.name, {
      equipment: body.equipmentHint,
      muscles: body.muscleHint,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'ai_failed', detail: String(e?.message ?? e) }, { status: 500 });
  }

  if (!body.saveAsCustom) {
    return NextResponse.json({ content });
  }

  // Save as custom exercise owned by user
  const svc = createServiceClient();
  const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  const { data: ex, error } = await svc.from('exercises').insert({
    owner_user_id: user.id,
    type: 'custom',
    name: body.name,
    slug: `${slug}-${Date.now().toString(36)}`,
    description: content.description,
    difficulty: content.difficulty,
    exercise_type: content.exercise_type,
    instructions: content.instructions.join('\n'),
    tips: content.tips.join('\n'),
    common_mistakes: content.common_mistakes.join('\n'),
    default_rest_seconds: content.default_rest_seconds,
    default_rir: content.default_rir,
    status: 'published',
  }).select('id').single();

  if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });

  return NextResponse.json({ content, exerciseId: ex.id });
}