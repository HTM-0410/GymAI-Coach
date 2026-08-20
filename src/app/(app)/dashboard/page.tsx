import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  Dumbbell, Brain, Activity, Calendar, Scale, ChevronRight,
  Zap, TrendingUp, Target, MessageCircle,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

const quickLinks = [
  { href: '/exercises',       title: 'Quản lý bài tập', desc: 'Xem, copy, tạo exercise cá nhân',    icon: <Dumbbell     className="h-4 w-4" strokeWidth={1.35} /> },
  { href: '/gyms',           title: 'Phòng gym của tôi', desc: 'Quản lý thiết bị cho mỗi gym',       icon: <Target       className="h-4 w-4" strokeWidth={1.35} /> },
  { href: '/programs',       title: 'Chương trình tập',  desc: 'Chọn Upper/Lower, PPL, Full Body…',  icon: <Calendar    className="h-4 w-4" strokeWidth={1.35} /> },
  { href: '/recommendations', title: 'Đề xuất AI',       desc: 'Tăng tạ, deload, plateau',            icon: <Zap         className="h-4 w-4" strokeWidth={1.35} /> },
  { href: '/weekly',         title: 'Báo cáo tuần',      desc: 'AI phân tích 7 ngày qua',             icon: <TrendingUp  className="h-4 w-4" strokeWidth={1.35} /> },
  { href: '/coach',          title: 'Chat với AI Coach', desc: 'Hỏi form, plateau, deload',           icon: <MessageCircle className="h-4 w-4" strokeWidth={1.35} /> },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const today = new Date().toISOString().slice(0, 10);

  const [profileRes, programRes, todayWorkoutsRes, recentWeightRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('user_programs').select('id, is_active, training_programs(name,name_vi)').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
    supabase.from('workouts').select('id, status, date').eq('user_id', user.id).eq('date', today),
    supabase.from('body_weight_logs').select('weight_kg, recorded_date').eq('user_id', user.id).order('recorded_date', { ascending: false }).limit(1),
  ]);

  const profile = profileRes.data as any;
  const activeProgram = programRes.data as any;
  const todayWorkouts: { id: string; status: string; date: string }[] = (todayWorkoutsRes.data as any) ?? [];
  const latestWeight = (recentWeightRes.data as any)?.[0];
  const todayWorkout = todayWorkouts.find((w) => w.status !== 'completed') ?? todayWorkouts[0];
  const completedToday = todayWorkouts.filter((w) => w.status === 'completed').length;

  const dateStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-24 space-y-6">

        {/* ── HEADER ── */}
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <BrandLogo size="lg" className="hidden sm:flex" />
            <div>
              {/* System label */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.9)] led-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">
                  Dashboard — {dateStr}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-none">
                Chào, <span className="text-accent">{profile?.display_name ?? 'bạn'}</span>
              </h1>
            </div>
          </div>
          {/* Status panel */}
          <div className="hidden sm:flex flex-col gap-1 bg-chassis border border-white/80 dark:border-white/10 shadow-neumorph-sm rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.9)] led-pulse" />
              <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted font-bold">Trạng thái máy</span>
            </div>
            <div className="font-mono text-sm text-ink font-extrabold">
              {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </header>

        {/* ── TODAY WORKOUT HERO CARD (Laser Border) ── */}
        <section className="relative p-[1px] rounded-2xl laser-border-box group">
          <div className="laser-border-box-inner card shadow-neumorph p-6 border-l-[6px] border-accent border-t border-r border-b border-white/80 dark:border-white/10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="h-6 w-6 rounded-lg bg-accent/15 flex items-center justify-center border border-accent/30 text-accent">
                    <Activity className="h-3.5 w-3.5" strokeWidth={2} />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-accent font-bold">
                    Buổi tập hôm nay
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-success led-pulse ml-1" />
                </div>
                {todayWorkout ? (
                  <>
                    <h2 className="text-xl font-bold text-ink capitalize tracking-tight">
                      {todayWorkout.status.replace('_', ' ')}
                    </h2>
                    <p className="text-sm text-ink-secondary mt-1 font-medium">Buổi tập đã sẵn sàng — mở để tập ngay.</p>
                  </>
                ) : activeProgram ? (
                  <>
                    <h2 className="text-xl font-bold text-ink tracking-tight">Đã sẵn sàng buổi tiếp theo chưa?</h2>
                    <p className="text-sm text-ink-secondary mt-1 font-medium">
                      Chương trình:{' '}
                      <span className="font-bold text-ink">
                        {(activeProgram.training_programs as any)?.name_vi ?? (activeProgram.training_programs as any)?.name}
                      </span>
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-ink tracking-tight">Chưa kích hoạt chương trình</h2>
                    <p className="text-sm text-ink-secondary mt-1 font-medium">Chọn một giáo án để AI bắt đầu tối ưu lịch tập.</p>
                  </>
                )}
              </div>
              <Link
                href={activeProgram ? '/workouts/new' : '/programs'}
                className="btn-primary shrink-0 flex items-center gap-2 text-sm shadow-accent-lg group-hover:scale-105 transition-transform"
              >
                <Brain className="h-4 w-4" strokeWidth={2} />
                {todayWorkout ? 'Mở buổi tập' : 'Tạo với AI'}
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── STATS TILES (Animated Shimmer) ── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatTile
            icon={<Dumbbell className="h-4 w-4 text-accent" strokeWidth={1.4} />}
            label="Hoàn thành hôm nay"
            value={completedToday.toString()}
          />
          <StatTile
            icon={<Calendar className="h-4 w-4 text-accent" strokeWidth={1.4} />}
            label="Chương trình"
            value={activeProgram ? 'Active' : '—'}
          />
          <StatTile
            icon={<Scale className="h-4 w-4 text-accent" strokeWidth={1.4} />}
            label="Cân nặng gần nhất"
            value={latestWeight ? `${latestWeight.weight_kg} kg` : '—'}
          />
          <StatTile
            icon={<Zap className="h-4 w-4 text-accent" strokeWidth={1.4} />}
            label="Chuỗi tập liên tục"
            value="—"
          />
        </section>

        {/* ── QUICK LINKS (Cybernetic Glass) ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">
                Bảng điều khiển nhanh
              </span>
            </div>
            <span className="font-mono text-[9px] text-ink-muted">SYSTEM READY</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {quickLinks.map((q) => (
              <Link key={q.href} href={q.href}
                className="card group p-3.5 flex items-center gap-3.5 hover:-translate-y-1 hover:border-accent/40 transition-all duration-300 border border-white/80 dark:border-white/10 shadow-neumorph-sm hover:shadow-neumorph rounded-xl relative overflow-hidden">
                {/* Accent glow on hover */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/15 transition-all pointer-events-none" />
                
                {/* Icon */}
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-chassis-hi to-chassis-lo shadow-neumorph-sm border border-white/80 dark:border-white/10
                                flex items-center justify-center shrink-0
                                group-hover:scale-105 group-hover:border-accent/30 transition-all duration-200">
                  <div className="text-ink-secondary group-hover:text-accent transition-colors">
                    {q.icon}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-ink text-sm tracking-tight group-hover:text-accent transition-colors">{q.title}</h3>
                  <p className="text-xs text-ink-secondary mt-0.5 leading-relaxed font-medium">{q.desc}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-ink-muted group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" strokeWidth={1.5} />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card shadow-neumorph-sm rounded-xl p-3.5 border border-white/80 dark:border-white/10 hover:-translate-y-1 hover:border-accent/30 transition-all group animate-shimmer relative overflow-hidden">
      <div className="flex items-center justify-between mb-2.5">
        <div className="h-7.5 w-7.5 rounded-lg bg-gradient-to-br from-chassis-hi to-chassis-lo shadow-neumorph-sm flex items-center justify-center border border-white/70 dark:border-white/10 group-hover:scale-105 transition-transform">
          {icon}
        </div>
        <span className="h-1 w-1 rounded-full bg-accent/40 group-hover:bg-accent group-hover:scale-125 transition-all" />
      </div>
      <div className="font-mono text-xl font-extrabold text-ink leading-none mb-1 tracking-tight group-hover:text-accent transition-colors">{value}</div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-ink-muted leading-tight font-bold">{label}</div>
    </div>
  );
}
