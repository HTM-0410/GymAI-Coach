import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  Calendar,
  ChevronLeft,
  Clock,
  Dumbbell,
  Activity,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { fetchProgramDetail } from '@/lib/programs/data';
import { DAY_OF_WEEK_LABELS_VI } from '@/lib/programs/types';
import ProgramDaysViewer from '@/components/programs/program-days-viewer';
import { getSessionName } from '@/lib/programs/utils';

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const detail = await fetchProgramDetail(id);
  if (!detail) notFound();

  // Active program id
  let activeId: string | null = null;
  if (user) {
    const { data } = await supabase
      .from('user_programs')
      .select('program_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    activeId = data?.program_id ?? null;
  }

  const isActive = activeId === detail.id;

  const totalExercises = detail.days.reduce((s, d) => s + d.exercises.length, 0);
  const totalSets = detail.days.reduce(
    (s, d) => s + d.exercises.reduce((ss, e) => ss + e.target_sets, 0),
    0,
  );

  async function activateProgram() {
    'use server';
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_programs').update({ is_active: false }).eq('user_id', user.id);
    await supabase.from('user_programs').insert({
      user_id: user.id,
      program_id: id,
      is_active: true,
    });
    redirect(`/programs/${id}`);
  }

  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-28">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <Link
            href="/programs"
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-ink-muted hover:text-accent transition-colors bg-chassis-hi/60 px-3 py-1.5 rounded-lg border border-black/[0.05] dark:border-white/10 shadow-neumorph-sm"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
            Tất cả chương trình
          </Link>

          {isActive ? (
            <div className="flex items-center gap-1.5 bg-success/15 border border-success/30 px-3 py-1 rounded-full shadow-[0_0_12px_rgba(34,197,94,0.2)]">
              <span className="h-2 w-2 rounded-full bg-success led-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-success font-bold">
                Giáo án đang kích hoạt
              </span>
            </div>
          ) : (
            <form action={activateProgram}>
              <button className="btn-primary text-xs py-1.5 px-4 rounded-lg font-bold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Kích hoạt ngay
              </button>
            </form>
          )}
        </div>

        {/* Hero Card */}
        <header className="card shadow-neumorph rounded-3xl p-6 sm:p-8 mb-8 border border-white/80 dark:border-white/10 relative overflow-hidden">
          {/* Background Ambient Glow */}
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-accent font-extrabold">
              Giáo Án Huấn Luyện Chuẩn
            </span>
            <span className="text-ink-muted font-mono text-[10px]">•</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              {detail.type === 'system' ? 'System Template' : 'Custom'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-ink tracking-tight mb-3">
            {detail.name || detail.name_vi}
          </h1>

          {detail.description && (
            <p className="text-sm sm:text-base text-ink-secondary leading-relaxed max-w-3xl font-medium">
              {detail.description}
            </p>
          )}

          {/* Stats Overview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-black/[0.05] dark:border-white/10">
            <StatCard
              icon={Calendar}
              label="Tần suất"
              value={`${detail.days.length} buổi / tuần`}
              sub="Phân bổ khoa học"
            />
            <StatCard
              icon={Dumbbell}
              label="Bài tập tuần"
              value={`${totalExercises} bài tập`}
              sub="Compound + Isolation"
            />
            <StatCard
              icon={Activity}
              label="Volume tuần"
              value={`${totalSets} sets`}
              sub="Tối ưu kích thích cơ"
            />
            <StatCard
              icon={Clock}
              label="Chu kỳ"
              value={detail.duration_weeks ? `${detail.duration_weeks} tuần` : 'Liên tục'}
              sub="1 Meso cycle"
            />
          </div>

          {/* Weekly Schedule Strip */}
          {detail.days.length > 0 && (
            <div className="mt-6 pt-6 border-t border-black/[0.05] dark:border-white/10">
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">
                  Phân bố lịch tập 7 ngày
                </span>
                <span className="text-[10px] font-mono text-accent">
                  {detail.days.length} ngày tập · {7 - detail.days.length} ngày nghỉ
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                  const matchingDay = detail.days.find((day) => day.day_of_week === d);
                  return (
                    <div
                      key={d}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                        matchingDay
                          ? 'bg-accent/10 dark:bg-accent/15 border-accent/30 dark:border-accent/40 shadow-xs'
                          : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.06]'
                      }`}
                    >
                      <span
                        className={`font-mono text-[11px] font-extrabold uppercase ${
                          matchingDay ? 'text-accent' : 'text-ink-muted/50'
                        }`}
                      >
                        {DAY_OF_WEEK_LABELS_VI[d]}
                      </span>
                      <span
                        className={`text-[9px] font-mono mt-0.5 truncate w-full px-0.5 ${
                          matchingDay ? 'text-ink font-semibold' : 'text-ink-muted/40'
                        }`}
                      >
                        {matchingDay
                          ? getSessionName(matchingDay.name_vi, matchingDay.name)
                          : 'Nghỉ'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </header>

        {/* Workout Days Section with Interactive Tabs & Unobstructed Muscle Maps */}
        <ProgramDaysViewer days={detail.days} />

        {/* Bottom CTA Card */}
        <div className="mt-10 card shadow-neumorph rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/80 dark:border-white/10 bg-gradient-to-r from-chassis-hi to-chassis">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent-dim text-white flex items-center justify-center shadow-accent shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-ink">
                {isActive ? 'Bạn đang tập theo giáo án này' : 'Sẵn sàng chinh phục mục tiêu?'}
              </h4>
              <p className="text-xs text-ink-secondary mt-0.5 font-medium">
                {isActive
                  ? 'Hệ thống tự động đồng bộ bài tập vào Dashboard hàng ngày của bạn.'
                  : 'Kích hoạt ngay để lên lịch tập cá nhân hóa chuẩn theo giáo án này.'}
              </p>
            </div>
          </div>

          <form action={activateProgram} className="w-full sm:w-auto shrink-0">
            <button
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all shadow-neumorph-sm ${
                isActive
                  ? 'bg-success/15 border border-success/30 text-success cursor-default'
                  : 'btn-primary shadow-accent hover:scale-105'
              }`}
              disabled={isActive}
            >
              {isActive ? '✓ Đang kích hoạt' : 'Kích hoạt giáo án này ngay'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-gradient-to-br from-chassis-hi to-chassis-lo/60 shadow-neumorph-sm rounded-2xl p-4 border border-white/80 dark:border-white/10">
      <div className="flex items-center gap-1.5 text-ink-muted mb-1">
        <Icon className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
        <span className="font-mono text-[9px] uppercase tracking-widest font-bold">{label}</span>
      </div>
      <div className="text-base sm:text-lg font-extrabold text-ink font-mono tracking-tight">
        {value}
      </div>
      {sub && <div className="text-[10px] text-ink-muted mt-0.5 font-medium">{sub}</div>}
    </div>
  );
}
