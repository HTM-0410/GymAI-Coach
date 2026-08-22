import { createClient } from '@/lib/supabase/server';
import CyberSpotlightBackground from '@/components/cyber-spotlight-background';
import NewWorkoutForm from './new-workout-form';

export default async function NewWorkoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [userProgramsRes, allProgramsRes, gymsRes, profileRes] = await Promise.all([
    supabase
      .from('user_programs')
      .select('program_id, is_active')
      .eq('user_id', user.id),
    supabase
      .from('training_programs')
      .select(`
        id,
        name,
        name_vi,
        description,
        type,
        duration_weeks,
        owner_user_id,
        training_program_days(
          id,
          name,
          name_vi,
          day_of_week,
          training_day_targets(
            role,
            target_sets,
            muscles(slug, name_vi)
          )
        )
      `)
      .or(`type.eq.system,owner_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false }),
    supabase
      .from('gyms')
      .select('id, name, description, gym_dumbbell_inventory(weight_kg, quantity), gym_equipment(equipment(slug, name_vi))')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('preferred_session_duration').eq('user_id', user.id).single(),
  ]);

  const activeUserProgram = userProgramsRes.data?.find((up) => up.is_active);
  const activeProgramId = activeUserProgram?.program_id ?? userProgramsRes.data?.[0]?.program_id ?? null;
  const programs = (allProgramsRes.data ?? []) as any[];

  return (
    <main className="min-h-screen bg-chassis blueprint-grid relative overflow-x-hidden">
      <CyberSpotlightBackground />
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-24 relative z-10 w-full overflow-hidden">
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
          programs={programs}
          activeProgramId={activeProgramId}
          gyms={gymsRes.data ?? []}
          defaultDuration={profileRes.data?.preferred_session_duration ?? 60}
        />
      </div>
    </main>
  );
}
