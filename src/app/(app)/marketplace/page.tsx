import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Store, Layers, ChevronRight } from 'lucide-react';

export default async function MarketplacePage() {
  const supabase = await createClient();
  const { data: publicPrograms } = await supabase
    .from('training_programs')
    .select('id, name, name_vi, description, duration_weeks, price_cents, training_program_days(id, training_day_targets(target_sets))')
    .eq('is_public', true)
    .limit(40);

  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-24 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Community</span>
          </div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Marketplace chương trình</h1>
          <p className="text-sm text-ink-secondary mt-1">Khám phá và áp dụng các chương trình tập từ cộng đồng.</p>
        </div>

        {/* Program grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(publicPrograms ?? []).map((p: any) => {
            const totalSets = (p.training_program_days ?? []).reduce((acc: number, d: any) =>
              acc + (d.training_day_targets ?? []).reduce((s: number, t: any) => s + (t.target_sets ?? 0), 0), 0);
            return (
              <div key={p.id} className="card shadow-neumorph-sm rounded-xl p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-ink leading-tight">{p.name_vi ?? p.name}</h3>
                  <span className={`chip text-xs font-mono shrink-0 ${p.price_cents === 0 ? '' : 'active'}`}>
                    {p.price_cents === 0 ? 'FREE' : `${p.price_cents / 1000}k`}
                  </span>
                </div>
                {p.description && (
                  <p className="text-xs text-ink-secondary leading-relaxed line-clamp-3">{p.description}</p>
                )}
                <div className="flex items-center gap-3 text-[10px] font-mono text-ink-muted uppercase tracking-wider border-t border-chassis-lo pt-3">
                  <Layers className="h-3 w-3" strokeWidth={1.5} />
                  {p.training_program_days?.length ?? 0} ngày · {totalSets} sets/tuần · {p.duration_weeks ?? '?'}W
                </div>
                <button className="btn-ghost w-full text-sm inline-flex items-center justify-center gap-1 mt-auto">
                  Áp dụng <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            );
          })}
        </section>

        {(publicPrograms ?? []).length === 0 && (
          <div className="card shadow-neumorph-lg rounded-2xl p-10 text-center">
            <p className="font-mono text-sm text-ink-muted uppercase tracking-wider">
              Marketplace chưa có chương trình công khai nào.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
