import Image from 'next/image';
import Link from 'next/link';
import { Activity, ArrowLeft, CheckCircle2, Clock3, Dumbbell, Info, Lightbulb, PlayCircle, Plus, ShieldAlert, Target, TrendingUp } from 'lucide-react';
import VideoGuide from './video-guide';
import PerformanceChart from './interactive-performance-chart';

const steps = ['Nằm ngửa trên ghế phẳng, mắt thẳng dưới thanh đòn; đặt chân vững trên sàn.', 'Kéo bả vai về sau và hạ xuống; nắm thanh rộng hơn vai một chút.', 'Tháo thanh khỏi giá, giữ cổ tay thẳng rồi hạ chậm về giữa ngực.', 'Đẩy thanh theo đường hơi chéo về phía vai; thở ra khi đẩy.', 'Khóa khuỷu tay có kiểm soát, giữ bả vai cố định rồi lặp lại.'];
const tips = ['Siết bả vai xuyên suốt hiệp để tạo nền tảng vững.', 'Giữ khuỷu tay tạo góc 45–75° với thân người.', 'Hạ tạ 2–3 giây có kiểm soát, không nảy thanh khỏi ngực.'];
const mistakes = ['Nhấc mông khỏi ghế hoặc để chân mất điểm tựa.', 'Bẻ cổ tay ra sau khiến lực dồn lên khớp cổ tay.', 'Hạ thanh quá cao lên cổ hoặc quá thấp về bụng.'];

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`card corner-screws p-5 ${className}`}>{children}</section>;
}

function PanelTitle({ icon: Icon, children }: { icon: typeof Info; children: React.ReactNode }) {
  return <h2 className="flex items-center gap-2 border-b border-chassis-lo pb-3 font-mono text-xs font-bold uppercase tracking-wider text-ink"><Icon className="h-4 w-4 text-accent" strokeWidth={1.5} />{children}</h2>;
}

function StaticPerformanceChart() {
  const values = [60, 62.5, 65, 65, 67.5, 70];
  const labels = ['12/07', '19/07', '26/07', '02/08', '09/08', 'Hôm nay'];
  const min = 57.5, max = 75, baseline = 136;
  const coords = values.map((value, index) => ({ x: 42 + index * 56, y: 126 - ((value - min) / (max - min)) * 92 }));
  const line = coords.map(({ x, y }) => `${x},${y}`).join(' ');
  const area = `M ${coords[0].x} ${baseline} L ${line.replaceAll(',', ' ')} L ${coords.at(-1)!.x} ${baseline} Z`;

  return <div className="mt-4 overflow-hidden rounded-xl bg-chassis shadow-inset">
    <div className="flex items-center justify-between border-b border-chassis-lo px-4 py-3"><div><p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">Mức tạ theo buổi tập</p><p className="mt-0.5 text-xs text-ink-secondary">6 buổi gần nhất</p></div><div className="rounded-lg bg-accent/10 px-2.5 py-1 text-right"><p className="font-mono text-[9px] font-bold uppercase text-accent-muted">Tăng trưởng</p><p className="text-sm font-extrabold text-accent">+10 kg</p></div></div>
    <div className="px-3 pb-2 pt-3"><svg viewBox="0 0 340 166" className="h-auto w-full" role="img" aria-label="Biểu đồ mức tạ Bench Press tăng từ 60 lên 70 kg">
      <defs><linearGradient id="performance-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity=".32"/><stop offset="100%" stopColor="#f97316" stopOpacity=".02"/></linearGradient><filter id="performance-glow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      {[36, 66, 96, 126].map((y, index) => <g key={y}><line x1="38" x2="330" y1={y} y2={y} stroke="#c7d0da" strokeDasharray="3 4"/><text x="3" y={y + 4} fill="#8896a5" fontSize="9">{75 - index * 5}</text></g>)}
      <line x1="38" x2="330" y1="51" y2="51" stroke="#f97316" strokeDasharray="5 4" strokeOpacity=".55"/><text x="330" y="46" textAnchor="end" fill="#ea580c" fontSize="9" fontWeight="700">Mục tiêu 72.5</text>
      <path d={area} fill="url(#performance-fill)"/><polyline points={line} fill="none" stroke="#f97316" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#performance-glow)"/>
      {coords.map(({ x, y }, index) => <g key={labels[index]}><circle cx={x} cy={y} r={index === coords.length - 1 ? '7' : '5'} fill="#fff" stroke="#f97316" strokeWidth={index === coords.length - 1 ? '4' : '3'}/><text x={x} y="155" textAnchor="middle" fill="#8896a5" fontSize="8">{labels[index]}</text>{index === coords.length - 1 && <g><rect x={x - 26} y={y - 31} width="52" height="19" rx="5" fill="#f97316"/><text x={x} y={y - 18} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">70 kg</text></g>}</g>)}
    </svg></div>
  </div>;
}

export default function ExerciseDetailPage() {
  return <main className="min-h-screen bg-chassis blueprint-grid">
    <div className="mx-auto max-w-6xl px-4 pt-4">
      <div className="card p-3 mb-4 flex items-center gap-3 border-2 border-warn/40">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-warn">
          @deprecated
        </span>
        <p className="text-xs text-ink-secondary">
          Trang demo chỉ dùng để so sánh thiết kế. Trang chính đã chuyển sang{' '}
          <Link href="/exercises" className="text-accent underline">/exercises</Link>.
        </p>
      </div>
    </div>
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6">
      <Link href="/exercises" className="mb-5 inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-ink-muted transition-colors hover:text-accent"><ArrowLeft className="h-4 w-4" />Thư viện bài tập</Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div><div className="mb-1 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]"/><span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">Chi tiết bài tập</span></div><h1 className="text-3xl font-extrabold tracking-tight text-ink">Đẩy ngực với thanh đòn</h1><p className="mt-0.5 font-mono text-sm font-medium text-ink-secondary">Bench Press</p><div className="mt-3 flex flex-wrap gap-2">{['Ngực','Đa khớp','Thanh đòn','Trung cấp'].map(tag=><span key={tag} className="chip cursor-default text-[10px]">{tag}</span>)}</div></div>
        <button className="btn-primary fixed inset-x-4 bottom-4 z-30 justify-center md:static md:inset-auto md:z-auto"><Plus className="h-4 w-4"/>Thêm vào buổi tập</button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
        <div className="space-y-5">
          <Panel className="p-3"><div className="relative h-56 overflow-hidden rounded-md bg-ink sm:h-64"><Image src="/exercises/demo/bench-press-main.jpg" alt="Barbell bench press" fill priority className="object-cover"/><div className="absolute left-3 top-3 flex rounded-lg bg-ink/80 p-1 text-[10px] font-bold text-white"><span className="rounded bg-accent px-2 py-1">HÌNH ẢNH</span><span className="px-2 py-1 text-slate-300">VIDEO</span><span className="px-2 py-1 text-slate-300">CƠ HOẠT ĐỘNG</span></div><div className="absolute inset-x-0 bottom-0 bg-ink/75 px-4 py-3 text-sm font-medium text-white">Tư thế chuẩn: bả vai cố định, chân đạp chắc sàn</div></div><div className="mt-3 flex gap-2">{['main','side','top'].map((view, index) => <div key={view} className={`relative h-12 w-20 overflow-hidden rounded border-2 ${index === 0 ? 'border-accent' : 'border-chassis-lo'}`}><Image src={`/exercises/demo/bench-press-${view}.jpg`} alt={`Góc nhìn ${index + 1}`} fill className="object-cover"/></div>)}</div></Panel>
          <Panel><PanelTitle icon={Target}>Mục tiêu bài tập</PanelTitle><p className="mt-4 max-w-2xl text-sm leading-7 text-ink-secondary">Bench Press phát triển sức mạnh đẩy ngang và khối lượng cơ ngực. Phù hợp đặt ở đầu buổi thân trên khi cơ thể còn nhiều năng lượng.</p></Panel>
          <Panel><PanelTitle icon={PlayCircle}>Cách thực hiện</PanelTitle><ol className="mt-3">{steps.map((step,index)=><li key={step} className="flex gap-3 border-b border-chassis-lo py-3 last:border-0"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent font-mono text-xs font-bold text-white shadow-accent">{String(index+1).padStart(2,'0')}</span><p className="pt-1 text-sm leading-6 text-ink-secondary">{step}</p></li>)}</ol></Panel>
          <VideoGuide />
          <div className="grid gap-5 md:grid-cols-2"><Panel><PanelTitle icon={Lightbulb}>Mẹo kỹ thuật</PanelTitle><ul className="mt-3 space-y-3">{tips.map(tip=><li key={tip} className="flex gap-2 text-sm leading-6 text-ink-secondary"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success"/>{tip}</li>)}</ul></Panel><Panel><PanelTitle icon={ShieldAlert}>Lỗi thường gặp</PanelTitle><ul className="mt-3 space-y-3">{mistakes.map(mistake=><li key={mistake} className="flex gap-2 text-sm leading-6 text-ink-secondary"><ShieldAlert className="mt-1 h-4 w-4 shrink-0 text-warn"/>{mistake}</li>)}</ul></Panel></div>
        </div>
        <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
          <Panel><PanelTitle icon={Info}>Thông số & thiết lập</PanelTitle><dl className="mt-2">{[['Nhóm cơ chính','Ngực'],['Nhóm cơ phụ','Tay sau, Vai trước'],['Dụng cụ','Thanh đòn, Ghế phẳng'],['Số hiệp','3–4'],['Số lần','6–10'],['RIR','1–3'],['Nghỉ','120–180 giây'],['Tempo','3–0–1–0']].map(([label,value])=><div key={label} className="flex justify-between gap-3 border-b border-chassis-lo py-2.5 last:border-0"><dt className="font-mono text-[10px] font-bold uppercase tracking-wide text-ink-secondary">{label}</dt><dd className="text-right text-xs font-semibold text-ink">{value}</dd></div>)}</dl></Panel>
          <Panel><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-accent"/><p className="font-mono text-xs font-bold uppercase tracking-wider text-ink">AI Coach đề xuất</p></div><p className="mt-3 text-sm font-semibold leading-6 text-ink">Buổi tiếp theo: Bench Press 72.5 kg · 4×6–8 · RIR 1–2</p><p className="mt-2 text-xs leading-5 text-ink-secondary">Đề xuất chỉ được áp dụng sau khi bạn xác nhận.</p><button className="btn-primary mt-4 w-full text-xs">Áp dụng cho buổi tiếp theo</button></Panel>
          <Panel><PanelTitle icon={Clock3}>Lưu ý an toàn</PanelTitle><p className="mt-3 text-sm leading-6 text-ink-secondary">Khởi động 2–3 hiệp nhẹ. Dùng spotter khi tập gần mức tối đa.</p></Panel>
        </aside>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2"><Panel><PanelTitle icon={TrendingUp}>Hiệu suất gần đây</PanelTitle><div className="mt-4 grid grid-cols-3 gap-2">{[['Mức tạ','70 kg'],['Số lần/hiệp','6–10'],['1RM ước tính','85 kg']].map(([label,value])=><div key={label} className="rounded-lg bg-chassis p-3 text-center shadow-inset"><p className="font-mono text-[9px] font-bold uppercase text-ink-muted">{label}</p><p className="mt-1 font-bold text-accent">{value}</p></div>)}</div><PerformanceChart /></Panel><Panel><PanelTitle icon={Dumbbell}>Bài thay thế</PanelTitle><div className="mt-4 grid grid-cols-3 gap-3">{[['side','Đẩy ngực với tạ đôi nghiêng'],['top','Đẩy ngực với máy'],['main','Hít đất']].map(([image,name])=><article key={name} className="rounded-lg bg-chassis p-2 shadow-neumorph-sm"><div className="relative aspect-[4/3] overflow-hidden rounded-md"><Image src={`/exercises/demo/bench-press-${image}.jpg`} alt={name} fill className="object-cover"/></div><p className="mt-2 text-xs font-bold text-ink">{name}</p><span className="font-mono text-[9px] uppercase text-ink-muted">Bài thay thế</span></article>)}</div></Panel></div>
    </div>
  </main>;
}
