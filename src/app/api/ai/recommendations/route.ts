import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { buildProgressionRecommendations } from '@/lib/ai/progression';
import { findSubstitutes } from '@/lib/ai/substitute';
import { buildPersonalizationContextForUser } from '@/lib/ai/personalization-context.server';
import { projectMinimalAIContext } from '@/lib/ai/personalization-context';
import { personalizationFactors } from '@/lib/ai/personalization-integration';

const Body = z.object({
  kind: z.enum(['progression', 'substitute']),
  exerciseSlug: z.string().optional(),
  gymId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = Body.parse(await req.json());
  const svc = createServiceClient();
  const personalization = projectMinimalAIContext(
    await buildPersonalizationContextForUser(user.id, 'planner'),
    'planner',
  );

  if (body.kind === 'progression') {
    const recs = await buildProgressionRecommendations(user.id, personalization);
    // Lưu PENDING vào ai_recommendations
    if (recs.length > 0) {
      await svc.from('ai_recommendations').insert(
        recs.map((r) => ({
          user_id: user.id,
          recommendation_type: 'weight_progression',
          target_type: 'exercise',
          target_id: null,
          current_value: { previous: r.previous, plateau: r.plateau },
          suggested_value: { weight: r.suggested_weight, rep_min: r.suggested_rep_min, rep_max: r.suggested_rep_max, verdict: r.verdict.outcome },
          reason: r.ai_explanation,
          confidence: r.verdict.confidence,
          status: 'pending',
        }))
      );
    }
    return NextResponse.json({
      recommendations: recs,
      personalization: personalizationFactors(personalization, { includePerformance: true }),
    });
  }

  if (body.kind === 'substitute') {
    if (!body.exerciseSlug) return NextResponse.json({ error: 'missing_exercise' }, { status: 400 });
    const subs = await findSubstitutes({
      userId: user.id,
      exerciseSlug: body.exerciseSlug,
      gymId: body.gymId ?? null,
      personalization,
    });
    return NextResponse.json({
      substitutes: subs,
      personalization: personalizationFactors(personalization),
    });
  }

  return NextResponse.json({ error: 'bad_kind' }, { status: 400 });
}
