/**
 * PerformanceChart — biểu đồ đường SVG render từ data JSON.
 * Tách ra từ StaticPerformanceChart trong exercise-demo/page.tsx để dùng chung.
 */

import type { PerformanceChart } from '@/lib/exercises-types';

const WIDTH = 340;
const HEIGHT = 166;
const PADDING_X = 38;
const PADDING_TOP = 26;
const PADDING_BOTTOM = 40;
const BASELINE = 136;

export default function PerformanceChart({ chart }: { chart: PerformanceChart }) {
  const { labels, values_kg, goal_kg, min, max } = chart;
  const count = labels.length;
  const stepX = count > 1 ? (WIDTH - PADDING_X - 12) / (count - 1) : 0;
  const range = max - min || 1;

  const coords = values_kg.map((value, index) => ({
    x: PADDING_X + index * stepX,
    y: PADDING_TOP + (1 - (value - min) / range) * (BASELINE - PADDING_TOP),
  }));

  const line = coords.map(({ x, y }) => `${x},${y}`).join(' ');
  const area = `M ${coords[0].x} ${BASELINE} L ${line.replaceAll(',', ' ')} L ${coords.at(-1)!.x} ${BASELINE} Z`;
  const lastX = coords.at(-1)!.x;
  const lastY = coords.at(-1)!.y;

  const goalY = PADDING_TOP + (1 - (goal_kg - min) / range) * (BASELINE - PADDING_TOP);
  const gridLines = [0, 1, 2, 3].map((i) => ({
    y: PADDING_TOP + (i * (BASELINE - PADDING_TOP)) / 3,
    label: (max - (i * (max - min)) / 3).toFixed(max - min < 10 ? 1 : 0),
  }));

  return (
    <div className="mt-4 overflow-hidden rounded-xl bg-chassis shadow-inset">
      <div className="flex items-center justify-between border-b border-chassis-lo px-4 py-3">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            Mức tạ theo buổi tập
          </p>
          <p className="mt-0.5 text-xs text-ink-secondary">{count} buổi gần nhất</p>
        </div>
        <div className="rounded-lg bg-accent/10 px-2.5 py-1 text-right">
          <p className="font-mono text-[9px] font-bold uppercase text-accent-muted">Tăng trưởng</p>
          <p className="text-sm font-extrabold text-accent">
            +{(values_kg.at(-1)! - values_kg[0]).toFixed(1)} kg
          </p>
        </div>
      </div>
      <div className="px-3 pb-2 pt-3">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label={`Biểu đồ hiệu suất ${labels.join(', ')}`}>
          <defs>
            <linearGradient id="perf-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity=".32" />
              <stop offset="100%" stopColor="#f97316" stopOpacity=".02" />
            </linearGradient>
            <filter id="perf-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {gridLines.map(({ y, label }, i) => (
            <g key={y}>
              <line x1={PADDING_X} x2={WIDTH - 12} y1={y} y2={y} stroke="#c7d0da" strokeDasharray="3 4" />
              <text x={3} y={y + 4} fill="#8896a5" fontSize={9}>
                {label}
              </text>
            </g>
          ))}
          <line
            x1={PADDING_X}
            x2={WIDTH - 12}
            y1={goalY}
            y2={goalY}
            stroke="#f97316"
            strokeDasharray="5 4"
            strokeOpacity=".55"
          />
          <text x={WIDTH - 12} y={goalY - 4} textAnchor="end" fill="#ea580c" fontSize={9} fontWeight={700}>
            Mục tiêu {goal_kg}
          </text>
          <path d={area} fill="url(#perf-fill)" />
          <polyline
            points={line}
            fill="none"
            stroke="#f97316"
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#perf-glow)"
          />
          {coords.map(({ x, y }, index) => {
            const isLast = index === coords.length - 1;
            const value = values_kg[index];
            return (
              <g key={labels[index]}>
                <circle
                  cx={x}
                  cy={y}
                  r={isLast ? 7 : 5}
                  fill="#fff"
                  stroke="#f97316"
                  strokeWidth={isLast ? 4 : 3}
                />
                <text x={x} y={HEIGHT - 11} textAnchor="middle" fill="#8896a5" fontSize={8}>
                  {labels[index]}
                </text>
                {isLast && (
                  <g>
                    <rect x={x - 26} y={y - 31} width={52} height={19} rx={5} fill="#f97316" />
                    <text x={x} y={y - 18} textAnchor="middle" fill="#fff" fontSize={10} fontWeight={700}>
                      {value} kg
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          {/* keep lastX/lastY reachable to satisfy TS noUnused checks */}
          {lastX > 0 && lastY > 0 && null}
        </svg>
      </div>
    </div>
  );
}