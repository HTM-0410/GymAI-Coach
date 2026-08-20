import Link from 'next/link';
import { Activity, Dumbbell, Brain, ClipboardList, TrendingUp, User, Zap, Shield, BarChart3 } from 'lucide-react';

const features = [
  { icon: <Dumbbell className="h-6 w-6" strokeWidth={1.5} />, title: 'Quản lý bài tập', desc: 'Xem, copy, tạo exercise cá nhân', href: '/exercises' },
  { icon: <ClipboardList className="h-6 w-6" strokeWidth={1.5} />, title: 'Gym & Thiết bị', desc: 'Quản lý phòng gym và equipment', href: '/gyms' },
  { icon: <Brain className="h-6 w-6" strokeWidth={1.5} />, title: 'AI Coach', desc: 'Tạo buổi tập cá nhân hoá', href: '/workouts/new' },
  { icon: <Activity className="h-6 w-6" strokeWidth={1.5} />, title: 'Workout Logger', desc: 'Ghi log nhanh trong buổi tập', href: '/workouts' },
  { icon: <TrendingUp className="h-6 w-6" strokeWidth={1.5} />, title: 'Tiến bộ', desc: 'Phân tích volume, PR, biểu đồ', href: '/progress' },
  { icon: <User className="h-6 w-6" strokeWidth={1.5} />, title: 'Hồ sơ', desc: 'Thông tin cá nhân, cân nặng', href: '/profile' },
];

const steps = [
  { num: '01', label: 'Đăng ký tài khoản', icon: <User className="h-4 w-4" strokeWidth={1.5} /> },
  { num: '02', label: 'Hoàn thành hồ sơ', icon: <Activity className="h-4 w-4" strokeWidth={1.5} /> },
  { num: '03', label: 'Tạo AI Workout', icon: <Brain className="h-4 w-4" strokeWidth={1.5} /> },
  { num: '04', label: 'Ghi log buổi tập', icon: <BarChart3 className="h-4 w-4" strokeWidth={1.5} /> },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      {/* ── HEADER / HERO ── */}
      <header className="relative overflow-hidden">
        {/* Dark accent strip */}
        <div className="bg-ink w-full">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-9 w-9 rounded-lg bg-chassis shadow-neumorph-sm flex items-center justify-center">
                  <Activity className="h-5 w-5 text-accent" strokeWidth={1.5} />
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_6px_rgba(34,197,94,0.8)] led-pulse" />
                </div>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-chassis-lo leading-none">GymAI</p>
                <p className="font-mono text-[10px] text-chassis-lo/50 uppercase tracking-wider leading-none mt-0.5">Coach System v2.0</p>
              </div>
            </div>
            {/* Status LEDs */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_6px_rgba(34,197,94,0.8)] led-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-chassis-lo">System Online</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_6px_rgba(34,197,94,0.8)] led-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-chassis-lo">AI Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-20">
          <div className="max-w-3xl">
            {/* System label */}
            <div className="inline-flex items-center gap-2 bg-chassis shadow-neumorph-sm rounded-full px-4 py-1.5 mb-6">
              <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.8)] led-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-secondary">
                AI Personal Trainer System
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-ink
                            tracking-tight leading-none mb-6
                            drop-shadow-[0_1px_0_#ffffff]">
              GymAI Coach
            </h1>

            <p className="text-xl md:text-2xl text-ink-secondary leading-relaxed max-w-xl mb-4">
              Hệ thống AI Personal Trainer —
              lập kế hoạch, tập luyện, ghi lại,
              phân tích, điều chỉnh.
            </p>
            <p className="font-mono text-sm text-ink-muted uppercase tracking-wider mb-10">
              v2.0 · MVP Phase 1
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-4">
              <Link href="/auth/register" className="btn-primary text-base px-8 py-3.5">
                Khởi động ngay
              </Link>
              <Link href="/auth/login" className="btn-ghost text-base px-8 py-3.5">
                Đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── FEATURE GRID ── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {features.map((f) => (
            <Link key={f.href} href={f.href}
              className="card group p-6 flex flex-col gap-4 hover:-translate-y-1 transition-all duration-300">
              {/* Icon housing */}
              <div className="h-14 w-14 rounded-xl bg-chassis shadow-neumorph-sm
                              flex items-center justify-center
                              group-hover:shadow-neumorph group-hover:text-accent transition-all duration-200">
                <div className="text-ink group-hover:text-accent transition-colors">
                  {f.icon}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-ink text-base mb-1">{f.title}</h3>
                <p className="text-sm text-ink-secondary leading-relaxed">{f.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── GETTING STARTED (Dark Panel) ── */}
      <section className="bg-ink">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Left: steps */}
            <div>
              <div className="flex items-center gap-2 mb-8">
                <Zap className="h-5 w-5 text-accent" strokeWidth={1.5} />
                <span className="font-mono text-[10px] uppercase tracking-widest text-chassis-lo/60">
                  Hướng dẫn
                </span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-10 drop-shadow-[0_1px_0_rgba(255,255,255,0.2)]">
                Bắt đầu trong 4 bước
              </h2>
              <ol className="space-y-4">
                {steps.map((s) => (
                  <li key={s.num} className="flex items-center gap-4">
                    {/* Step number */}
                    <div className="h-10 w-10 rounded-lg bg-chassis shadow-neumorph-sm flex items-center justify-center flex-shrink-0">
                      <span className="font-mono text-xs font-bold text-accent">{s.num}</span>
                    </div>
                    <span className="font-mono text-sm text-chassis-lo">{s.label}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Right: quick-start card */}
            <div className="card shadow-neumorph-lg p-8">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="h-4 w-4 text-accent" strokeWidth={1.5} />
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                  Tính năng chính
                </span>
              </div>
              <ul className="space-y-4">
                {[
                  'Tạo buổi tập cá nhân với AI',
                  'Ghi log set/rep/weight real-time',
                  'Theo dõi tiến bộ & PR',
                  'Báo cáo tuần tự động',
                  'Chat AI Coach 24/7',
                  'Marketplace chương trình tập',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent mt-2 flex-shrink-0 shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
                    <span className="text-sm text-ink font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 pt-6 border-t border-chassis-lo">
                <Link href="/auth/register" className="btn-primary w-full text-center">
                  Đăng ký miễn phí
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-chassis border-t border-chassis-lo py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" strokeWidth={1.5} />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">GymAI Coach</span>
          </div>
          <p className="font-mono text-[10px] text-ink-muted uppercase tracking-wider">
            Hệ thống vận hành 24/7 · Phiên bản 2.0
          </p>
        </div>
      </footer>
    </main>
  );
}
