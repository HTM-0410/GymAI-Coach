'use client';
import { useState } from 'react';
import { Loader2, CreditCard } from 'lucide-react';

export default function BillingClient({ currentTier }: { currentTier: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upgrade(tier: 'pro' | 'elite') {
    setLoading(tier); setError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Lỗi');
      if (data.demo) {
        alert(`Demo mode: Bạn đã upgrade lên ${tier} (không qua Stripe)`);
        location.reload();
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  if (currentTier !== 'free') {
    return (
      <div className="card shadow-neumorph rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="h-4 w-4 text-accent" strokeWidth={1.5} />
          <h2 className="font-bold text-ink">Quản lý subscription</h2>
        </div>
        <p className="text-sm text-ink-secondary">
          Bạn đang dùng gói{' '}
          <span className="font-mono font-bold text-accent uppercase">{currentTier}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="card shadow-neumorph rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <CreditCard className="h-4 w-4 text-accent" strokeWidth={1.5} />
        <h2 className="font-bold text-ink">Nâng cấp tài khoản</h2>
      </div>
      <p className="text-sm text-ink-secondary mb-4">
        Mở khóa toàn bộ AI + premium features.
      </p>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => upgrade('pro')} disabled={loading !== null} className="btn-primary">
          {loading === 'pro' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading === 'pro' ? 'Đang xử lý…' : 'Nâng cấp Pro'}
        </button>
        <button onClick={() => upgrade('elite')} disabled={loading !== null} className="btn-ghost">
          {loading === 'elite' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading === 'elite' ? 'Đang xử lý…' : 'Nâng cấp Elite'}
        </button>
      </div>
      {error && (
        <div className="mt-3 bg-chassis shadow-inset-sm rounded-md px-4 py-2">
          <p className="font-mono text-xs text-danger font-bold uppercase tracking-wider">ERR: {error}</p>
        </div>
      )}
      <p className="text-xs text-ink-muted mt-3 font-mono">
        * Stripe chưa được cấu hình. Bấm upgrade sẽ chạy chế độ demo.
      </p>
    </div>
  );
}
