import { createClient } from '@/lib/supabase/server';
import GymsListClient from './gyms-list-client';

export default async function GymsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: gyms } = await supabase
    .from('gyms')
    .select('id, name, description, created_at, gym_equipment(count)')
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <GymsListClient initialGyms={(gyms as any) ?? []} />
    </main>
  );
}
