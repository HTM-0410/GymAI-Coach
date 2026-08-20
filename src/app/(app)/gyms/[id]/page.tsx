import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import GymDetailClient from './gym-detail-client';
import DumbbellInventoryCard from './dumbbell-inventory-card';

// The equipment catalog is edited live in Supabase. Never reuse a stale
// route payload after an equipment merge, rename or reclassification.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function GymDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: gym }, { data: allEquipment }, { data: dumbbellInventory }] = await Promise.all([
    supabase
      .from('gyms')
      .select('id, name, description, gym_equipment(equipment_id, quantity, equipment(id, slug, name, name_vi, category, image_url))')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('equipment')
      .select('id, slug, name, name_vi, category, image_url')
      .order('name_vi'),
    supabase
      .from('gym_dumbbell_inventory')
      .select('id, weight_kg, quantity')
      .eq('gym_id', id)
      .order('weight_kg'),
  ]);

  if (!gym) notFound();

  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <GymDetailClient
        gym={gym as any}
        allEquipment={allEquipment ?? []}
        inventoryCard={(
          <DumbbellInventoryCard
            gymId={id}
            initialItems={(dumbbellInventory ?? []).map((item) => ({
              id: item.id,
              weight_kg: Number(item.weight_kg),
              quantity: Number(item.quantity),
            }))}
          />
        )}
      />
    </main>
  );
}
