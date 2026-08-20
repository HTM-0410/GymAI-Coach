import { createClient } from '@/lib/supabase/server';
import { MapPin } from 'lucide-react';

export default async function GymDatabasePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: gyms } = user
    ? await supabase.from('gyms').select('id, name, description, gym_equipment(count)').eq('owner_user_id', user.id).order('created_at', { ascending: false }).limit(20)
    : { data: [] };

  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-24 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Gym Database</span>
          </div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Gym Database</h1>
          <p className="text-sm text-ink-secondary mt-1">Danh sách phòng gym của bạn.</p>
        </div>

        {/* Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(gyms ?? []).map((g: any) => (
            <div key={g.id} className="card shadow-neumorph-sm rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-chassis shadow-neumorph-sm flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-accent" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-ink">{g.name}</h3>
                  {g.description && (
                    <p className="text-xs text-ink-secondary mt-1 leading-relaxed line-clamp-2">{g.description}</p>
                  )}
                  <p className="font-mono text-[10px] text-ink-muted uppercase tracking-wider mt-2">
                    {g.gym_equipment?.[0]?.count ?? 0} thiết bị
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Placeholder notice */}
        <div className="card shadow-neumorph rounded-xl p-6 text-center">
          <p className="font-mono text-sm text-ink-muted uppercase tracking-wider">
            Public gym database cho phép chia se + kham pha gym cong dong.
          </p>
          <p className="font-mono text-xs text-ink-muted mt-2">Hien tai chi hien thi gym cua ban.</p>
        </div>
      </div>
    </main>
  );
}
