import Link from 'next/link';
import {
  Activity, ArrowRight, BarChart3, Brain, Check, ChevronRight, ClipboardList,
  Dumbbell, Gauge, Orbit, ShieldCheck, Sparkles, Target, Zap,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { LandingRobotCoach } from '@/components/landing-robot-coach';

const capabilities = [
  { icon: Brain, eyebrow: 'AI Planning', title: 'Buổi tập thật sự dành cho bạn', desc: 'AI kết hợp mục tiêu, lịch tập, thiết bị, lịch sử và trạng thái cơ thể trước khi chọn bài.', href: '/workouts/new', className: 'md:col-span-2' },
  { icon: ClipboardList, eyebrow: 'Live Logger', title: 'Ghi set ngay khi tập', desc: 'Theo dõi rep, mức tạ, RIR và thời gian nghỉ trong một luồng duy nhất.', href: '/workouts' },
  { icon: BarChart3, eyebrow: 'Progress Engine', title: 'Biết mình đang tiến bộ', desc: 'Volume, 1RM, PR và xu hướng được biến thành tín hiệu dễ hành động.', href: '/progress' },
  { icon: ShieldCheck, eyebrow: 'Safety Layer', title: 'Tôn trọng giới hạn', desc: 'Lọc bài theo thiết bị, kinh nghiệm và các ràng buộc vận động đã xác nhận.', href: '/profile', className: 'md:col-span-2' },
];

const workflow = [
  { num: '01', title: 'Khai báo mục tiêu', desc: 'Thiết lập kinh nghiệm, mục tiêu và thời lượng.' },
  { num: '02', title: 'Chọn môi trường tập', desc: 'AI biết chính xác thiết bị bạn có thể dùng.' },
  { num: '03', title: 'Tạo và hoàn thành', desc: 'Nhận buổi tập, ghi log ngay trong từng set.' },
  { num: '04', title: 'Thích nghi liên tục', desc: 'Dữ liệu mới giúp lần đề xuất sau sát hơn.' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#07090d] text-white">
      <header className="relative min-h-[760px] overflow-hidden border-b border-white/[0.07]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:54px_54px]" />
        <div className="absolute left-1/2 top-0 h-[620px] w-[900px] -translate-x-1/2 rounded-full bg-orange-600/[0.09] blur-[150px]" />

        <nav className="relative z-20 border-b border-white/[0.07] bg-[#080b10]/75 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <BrandLogo size="md" showText />
            <div className="hidden items-center gap-7 md:flex">
              <a href="#nang-luc" className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 transition hover:text-white">Năng lực</a>
              <a href="#quy-trinh" className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 transition hover:text-white">Quy trình</a>
              <Link href="/exercises" className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 transition hover:text-white">Thư viện</Link>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="hidden items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 lg:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-emerald-300">AI online</span>
              </div>
              <ThemeToggle />
              <Link href="/auth/login" className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-white transition hover:border-orange-400/40 hover:bg-orange-400/10">Đăng nhập</Link>
            </div>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-7 px-4 pb-14 pt-7 sm:gap-8 sm:px-6 sm:pt-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:px-8 lg:pb-24 lg:pt-16">
          <div className="contents lg:relative lg:z-10 lg:block">
            <div className="order-1">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/[0.07] px-3 py-1.5 lg:mb-6">
                <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-orange-200">Huấn luyện thích nghi · Mỗi buổi tập</span>
              </div>
              <h1 className="max-w-3xl text-5xl font-black leading-[0.92] tracking-[-0.055em] text-white sm:text-6xl lg:text-[5.3rem]">
                Tập đúng.<br /><span className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-300 bg-clip-text text-transparent">Tiến bộ thật.</span>
              </h1>
            </div>

            <div className="order-3 lg:mt-0">
              <p className="max-w-xl text-base font-medium leading-relaxed text-slate-300 sm:text-lg lg:mt-7">
                GymAI biến mục tiêu, lịch tập, thiết bị và từng set bạn hoàn thành thành một kế hoạch dành riêng cho chính bạn.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-8">
                <Link href="/auth/register" className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_14px_40px_rgba(249,115,22,.28)] transition hover:-translate-y-0.5 hover:brightness-110">
                  Bắt đầu tập luyện <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
                <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:border-orange-400/35 hover:bg-orange-400/[0.08]">
                  Xem một buổi tập <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-7 grid max-w-lg grid-cols-3 divide-x divide-white/10 border-y border-white/[0.08] py-4 lg:mt-10">
                <HeroMetric value="24/7" label="AI Coach" />
                <HeroMetric value="1 luồng" label="Plan → Log" />
                <HeroMetric value="Thích nghi" label="Theo dữ liệu" />
              </div>
            </div>
          </div>

          <div className="order-2 relative mx-auto w-full max-w-[280px] sm:max-w-[320px] lg:order-none lg:max-w-[470px]">
            <div className="absolute inset-10 rounded-full bg-orange-500/15 blur-[90px]" />
            <div className="relative rounded-[2.2rem] border border-white/[0.09] bg-gradient-to-br from-white/[0.065] to-white/[0.015] p-2 shadow-[0_40px_120px_rgba(0,0,0,.48)] backdrop-blur-sm">
              <LandingRobotCoach />
            </div>
          </div>
        </div>
      </header>

      <section className="border-b border-white/[0.07] bg-[#0a0d13]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/[0.07] px-4 sm:px-6 md:grid-cols-4 lg:px-8">
          <Signal icon={Target} text="Bám sát mục tiêu" />
          <Signal icon={Dumbbell} text="Đúng thiết bị" />
          <Signal icon={Gauge} text="Điều chỉnh volume" />
          <Signal icon={Activity} text="Theo dõi từng set" />
        </div>
      </section>

      <section id="nang-luc" className="relative bg-[#f0f3f7] py-20 text-slate-950 dark:bg-[#0b0e14] dark:text-white sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:34px_34px] opacity-[0.045]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 grid gap-5 lg:grid-cols-2 lg:items-end">
            <div>
              <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.2em] text-orange-600">Một hệ thống khép kín</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Không chỉ tạo bài tập.<br />GymAI tạo vòng lặp tiến bộ.</h2>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 lg:justify-self-end">Mỗi thành phần dùng chung một nguồn dữ liệu, để lời khuyên của AI, kế hoạch tập và nhật ký không còn tách rời nhau.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {capabilities.map(({ icon: Icon, eyebrow, title, desc, href, className }) => (
              <Link key={title} href={href} className={`group relative min-h-[230px] overflow-hidden rounded-2xl border border-black/[0.06] bg-white/75 p-6 shadow-[0_18px_50px_rgba(15,23,42,.06)] transition duration-300 hover:-translate-y-1 hover:border-orange-400/40 dark:border-white/[0.08] dark:bg-white/[0.035] ${className ?? ''}`}>
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-orange-500/0 blur-3xl transition group-hover:bg-orange-500/15" />
                <div className="flex items-center justify-between"><div className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400"><Icon className="h-5 w-5" /></div><ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-orange-500" /></div>
                <p className="mt-8 font-mono text-[9px] font-extrabold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">{eyebrow}</p>
                <h3 className="mt-2 text-xl font-black tracking-tight">{title}</h3>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-400">{desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="quy-trinh" className="relative overflow-hidden border-y border-white/[0.07] bg-[#090c12] py-20 sm:py-28">
        <div className="absolute -left-40 top-10 h-96 w-96 rounded-full bg-orange-600/10 blur-[140px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div className="lg:sticky lg:top-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/[0.07] px-3 py-1.5"><Orbit className="h-3.5 w-3.5 text-orange-400" /><span className="font-mono text-[9px] font-bold uppercase tracking-widest text-orange-200">Adaptive loop</span></div>
              <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl">Từ dữ liệu đầu vào đến tiến bộ đo được.</h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-400">Không cần tự ghép nhiều công cụ. GymAI giữ toàn bộ vòng đời buổi tập trong một trải nghiệm nhất quán.</p>
              <Link href="/auth/register" className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-orange-400 hover:text-orange-300">Thiết lập hồ sơ đầu tiên <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2">
              {workflow.map((step, index) => (
                <li key={step.num} className="group rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 transition hover:border-orange-400/30 hover:bg-orange-400/[0.045]">
                  <div className="flex items-center justify-between"><span className="font-mono text-xs font-black text-orange-400">{step.num}</span>{index < workflow.length - 1 ? <ChevronRight className="h-4 w-4 text-slate-600" /> : <Check className="h-4 w-4 text-emerald-400" />}</div>
                  <h3 className="mt-8 text-lg font-black text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="bg-[#f0f3f7] px-4 py-16 text-slate-950 dark:bg-[#0b0e14] dark:text-white sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-orange-400/20 bg-gradient-to-br from-orange-600 to-orange-500 p-8 shadow-[0_30px_100px_rgba(234,88,12,.24)] sm:p-12">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-orange-100">Sẵn sàng khởi động?</p><h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Buổi tập tiếp theo nên hiểu bạn hơn.</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-orange-50/85">Tạo hồ sơ miễn phí, chọn chương trình và để GymAI chuẩn bị buổi đầu tiên.</p></div>
            <Link href="/auth/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-extrabold text-orange-600 shadow-xl transition hover:-translate-y-0.5 hover:bg-orange-50">Khởi động ngay <Zap className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.07] bg-[#07090d] py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row lg:px-8">
          <BrandLogo size="sm" showText />
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Plan · Train · Track · Adapt</p>
          <div className="flex items-center gap-5 text-xs text-slate-400"><Link href="/auth/login" className="hover:text-white">Đăng nhập</Link><Link href="/auth/register" className="hover:text-white">Đăng ký</Link></div>
        </div>
      </footer>
    </main>
  );
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return <div className="px-3 first:pl-0"><p className="text-sm font-black text-white sm:text-base">{value}</p><p className="mt-1 font-mono text-[8px] font-bold uppercase tracking-widest text-slate-500">{label}</p></div>;
}

function Signal({ icon: Icon, text }: { icon: typeof Activity; text: string }) {
  return <div className="flex items-center justify-center gap-2 px-3 py-4 text-center"><Icon className="h-3.5 w-3.5 shrink-0 text-orange-400" /><span className="font-mono text-[8px] font-bold uppercase tracking-widest text-slate-400 sm:text-[9px]">{text}</span></div>;
}
