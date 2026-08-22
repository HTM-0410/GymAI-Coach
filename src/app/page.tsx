import Link from 'next/link';
import { Activity, Dumbbell, Brain, ClipboardList, TrendingUp, User, Zap, Shield, BarChart3 } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';

const features = [
  { icon: <Dumbbell className="h-6 w-6" strokeWidth={1.5} />, title: 'Quản lý bài tập', desc: 'Xem, copy, tạo exercise cá nhân', href: '/exercises' },
  { icon: <ClipboardList className="h-6 w-6" strokeWidth={1.5} />, title: 'Gym & Thiết bị', desc: 'Quản lý phòng gym và equipment', href: '/gyms' },
  { icon: <Brain className="h-6 w-6" strokeWidth={1.5} />, title: 'AI Coach', desc: 'Tạo buổi tập cá nhân hoá', href: '/workouts/new' },
  { icon: <Activity className="h-6 w-6" strokeWidth={1.5} />, title: 'Workout Logger', desc: 'Ghi log nhanh trong buổi tập', href: '/workouts' },
  { icon: <TrendingUp className="h-6 w-6" strokeWidth={1.5} />, title: 'Tiến bộ', desc: 'Phân tích volume, PR, biểu đồ', href: '/progress' },
  { icon: <User className="h-6 w-6" strokeWidth={1.5} />, title: 'Hồ sơ', desc: 'Thông tin cá nhân, cân nặng', href: '/profile' },
];

const steps = [
  { num: '01', label: 'Đăng ký tài khoản' },
  { num: '02', label: 'Hoàn thành hồ sơ' },
  { num: '03', label: 'Tạo AI Workout' },
  { num: '04', label: 'Ghi log buổi tập' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      {/* ── HEADER / HERO ── */}
      <header className="relative overflow-hidden">
        {/* Modern Cyber-Industrial Header Bar */}
        <div className="w-full bg-chassis-hi/80 dark:bg-[#0c1017]/90 backdrop-blur-md border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo size="md" showText={true} />
            </div>

            {/* Status LEDs & Theme/Auth Actions */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="hidden md:flex items-center gap-4 border-r border-black/[0.06] dark:border-white/[0.08] pr-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_6px_rgba(34,197,94,0.8)] led-pulse" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-semibold">System Online</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_6px_rgba(34,197,94,0.8)] led-pulse" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-semibold">AI Active</span>
                </div>
              </div>

              <ThemeToggle />

              <Link
                href="/auth/login"
                className="hidden sm:inline-flex btn-ghost text-xs px-3.5 py-1.5 border border-black/[0.06] dark:border-white/[0.1]"
              >
                Đăng nhập
              </Link>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className="max-w-6xl mx-auto px-6 pt-14 pb-20">
          <div className="max-w-3xl">
            {/* System label */}
            <div className="inline-flex items-center gap-2 bg-chassis-hi/90 dark:bg-[#151c28] border border-black/[0.06] dark:border-white/[0.08] shadow-neumorph-sm rounded-full px-4 py-1.5 mb-6">
              <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.8)] led-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-secondary font-semibold">
                AI Personal Trainer System
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-ink tracking-tight leading-none mb-6">
              GymAI Coach
            </h1>

            <p className="text-xl md:text-2xl text-ink-secondary leading-relaxed max-w-xl mb-4 font-medium">
              Hệ thống AI Personal Trainer -
              lập kế hoạch, tập luyện, ghi lại,
              phân tích, điều chỉnh.
            </p>
            <p className="font-mono text-sm text-ink-muted uppercase tracking-wider mb-10">
              v2.0 · MVP Phase 1
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-4">
              <Link href="/auth/register" className="btn-primary text-base px-8 py-3.5 shadow-accent">
                Khởi động ngay
              </Link>
              <Link href="/auth/login" className="btn-ghost text-base px-8 py-3.5 border border-black/[0.06] dark:border-white/[0.1]">
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
            <Link
              key={f.href}
              href={f.href}
              className="card group p-6 flex flex-col gap-4 hover:-translate-y-1 transition-all duration-300 border border-white/80 dark:border-white/10 hover:border-accent/40 shadow-neumorph-sm hover:shadow-neumorph"
            >
              {/* Icon housing */}
              <div className="h-14 w-14 rounded-xl bg-chassis border border-black/[0.04] dark:border-white/[0.08] shadow-neumorph-sm
                              flex items-center justify-center
                              group-hover:shadow-neumorph group-hover:text-accent transition-all duration-200">
                <div className="text-ink group-hover:text-accent transition-colors">
                  {f.icon}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-ink text-base mb-1 group-hover:text-accent transition-colors">{f.title}</h3>
                <p className="text-sm text-ink-secondary leading-relaxed">{f.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── GETTING STARTED (Tactical Dark Panel) ── */}
      <section className="bg-[#121824] dark:bg-[#090d14] text-white border-y border-black/[0.08] dark:border-white/[0.08] relative overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:24px_24px] opacity-5 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 py-16 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: steps */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Zap className="h-5 w-5 text-accent" strokeWidth={2} />
                <span className="font-mono text-[10px] uppercase tracking-widest text-accent font-bold">
                  Quy trình sử dụng
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-8 tracking-tight">
                Bắt đầu trong 4 bước
              </h2>
              <ol className="space-y-4">
                {steps.map((s) => (
                  <li key={s.num} className="flex items-center gap-4 group">
                    {/* Step number */}
                    <div className="h-11 w-11 rounded-xl bg-white/[0.06] dark:bg-white/[0.04] border border-white/10 shadow-sm flex items-center justify-center flex-shrink-0 group-hover:border-accent/50 group-hover:bg-accent/10 transition-all">
                      <span className="font-mono text-sm font-bold text-accent">{s.num}</span>
                    </div>
                    <span className="font-mono text-sm sm:text-base text-slate-200 font-medium">{s.label}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Right: quick-start card */}
            <div className="bg-white/[0.04] dark:bg-white/[0.02] backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="h-4 w-4 text-accent" strokeWidth={2} />
                <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                  Tính năng vượt trội
                </span>
              </div>
              <ul className="space-y-3.5">
                {[
                  'Tạo buổi tập cá nhân hoá với AI Coach',
                  'Ghi log set, rep, weight chuẩn xác thời gian thực',
                  'Theo dõi tiến bộ, 1RM và kỷ lục cá nhân (PR)',
                  'Báo cáo phân tích khối lượng tập tuần tự động',
                  'Tương tác hỏi đáp AI Coach 24/7',
                  'Khám phá kho giáo án và chương trình chuẩn khoa học',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                    <span className="text-sm text-slate-200 font-medium leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 pt-6 border-t border-white/10">
                <Link href="/auth/register" className="btn-primary w-full text-center text-sm py-3.5 font-bold shadow-accent">
                  Đăng ký miễn phí ngay
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-chassis border-t border-black/[0.06] dark:border-white/[0.08] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="sm" showText={true} />
          </div>
          <p className="font-mono text-[10px] text-ink-muted uppercase tracking-wider">
            Hệ thống AI Personal Trainer vận hành 24/7 · Phiên bản 2.0
          </p>
        </div>
      </footer>
    </main>
  );
}
