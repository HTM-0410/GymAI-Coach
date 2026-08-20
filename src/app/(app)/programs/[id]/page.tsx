import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Layers,
  Target,
  Activity,
  Check,
  Flame,
  Zap,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Timer
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { fetchProgramDetail } from '@/lib/programs/data';
import { DAY_OF_WEEK_LABELS_VI } from '@/lib/programs/types';
import DayMuscleMap from '@/components/programs/day-muscle-map';

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
                  const isRest = !matchingDay;
                  return (
                    <div
                      key={d}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                        matchingDay
                          ? 'bg-gradient-to-b from-accent to-accent-dim text-white border-accent shadow-accent'
                          : 'bg-black/[0.03] dark:bg-white/[0.03] text-ink-muted border-black/[0.04] dark:border-white/[0.06]'
                      }`}
                    >
                      <span className="font-mono text-[11px] font-extrabold uppercase">
                        {DAY_OF_WEEK_LABELS_VI[d]}
                      </span>
                      <span
                        className={`text-[9px] font-mono mt-0.5 truncate w-full px-0.5 ${
                          matchingDay ? 'text-white/90 font-medium' : 'text-ink-muted/60'
                        }`}
                      >
                        {matchingDay ? matchingDay.name_vi?.split('—')[0]?.trim() || 'Tập' : 'Nghỉ'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </header>

        {/* Quick Day Navigator Tabs */}
        {detail.days.length > 1 && (
          <div className="sticky top-16 z-20 mb-6 py-2 bg-chassis/90 backdrop-blur-md -mx-4 px-4 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {detail.days.map((day, idx) => (
                <a
                  key={day.id}
                  href={`#day-${idx + 1}`}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono tracking-wider transition-all bg-gradient-to-br from-chassis-hi to-chassis-lo text-ink hover:text-accent border border-white/80 dark:border-white/10 shadow-neumorph-sm hover:shadow-neumorph flex items-center gap-1.5"
                >
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  <span>Buổi {idx + 1}: {day.name_vi?.split('—')[0]?.trim() || day.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Workout Days List */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent" strokeWidth={2} />
              <h2 className="text-lg font-extrabold text-ink tracking-tight">
                Cấu trúc các buổi tập chi tiết ({detail.days.length} buổi)
              </h2>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Chuẩn Volume & RIR
            </span>
          </div>

          {detail.days.length === 0 && (
            <div className="card shadow-neumorph-sm rounded-2xl p-8 text-center border border-white/80 dark:border-white/10">
              <p className="text-sm text-ink-muted">Chưa có buổi tập nào cho chương trình này.</p>
            </div>
          )}

          {detail.days.map((day, dayIdx) => {
            const dayTotalSets = day.exercises.reduce((s, e) => s + e.target_sets, 0);
            const estMinutes = Math.round(dayTotalSets * 2.8 + day.exercises.length * 1.5);

            return (
              <article
                key={day.id}
                id={`day-${dayIdx + 1}`}
                className="card shadow-neumorph rounded-3xl overflow-hidden border border-white/80 dark:border-white/10 transition-all duration-300 scroll-mt-28"
              >
                {/* Day Card Header */}
                <div className="p-5 sm:p-6 border-b border-black/[0.05] dark:border-white/10 bg-gradient-to-r from-chassis-hi/90 via-chassis to-chassis-lo/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex flex-col items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-accent to-accent-dim text-white shadow-accent shrink-0">
                        <span className="font-mono text-[9px] uppercase font-bold opacity-80 leading-none">
                          {DAY_OF_WEEK_LABELS_VI[day.day_of_week] ?? 'Day'}
                        </span>
                        <span className="font-mono text-sm font-extrabold leading-none mt-0.5">
                          {dayIdx + 1}
                        </span>
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-accent font-bold">
                            Buổi tập #{dayIdx + 1}
                          </span>
                          <span className="text-ink-muted font-mono text-[10px]">•</span>
                          <span className="font-mono text-[10px] text-ink-muted uppercase">
                            Thứ {DAY_OF_WEEK_LABELS_VI[day.day_of_week]}
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-ink tracking-tight">
                          {day.name_vi ?? day.name}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:self-start">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/10 font-mono text-[11px] font-bold text-ink">
                        <Dumbbell className="h-3 w-3 text-accent" />
                        {day.exercises.length} bài
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/10 font-mono text-[11px] font-bold text-ink">
                        <Flame className="h-3 w-3 text-accent" />
                        {dayTotalSets} sets
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/10 font-mono text-[11px] font-bold text-ink">
                        <Timer className="h-3 w-3 text-accent" />
                        ~{estMinutes}p
                      </span>
                    </div>
                  </div>
                </div>

                {/* Body Anatomy Silhouette & Target Muscles Visual Card */}
                <div className="p-5 sm:p-6 bg-black/[0.02] dark:bg-black/20 border-b border-black/[0.05] dark:border-white/10">
                  <DayMuscleMap
                    targetMuscles={day.target_muscles}
                    dayName={day.name_vi ?? day.name}
                  />
                </div>

                {/* Exercise List */}
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">
                        Danh sách bài tập ({day.exercises.length})
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-ink-muted uppercase">
                      Sets × Reps / RIR / Nghỉ
                    </span>
                  </div>

                  {day.exercises.length === 0 ? (
                    <div className="py-8 text-center text-xs text-ink-muted">
                      Buổi này chưa có bài tập chi tiết.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {day.exercises.map((pe, exIdx) => {
                        const isCompound =
                          pe.exercise.exercise_type === 'compound' ||
                          (!pe.exercise.exercise_type && exIdx < 2);

                        return (
                          <div
                            key={pe.id}
                            className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-br from-chassis-hi/60 to-chassis-lo/30 border border-black/[0.04] dark:border-white/10 hover:border-accent/40 shadow-neumorph-sm transition-all duration-200 hover:-translate-y-0.5"
                          >
                            {/* Left: Index & Exercise Details */}
                            <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] font-mono text-xs font-extrabold text-ink-muted group-hover:text-accent group-hover:bg-accent/10 transition-colors shrink-0">
                                {String(exIdx + 1).padStart(2, '0')}
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link
                                    href={`/exercises/${pe.exercise.slug}`}
                                    className="font-extrabold text-sm text-ink group-hover:text-accent transition-colors leading-tight hover:underline flex items-center gap-1"
                                  >
                                    <span>{pe.exercise.name_vi ?? pe.exercise.name}</span>
                                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-accent shrink-0" />
                                  </Link>

                                  {/* Compound / Isolation Tag */}
                                  <span
                                    className={`px-2 py-0.5 rounded-md font-mono text-[9px] uppercase tracking-wider font-bold ${
                                      isCompound
                                        ? 'bg-accent/15 text-accent border border-accent/20'
                                        : 'bg-black/5 dark:bg-white/10 text-ink-muted'
                                    }`}
                                  >
                                    {isCompound ? 'Compound' : 'Isolation'}
                                  </span>

                                  {pe.exercise.difficulty && (
                                    <span className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">
                                      {pe.exercise.difficulty}
                                    </span>
                                  )}
                                </div>

                                {pe.exercise.name_vi && (
                                  <p className="text-xs text-ink-muted font-medium truncate mt-0.5">
                                    {pe.exercise.name}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Right: Sets × Reps & Prescriptions */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/[0.04] dark:border-white/[0.06]">
                              {/* Volume badge */}
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-accent/[0.08] border border-accent/20 text-accent font-mono text-xs font-extrabold">
                                <span>{pe.target_sets} sets</span>
                                <span className="opacity-50">×</span>
                                <span>
                                  {pe.target_rep_min}
                                  {pe.target_rep_max !== pe.target_rep_min && `-${pe.target_rep_max}`} reps
                                </span>
                              </div>

                              {/* Prescriptions info */}
                              <div className="flex items-center gap-2 text-right">
                                {pe.target_rir !== null && (
                                  <span className="px-2 py-0.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] text-[10px] font-mono font-bold text-ink-secondary dark:text-ink uppercase tracking-wider">
                                    RIR {pe.target_rir}
                                  </span>
                                )}
                                {pe.rest_seconds && (
                                  <span className="px-2 py-0.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] text-[10px] font-mono text-ink-muted uppercase tracking-wider">
                                    {formatRest(pe.rest_seconds)} nghỉ
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        {/* Bottom CTA Sticky Card */}
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

function formatRest(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s ? `${m}m${s}s` : `${m}p`;
  }
  return `${seconds}s`;
}
