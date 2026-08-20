'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type PerformanceData = {
  exercise_name: string;
  hasData: boolean;
  message?: string;
  metrics?: {
    current_weight_kg: number;
    rep_range: string;
    estimated_1rm_kg: number;
    avg_rir: number;
    sessions_count: number;
  };
  chart?: Array<{
    date: string;
    label: string;
    weight: number;
    reps: number;
  }>;
  trend_kg?: number;
};

type Props = {
  exerciseSlug: string;
};

export default function UserPerformance({ exerciseSlug }: Props) {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPerformance() {
      try {
        const res = await fetch(`/api/exercise-performance?exerciseSlug=${encodeURIComponent(exerciseSlug)}`);
        if (!res.ok) {
          if (res.status === 401) {
            setError('Vui lòng đăng nhập để xem hiệu suất');
          } else if (res.status === 404) {
            setError('Không tìm thấy dữ liệu');
          } else {
            setError('Lỗi khi tải dữ liệu');
          }
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError('Lỗi kết nối');
      } finally {
        setLoading(false);
      }
    }

    fetchPerformance();
  }, [exerciseSlug]);

  if (loading) {
    return (
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-lg bg-chassis p-3 text-center shadow-inset">
            <div className="mx-auto h-8 w-16 rounded bg-chassis-lo" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data?.hasData) {
    return (
      <div className="mt-4 rounded-lg bg-chassis p-4 text-center shadow-inset">
        <p className="font-mono text-xs text-ink-muted">
          {data?.message || error || 'Chưa có dữ liệu hiệu suất cho bài tập này'}
        </p>
        <p className="mt-1 text-xs text-ink-secondary">
          Hoàn thành buổi tập để xem thống kê
        </p>
      </div>
    );
  }

  const { metrics, chart, trend_kg } = data;
  const trendColor = trend_kg && trend_kg > 0 ? 'text-green-500' : trend_kg && trend_kg < 0 ? 'text-red-500' : 'text-ink-muted';
  const TrendIcon = trend_kg && trend_kg > 0 ? TrendingUp : trend_kg && trend_kg < 0 ? TrendingDown : Minus;

  return (
    <>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-chassis p-3 text-center shadow-inset">
          <p className="font-mono text-[9px] font-bold uppercase text-ink-muted">Mức tạ</p>
          <p className="mt-1 font-bold text-accent">{metrics?.current_weight_kg} kg</p>
        </div>
        <div className="rounded-lg bg-chassis p-3 text-center shadow-inset">
          <p className="font-mono text-[9px] font-bold uppercase text-ink-muted">Số lần/hiệp</p>
          <p className="mt-1 font-bold text-accent">{metrics?.rep_range}</p>
        </div>
        <div className="rounded-lg bg-chassis p-3 text-center shadow-inset">
          <p className="font-mono text-[9px] font-bold uppercase text-ink-muted">1RM ước tính</p>
          <p className="mt-1 font-bold text-accent">{metrics?.estimated_1rm_kg} kg</p>
        </div>
      </div>

      {chart && chart.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between border-b border-chassis-lo px-1 py-2">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Mức tạ theo buổi tập
              </p>
              <p className="mt-0.5 text-xs text-ink-secondary">
                {chart.length} buổi gần nhất
              </p>
            </div>
            <div className={`flex items-center gap-1 rounded-lg bg-accent/10 px-2.5 py-1 ${trendColor}`}>
              <TrendIcon className="h-3 w-3" />
              <span className="font-mono text-xs font-bold">
                {trend_kg !== undefined && trend_kg > 0 ? '+' : ''}{trend_kg} kg
              </span>
            </div>
          </div>

          <div className="mt-3 flex h-24 items-end justify-between gap-1 px-1">
            {chart.map((point, idx) => {
              const maxWeight = Math.max(...chart.map((p) => p.weight));
              const minWeight = Math.min(...chart.map((p) => p.weight));
              const range = maxWeight - minWeight || 1;
              const heightPercent = 40 + (((point.weight - minWeight) / range) * 50);

              return (
                <div key={point.date} className="group relative flex flex-1 flex-col items-center">
                  <div
                    className="w-full rounded-t bg-accent/60 transition-all hover:bg-accent"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="mt-1 font-mono text-[8px] text-ink-muted">
                    {point.label}
                  </span>
                  <span className="font-mono text-[9px] font-bold text-accent">
                    {point.weight}
                  </span>

                  <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-xs font-bold text-white group-hover:block">
                    {point.weight} kg × {point.reps} reps
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-3 font-mono text-[9px] text-ink-muted">
        {metrics?.sessions_count} buổi tập · RIR trung bình: {metrics?.avg_rir}
      </p>
    </>
  );
}
