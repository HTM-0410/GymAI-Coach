import { createClient } from '@/lib/supabase/server';
import ProfileForm from './profile-form';
import { User } from 'lucide-react';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Profile Settings</span>
          </div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Hồ sơ cá nhân</h1>
        </div>
        <ProfileForm initial={profile as any} email={user.email ?? ''} />
      </div>
    </main>
  );
}
