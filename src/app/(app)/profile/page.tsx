import { createClient } from '@/lib/supabase/server';
import ProfileForm from './profile-form';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <div className="max-w-4xl mx-auto px-3.5 sm:px-6 pt-3.5 sm:pt-6 pb-28 sm:pb-36">
        <div className="mb-3 sm:mb-6">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
            <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-ink-muted">Profile & Personalization</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-ink tracking-tight">Hồ sơ & Cá nhân hoá</h1>
        </div>
        <ProfileForm initial={profile as any} email={user.email ?? ''} />
      </div>
    </main>
  );
}
