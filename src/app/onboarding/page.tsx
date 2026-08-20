import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OnboardingForm from './onboarding-form';
import { Activity } from 'lucide-react';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const profileRow = profile as any;

  // Step-gate: skip onboarding only when user has completed ALL 4 steps.
  // Step 1-2 required (experience_level, goal). Step 4 marked by having ≥1
  // row in profile_equipment (step 3 fields `preferred_training_days` and
  // `preferred_session_duration` are NOT part of the gate — user may revisit
  // and change them indefinitely).
  const { count: equipmentCount } = await supabase
    .from('profile_equipment')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileRow?.id ?? '');

  const fullyOnboarded =
    profileRow?.experience_level &&
    profileRow?.goal &&
    (equipmentCount ?? 0) > 0;

  if (fullyOnboarded) {
    redirect('/dashboard');
  }

  // Load equipment catalog (28 rows) — grouped by category client-side.
  const { data: equipment } = await supabase
    .from('equipment')
    .select('id,slug,name,name_vi,category,image_url')
    .order('category', { ascending: true })
    .order('name_vi', { ascending: true });

  // Preselect existing equipment for returning users (mid-flow refresh).
  const { data: existing } = await supabase
    .from('profile_equipment')
    .select('equipment_id')
    .eq('profile_id', profileRow?.id ?? '');
  const preselected = (existing ?? []).map((r: any) => r.equipment_id as string);

  return (
    <main className="min-h-screen bg-chassis flex items-center justify-center px-4 py-12 blueprint-grid">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-chassis shadow-neumorph-sm flex items-center justify-center">
            <Activity className="h-5 w-5 text-accent" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted leading-none">GymAI Coach</p>
            <h1 className="font-mono text-sm font-bold uppercase tracking-widest text-ink mt-0.5">Khởi tạo hồ sơ</h1>
          </div>
        </div>
        <p className="text-sm text-ink-secondary mb-6 leading-relaxed">
          Vài thông tin nhanh để AI cá nhân hoá buổi tập cho bạn.
        </p>
        <OnboardingForm
          initial={profileRow}
          equipment={(equipment as any) ?? []}
          preselectedEquipment={preselected}
        />
      </div>
    </main>
  );
}
