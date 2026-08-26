import { redirect } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { isOnboardingComplete } from '@/lib/onboarding';
import OnboardingForm from './onboarding-form';
import { Activity, Clock3, LockKeyhole, Target, TrendingUp } from 'lucide-react';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const profileRow = profile as any;

  // Gate onboarding: redirect to dashboard if profile has already completed onboarding.
  if (isOnboardingComplete(profileRow)) redirect('/dashboard');

  const { data: equipment } = await supabase
    .from('equipment')
    .select('id,slug,name,name_vi,category,image_url')
    .order('category', { ascending: true })
    .order('name_vi', { ascending: true });

  const { data: existing } = await supabase
    .from('profile_equipment')
    .select('equipment_id')
    .eq('profile_id', profileRow?.id ?? '');
  const preselected = (existing ?? []).map((row: any) => row.equipment_id as string);

  return (
    <main className="dark onboarding-page relative flex h-svh min-h-0 overflow-hidden items-center justify-center bg-[#07090e] p-3 text-slate-100 blueprint-grid sm:p-5 lg:p-6 xl:p-8">
      <div className="onboarding-enter relative z-10 mx-auto flex h-full max-h-[880px] min-h-0 w-full max-w-[1480px] flex-col lg:grid lg:grid-cols-[480px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[530px_minmax(0,1fr)] xl:gap-10 2xl:grid-cols-[570px_minmax(0,1fr)] 2xl:gap-12">
        {/* Left Hero (Directly on unified background, no separate card box) */}
        <aside
          className="relative hidden h-full min-h-0 flex-col justify-between py-1 lg:flex xl:py-2"
          aria-label="Giới thiệu GymAI Coach"
        >
          {/* Top Section */}
          <div className="relative z-20">
            {/* Top Brand Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 shadow-[0_0_16px_rgba(249,115,22,0.22)]">
                <Activity className="h-6 w-6 text-accent" strokeWidth={2.4} aria-hidden="true" />
              </div>
              <div>
                <p className="text-[17px] font-black uppercase tracking-[0.03em] text-white">
                  <span className="text-accent">GYMAI</span> COACH
                </p>
                <p className="font-mono text-[8px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  AI COACH ONLINE
                </p>
              </div>
            </div>

            {/* Intro Heading */}
            <div className="mt-6 xl:mt-7">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/[0.07] px-3.5 py-1.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.16em] text-orange-200 shadow-sm">
                <span className="font-black text-accent">/</span> AI HUẤN LUYỆN THÍCH NGHI · MỖI BUỔI TẬP
              </div>
              <h1 className="mt-4 text-[42px] font-black leading-[0.92] tracking-[-0.04em] text-white xl:text-[48px] 2xl:text-[54px]">
                Khởi tạo
                <span className="block bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400 bg-clip-text text-transparent">
                  hồ sơ
                </span>
              </h1>
              <p className="mt-3 max-w-[280px] text-[13px] leading-relaxed text-slate-400 xl:text-[13.5px]">
                Vài lựa chọn để AI cá nhân hoá buổi tập cho bạn, giúp tối ưu hiệu quả và an toàn.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="mt-5 space-y-3.5 max-w-[260px] xl:mt-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-accent/25 bg-accent/[0.08] text-accent shadow-sm">
                  <Target className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-[12.5px] font-bold text-slate-100">Cá nhân hoá thông minh</h2>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-400">
                    AI hiểu cơ thể và mục tiêu để lên kế hoạch phù hợp.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-white/[0.08] bg-white/[0.03] text-accent shadow-sm">
                  <TrendingUp className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-[12.5px] font-bold text-slate-100">Hiệu quả vượt trội</h2>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-400">
                    Bài tập, cường độ và lịch tập được tối ưu theo dữ liệu.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3D Holographic Cyber Platform & Scaled Robot Character */}
          <div
            className="pointer-events-none absolute bottom-0 right-[-10px] z-10 flex h-[70%] w-[330px] flex-col items-center justify-end xl:right-0 xl:h-[74%] xl:w-[360px] 2xl:h-[78%] 2xl:w-[390px]"
            aria-hidden="true"
          >
            {/* Soft Ambient Backlight Centered Directly Behind Robot */}
            <div className="pointer-events-none absolute left-1/2 top-[46%] h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.32)_0%,rgba(249,115,22,0.14)_35%,rgba(249,115,22,0.03)_58%,transparent_74%)] blur-2xl xl:h-[400px] xl:w-[400px]" />

            {/* Subtle Floor Warmth (Reduced glare) */}
            <div className="absolute bottom-[-10px] left-1/2 h-28 w-[380px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.18)_0%,rgba(249,115,22,0.06)_40%,transparent_70%)] blur-md" />

            {/* High-Detail Cybernetic Floor Dial & Concentric Rings (SVG) */}
            <svg
              className="absolute bottom-[-10px] left-1/2 h-[140px] w-[460px] -translate-x-1/2 xl:h-[155px] xl:w-[500px] 2xl:h-[170px] 2xl:w-[540px]"
              viewBox="0 0 500 160"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Dashed Perspective Ring */}
              <ellipse cx="250" cy="80" rx="230" ry="66" stroke="rgba(249,115,22,0.28)" strokeWidth="1" strokeDasharray="5 5" />

              {/* Radial Grid Lines Between Outer & Middle Ring (Every 20 degrees) */}
              <line x1="480.0" y1="80.0" x2="418.0" y2="80.0" stroke="rgba(249,115,22,0.20)" strokeWidth="1" />
              <line x1="466.1" y1="102.6" x2="407.9" y2="96.4" stroke="rgba(249,115,22,0.20)" strokeWidth="1" />
              <line x1="426.2" y1="122.4" x2="378.7" y2="110.9" stroke="rgba(249,115,22,0.20)" strokeWidth="1" />
              <line x1="365.0" y1="137.2" x2="334.0" y2="121.6" stroke="rgba(249,115,22,0.20)" strokeWidth="1" />
              <line x1="289.9" y1="145.0" x2="279.2" y2="127.3" stroke="rgba(249,115,22,0.20)" strokeWidth="1" />
              <line x1="210.1" y1="145.0" x2="220.8" y2="127.3" stroke="rgba(249,115,22,0.20)" strokeWidth="1" />
              <line x1="135.0" y1="137.2" x2="166.0" y2="121.6" stroke="rgba(249,115,22,0.20)" strokeWidth="1" />
              <line x1="73.8" y1="122.4" x2="121.3" y2="110.9" stroke="rgba(249,115,22,0.20)" strokeWidth="1" />
              <line x1="33.9" y1="102.6" x2="92.1" y2="96.4" stroke="rgba(249,115,22,0.20)" strokeWidth="1" />
              <line x1="20.0" y1="80.0" x2="82.0" y2="80.0" stroke="rgba(249,115,22,0.20)" strokeWidth="1" />
              <line x1="33.9" y1="57.4" x2="92.1" y2="63.6" stroke="rgba(249,115,22,0.20)" strokeWidth="1" />
              <line x1="73.8" y1="37.6" x2="121.3" y2="49.1" stroke="rgba(249,115,22,0.20)" strokeWidth="1" />
              <line x1="135.0" y1="22.8" x2="166.0" y2="38.4" stroke="rgba(249,115,22,0.20)" strokeWidth="1" />
              <line x1="210.1" y1="15.0" x2="220.8" y2="32.7" stroke="rgba(249,115,22,0.20)" strokeWidth="1" />
              <line x1="289.9" y1="15.0" x2="279.2" y2="32.7" stroke="rgba(249,115,22,0.20)" strokeWidth="1" />
              <line x1="365.0" y1="22.8" x2="334.0" y2="38.4" stroke="rgba(249,115,22,0.20)" strokeWidth="1" />
              <line x1="426.2" y1="37.6" x2="378.7" y2="49.1" stroke="rgba(249,115,22,0.20)" strokeWidth="1" />
              <line x1="466.1" y1="57.4" x2="407.9" y2="63.6" stroke="rgba(249,115,22,0.20)" strokeWidth="1" />

              {/* Middle Perspective Ring */}
              <ellipse cx="250" cy="80" rx="168" ry="48" stroke="rgba(249,115,22,0.48)" strokeWidth="1.2" />

              {/* Radial Grid Lines Between Middle & Inner Ring (Every 40 degrees) */}
              <line x1="418.0" y1="80.0" x2="362.0" y2="80.0" stroke="rgba(249,115,22,0.28)" strokeWidth="1" />
              <line x1="378.7" y1="110.9" x2="335.8" y2="100.6" stroke="rgba(249,115,22,0.28)" strokeWidth="1" />
              <line x1="279.2" y1="127.3" x2="269.4" y2="111.5" stroke="rgba(249,115,22,0.28)" strokeWidth="1" />
              <line x1="166.0" y1="121.6" x2="194.0" y2="107.7" stroke="rgba(249,115,22,0.28)" strokeWidth="1" />
              <line x1="92.1" y1="96.4" x2="144.8" y2="90.9" stroke="rgba(249,115,22,0.28)" strokeWidth="1" />
              <line x1="92.1" y1="63.6" x2="144.8" y2="69.1" stroke="rgba(249,115,22,0.28)" strokeWidth="1" />
              <line x1="166.0" y1="38.4" x2="194.0" y2="52.3" stroke="rgba(249,115,22,0.28)" strokeWidth="1" />
              <line x1="279.2" y1="32.7" x2="269.4" y2="48.5" stroke="rgba(249,115,22,0.28)" strokeWidth="1" />
              <line x1="378.7" y1="49.1" x2="335.8" y2="59.4" stroke="rgba(249,115,22,0.28)" strokeWidth="1" />

              {/* Inner Clean Orange Ring */}
              <ellipse cx="250" cy="80" rx="112" ry="32" stroke="rgba(249,115,22,0.68)" strokeWidth="1.4" />

              {/* Core Precision Ring directly under shoes */}
              <ellipse cx="250" cy="80" rx="65" ry="19" stroke="rgba(249,115,22,0.85)" strokeWidth="1.2" fill="rgba(249,115,22,0.06)" />
            </svg>

            {/* Transparent Cutout Robot Image */}
            <div className="relative z-10 flex h-full w-full items-end justify-center pb-2">
              <Image
                src="/images/landing/robot-poses-v2/pose-thumbs-up-nobg.png"
                alt="GymAI Robot Coach"
                width={1024}
                height={1536}
                priority
                className="h-[96%] w-auto max-w-full object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.9)] filter [mask-image:linear-gradient(to_bottom,black_92%,transparent_100%)]"
              />
            </div>
          </div>

          {/* Bottom Left Badge */}
          <div className="relative z-20 mt-auto w-fit rounded-[16px] border border-white/[0.09] bg-[#0b1018]/92 p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.4)] backdrop-blur-md">
            <p className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Clock3 className="h-4 w-4 text-accent" />
              ~2 phút để hoàn tất
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-[10.5px] text-slate-400">
              <LockKeyhole className="h-3.5 w-3.5 text-accent/80" />
              Hoàn toàn bảo mật thông tin
            </p>
          </div>
        </aside>

        {/* Right Form Card */}
        <section className="relative z-20 flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Mobile Top Header */}
          <header className="mb-3 flex shrink-0 items-center justify-between px-1 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.04]">
                <Activity className="h-5 w-5 text-accent" strokeWidth={2.2} />
              </div>
              <p className="text-[15px] font-black uppercase tracking-[0.03em] text-white">
                <span className="text-accent">GYMAI</span> COACH
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <Clock3 className="h-4 w-4 text-slate-400" />
              <span>~2 phút</span>
            </div>
          </header>

          <OnboardingForm initial={profileRow} equipment={(equipment as any) ?? []} preselectedEquipment={preselected} />
        </section>
      </div>
    </main>
  );
}
