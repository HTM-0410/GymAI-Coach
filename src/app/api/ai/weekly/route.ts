import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateWeeklyReport } from '@/lib/ai/report';
import { buildPersonalizationContextForUser } from '@/lib/ai/personalization-context.server';
import { projectMinimalAIContext } from '@/lib/ai/personalization-context';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const personalization = projectMinimalAIContext(
      await buildPersonalizationContextForUser(user.id, 'weekly_report'),
      'weekly_report',
    );
    const report = await generateWeeklyReport(user.id, personalization);
    return NextResponse.json({ summary: report.ai_summary, report });
  } catch (e: any) {
    return NextResponse.json({ error: 'failed', detail: String(e?.message ?? e) }, { status: 500 });
  }
}
