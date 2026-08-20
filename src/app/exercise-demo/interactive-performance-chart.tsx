'use client';

import { useState } from 'react';

const values = [60, 62.5, 65, 65, 67.5, 70];
const labels = ['12/07', '19/07', '26/07', '02/08', '09/08', 'Hôm nay'];

export default function InteractivePerformanceChart() {
  const [active, setActive] = useState<number | null>(null);
  const min = 57.5, max = 75, baseline = 136;
  const coords = values.map((value, index) => ({ x: 42 + index * 56, y: 126 - ((value - min) / (max - min)) * 92 }));
  const line = coords.map(({ x, y }) => `${x},${y}`).join(' ');
  const area = `M ${coords[0].x} ${baseline} L ${line.replaceAll(',', ' ')} L ${coords.at(-1)!.x} ${baseline} Z`;
  return <div className="mt-4 overflow-hidden rounded-xl bg-chassis shadow-inset">
    <div className="flex items-center justify-between border-b border-chassis-lo px-4 py-3"><div><p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">Mức tạ theo buổi tập</p><p className="mt-0.5 text-xs text-ink-secondary">Di chuột vào điểm dữ liệu để xem chi tiết</p></div><span className="text-sm font-extrabold text-accent">+10 kg</span></div>
    <div className="px-3 pb-2 pt-3"><svg viewBox="0 0 340 166" className="h-auto w-full" role="img" aria-label="Biểu đồ mức tạ Bench Press tăng từ 60 lên 70 kg"><defs><linearGradient id="performance-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity=".32"/><stop offset="100%" stopColor="#f97316" stopOpacity=".02"/></linearGradient></defs>{[36,66,96,126].map((y,index)=><g key={y}><line x1="38" x2="330" y1={y} y2={y} stroke="#c7d0da" strokeDasharray="3 4"/><text x="3" y={y+4} fill="#8896a5" fontSize="9">{75-index*5}</text></g>)}<path d={area} fill="url(#performance-fill)"/><polyline points={line} fill="none" stroke="#f97316" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>{coords.map(({x,y},index)=><g key={labels[index]} onMouseEnter={()=>setActive(index)} onMouseLeave={()=>setActive(null)} onClick={()=>setActive(index)} className="cursor-pointer"><circle cx={x} cy={y} r="11" fill="transparent"/><circle cx={x} cy={y} r={active===index?'6.5':'5'} fill="#fff" stroke="#f97316" strokeWidth={active===index?'4':'3'}/><text x={x} y="155" textAnchor="middle" fill="#8896a5" fontSize="8">{labels[index]}</text>{active===index&&<g><rect x={x-30} y={y-34} width="60" height="21" rx="5" fill="#f97316"/><text x={x} y={y-20} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">{values[index]} kg</text></g>}</g>)}</svg></div>
  </div>;
}
