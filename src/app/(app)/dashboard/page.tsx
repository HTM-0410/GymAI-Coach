import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { resolveEffectiveTrainingPlan } from '@/lib/training/effective-plan';
import {
  Activity, ArrowRight, Award, Brain, CalendarDays, Check, ChevronRight,
  CircleDot, Dumbbell, Flame, Gauge, HeartPulse, History, Scale, Sparkles, Target, TrendingUp,
} from 'lucide-react';
import { isMuscleReadinessEnabled } from '@/lib/recovery/feature-flags';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const quickLinks = [
  { href: '/workouts/new', title: 'Tạo buổi tập AI', desc: 'Theo lịch, thiết bị và mục tiêu của bạn', icon: Brain },
  { href: '/progress', title: 'Xem tiến bộ', desc: 'Volume, sức mạnh và các kỷ lục mới', icon: TrendingUp },
  { href: '/recovery', title: 'Phục hồi cơ bắp', desc: 'Xem nhóm cơ đã sẵn sàng tập lại', icon: HeartPulse },
  { href: '/weekly', title: 'Báo cáo tuần', desc: 'Nhận phân tích và điều chỉnh từ AI', icon: Sparkles },
  { href: '/profile/body-composition', title: 'Cập nhật InBody', desc: 'Giữ dữ liệu cơ thể luôn mới', icon: Scale },
];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  result.setHours(0, 0, 0, 0);
  return result;
}

function calculateStreak(completedDates: string[], today: Date) {
  const dates = new Set(completedDates);
  const cursor = new Date(today);
  if (!dates.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (dates.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function workoutLabel(workout: any) {
  return workout.training_program_days?.name_vi ?? workout.training_program_days?.name ?? 'Buổi tập tự do';
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const visibleQuickLinks = isMuscleReadinessEnabled()
    ? quickLinks
    : quickLinks.filter((item) => item.href !== '/recovery');

  const now = new Date();
  const today = dateKey(now);
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [profileRes, programRes, workoutsRes, weightRes, prsRes] = await Promise.all([
    supabase.from('profiles').select('display_name, goal, preferred_session_duration, preferred_training_days, updated_at').eq('user_id', user.id).maybeSingle(),
    supabase.from('user_programs')
      .select('id, started_at, training_programs(id, name, name_vi, training_program_days(id, name, name_vi, day_of_week, order_index))')
      .eq('user_id', user.id).eq('is_active', true).maybeSingle(),
    supabase.from('workouts')
      .select('id, status, date, planned_duration, started_at, completed_at, training_program_days(name, name_vi), workout_exercises(phase, workout_sets(weight, reps, completed, set_type))')
      .eq('user_id', user.id).gte('date', dateKey(thirtyDaysAgo)).order('date', { ascending: false }).limit(30),
    supabase.from('body_weight_logs').select('weight_kg, recorded_date').eq('user_id', user.id).order('recorded_date', { ascending: false }).limit(2),
    supabase.from('personal_records').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);

  const profile = profileRes.data as any;
  const activeProgram = programRes.data as any;
  const effectivePlan = resolveEffectiveTrainingPlan(profile, activeProgram);
  const workouts = (workoutsRes.data ?? []) as any[];
  const completed = workouts.filter((workout) => workout.status === 'completed');
  const weekWorkouts = completed.filter((workout) => workout.date >= dateKey(weekStart) && workout.date <= dateKey(weekEnd));
  const todayWorkout = workouts.find((workout) => workout.date === today && workout.status !== 'completed');
  const recentKeys = new Set<string>();
  const recentWorkouts = workouts.filter((workout) => {
    const key = `${workout.date}:${workout.status}:${workoutLabel(workout)}`;
    if (recentKeys.has(key)) return false;
    recentKeys.add(key);
    return true;
  }).slice(0, 4);
  const program = activeProgram?.training_programs as any;
  const programDays = [...(program?.training_program_days ?? [])].sort((a: any, b: any) => a.order_index - b.order_index);
  const weeklyGoal = effectivePlan.effective.daysPerWeek;
  const weeklyProgress = Math.min(100, Math.round((weekWorkouts.length / weeklyGoal) * 100));
  const streak = calculateStreak(completed.map((workout) => workout.date), now);
  const latestWeight = weightRes.data?.[0];
  const previousWeight = weightRes.data?.[1];
  const weightDelta = latestWeight && previousWeight ? Number(latestWeight.weight_kg) - Number(previousWeight.weight_kg) : null;
  const weeklyVolume = weekWorkouts.reduce((total, workout) => total + (workout.workout_exercises ?? []).reduce(
    (exerciseTotal: number, exercise: any) => exerciseTotal + (exercise.workout_sets ?? [])
      .filter((set: any) => set.completed && set.set_type !== 'warmup')
      .reduce((setTotal: number, set: any) => setTotal + Number(set.weight ?? 0) * Number(set.reps ?? 0), 0), 0), 0);
  const nextProgramDay = programDays.find((day: any) => day.day_of_week >= now.getDay()) ?? programDays[0];
  const heroTitle = todayWorkout ? workoutLabel(todayWorkout) : nextProgramDay?.name_vi ?? nextProgramDay?.name ?? 'Tạo buổi tập phù hợp hôm nay';
  const heroHref = todayWorkout ? `/workouts/${todayWorkout.id}` : activeProgram ? '/workouts/new' : '/programs';
  const heroAction = todayWorkout ? 'Tiếp tục tập' : activeProgram ? 'Tạo buổi tập' : 'Chọn chương trình';
  const goalLabel: Record<string, string> = {
    muscle_gain: 'Tăng cơ', strength_gain: 'Tăng sức mạnh', fat_loss: 'Giảm mỡ', maintenance: 'Duy trì thể trạng',
  };
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    const key = dateKey(date);
    return {
      key, label: date.toLocaleDateString('vi-VN', { weekday: 'short' }).replace('Th ', 'T'), day: date.getDate(),
      completed: weekWorkouts.some((workout) => workout.date === key), today: key === today, future: date > now,
    };
  });

  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <div className="mx-auto max-w-6xl space-y-5 px-4 pb-24 pt-6 sm:px-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.75)]" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted">
                Tổng quan · {now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Chào {profile?.display_name ?? 'bạn'}, <span className="text-accent">sẵn sàng tiến bộ?</span>
            </h1>
            <p className="mt-2 text-sm text-ink-secondary">
              {weekWorkouts.length > 0 ? `Bạn đã hoàn thành ${weekWorkouts.length}/${weeklyGoal} buổi trong tuần này.` : 'Bắt đầu buổi đầu tiên để tạo nhịp tập cho tuần này.'}
            </p>
          </div>
          <Link href="/coach" className="btn-ghost inline-flex w-fit items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-accent" /> Hỏi AI Coach</Link>
        </header>

        <section className="card relative overflow-hidden rounded-2xl border border-white/80 p-5 shadow-neumorph dark:border-white/10 sm:p-7">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1.5fr_0.75fr] lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-accent">
                <CircleDot className="h-3 w-3" /> {todayWorkout ? 'Buổi tập đang chờ' : 'Gợi ý tiếp theo'}
              </div>
              <h2 className="max-w-2xl text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{heroTitle}</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-secondary">
                {todayWorkout ? `Buổi tập ${todayWorkout.planned_duration ?? profile?.preferred_session_duration ?? 60} phút đã được tạo. Tiếp tục từ nơi bạn đang dừng.`
                  : activeProgram ? `${program?.name_vi ?? program?.name} · AI sẽ chọn bài theo lịch, thiết bị và trạng thái gần đây.`
                    : 'Kích hoạt một chương trình để dashboard đưa ra lịch và mục tiêu phù hợp.'}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link href={heroHref} className="btn-primary inline-flex items-center gap-2 px-5 py-3 text-sm"><Dumbbell className="h-4 w-4" /> {heroAction} <ArrowRight className="h-4 w-4" /></Link>
                <Link href="/workouts" className="btn-ghost inline-flex items-center gap-2 text-sm"><History className="h-4 w-4" /> Lịch sử tập</Link>
              </div>
            </div>
            <div className="rounded-2xl border border-black/[0.05] bg-black/[0.025] p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between">
                <div><p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">Mục tiêu tuần</p><p className="mt-1 text-2xl font-extrabold text-ink">{weekWorkouts.length}<span className="text-sm text-ink-muted">/{weeklyGoal} buổi</span></p></div>
                <div className="grid h-16 w-16 place-items-center rounded-full border-[5px] border-accent/20 bg-chassis shadow-neumorph-sm"><span className="font-mono text-sm font-extrabold text-accent">{weeklyProgress}%</span></div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-accent to-orange-400" style={{ width: `${weeklyProgress}%` }} /></div>
              <p className="mt-3 text-xs text-ink-secondary">{weekWorkouts.length >= weeklyGoal ? 'Đã đạt mục tiêu tuần. Hãy ưu tiên phục hồi.' : `Còn ${weeklyGoal - weekWorkouts.length} buổi để hoàn thành kế hoạch.`}</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard icon={CalendarDays} label="Buổi tuần này" value={`${weekWorkouts.length}/${weeklyGoal}`} detail={activeProgram ? "Theo chương trình đang chọn" : "Theo mục tiêu trong hồ sơ"} />
          <MetricCard icon={Gauge} label="Volume tuần" value={weeklyVolume > 0 ? `${Math.round(weeklyVolume).toLocaleString('vi-VN')} kg` : '0 kg'} detail="Các working set hoàn thành" />
          <MetricCard icon={Flame} label="Chuỗi hiện tại" value={`${streak} ngày`} detail={streak > 0 ? 'Duy trì nhịp đều đặn' : 'Hoàn thành một buổi để bắt đầu'} />
          <MetricCard icon={Award} label="Kỷ lục cá nhân" value={`${prsRes.count ?? 0}`} detail="PR đã được ghi nhận" />
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.85fr]">
          <section className="card rounded-2xl border border-white/80 p-5 shadow-neumorph-sm dark:border-white/10">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div><p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">Nhịp tập 7 ngày</p><h2 className="mt-1 text-lg font-extrabold text-ink">Tuần của bạn</h2></div>
              <Link href="/weekly" className="text-xs font-bold text-accent hover:underline">Xem phân tích</Link>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => (
                <div key={day.key} className={`rounded-xl border px-1 py-3 text-center ${day.today ? 'border-accent bg-accent/10' : 'border-black/[0.05] bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.02]'}`}>
                  <p className="font-mono text-[9px] font-bold uppercase text-ink-muted">{day.label}</p><p className="mt-1 text-sm font-extrabold text-ink">{day.day}</p>
                  <div className={`mx-auto mt-2 grid h-5 w-5 place-items-center rounded-full ${day.completed ? 'bg-success text-white' : day.future ? 'border border-black/10 dark:border-white/10' : 'bg-black/5 text-ink-muted dark:bg-white/10'}`}>
                    {day.completed ? <Check className="h-3 w-3" strokeWidth={3} /> : <span className="h-1 w-1 rounded-full bg-current" />}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between"><h3 className="text-sm font-bold text-ink">Hoạt động gần đây</h3><Link href="/workouts" className="text-xs text-ink-muted hover:text-accent">Xem tất cả</Link></div>
            <div className="mt-3 space-y-2">
              {recentWorkouts.length > 0 ? recentWorkouts.map((workout) => (
                <Link key={workout.id} href={`/workouts/${workout.id}`} className="group flex items-center gap-3 rounded-xl border border-black/[0.04] p-3 transition hover:border-accent/30 hover:bg-accent/[0.03] dark:border-white/[0.07]">
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${workout.status === 'completed' ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'}`}>{workout.status === 'completed' ? <Check className="h-4 w-4" /> : <Activity className="h-4 w-4" />}</div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-ink">{workoutLabel(workout)}</p><p className="mt-0.5 font-mono text-[10px] text-ink-muted">{new Date(`${workout.date}T12:00:00`).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })} · {workout.planned_duration ?? '?'} phút</p></div>
                  <span className={`hidden text-[10px] font-bold uppercase sm:block ${workout.status === 'completed' ? 'text-success' : 'text-accent'}`}>{workout.status === 'completed' ? 'Hoàn thành' : 'Đang chờ'}</span>
                  <ChevronRight className="h-4 w-4 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-accent" />
                </Link>
              )) : <div className="rounded-xl border border-dashed border-black/10 p-6 text-center dark:border-white/10"><p className="text-sm text-ink-muted">Chưa có hoạt động tập luyện.</p></div>}
            </div>
          </section>

          <div className="space-y-5">
            <section className="card rounded-2xl border border-white/80 p-5 shadow-neumorph-sm dark:border-white/10">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">Trạng thái hiện tại</p><h2 className="mt-1 text-lg font-extrabold text-ink">Thông tin cần biết</h2>
              <div className="mt-4 space-y-3">
                <InfoRow icon={Scale} label="Cân nặng gần nhất" value={latestWeight ? `${latestWeight.weight_kg} kg` : 'Chưa ghi nhận'} detail={weightDelta == null ? 'Cập nhật để theo dõi xu hướng' : `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg so với lần trước`} href="/profile/weight" />
                <InfoRow icon={Target} label="Mục tiêu" value={goalLabel[profile?.goal] ?? profile?.goal ?? 'Chưa thiết lập'} detail={program ? `Đang theo ${program.name_vi ?? program.name}` : 'Chưa có chương trình hoạt động'} href="/programs" />
                <InfoRow icon={Activity} label="Thời lượng ưu tiên" value={`${profile?.preferred_session_duration ?? 60} phút`} detail="Dùng khi AI tạo buổi tập" href="/profile" />
              </div>
            </section>
            <section className="card rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/[0.08] to-transparent p-5 shadow-neumorph-sm">
              <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-white shadow-accent-lg"><Brain className="h-5 w-5" /></div><div><p className="text-sm font-extrabold text-ink">Gợi ý cho bạn</p><p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                {weekWorkouts.length === 0 ? 'Hãy tạo một buổi tập ngắn để bắt đầu tuần. AI sẽ điều chỉnh theo thời gian và thiết bị bạn có.' : weekWorkouts.length >= weeklyGoal ? 'Bạn đã đủ tần suất tuần này. Ưu tiên ngủ, dinh dưỡng và một ngày phục hồi chủ động.' : `Giữ nhịp với ${weeklyGoal - weekWorkouts.length} buổi còn lại; không cần tăng volume đột ngột.`}
              </p></div></div>
            </section>
          </div>
        </div>

        <section>
          <div className="mb-3"><p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">Truy cập nhanh</p><h2 className="mt-1 text-lg font-extrabold text-ink">Công cụ của bạn</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {visibleQuickLinks.map(({ href, title, desc, icon: Icon }) => (
              <Link key={href} href={href} className="card group rounded-xl border border-white/80 p-4 shadow-neumorph-sm transition hover:-translate-y-1 hover:border-accent/30 dark:border-white/10">
                <div className="mb-4 flex items-center justify-between"><div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent"><Icon className="h-4 w-4" /></div><ChevronRight className="h-4 w-4 text-ink-muted transition group-hover:translate-x-1 group-hover:text-accent" /></div>
                <h3 className="text-sm font-extrabold text-ink">{title}</h3><p className="mt-1 text-xs leading-relaxed text-ink-secondary">{desc}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: string; detail: string }) {
  return <div className="card rounded-xl border border-white/80 p-4 shadow-neumorph-sm dark:border-white/10"><div className="mb-3 flex items-center justify-between"><div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent"><Icon className="h-4 w-4" /></div><span className="h-1.5 w-1.5 rounded-full bg-success" /></div><p className="font-mono text-xl font-extrabold text-ink">{value}</p><p className="mt-1 text-xs font-bold text-ink-secondary">{label}</p><p className="mt-1 hidden text-[10px] text-ink-muted sm:block">{detail}</p></div>;
}

function InfoRow({ icon: Icon, label, value, detail, href }: { icon: typeof Activity; label: string; value: string; detail: string; href: string }) {
  return <Link href={href} className="group flex items-center gap-3 rounded-xl border border-black/[0.04] p-3 transition hover:border-accent/30 dark:border-white/[0.07]"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black/[0.03] text-ink-secondary group-hover:bg-accent/10 group-hover:text-accent dark:bg-white/[0.05]"><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink-muted">{label}</p><p className="mt-0.5 truncate text-sm font-extrabold text-ink">{value}</p><p className="mt-0.5 truncate text-[10px] text-ink-muted">{detail}</p></div><ChevronRight className="h-4 w-4 text-ink-muted group-hover:text-accent" /></Link>;
}
