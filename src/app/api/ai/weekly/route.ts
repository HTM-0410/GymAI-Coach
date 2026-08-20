import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateWeeklyReport } from '@/lib/ai/report';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const report = await generateWeeklyReport(user.id);
    return NextResponse.json({ summary: report.ai_summary, report });
  } catch (e: any) {
    return NextResponse.json({ error: 'failed', detail: String(e?.message ?? e) }, { status: 500 });
  }
}