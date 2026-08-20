import { createClient } from '@/lib/supabase/server';
import RecommendationsClient from './recommendations-client';
import { Sparkles } from 'lucide-react';

export default async function RecommendationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: pending } = await supabase
    .from('ai_recommendations')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">AI Recommendations</span>
          </div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Đề xuất AI</h1>
        </div>
        <RecommendationsClient initialPending={pending ?? []} />
      </div>
    </main>
  );
}
