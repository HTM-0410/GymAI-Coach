import { createClient } from '@/lib/supabase/server';
import GymsListClient from './gyms-list-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function GymsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: gyms } = await supabase
    .from('gyms')
    .select('id, name, description, created_at, gym_equipment(equipment(slug, name_vi))')
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <GymsListClient initialGyms={(gyms as any) ?? []} />
    </main>
  );
}
