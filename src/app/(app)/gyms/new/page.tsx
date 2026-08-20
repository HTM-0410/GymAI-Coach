import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import NewGymForm from './new-gym-form';
import { MapPin } from 'lucide-react';

export default async function NewGymPage() {
  const supabase = await createClient();
  const { data: equipment } = await supabase.from('equipment').select('id, slug, name_vi, category').order('name_vi');
  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-accent" strokeWidth={1.5} />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Add Gym</span>
          </div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Thêm gym mới</h1>
          <p className="text-sm text-ink-secondary mt-1 leading-relaxed">
            Đặt tên + chọn thiết bị có sẵn tại phòng tập.
          </p>
        </div>
        <NewGymForm equipment={equipment ?? []} />
      </div>
    </main>
  );
}
