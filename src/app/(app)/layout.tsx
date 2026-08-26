import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Nav from '@/components/nav';
import FloatingCoachWidget from '@/components/floating-coach-widget';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, experience_level, goal')
    .eq('user_id', user.id)
    .maybeSingle();

  const p = profile as any;

  return (
    <div className="min-h-screen pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-0 md:pl-16 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
      <Nav displayName={p?.display_name ?? user.email ?? 'You'} />
      {children}
      <FloatingCoachWidget />
    </div>
  );
}