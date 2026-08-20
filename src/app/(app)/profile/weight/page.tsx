import { createClient } from '@/lib/supabase/server';
import WeightForm from './weight-form';
import { Scale } from 'lucide-react';

export default async function WeightLogPage() {
  const supabase = await createClient();
  const { data: weights } = await supabase
    .from('body_weight_logs')
    .select('*')
    .order('recorded_date', { ascending: false })
    .limit(30);
  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Weight Tracking</span>
          </div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Ghi cân nặng</h1>
        </div>
        <WeightForm />

        {/* History */}
        <div className="card shadow-neumorph rounded-xl p-5 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="h-4 w-4 text-accent" strokeWidth={1.5} />
            <h2 className="font-bold text-ink">Lịch sử</h2>
          </div>
          {weights && weights.length > 0 ? (
            <ul className="space-y-2">
              {(weights as any[]).map((w: any) => (
                <li key={w.id} className="flex items-center justify-between py-2 border-b border-chassis-lo last:border-0">
                  <span className="font-mono text-xs text-ink-secondary">
                    {new Date(w.recorded_date).toLocaleDateString('vi-VN')}
                  </span>
                  <span className="font-mono text-sm font-bold text-ink">{w.weight_kg} kg</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-mono text-sm text-ink-muted">Chưa có dữ liệu.</p>
          )}
        </div>
      </div>
    </main>
  );
}
