import { createClient } from '@/lib/supabase/server';
import NewWorkoutForm from './new-workout-form';
import { Brain } from 'lucide-react';

export default async function NewWorkoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [activeProgramRes, gymsRes, profileRes] = await Promise.all([
    supabase.from('user_programs').select('training_programs(id, name, training_program_days(id, name, day_of_week, training_day_targets(role, target_sets, muscles(slug))))').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
    supabase
      .from('gyms')
      .select('id, name, gym_dumbbell_inventory(weight_kg, quantity)')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('preferred_session_duration').eq('user_id', user.id).single(),
  ]);

  const program = activeProgramRes.data as any;
  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">AI Workout Generator</span>
          </div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Tạo buổi tập với AI</h1>
          <p className="text-sm text-ink-secondary mt-1 leading-relaxed">
            AI sẽ chọn bài phù hợp với gym + lịch tập của bạn.
          </p>
        </div>
        <NewWorkoutForm
          program={program?.training_programs ?? null}
          gyms={gymsRes.data ?? []}
          defaultDuration={profileRes.data?.preferred_session_duration ?? 60}
        />
      </div>
    </main>
  );
}
