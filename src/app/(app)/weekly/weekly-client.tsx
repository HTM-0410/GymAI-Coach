'use client';
import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

export default function WeeklyClient() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/ai/weekly', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Lỗi');
      setSummary(data.summary);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card shadow-neumorph rounded-xl p-6 border border-white/80 dark:border-white/10">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" strokeWidth={1.75} />
          <h2 className="font-bold text-ink text-base">AI phân tích tuần</h2>
        </div>
        <button onClick={generate} disabled={loading} className="btn-primary inline-flex items-center gap-2 text-sm shrink-0">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Đang phân tích…</> : <><Sparkles className="h-4 w-4" />Tạo báo cáo</>}
        </button>
      </div>
      {error && (
        <div className="bg-chassis shadow-inset-sm rounded-md px-4 py-3 mb-4">
          <p className="font-mono text-xs text-danger font-bold uppercase tracking-wider">ERR: {error}</p>
        </div>
      )}
      {summary ? (
        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap font-medium">{summary}</p>
      ) : (
        <p className="text-sm text-ink-muted leading-relaxed">
          Bấm nút để AI đọc dữ liệu 7 ngày qua và viết báo cáo cá nhân hoá cho bạn.
        </p>
      )}
    </div>
  );
}
