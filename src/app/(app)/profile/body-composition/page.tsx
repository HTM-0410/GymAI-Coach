import Link from 'next/link';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import BodyCompositionClient from './body-composition-client';

export default async function BodyCompositionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const measurementsResult = await supabase.from('body_composition_measurements')
    .select('*, body_composition_segments(*)').eq('user_id', user.id).eq('review_status', 'confirmed').order('measured_at', { ascending: false });
  return (
    <main className="min-h-screen overflow-x-clip bg-chassis blueprint-grid">
      <div className="mx-auto min-w-0 max-w-5xl px-3 pb-28 pt-5 sm:px-4 sm:pt-6">
        <Link href="/profile" className="mb-5 inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-accent"><ChevronLeft className="h-4 w-4" />Hồ sơ</Link>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-accent"><span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" /><span className="font-mono text-[10px] font-bold uppercase tracking-widest">Body composition</span></div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">Thành phần cơ thể</h1>
            <p className="mt-1 max-w-2xl text-sm text-ink-secondary">Theo dõi baseline và xu hướng đo trong điều kiện tương đồng. Thông tin này không phải chẩn đoán y khoa.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-black/5 bg-white/30 px-3 py-2 text-xs text-ink-secondary dark:border-white/10 dark:bg-white/5"><ShieldCheck className="h-4 w-4 text-accent" />Ảnh không được lưu</div>
        </div>
        <BodyCompositionClient
          initialMeasurements={(measurementsResult.data ?? []) as any}
          setupError={Boolean(measurementsResult.error)}
        />
      </div>
    </main>
  );
}
