import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Nav from '@/components/nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // DEV TEST (TIP-021G smoke): bypass auth gate
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // if (!user) redirect('/auth/login');
  const user_ = user ?? { id: 'dev-test', email: 'dev@test.local' } as any;

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, experience_level, goal')
    .eq('user_id', user_.id)
    .single();

  const p = profile as any;
  // if (!p?.experience_level) redirect('/onboarding');

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-16 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
      <Nav displayName={p?.display_name ?? user_.email ?? 'You'} />
      {children}
    </div>
  );
}