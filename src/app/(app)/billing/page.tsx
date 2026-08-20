import { createClient } from '@/lib/supabase/server';
import { Check, Crown, Zap, CreditCard } from 'lucide-react';
import BillingClient from './billing-client';

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('subscription_tier, subscription_renews_at').eq('user_id', user.id).single();
  const tier = profile?.subscription_tier ?? 'free';

  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-24 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Subscription</span>
          </div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Gói thành viên</h1>
          <p className="text-sm text-ink-secondary mt-1">
            Hiện tại:{' '}
            <span className={`chip text-xs font-bold uppercase tracking-wider ${tier === 'free' ? '' : 'active'}`}>
              {tier}
            </span>
          </p>
        </div>

        {/* Upgrade panel */}
        <BillingClient currentTier={tier} />

        {/* Pricing cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PlanCard tier="free" name="Free" price="0đ" highlight={tier === 'free'} icon={null}>
            <Feature ok> Bài tập cơ bản</Feature>
            <Feature ok> Ghi log workout</Feature>
            <Feature ok> Body weight tracking</Feature>
            <Feature ok={false}> AI workout generation</Feature>
            <Feature ok={false}> AI coach chat</Feature>
            <Feature ok={false}> Photo equipment detect</Feature>
            <Feature ok={false}> Progressive overload AI</Feature>
          </PlanCard>
          <PlanCard tier="pro" name="Pro" price="59.000đ/th" highlight={tier === 'pro'} icon={<Zap className="h-4 w-4 text-accent" strokeWidth={1.5} />}>
            <Feature ok> Tất cả Free</Feature>
            <Feature ok> AI workout generation</Feature>
            <Feature ok> Photo equipment detect</Feature>
            <Feature ok> Progressive overload AI</Feature>
            <Feature ok> Weekly AI report</Feature>
            <Feature ok={false}> Trainer + coach dashboard</Feature>
          </PlanCard>
          <PlanCard tier="elite" name="Elite" price="199.000đ/th" highlight={tier === 'elite'} icon={<Crown className="h-4 w-4 text-warn" strokeWidth={1.5} />}>
            <Feature ok> Tất cả Pro</Feature>
            <Feature ok> AI coach chat (Layer 3)</Feature>
            <Feature ok> Personal trainer (1-1)</Feature>
            <Feature ok> Custom program từ trainer</Feature>
            <Feature ok> Video call coaching</Feature>
          </PlanCard>
        </section>
      </div>
    </main>
  );
}

function PlanCard({ tier, name, price, highlight, icon, children }: {
  tier: string; name: string; price: string; highlight: boolean; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className={`card shadow-neumorph rounded-2xl p-5 ${highlight ? 'ring-2 ring-accent ring-offset-2' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-ink flex items-center gap-1.5">{icon}{name}</h3>
        {highlight && <span className="chip text-[10px] active">HIỆN TẠI</span>}
      </div>
      <div className="font-mono text-2xl font-extrabold text-ink mb-4">{price}</div>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function Feature({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`text-sm flex items-start gap-2 ${ok ? 'text-ink' : 'text-ink-muted line-through'}`}>
      <Check className={`h-4 w-4 mt-0.5 shrink-0 ${ok ? 'text-success' : 'text-ink-muted'}`} strokeWidth={1.5} />
      {children}
    </li>
  );
}
