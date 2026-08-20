import WeeklyClient from './weekly-client';
import { TrendingUp } from 'lucide-react';

export default function WeeklyPage() {
  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">AI Analytics</span>
          </div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Báo cáo tuần</h1>
          <p className="text-sm text-ink-secondary mt-1">AI phân tích dữ liệu 7 ngày qua.</p>
        </div>
        <WeeklyClient />
      </div>
    </main>
  );
}
