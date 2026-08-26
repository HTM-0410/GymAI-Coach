'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import {
  Activity,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  CalendarDays,
  Loader2,
  LockKeyhole,
  Minus,
  PencilLine,
  Plus,
  Ruler,
  Scale,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import EquipmentStep, { EquipmentItem } from './equipment-step';
import { inferPresetFromEquipmentIds } from '@/lib/equipment-presets';
import { normalizeOnboardingDuration, ONBOARDING_DURATION_OPTIONS } from '@/lib/onboarding';

type Profile = {
  id?: string;
  display_name?: string | null;
  age?: number | null;
  gender?: Gender | null;
  height_cm?: number | null;
  current_weight_kg?: number | null;
  experience_level?: 'beginner' | 'intermediate' | 'advanced' | null;
  goal?: 'muscle_gain' | 'strength_gain' | 'fat_loss' | 'maintenance' | null;
  secondary_goal?: Goal | null;
  injury_areas?: InjuryArea[] | null;
  injury_note?: string | null;
  preferred_training_days?: number | null;
  preferred_session_duration?: number | null;
};

type Goal = NonNullable<Profile['goal']>;
type Gender = 'male' | 'female' | 'other';
type InjuryArea = 'knee' | 'shoulder' | 'lower_back' | 'wrist' | 'ankle' | 'other';

const expOptions: Array<{ value: Profile['experience_level']; label: string; detail: string }> = [
  { value: 'beginner', label: 'Mới bắt đầu', detail: 'Đang làm quen' },
  { value: 'intermediate', label: 'Trung cấp', detail: 'Tập đều đặn' },
  { value: 'advanced', label: 'Nâng cao', detail: 'Kỹ thuật vững' },
];

const goalOptions: Array<{ value: Profile['goal']; label: string; detail: string; icon: LucideIcon }> = [
  { value: 'muscle_gain', label: 'Tăng cơ', detail: 'Phát triển khối lượng cơ', icon: Dumbbell },
  { value: 'strength_gain', label: 'Tăng sức mạnh', detail: 'Cải thiện mức tạ', icon: Zap },
  { value: 'fat_loss', label: 'Giảm mỡ', detail: 'Tăng vận động hiệu quả', icon: Flame },
  { value: 'maintenance', label: 'Duy trì thể lực', detail: 'Khỏe và cân bằng', icon: Activity },
];

const genderOptions: Array<{ value: Gender; label: string }> = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
];

const injuryOptions: Array<{ value: InjuryArea; label: string }> = [
  { value: 'knee', label: 'Đầu gối' },
  { value: 'shoulder', label: 'Vai' },
  { value: 'lower_back', label: 'Lưng dưới' },
  { value: 'wrist', label: 'Cổ tay' },
  { value: 'ankle', label: 'Cổ chân' },
  { value: 'other', label: 'Khác' },
];

const TOTAL_STEPS = 4;
const STEP_META = [
  { short: 'Hồ sơ', eyebrow: 'PROFILE', title: 'Thông tin cơ bản', helper: 'Thông tin nền tảng giúp AI tính cường độ phù hợp.' },
  { short: 'Mục tiêu', eyebrow: 'GOAL', title: 'Kinh nghiệm & mục tiêu', helper: 'Chọn điểm xuất phát và kết quả bạn muốn đạt được.' },
  { short: 'Lịch tập', eyebrow: 'SCHEDULE', title: 'Lịch tập mong muốn', helper: 'Thiết lập nhịp tập phù hợp với thời gian của bạn.' },
  { short: 'Thiết bị', eyebrow: 'EQUIPMENT', title: 'Điều kiện tập luyện', helper: 'AI chỉ chọn bài phù hợp với nơi bạn thường tập.' },
] as const;

function isMissingOnboardingSchema(message: string) {
  return /could not find the '(age|gender|secondary_goal|injury_areas|injury_note)' column/i.test(message);
}

function OptionCard({
  label,
  detail,
  icon: Icon,
  selected,
  badge,
  disabled = false,
  compact = false,
  onClick,
}: {
  label: string;
  detail?: string;
  icon?: LucideIcon;
  selected: boolean;
  badge?: string;
  disabled?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={clsx(
        'group relative flex items-center rounded-[13px] border text-left transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out',
        compact ? 'h-[54px] min-h-[54px] gap-2 px-3 py-0' : 'min-h-[54px] gap-3 px-4 py-2.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#11161e] active:scale-[0.98]',
        selected
          ? 'border-accent/90 bg-accent/[0.09] text-white shadow-[0_4px_20px_rgba(249,115,22,0.15)] ring-1 ring-accent/30'
          : 'border-white/[0.08] bg-white/[0.025] text-slate-300 hover:border-white/[0.16] hover:bg-white/[0.045]',
        disabled && 'cursor-not-allowed opacity-35 hover:border-white/[0.08] hover:bg-white/[0.025]',
      )}
    >
      {Icon && (
        <span
          className={clsx(
            'flex shrink-0 items-center justify-center rounded-[10px] transition-colors',
            compact ? 'h-6 w-6' : 'h-8 w-8',
            selected ? 'text-accent' : 'text-slate-500 group-hover:text-slate-400',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className={clsx('block text-sm font-semibold tracking-tight', selected ? 'text-white font-bold' : 'text-slate-200')}>{label}</span>
          {badge && (
            <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-accent">
              {badge}
            </span>
          )}
        </span>
        {detail && <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">{detail}</span>}
      </span>
      <span
        className={clsx(
          'flex shrink-0 items-center justify-center rounded-full transition-all duration-200',
          compact ? 'h-4 w-4' : 'h-5 w-5',
          selected ? 'bg-accent text-white shadow-[0_0_10px_rgba(249,115,22,0.4)]' : 'border border-white/20 bg-transparent',
        )}
      >
        {selected ? (
          <Check className={compact ? 'h-2.5 w-2.5 stroke-[3]' : 'h-3 w-3 stroke-[3]'} aria-hidden="true" />
        ) : null}
      </span>
    </button>
  );
}

function ProgressStepper({ step, complete = false }: { step: number; complete?: boolean }) {
  const currentStepMeta = STEP_META[step - 1];

  return (
    <div className="border-b border-white/[0.08] px-5 py-4 sm:px-8 sm:py-5 lg:px-10 lg:py-6">
      {/* Mobile Connected-Node Stepper with Glow and Step Label */}
      <div className="lg:hidden">
        {/* Step Indicator Nodes */}
        <div className="relative flex items-center justify-between">
          {/* Background Connecting Track */}
          <div className="absolute left-4 right-4 top-1/2 h-[2px] -translate-y-1/2 bg-white/[0.08]" aria-hidden="true" />
          {/* Active Progress Fill */}
          <div
            className="absolute left-4 top-1/2 h-[2px] -translate-y-1/2 bg-accent shadow-[0_0_8px_rgba(249,115,22,0.6)] transition-all duration-300 ease-out"
            style={{
              width: complete ? 'calc(100% - 32px)' : `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%`,
              maxWidth: 'calc(100% - 32px)',
            }}
            aria-hidden="true"
          />

          {STEP_META.map((item, index) => {
            const itemStep = index + 1;
            const isDone = complete || itemStep < step;
            const isCurrent = !complete && itemStep === step;

            return (
              <div key={item.short} className="relative z-10 flex flex-col items-center">
                <span
                  className={clsx(
                    'flex h-7 w-7 items-center justify-center rounded-full font-mono text-[10px] font-extrabold transition-all duration-300',
                    isDone
                      ? 'border border-accent bg-accent text-white shadow-[0_0_10px_rgba(249,115,22,0.4)]'
                      : isCurrent
                        ? 'border-2 border-accent bg-[#151b26] text-accent ring-4 ring-accent/20 shadow-[0_0_14px_rgba(249,115,22,0.5)]'
                        : 'border border-white/10 bg-[#0d1117] text-slate-500',
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : `0${itemStep}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Current Step Label & Count */}
        <div className="mt-2.5 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-200">
            {currentStepMeta.short}
          </span>
          <span className="font-mono text-[11px] font-semibold tabular-nums text-accent">
            {step}/{TOTAL_STEPS}
          </span>
        </div>
      </div>

      {/* Desktop Stepper */}
      <div className="hidden lg:block">
        <span className="absolute right-6 top-5 font-mono text-xs font-semibold tabular-nums text-slate-400 sm:right-8 sm:top-6">
          {step}/{TOTAL_STEPS}
        </span>
        <div className="grid grid-cols-4 gap-3 pr-12 sm:gap-6 sm:pr-14">
          {STEP_META.map((item, index) => {
            const itemStep = index + 1;
            const isDone = complete || itemStep < step;
            const isCurrent = !complete && itemStep === step;
            return (
              <div key={item.short} aria-current={isCurrent ? 'step' : undefined} className="min-w-0">
                <div className="mb-2.5 flex items-center gap-2 sm:gap-3">
                  <span
                    className={clsx(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold transition-[border-color,background-color,color] duration-300 sm:h-8 sm:w-8',
                      isDone
                        ? 'border border-accent bg-accent text-white shadow-[0_0_12px_rgba(249,115,22,0.3)]'
                        : isCurrent
                          ? 'border border-accent bg-accent text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                          : 'border border-white/10 bg-white/[0.025] text-slate-500',
                    )}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : String(itemStep).padStart(2, '0')}
                  </span>
                  <span
                    className={clsx(
                      'truncate text-xs font-bold sm:block lg:text-[13px]',
                      isDone || isCurrent ? 'text-slate-100' : 'text-slate-500',
                    )}
                  >
                    {item.short}
                  </span>
                </div>
                <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className={clsx(
                      'h-full origin-left rounded-full bg-accent transition-transform duration-[400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]',
                      isDone || isCurrent ? 'scale-x-100 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'scale-x-0',
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const CHIBI_IMAGES: Record<number, string> = {
  1: '/images/landing/robot-poses-v2/robot-chibi-biceps-nobg.png',
  2: '/images/landing/robot-poses-v2/robot-chibi-thumbs-up-nobg.png',
  3: '/images/landing/robot-poses-v2/robot-chibi-stopwatch-nobg.png',
};

function StepHeader({ step, headingRef }: { step: number; headingRef: React.RefObject<HTMLHeadingElement> }) {
  const item = STEP_META[step - 1];
  const chibiSrc = CHIBI_IMAGES[step];
  const isLeftRobot = step === 2;

  return (
    <div className="onboarding-step-header mb-2 sm:mb-4">
      {/* Mobile Layout with Enlarged Cute Chibi Robot (Step 1, 2, 3) */}
      <div
        className={clsx(
          'flex justify-between gap-2 sm:gap-3 lg:hidden',
          chibiSrc ? 'items-end' : 'items-start',
          isLeftRobot ? 'flex-row-reverse' : 'flex-row',
        )}
      >
        <div className="min-w-0 flex-1 pb-1">
          <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            <span>BƯỚC {String(step).padStart(2, '0')}</span>
          </div>
          <h2 ref={headingRef} tabIndex={-1} className="text-balance text-[20px] font-extrabold tracking-[-0.03em] text-white outline-none sm:text-2xl">
            {item.title}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            {step === 1
              ? 'Giúp AI tính cường độ phù hợp và cá nhân hoá kế hoạch tập luyện.'
              : item.helper}
          </p>
        </div>

        {/* Chibi Robot Avatar with Glowing Backlight (Only for Steps 1, 2, 3) */}
        {chibiSrc && (
          <div className="relative shrink-0 -mb-1 sm:-mb-2.5 w-[105px] h-[105px] min-[375px]:w-[120px] min-[375px]:h-[120px] min-[420px]:w-[135px] min-[420px]:h-[135px] sm:w-[150px] sm:h-[150px] flex items-end justify-center z-10 pointer-events-none">
            {/* Energy Sparks */}
            <div
              className={clsx(
                'pointer-events-none absolute top-2 flex gap-1 z-20',
                isLeftRobot ? 'left-2' : 'right-2',
              )}
            >
              <span className="h-2 w-1 rounded-full bg-accent/90 rotate-12 shadow-[0_0_6px_rgba(249,115,22,0.8)]" />
              <span className="h-2.5 w-1 rounded-full bg-accent rotate-45 shadow-[0_0_8px_rgba(249,115,22,1)]" />
            </div>

            {/* Dramatic Orange Backlight Halo */}
            <div className="pointer-events-none absolute inset-[-10%] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.48)_0%,rgba(249,115,22,0.18)_42%,transparent_72%)] blur-lg" />

            <Image
              src={chibiSrc}
              alt="AI Coach Chibi"
              width={300}
              height={300}
              priority
              className="relative z-10 h-full w-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.7)] filter"
            />
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(249,115,22,0.6)]" aria-hidden="true" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            BƯỚC {String(step).padStart(2, '0')} · {item.eyebrow}
          </span>
        </div>
        <h2 ref={headingRef} tabIndex={-1} className="text-balance text-2xl font-extrabold tracking-[-0.03em] text-white outline-none sm:text-3xl">
          {item.title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">{item.helper}</p>
      </div>
    </div>
  );
}

function PrimaryButton({ children, disabled = false, loading = false }: { children: React.ReactNode; disabled?: boolean; loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className="group inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[13px] border border-orange-400/30 bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 px-7 text-sm font-bold text-white shadow-[0_4px_22px_rgba(249,115,22,0.32)] transition-[transform,box-shadow,filter] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(249,115,22,0.48)] hover:brightness-105 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 sm:w-auto sm:px-8"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
      {!loading && <ChevronRight className="h-4 w-4 stroke-[2.5] transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />}
    </button>
  );
}

function SecondaryButton({ onClick, disabled = false }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[13px] border border-white/[0.09] bg-white/[0.025] px-5 text-sm font-semibold text-slate-300 transition-[transform,border-color,background-color,color] duration-200 hover:-translate-y-0.5 hover:border-white/[0.17] hover:bg-white/[0.045] hover:text-white active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
    >
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      Quay lại
    </button>
  );
}

export default function OnboardingForm({
  initial,
  equipment = [],
  preselectedEquipment = [],
}: {
  initial?: Profile | null;
  equipment?: EquipmentItem[];
  preselectedEquipment?: string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayNameTouched, setDisplayNameTouched] = useState(false);
  const [heightTouched, setHeightTouched] = useState(false);
  const [weightTouched, setWeightTouched] = useState(false);
  const [ageTouched, setAgeTouched] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [displayName, setDisplayName] = useState(initial?.display_name ?? '');
  const [age, setAge] = useState(initial?.age?.toString() ?? '');
  const [gender, setGender] = useState<Gender | null>(initial?.gender ?? null);
  const [height, setHeight] = useState(initial?.height_cm?.toString() ?? '');
  const [weight, setWeight] = useState(initial?.current_weight_kg?.toString() ?? '');
  const [experience, setExperience] = useState<Profile['experience_level']>(initial?.experience_level ?? null);
  const [goals, setGoals] = useState<Goal[]>(() =>
    [initial?.goal, initial?.secondary_goal].filter((goal): goal is Goal => Boolean(goal)),
  );
  const [injuryAreas, setInjuryAreas] = useState<InjuryArea[]>(initial?.injury_areas ?? []);
  const [injuryNote, setInjuryNote] = useState(initial?.injury_note ?? '');
  const [injuriesSkipped, setInjuriesSkipped] = useState(false);
  const [days, setDays] = useState<number>(initial?.preferred_training_days ?? 4);
  const initialDuration = normalizeOnboardingDuration(initial?.preferred_session_duration);
  const [duration, setDuration] = useState<number>(initialDuration);
  const bodyweightEquipmentIds = equipment.filter((item) => item.slug === 'bodyweight').map((item) => item.id);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(() =>
    [...new Set([...preselectedEquipment, ...bodyweightEquipmentIds])],
  );
  const [customGymName, setCustomGymName] = useState('');

  useEffect(() => {
    const focusTimer = window.setTimeout(() => headingRef.current?.focus({ preventScroll: true }), 80);
    return () => window.clearTimeout(focusTimer);
  }, [step]);

  function updateSelectedEquipment(next: string[]) {
    setSelectedEquipment([...new Set([...next, ...bodyweightEquipmentIds])]);
  }

  function goToStep(next: number) {
    setDirection(next > step ? 'forward' : 'back');
    setError(null);
    setStep(next);
  }

  function toggleGoal(goal: Goal) {
    setGoals((current) => {
      if (current.includes(goal)) return current.filter((item) => item !== goal);
      if (current.length >= 2) return current;
      return [...current, goal];
    });
  }

  function toggleInjury(area: InjuryArea) {
    setInjuriesSkipped(false);
    if (area === 'other' && injuryAreas.includes('other')) setInjuryNote('');
    setInjuryAreas((current) =>
      current.includes(area) ? current.filter((item) => item !== area) : [...current, area],
    );
  }

  function skipInjuries() {
    setInjuryAreas([]);
    setInjuryNote('');
    setInjuriesSkipped(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 1) {
      setDisplayNameTouched(true);
      setHeightTouched(true);
      setWeightTouched(true);
      setAgeTouched(true);
      const submittedHeight = Number(height);
      const submittedWeight = Number(weight);
      if (
        displayName.trim()
        && height !== ''
        && submittedHeight >= 100
        && submittedHeight <= 250
        && weight !== ''
        && submittedWeight >= 20
        && submittedWeight <= 300
        && Number(age) >= 13
        && Number(age) <= 100
        && gender
      ) goToStep(2);
      return;
    }
    if (step === 2) {
      if (experience && goals.length > 0) goToStep(3);
      return;
    }
    if (step === 3) {
      goToStep(4);
      return;
    }
    void save();
  }

  async function save() {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        setLoading(false);
        return;
      }

      // 1. Fetch profile ID
      let profileId = initial?.id;
      if (!profileId) {
        const { data: profileRow, error: profileErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileErr || !profileRow) {
          setError('Không tìm thấy thông tin hồ sơ. Vui lòng thử lại.');
          setLoading(false);
          return;
        }
        profileId = profileRow.id;
      }

      // Persist the profile fields before mutating related equipment records.
      // This prevents a missing/outdated database schema from leaving equipment half-synced.
      const { error: profileFieldsErr } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          age: Number(age),
          gender,
          height_cm: height ? Number(height) : null,
          current_weight_kg: weight ? Number(weight) : null,
          experience_level: experience,
          goal: goals[0] ?? null,
          secondary_goal: goals[1] ?? null,
          injury_areas: injuryAreas,
          injury_note: injuryNote.trim() || null,
          preferred_training_days: days,
          preferred_session_duration: duration,
        })
        .eq('user_id', user.id);

      if (profileFieldsErr) {
        setError(
          isMissingOnboardingSchema(profileFieldsErr.message)
            ? 'Database chưa được cập nhật cho hồ sơ mới. Hãy áp dụng migration onboarding rồi thử lại.'
            : `Không thể lưu thông tin hồ sơ: ${profileFieldsErr.message}`,
        );
        setLoading(false);
        return;
      }

      // 1b. Sync canonical training_constraints so all AI surfaces and profile panel receive them
      if (injuryAreas.length > 0) {
        const nowIso = new Date().toISOString();
        for (const region of injuryAreas) {
          const isKnee = region === 'knee';
          const triggers = isKnee
            ? ['deep_flexion', 'high_impact', 'kneeling', 'squat', 'lunge', 'leg_press']
            : ['overhead_load', 'excessive_strain'];

          await supabase.from('training_constraints').upsert(
            {
              user_id: user.id,
              region,
              side: 'both',
              severity: 3,
              triggers,
              excluded_exercise_slugs: [],
              status: 'active',
              source: 'user',
              valid_from: nowIso,
              user_confirmed_at: nowIso,
              updated_at: nowIso,
            },
            { onConflict: 'user_id,region' }
          );
        }
      }

      // 2. Sync equipment only after the profile payload is accepted.
      const { error: delErr } = await supabase
        .from('profile_equipment')
        .delete()
        .eq('profile_id', profileId);

      if (delErr) {
        setError(`Không thể đồng bộ danh sách thiết bị: ${delErr.message}`);
        setLoading(false);
        return;
      }

      if (selectedEquipment.length > 0) {
        const rows = selectedEquipment.map((equipment_id) => ({
          profile_id: profileId,
          equipment_id,
        }));
        const { error: insErr } = await supabase
          .from('profile_equipment')
          .insert(rows);

        if (insErr) {
          setError(`Không thể lưu danh sách thiết bị: ${insErr.message}`);
          setLoading(false);
          return;
        }
      }

      // 3. Persist the initial gym setup (from custom modal or preset)
      // Reuse the latest same-name gym so a retry cannot create duplicates.
      const inferredPreset = inferPresetFromEquipmentIds(selectedEquipment, equipment);
      const defaultGymName =
        inferredPreset === 'gym_full'
          ? 'Phòng Gym đầy đủ'
          : inferredPreset === 'gym_standard'
          ? 'Phòng Gym tiêu chuẩn'
          : inferredPreset === 'home_basic'
          ? 'Tập tại nhà'
          : inferredPreset === 'none'
          ? 'Không gian tự do (Bodyweight)'
          : 'Phòng tập của tôi';

      const normalizedGymName = customGymName.trim() || defaultGymName;
      if (normalizedGymName) {
        const { data: existingGym, error: lookupGymErr } = await supabase
          .from('gyms')
          .select('id')
          .eq('owner_user_id', user.id)
          .eq('name', normalizedGymName)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lookupGymErr) {
          setError(`Không thể kiểm tra phòng tập: ${lookupGymErr.message}`);
          setLoading(false);
          return;
        }

        let gymId = existingGym?.id as string | undefined;
        if (!gymId) {
          const { data: createdGym, error: createGymErr } = await supabase
            .from('gyms')
            .insert({
              owner_user_id: user.id,
              name: normalizedGymName,
              description: 'Phòng tập được thiết lập trong bước khởi tạo hồ sơ.',
            })
            .select('id')
            .single();

          if (createGymErr || !createdGym) {
            setError(`Không thể tạo phòng tập: ${createGymErr?.message ?? 'Không rõ nguyên nhân'}`);
            setLoading(false);
            return;
          }
          gymId = createdGym.id;
        }

        const { error: clearGymEquipmentErr } = await supabase
          .from('gym_equipment')
          .delete()
          .eq('gym_id', gymId);

        if (clearGymEquipmentErr) {
          setError(`Không thể cập nhật thiết bị phòng tập: ${clearGymEquipmentErr.message}`);
          setLoading(false);
          return;
        }

        if (selectedEquipment.length > 0) {
          const { error: gymEquipmentErr } = await supabase
            .from('gym_equipment')
            .insert(selectedEquipment.map((equipment_id) => ({ gym_id: gymId, equipment_id })));

          if (gymEquipmentErr) {
            setError(`Không thể lưu thiết bị cho phòng tập: ${gymEquipmentErr.message}`);
            setLoading(false);
            return;
          }
        }
      }

      // 4. Mark onboarding complete only after profile, equipment and custom gym all succeed.
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          onboarding_step: 4,
        })
        .eq('user_id', user.id);

      if (updateErr) {
        setError(`Không thể lưu thông tin hồ sơ: ${updateErr.message}`);
        setLoading(false);
        return;
      }

      setCompleted(true);
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      await new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 80 : 700));
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Đã xảy ra lỗi không xác định trong quá trình lưu hồ sơ.');
      setLoading(false);
    }
  }

  const stepAnimationClass = direction === 'forward' ? 'onboarding-step-forward' : 'onboarding-step-back';
  const heightIsValid = height !== '' && Number(height) >= 100 && Number(height) <= 250;
  const weightIsValid = weight !== '' && Number(weight) >= 20 && Number(weight) <= 300;
  const ageIsValid = Number(age) >= 13 && Number(age) <= 100;
  const canContinueProfile = Boolean(displayName.trim() && heightIsValid && weightIsValid && ageIsValid && gender);
  const visibleEquipmentCount = selectedEquipment.filter((id) => !bodyweightEquipmentIds.includes(id)).length;
  const genderLabel = genderOptions.find((item) => item.value === gender)?.label ?? 'Chưa chọn';
  const experienceLabel = expOptions.find((item) => item.value === experience)?.label ?? 'Chưa chọn';
  const goalLabels = goals.map((goal) => goalOptions.find((item) => item.value === goal)?.label).filter(Boolean).join(' · ');
  const injuryLabels = injuryAreas.map((area) => injuryOptions.find((item) => item.value === area)?.label).filter(Boolean).join(', ');

  return (
    <form
      onSubmit={handleSubmit}
      className="onboarding-form-shell relative z-20 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0c1017] shadow-2xl"
      noValidate
    >
      <ProgressStepper step={step} complete={completed} />

      <div className="onboarding-form-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-8 xl:px-12">
        {completed ? (
          <div className="onboarding-complete flex min-h-[300px] flex-col items-center justify-center text-center" role="status" aria-live="polite">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-400">
              <ShieldCheck className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-white">Đã tạo hồ sơ</h2>
            <p className="mt-2 text-sm text-slate-400">AI Coach đang chuẩn bị trải nghiệm dành riêng cho bạn.</p>
          </div>
        ) : (
          <div key={step} className={stepAnimationClass}>
            <StepHeader step={step} headingRef={headingRef} />

            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="onboarding-display-name" className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300">
                    TÊN HIỂN THỊ
                  </label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                      id="onboarding-display-name"
                      className="onboarding-input onboarding-input--leading"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      onBlur={() => setDisplayNameTouched(true)}
                      placeholder="Nhập tên hiển thị của bạn"
                      autoComplete="name"
                      aria-invalid={displayNameTouched && !displayName.trim()}
                      aria-describedby={displayNameTouched && !displayName.trim() ? 'display-name-error' : undefined}
                    />
                  </div>
                  {displayNameTouched && !displayName.trim() && (
                    <p id="display-name-error" className="mt-2 text-xs font-medium text-red-400">Hãy nhập tên để tiếp tục.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label htmlFor="onboarding-height" className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300">
                      CHIỀU CAO
                    </label>
                    <div className="relative">
                      <Ruler className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      <input
                        id="onboarding-height"
                        className="onboarding-input onboarding-input--leading onboarding-input--trailing"
                        type="number"
                        inputMode="numeric"
                        value={height}
                        onChange={(event) => setHeight(event.target.value)}
                        onBlur={() => setHeightTouched(true)}
                        placeholder="Ví dụ: 170"
                        min={100}
                        max={250}
                        aria-invalid={heightTouched && !heightIsValid}
                        aria-describedby={heightTouched && !heightIsValid ? 'height-error' : undefined}
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">cm</span>
                    </div>
                    {heightTouched && !heightIsValid && (
                      <p id="height-error" className="mt-2 text-xs font-medium text-red-400">Nhập chiều cao từ 100 đến 250 cm.</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="onboarding-weight" className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300">
                      CÂN NẶNG
                    </label>
                    <div className="relative">
                      <Scale className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      <input
                        id="onboarding-weight"
                        className="onboarding-input onboarding-input--leading onboarding-input--trailing"
                        type="number"
                        inputMode="numeric"
                        value={weight}
                        onChange={(event) => setWeight(event.target.value)}
                        onBlur={() => setWeightTouched(true)}
                        placeholder="Ví dụ: 70"
                        min={20}
                        max={300}
                        step={0.1}
                        aria-invalid={weightTouched && !weightIsValid}
                        aria-describedby={weightTouched && !weightIsValid ? 'weight-error' : undefined}
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">kg</span>
                    </div>
                    {weightTouched && !weightIsValid && (
                      <p id="weight-error" className="mt-2 text-xs font-medium text-red-400">Nhập cân nặng từ 20 đến 300 kg.</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
                  <div>
                    <label htmlFor="onboarding-age" className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300">
                      TUỔI
                    </label>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      <input
                        id="onboarding-age"
                        className="onboarding-input onboarding-input--leading"
                        type="number"
                        inputMode="numeric"
                        value={age}
                        onChange={(event) => setAge(event.target.value)}
                        onBlur={() => setAgeTouched(true)}
                        placeholder="Ví dụ: 25"
                        min={13}
                        max={100}
                        aria-invalid={ageTouched && !ageIsValid}
                        aria-describedby={ageTouched && !ageIsValid ? 'age-error' : undefined}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {ageTouched && !ageIsValid ? (
                        <span className="font-medium text-red-400">Nhập tuổi từ 13 đến 100.</span>
                      ) : (
                        'Nhập tuổi từ 13 đến 100.'
                      )}
                    </p>
                  </div>
                  <fieldset>
                    <legend className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300">
                      GIỚI TÍNH
                    </legend>
                    <div className="grid grid-cols-3 gap-2.5">
                      {genderOptions.map((option) => (
                        <OptionCard
                          key={option.value}
                          label={option.label}
                          icon={UserRound}
                          compact
                          selected={gender === option.value}
                          onClick={() => setGender(option.value)}
                        />
                      ))}
                    </div>
                  </fieldset>
                </div>

                {/* Mobile Security Note */}
                <div className="flex items-center gap-2 text-xs text-slate-400 pt-1 lg:hidden">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-accent shrink-0">
                    <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                  </span>
                  <span>Thông tin của bạn được bảo mật tuyệt đối.</span>
                </div>

                <div className="flex justify-end pt-2 sm:pt-4">
                  <PrimaryButton disabled={!canContinueProfile}>Tiếp theo</PrimaryButton>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 sm:space-y-6">
                {/* Section 1: KINH NGHIỆM TẬP GYM */}
                <fieldset className="rounded-[18px] border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
                  <legend className="mb-3 block font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300">
                    KINH NGHIỆM TẬP GYM
                  </legend>
                  <div className="grid grid-cols-3 gap-2.5">
                    {expOptions.map((option) => {
                      const selected = experience === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setExperience(option.value)}
                          className={clsx(
                            'group flex flex-col items-center justify-center gap-2 rounded-[13px] border py-3 px-2 text-center transition-all duration-200',
                            selected
                              ? 'border-accent/90 bg-accent/[0.09] text-accent ring-1 ring-accent/30 shadow-[0_2px_14px_rgba(249,115,22,0.15)]'
                              : 'border-white/[0.08] bg-white/[0.025] text-slate-300 hover:border-white/[0.16] hover:bg-white/[0.045]',
                          )}
                        >
                          <span
                            className={clsx(
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-200',
                              selected
                                ? 'bg-accent text-white shadow-[0_0_8px_rgba(249,115,22,0.4)]'
                                : 'border border-white/20 bg-transparent',
                            )}
                          >
                            {selected ? <Check className="h-3 w-3 stroke-[3]" /> : null}
                          </span>
                          <span className={clsx('text-[13px] font-bold tracking-tight', selected ? 'text-accent' : 'text-slate-200')}>
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* Section 2: MỤC TIÊU CHÍNH */}
                <fieldset className="rounded-[18px] border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
                  <div className="mb-3 flex w-full items-center justify-between gap-3">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300">
                      MỤC TIÊU CHÍNH
                    </span>
                    <span className="font-mono text-xs font-medium text-slate-400">
                      Tối đa 2 · {goals.length}/2
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {goalOptions.map((option) => {
                      const goal = option.value as Goal;
                      const selected = goals.includes(goal);
                      const isPriority = goals[0] === goal;
                      const Icon = option.icon;
                      return (
                        <button
                          key={goal}
                          type="button"
                          disabled={!selected && goals.length >= 2}
                          onClick={() => toggleGoal(goal)}
                          className={clsx(
                            'group relative flex items-center justify-between rounded-[13px] border p-3 text-left transition-all duration-200',
                            selected
                              ? 'border-accent/90 bg-accent/[0.09] text-white shadow-[0_2px_14px_rgba(249,115,22,0.15)] ring-1 ring-accent/30'
                              : 'border-white/[0.08] bg-white/[0.025] text-slate-300 hover:border-white/[0.16] hover:bg-white/[0.045]',
                            !selected && goals.length >= 2 && 'cursor-not-allowed opacity-35',
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {Icon && (
                              <span className={clsx('flex h-6 w-6 shrink-0 items-center justify-center transition-colors', selected ? 'text-accent' : 'text-slate-400')}>
                                <Icon className="h-5 w-5" aria-hidden="true" />
                              </span>
                            )}
                            <div className="min-w-0">
                              <span className={clsx('block truncate text-xs sm:text-sm font-bold tracking-tight', selected ? 'text-accent' : 'text-slate-200')}>
                                {option.label}
                              </span>
                              {selected && isPriority && goals.length > 1 && (
                                <span className="text-[9px] font-mono uppercase text-accent/80 font-bold block">
                                  Ưu tiên
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={clsx(
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-200 ml-1.5',
                              selected
                                ? 'bg-accent text-white shadow-[0_0_8px_rgba(249,115,22,0.4)]'
                                : 'border border-white/20 bg-transparent',
                            )}
                          >
                            {selected ? <Check className="h-3 w-3 stroke-[3]" /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>



                {/* Mobile Security Note */}
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-1 lg:hidden">
                  <LockKeyhole className="h-3.5 w-3.5 text-accent/80" />
                  <span>Dữ liệu được bảo mật và có thể chỉnh sửa</span>
                </div>

                <div className="flex flex-col gap-2.5 pt-1 sm:flex-row-reverse sm:justify-between">
                  <PrimaryButton disabled={!experience || goals.length === 0}>Tiếp theo</PrimaryButton>
                  <SecondaryButton onClick={() => goToStep(1)} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                {/* Field 1: Số ngày tập mỗi tuần */}
                <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.022] p-4 sm:p-5">
                  <div className="mb-3.5 flex items-center justify-between gap-3">
                    <div>
                      <label className="text-sm font-bold text-slate-100">Số ngày tập mỗi tuần</label>
                      <p className="mt-0.5 text-xs text-slate-400">Chọn số buổi bạn có thể duy trì đều đặn</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 font-mono text-xs font-semibold text-accent">
                      {days} ngày / tuần
                    </span>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5" role="radiogroup" aria-label="Số ngày tập mỗi tuần">
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                      const isSelected = days === d;
                      return (
                        <button
                          key={d}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => setDays(d)}
                          className={clsx(
                            'flex aspect-square w-full items-center justify-center rounded-xl border font-mono text-sm sm:text-base font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer',
                            isSelected
                              ? 'border-accent bg-accent text-white shadow-[0_0_16px_rgba(249,115,22,0.45)] scale-[1.04]'
                              : 'border-white/[0.08] bg-white/[0.025] text-slate-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white',
                          )}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Field 2: Thời lượng mỗi buổi */}
                <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.022] p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <label className="text-sm font-bold text-slate-100">Thời lượng mỗi buổi</label>
                      <p className="mt-0.5 text-xs text-slate-400">Kéo thanh trượt để chọn thời gian</p>
                    </div>
                    <div className="flex items-baseline gap-1 rounded-full border border-accent/25 bg-accent/10 px-3.5 py-1 text-accent">
                      <span className="font-mono text-base font-extrabold">{duration}</span>
                      <span className="text-xs font-semibold">phút / buổi</span>
                    </div>
                  </div>

                  {/* Clean Minimal Slider */}
                  <div className="space-y-3 pt-2">
                    <div className="relative flex items-center px-1">
                      <input
                        type="range"
                        min={ONBOARDING_DURATION_OPTIONS[0]}
                        max={ONBOARDING_DURATION_OPTIONS[ONBOARDING_DURATION_OPTIONS.length - 1]}
                        step={15}
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        style={{
                          background: `linear-gradient(to right, #f97316 0%, #f97316 ${((duration - 30) / 90) * 100}%, rgba(255, 255, 255, 0.1) ${((duration - 30) / 90) * 100}%, rgba(255, 255, 255, 0.1) 100%)`,
                        }}
                        className="w-full h-3 rounded-lg appearance-none cursor-pointer accent-[#f97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        aria-label="Thanh trượt thời lượng mỗi buổi tập"
                      />
                    </div>

                    {/* Scale tick marks */}
                    <div className="flex justify-between px-1 text-xs font-mono font-bold">
                      {ONBOARDING_DURATION_OPTIONS.map((val) => {
                        const isCurrent = duration === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setDuration(val)}
                            className={clsx(
                              'py-1 px-1.5 rounded-md transition-all cursor-pointer',
                              isCurrent
                                ? 'text-accent font-black scale-110'
                                : 'text-slate-400 hover:text-white',
                            )}
                          >
                            {val}′
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 pt-1 sm:flex-row-reverse sm:justify-between">
                  <PrimaryButton>Tiếp theo</PrimaryButton>
                  <SecondaryButton onClick={() => goToStep(2)} />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <EquipmentStep
                  equipment={equipment}
                  selected={selectedEquipment}
                  onChange={updateSelectedEquipment}
                  customGymName={customGymName}
                  onCustomGymNameChange={setCustomGymName}
                  hideHeader
                />

                {error && (
                  <div className="rounded-[13px] border border-red-400/20 bg-red-400/[0.07] px-4 py-3" role="alert">
                    <p className="text-sm font-medium text-red-300">{error}</p>
                  </div>
                )}

                {/* Mobile Security Note */}
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-1 lg:hidden">
                  <LockKeyhole className="h-3.5 w-3.5 text-accent/80" />
                  <span>Dữ liệu được bảo mật và có thể chỉnh sửa</span>
                </div>

                <div className="flex flex-col gap-2.5 pt-1 sm:flex-row-reverse sm:justify-between">
                  <PrimaryButton loading={loading}>{loading ? 'Đang khởi tạo…' : 'Xác nhận & Khởi tạo'}</PrimaryButton>
                  <SecondaryButton onClick={() => goToStep(3)} disabled={loading} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="hidden shrink-0 grid-cols-3 gap-5 border-t border-white/[0.08] px-8 py-4 text-[11px] font-medium leading-relaxed text-slate-400 lg:grid xl:px-12">
        <p className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" />
          Dữ liệu chỉ lưu để cá nhân hoá cho bạn
        </p>
        <p className="flex items-center justify-center gap-2 border-x border-white/[0.06] px-4">
          <LockKeyhole className="h-4 w-4 shrink-0 text-slate-400" />
          Không chia sẻ với bên thứ ba
        </p>
        <p className="flex items-center justify-end gap-2">
          <PencilLine className="h-4 w-4 shrink-0 text-slate-400" />
          Bạn có thể chỉnh sửa bất kỳ lúc nào
        </p>
      </div>
    </form>
  );
}
