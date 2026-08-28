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
import { GeminiApiError, getGeminiModel } from '@/lib/ai/gemini';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const;

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
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request', message: 'Yêu cầu gửi đến AI Coach không hợp lệ. Vui lòng tải lại trang và thử lại.' },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
  const body = parsed.data;
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
      return NextResponse.json({ reply: navigationReply(action), action }, { headers: NO_STORE_HEADERS });
    }

    const personalization = projectMinimalAIContext(
      await buildPersonalizationContextForUser(user.id, 'coach'),
      'coach',
    );
    const result = await chatWithCoach(user.id, body.messages, personalization, body.workoutContext);
    return NextResponse.json(result, { headers: NO_STORE_HEADERS });
  } catch (error) {
    const requestId = crypto.randomUUID();
    const reason = error instanceof GeminiApiError ? `provider_${error.status}` : 'internal_error';
    console.error(
      `[ai/coach] request_id=${requestId} model=${getGeminiModel()} reason=${reason}`,
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      {
        error: 'ai_failed',
        reason,
        requestId,
        message: 'AI Coach đang tạm thời không phản hồi. Vui lòng thử lại sau ít phút.',
      },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
