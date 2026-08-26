import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { chatWithCoach } from '@/lib/ai/coach';
import { buildPersonalizationContextForUser } from '@/lib/ai/personalization-context.server';
import { projectMinimalAIContext } from '@/lib/ai/personalization-context';
import {
  navigationReply,
  requestsSuggestedWorkoutHandoff,
  resolveCoachNavigationAction,
} from '@/lib/ai/coach-actions';

const Body = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(2000),
  })).min(1).max(20),
  workoutContext: z.object({
    exerciseName: z.string().optional(),
    exerciseSlug: z.string().optional(),
    setNumber: z.number().optional(),
    targetSets: z.number().optional(),
    targetReps: z.string().optional(),
    targetRir: z.number().nullable().optional(),
    completedSets: z.array(z.object({
      setNumber: z.number(),
      weight: z.number().nullable().optional(),
      reps: z.number().nullable().optional(),
      rir: z.number().nullable().optional(),
      perceivedEffort: z.string().nullable().optional(),
    })).optional(),
    currentWeight: z.number().nullable().optional(),
    currentReps: z.number().nullable().optional(),
    restRemaining: z.number().optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = Body.parse(await req.json());
  try {
    const latestUserMessage = [...body.messages].reverse().find((message) => message.role === 'user');
    let action = latestUserMessage ? resolveCoachNavigationAction(latestUserMessage.content) : null;
    if (action?.href === '/workouts/new' && latestUserMessage && requestsSuggestedWorkoutHandoff(latestUserMessage.content)) {
      const latestUserIndex = body.messages.lastIndexOf(latestUserMessage);
      const previousAssistant = [...body.messages.slice(0, latestUserIndex)]
        .reverse()
        .find((message) => message.role === 'assistant');
      if (previousAssistant) {
        action = { ...action, workoutHandoff: { suggestion: previousAssistant.content } };
      }
    }
    if (action) {
      return NextResponse.json({ reply: navigationReply(action), action });
    }

    const personalization = projectMinimalAIContext(
      await buildPersonalizationContextForUser(user.id, 'coach'),
      'coach',
    );
    const result = await chatWithCoach(user.id, body.messages, personalization, body.workoutContext);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: 'ai_failed', detail: String(e?.message ?? e) }, { status: 500 });
  }
}
