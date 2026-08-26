'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/theme-provider';
import {
  User,
  Mail,
  Sun,
  Moon,
  Monitor,
  Target,
  Flame,
  Zap,
  Activity,
  ShieldCheck,
  Calendar,
  Clock,
  Ruler,
  Scale,
  ScanLine,
  Check,
  CheckCircle2,
  LogOut,
  Sparkles,
  Brain,
  ChevronRight,
  TrendingUp,
  Info,
  Minus,
  Plus,
} from 'lucide-react';
import AdaptiveProfilePanel from './adaptive-profile-panel';
import InBodyScanModal from '@/components/inbody-scan-modal';

type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
type TrainingGoal = 'muscle_gain' | 'strength_gain' | 'fat_loss' | 'maintenance';
type UnitSystem = 'metric' | 'imperial';

type ProfileData = {
  user_id: string;
  display_name?: string | null;
  height_cm?: number | null;
  current_weight_kg?: number | null;
  experience_level?: ExperienceLevel | null;
  goal?: TrainingGoal | null;
  preferred_training_days?: number | null;
  preferred_session_duration?: number | null;
  unit_system?: UnitSystem | null;
};

const GOAL_OPTIONS: {
  id: TrainingGoal;
  title: string;
  subtitle: string;
  icon: typeof Flame;
  badge: string;
}[] = [
  {
    id: 'muscle_gain',
    title: 'Tăng cơ',
    subtitle: 'Kích thích phì đại sợi cơ (Hypertrophy), tăng kích thước và độ dày khối cơ bắp',
    icon: Flame,
    badge: 'Tối ưu thể tích',
  },
  {
    id: 'strength_gain',
    title: 'Tăng sức mạnh',
    subtitle: 'Tối ưu dẫn truyền thần kinh, nâng cao giới hạn tạ và kỷ lục cá nhân (1RM)',
    icon: Zap,
    badge: 'Tối ưu tải trọng',
  },
  {
    id: 'fat_loss',
    title: 'Giảm mỡ',
    subtitle: 'Thâm hụt calo kiểm soát, tăng cường trao đổi chất và làm nét khối cơ',
    icon: Activity,
    badge: 'Đốt mỡ & Nét cơ',
  },
  {
    id: 'maintenance',
    title: 'Duy trì thể lực',
    subtitle: 'Giữ vững phong độ, duy trì thể lực dẻo dai và nâng cao sức khỏe tim mạch',
    icon: ShieldCheck,
    badge: 'Sức bền & Dẻo dai',
  },
];

const EXPERIENCE_OPTIONS: {
  id: ExperienceLevel;
  title: string;
  timeframe: string;
  desc: string;
}[] = [
  {
    id: 'beginner',
    title: 'Mới bắt đầu',
    timeframe: '< 6 tháng',
    desc: 'Làm quen chuẩn kỹ thuật chuyển động, xây dựng nền tảng cơ bắp ban đầu.',
  },
  {
    id: 'intermediate',
    title: 'Trung cấp',
    timeframe: '6 tháng - 2 năm',
    desc: 'Đã chuẩn form cơ bản, áp dụng tăng tiến khối lượng tạ (Progressive Overload).',
  },
  {
    id: 'advanced',
    title: 'Nâng cao',
    timeframe: '> 2 năm',
    desc: 'Tập luyện cường độ cao, tối ưu phân chia nhóm cơ và các kỹ thuật chuyên sâu.',
  },
];

const DURATION_PRESETS = [30, 45, 60, 75, 90, 120];

export default function ProfileForm({ initial, email }: { initial: ProfileData; email: string }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'goals' | 'metrics' | 'adaptive' | 'account'>('goals');

  // Form states
  const [displayName, setDisplayName] = useState(initial?.display_name ?? '');
  const [height, setHeight] = useState(initial?.height_cm?.toString() ?? '');
  const [weight, setWeight] = useState(initial?.current_weight_kg?.toString() ?? '');
  const [experience, setExperience] = useState<ExperienceLevel>(initial?.experience_level ?? 'beginner');
  const [goal, setGoal] = useState<TrainingGoal>(initial?.goal ?? 'muscle_gain');
  const [days, setDays] = useState<number>(initial?.preferred_training_days ?? 2);
  const [duration, setDuration] = useState<number>(initial?.preferred_session_duration ?? 60);
  const [unit, setUnit] = useState<UnitSystem>(initial?.unit_system ?? 'metric');
  const [hoveredGoal, setHoveredGoal] = useState<TrainingGoal | null>(null);
  const [hoveredExp, setHoveredExp] = useState<ExperienceLevel | null>(null);
  const [isInBodyModalOpen, setIsInBodyModalOpen] = useState(false);

  const handleInBodySaved = useCallback((measurement: { weightKg?: number | null; bmi?: number | null }) => {
    if (measurement.weightKg) {
      setWeight(measurement.weightKg.toString());
    }
  }, []);

  const isInitialMount = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Core silent save function
  const performSave = useCallback(
    async (dataToSave: {
      displayName: string;
      height: string;
      weight: string;
      experience: ExperienceLevel;
      goal: TrainingGoal;
      days: number;
      duration: number;
      unit: UnitSystem;
    }) => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const targetUserId = initial?.user_id || user?.id;
        if (!targetUserId) return;

        const hNum = dataToSave.height ? parseFloat(dataToSave.height) : null;
        const wNum = dataToSave.weight ? parseFloat(dataToSave.weight) : null;

        const heightCm =
          hNum !== null && !isNaN(hNum) && hNum > 0
            ? dataToSave.unit === 'metric'
              ? hNum
              : Math.round(hNum * 2.54 * 10) / 10
            : null;

        const weightKg =
          wNum !== null && !isNaN(wNum) && wNum > 0
            ? dataToSave.unit === 'metric'
              ? wNum
              : Math.round((wNum / 2.20462) * 10) / 10
            : null;

        await supabase
          .from('profiles')
          .upsert({
            user_id: targetUserId,
            display_name: dataToSave.displayName.trim() || null,
            height_cm: heightCm,
            current_weight_kg: weightKg,
            experience_level: dataToSave.experience,
            goal: dataToSave.goal,
            preferred_training_days: dataToSave.days,
            preferred_session_duration: dataToSave.duration,
            unit_system: dataToSave.unit,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        router.refresh();
      } catch (e) {
        console.error('Error auto-saving profile:', e);
      }
    },
    [initial?.user_id, router]
  );

  // Automatically save on state changes with debounce (silently in background)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      performSave({
        displayName,
        height,
        weight,
        experience,
        goal,
        days,
        duration,
        unit,
      });
    }, 450); // 450ms debounce for ultra smooth responsiveness

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [displayName, height, weight, experience, goal, days, duration, unit, performSave]);

  // Unit toggle handler with automatic value conversion
  const handleUnitChange = useCallback(
    (newUnit: UnitSystem) => {
      if (newUnit === unit) return;
      if (unit === 'metric' && newUnit === 'imperial') {
        if (height) {
          const hIn = Math.round((parseFloat(height) / 2.54) * 10) / 10;
          if (!isNaN(hIn) && hIn > 0) setHeight(hIn.toString());
        }
        if (weight) {
          const wLbs = Math.round(parseFloat(weight) * 2.20462 * 10) / 10;
          if (!isNaN(wLbs) && wLbs > 0) setWeight(wLbs.toString());
        }
      } else if (unit === 'imperial' && newUnit === 'metric') {
        if (height) {
          const hCm = Math.round(parseFloat(height) * 2.54);
          if (!isNaN(hCm) && hCm > 0) setHeight(hCm.toString());
        }
        if (weight) {
          const wKg = Math.round((parseFloat(weight) / 2.20462) * 10) / 10;
          if (!isNaN(wKg) && wKg > 0) setWeight(wKg.toString());
        }
      }
      setUnit(newUnit);
    },
    [unit, height, weight]
  );

  // Stepper adjustments for quick tap interaction
  const adjustHeight = useCallback(
    (delta: number) => {
      const current = parseFloat(height) || (unit === 'metric' ? 170 : 67);
      const next = Math.max(1, Math.round((current + delta) * 10) / 10);
      setHeight(next.toString());
    },
    [height, unit]
  );

  const adjustWeight = useCallback(
    (delta: number) => {
      const current = parseFloat(weight) || (unit === 'metric' ? 65 : 143);
      const next = Math.max(1, Math.round((current + delta) * 10) / 10);
      setWeight(next.toString());
    },
    [weight, unit]
  );

  // Secondary conversion helpers
  const heightConversionHint = useMemo(() => {
    const h = parseFloat(height);
    if (!h || isNaN(h) || h <= 0) return null;
    if (unit === 'metric') {
      const totalIn = h / 2.54;
      const ft = Math.floor(totalIn / 12);
      const inch = Math.round(totalIn % 12);
      return `≈ ${ft}'${inch}"`;
    } else {
      return `≈ ${Math.round(h * 2.54)} cm`;
    }
  }, [height, unit]);

  const weightConversionHint = useMemo(() => {
    const w = parseFloat(weight);
    if (!w || isNaN(w) || w <= 0) return null;
    if (unit === 'metric') {
      return `≈ ${(w * 2.20462).toFixed(1)} lbs`;
    } else {
      return `≈ ${(w / 2.20462).toFixed(1)} kg`;
    }
  }, [weight, unit]);

  // BMI Calculation & Extended Health Insights
  const bmiInfo = useMemo(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!h || !w || h <= 0 || w <= 0) return null;

    // Standardize to metric for WHO / Asia formulas
    const heightCm = unit === 'metric' ? h : h * 2.54;
    const weightKg = unit === 'metric' ? w : w / 2.20462;

    const heightInMeters = heightCm / 100;
    const bmiVal = weightKg / (heightInMeters * heightInMeters);
    const rounded = Math.round(bmiVal * 10) / 10;

    // Ideal weight bounds based on WHO Asian BMI Standard (18.5 - 22.9)
    const minIdealKg = Math.round(18.5 * heightInMeters * heightInMeters * 10) / 10;
    const maxIdealKg = Math.round(22.9 * heightInMeters * heightInMeters * 10) / 10;

    let category = 'Cân đối lý tưởng';
    let colorClass = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25';
    let coachTip =
      'Chỉ số rất đẹp! Thể trạng cân đối lý tưởng, thuận lợi để tăng cơ hoặc duy trì vóc dáng săn chắc.';

    if (rounded < 18.5) {
      category = 'Thiếu cân';
      colorClass = 'text-sky-500 bg-sky-500/10 border-sky-500/25';
      coachTip =
        'Bạn đang dưới mức cân chuẩn. Nên tăng cường nạp năng lượng calo dồi dào và tập luyện để tăng cân & cơ bắp.';
    } else if (rounded >= 18.5 && rounded <= 22.9) {
      category = 'Cân đối lý tưởng';
      colorClass = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25';
      coachTip =
        'Chỉ số rất đẹp! Thể trạng cân đối lý tưởng, thuận lợi để tăng cơ hoặc duy trì vóc dáng săn chắc.';
    } else if (rounded >= 23.0 && rounded <= 24.9) {
      category = 'Thừa cân nhẹ';
      colorClass = 'text-amber-500 bg-amber-500/10 border-amber-500/25';
      coachTip =
        'Cân nặng hơi cao nhẹ. Nếu bạn có khối cơ bắp phát triển thì hoàn toàn bình thường; nếu không, hãy kiểm soát nhẹ calo nạp vào.';
    } else {
      category = 'Nguy cơ béo phì';
      colorClass = 'text-rose-500 bg-rose-500/10 border-rose-500/25';
      coachTip =
        'Chỉ số BMI ở ngưỡng cao. Nên kết hợp thâm hụt calo hợp lý cùng các buổi tập kháng lực và cardio để bảo vệ sức khoẻ.';
    }

    // Gauge positioning percentage (range: 15 to 35)
    const gaugePercent = Math.min(Math.max(((rounded - 15) / (35 - 15)) * 100, 3), 97);

    const minIdeal =
      unit === 'metric' ? `${minIdealKg} kg` : `${(minIdealKg * 2.20462).toFixed(1)} lbs`;
    const maxIdeal =
      unit === 'metric' ? `${maxIdealKg} kg` : `${(maxIdealKg * 2.20462).toFixed(1)} lbs`;

    return {
      value: rounded,
      category,
      colorClass,
      coachTip,
      gaugePercent,
      idealRange: `${minIdeal} - ${maxIdeal}`,
    };
  }, [height, weight, unit]);

  // Days Recommendation Hint
  const daysCoachTip = useMemo(() => {
    if (days <= 2) return 'Phù hợp cho lịch tập Full Body (Toàn thân) 2 buổi/tuần duy trì sức khỏe.';
    if (days === 3) return 'Tuyệt vời cho lịch tập Full Body 3 buổi cách ngày hoặc Upper/Lower/Full.';
    if (days === 4) return 'Lý tưởng cho phân chia Upper / Lower hoặc Push / Pull cân bằng phục hồi.';
    if (days === 5) return 'Tối ưu cho lịch tập Push / Pull / Legs + Upper / Lower hoặc Body Split.';
    if (days === 6) return 'Chuyên sâu Push / Pull / Legs (2 vòng/tuần) - cần dinh dưỡng & ngủ đủ.';
    return 'Cường độ hàng ngày - nên xen kẽ các ngày Active Recovery / Phục hồi cơ bắp.';
  }, [days]);

  // Dynamic Goal & Experience Info (Live preview on hover/select)
  const activeGoalInfo = useMemo(() => {
    return GOAL_OPTIONS.find((g) => g.id === (hoveredGoal || goal)) ?? GOAL_OPTIONS[0];
  }, [hoveredGoal, goal]);

  const activeExpInfo = useMemo(() => {
    return EXPERIENCE_OPTIONS.find((e) => e.id === (hoveredExp || experience)) ?? EXPERIENCE_OPTIONS[0];
  }, [hoveredExp, experience]);

  // User initials
  const initials = useMemo(() => {
    if (displayName) {
      const parts = displayName.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return 'ME';
  }, [displayName, email]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Hero Profile Summary Card */}
      <div className="card relative overflow-hidden rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 lg:p-8 border border-white/80 dark:border-white/10 shadow-neumorph-lg">
        {/* Ambient subtle glow background */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-6">
          {/* Avatar & User Details */}
          <div className="flex items-center gap-3 sm:gap-5 w-full sm:w-auto">
            <div className="relative flex h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-accent via-accent-dim to-orange-600 text-white font-extrabold text-base sm:text-2xl shadow-accent">
              <span>{initials}</span>
              <span className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 sm:ring-4 ring-chassis">
                <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" strokeWidth={3} />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-base sm:text-2xl font-black tracking-tight text-ink truncate">
                  {displayName || 'Vận động viên'}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 border border-accent/25 px-2 py-0.2 sm:px-2.5 sm:py-0.5 font-mono text-[9px] sm:text-[10px] font-bold text-accent">
                  <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> GymAI Member
                </span>
              </div>
              <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] sm:text-xs text-ink-muted truncate">
                <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-ink-muted shrink-0" />
                <span className="truncate">{email}</span>
              </p>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              href="/profile/weight"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg sm:rounded-xl bg-chassis px-2.5 py-2 sm:px-3.5 sm:py-2.5 text-[11px] sm:text-xs font-bold text-ink shadow-neumorph-sm hover:shadow-neumorph border border-white/60 dark:border-white/5 transition-all hover:text-accent whitespace-nowrap"
            >
              <Scale className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
              <span>Ghi cân nặng</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsInBodyModalOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg sm:rounded-xl bg-accent/10 hover:bg-accent/20 px-2.5 py-2 sm:px-3.5 sm:py-2.5 text-[11px] sm:text-xs font-bold text-accent border border-accent/30 transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              <ScanLine className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Quét InBody AI</span>
            </button>
          </div>
        </div>

        {/* Quick Highlights Row */}
        <div className="mt-3 sm:mt-5 grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3 pt-3 sm:pt-5 border-t border-black/5 dark:border-white/5">
          <div className="recessed-bay p-2 sm:p-3 rounded-lg sm:rounded-xl">
            <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-ink-muted block">Mục tiêu</span>
            <span className="text-xs sm:text-sm font-bold text-ink truncate block mt-0.5">
              {GOAL_OPTIONS.find((g) => g.id === goal)?.title ?? 'Tăng cơ'}
            </span>
          </div>

          <div className="recessed-bay p-2 sm:p-3 rounded-lg sm:rounded-xl">
            <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-ink-muted block">Thể trạng (BMI)</span>
            <span className="text-xs sm:text-sm font-bold text-ink block mt-0.5 truncate">
              {bmiInfo ? `${bmiInfo.value} · ${bmiInfo.category}` : `${height || '-'} cm / ${weight || '-'} kg`}
            </span>
          </div>

          <div className="recessed-bay p-2 sm:p-3 rounded-lg sm:rounded-xl">
            <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-ink-muted block">Lịch tập</span>
            <span className="text-xs sm:text-sm font-bold text-ink block mt-0.5">
              {days} buổi / tuần
            </span>
          </div>

          <div className="recessed-bay p-2 sm:p-3 rounded-lg sm:rounded-xl">
            <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-ink-muted block">Thời lượng</span>
            <span className="text-xs sm:text-sm font-bold text-ink block mt-0.5">
              {duration} phút / buổi
            </span>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="recessed-bay p-1 sm:p-1.5 flex items-center gap-1 sm:gap-1.5 rounded-xl sm:rounded-2xl shadow-inset overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('goals')}
          className={`flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5 text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'goals'
              ? 'bg-gradient-to-r from-accent to-accent-dim text-white shadow-accent'
              : 'text-ink-secondary hover:text-ink hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>Mục tiêu & Kế hoạch</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('metrics')}
          className={`flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5 text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'metrics'
              ? 'bg-gradient-to-r from-accent to-accent-dim text-white shadow-accent'
              : 'text-ink-secondary hover:text-ink hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <Ruler className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>Chỉ số thể chất</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('adaptive')}
          className={`flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5 text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'adaptive'
              ? 'bg-gradient-to-r from-accent to-accent-dim text-white shadow-accent'
              : 'text-ink-secondary hover:text-ink hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>Cá nhân hoá AI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5 text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'account'
              ? 'bg-gradient-to-r from-accent to-accent-dim text-white shadow-accent'
              : 'text-ink-secondary hover:text-ink hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>Tài khoản & Theme</span>
        </button>
      </div>

      {/* TAB 1: MỤC TIÊU & KẾ HOẠCH */}
      {activeTab === 'goals' && (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
          {/* Section: Mục tiêu tập luyện */}
          <div className="card rounded-2xl p-3.5 sm:p-6 border border-white/80 dark:border-white/10 shadow-neumorph space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <label className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-ink flex items-center gap-1.5 sm:gap-2">
                  <Target className="h-4 w-4 text-accent" />
                  Mục tiêu tập luyện chính
                </label>
                <p className="text-[11px] sm:text-xs text-ink-secondary mt-0.5">
                  Nhấp để chọn mục tiêu • Di chuột qua từng thẻ để xem nhanh định hướng chiến lược
                </p>
              </div>
            </div>

            {/* Compact Goal Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-0.5">
              {GOAL_OPTIONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = goal === item.id;
                const isHovered = hoveredGoal === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGoal(item.id)}
                    onMouseEnter={() => setHoveredGoal(item.id)}
                    onMouseLeave={() => setHoveredGoal(null)}
                    className={`text-left p-2.5 sm:p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between cursor-pointer select-none ${
                      isSelected
                        ? 'border-accent bg-accent/[0.08] shadow-accent/20 shadow-md ring-1 ring-accent'
                        : isHovered
                        ? 'border-accent/40 bg-accent/[0.03] shadow-neumorph-sm -translate-y-0.5'
                        : 'border-black/5 dark:border-white/5 bg-chassis hover:border-black/15 dark:hover:border-white/15 shadow-neumorph-sm hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div
                        className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-accent text-white shadow-sm'
                            : 'bg-black/5 dark:bg-white/5 text-ink-secondary'
                        }`}
                      >
                        <IconComponent className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs sm:text-sm text-ink truncate">{item.title}</h4>
                        <span className="font-mono text-[9px] sm:text-[10px] text-ink-muted block">{item.badge}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      {isSelected ? (
                        <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-accent bg-accent/15 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md">
                          <Check className="h-3 w-3" strokeWidth={3} />
                          <span className="hidden xs:inline">Đang chọn</span>
                        </span>
                      ) : (
                        <span className="h-5 w-5 sm:h-6 sm:w-6 rounded-lg flex items-center justify-center text-ink-muted hover:text-accent transition-colors">
                          <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Dynamic AI Strategy Guidance Box */}
            <div className="recessed-bay rounded-xl p-2.5 sm:p-3.5 flex items-start gap-2.5 sm:gap-3 border border-black/5 dark:border-white/5 transition-all">
              <div className="p-1.5 sm:p-2 rounded-lg bg-accent/10 text-accent shrink-0 mt-0.5">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="min-w-0 text-xs flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-xs sm:text-sm text-ink">
                      Chiến lược: {activeGoalInfo.title}
                    </span>
                    <span className="font-mono text-[9px] sm:text-[10px] font-bold text-accent bg-accent/10 px-1.5 sm:px-2 py-0.2 rounded">
                      {activeGoalInfo.badge}
                    </span>
                  </div>
                  {hoveredGoal && hoveredGoal !== goal && (
                    <span className="font-mono text-[9px] sm:text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded animate-pulse">
                      Xem trước
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-ink-secondary mt-1 leading-relaxed">
                  {activeGoalInfo.subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Section: Kinh nghiệm tập luyện */}
          <div className="card rounded-2xl p-3.5 sm:p-6 border border-white/80 dark:border-white/10 shadow-neumorph space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <label className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-ink flex items-center gap-1.5 sm:gap-2">
                  <Flame className="h-4 w-4 text-accent" />
                  Trình độ kinh nghiệm
                </label>
                <p className="text-[11px] sm:text-xs text-ink-secondary mt-0.5">
                  Nhấp để chọn trình độ • Di chuột qua từng thẻ để xem định lượng Volume
                </p>
              </div>
            </div>

            {/* Compact Experience Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 pt-0.5">
              {EXPERIENCE_OPTIONS.map((item) => {
                const isSelected = experience === item.id;
                const isHovered = hoveredExp === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setExperience(item.id)}
                    onMouseEnter={() => setHoveredExp(item.id)}
                    onMouseLeave={() => setHoveredExp(null)}
                    className={`text-left p-2.5 sm:p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between cursor-pointer select-none ${
                      isSelected
                        ? 'border-accent bg-accent/[0.08] ring-1 ring-accent shadow-accent/20 shadow-md'
                        : isHovered
                        ? 'border-accent/40 bg-accent/[0.03] shadow-neumorph-sm -translate-y-0.5'
                        : 'border-black/5 dark:border-white/5 bg-chassis hover:border-black/15 dark:hover:border-white/15 shadow-neumorph-sm hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="font-extrabold text-xs sm:text-sm text-ink block truncate">{item.title}</span>
                      <span className="font-mono text-[9px] sm:text-[10px] text-accent font-bold mt-0.5 block">
                        {item.timeframe}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      {isSelected ? (
                        <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-accent bg-accent/15 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      ) : (
                        <span className="h-5 w-5 sm:h-6 sm:w-6 rounded-lg flex items-center justify-center text-ink-muted hover:text-accent transition-colors">
                          <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Experience Detail Box */}
            <div className="recessed-bay rounded-xl p-2.5 sm:p-3.5 flex items-start gap-2.5 sm:gap-3 border border-black/5 dark:border-white/5 transition-all">
              <div className="p-1.5 sm:p-2 rounded-lg bg-accent/10 text-accent shrink-0 mt-0.5">
                <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="min-w-0 text-xs flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-xs sm:text-sm text-ink">
                      Định hướng: {activeExpInfo.title}
                    </span>
                    <span className="font-mono text-[9px] sm:text-[10px] font-bold text-accent bg-accent/10 px-1.5 sm:px-2 py-0.2 rounded">
                      {activeExpInfo.timeframe}
                    </span>
                  </div>
                  {hoveredExp && hoveredExp !== experience && (
                    <span className="font-mono text-[9px] sm:text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded animate-pulse">
                      Xem trước
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-ink-secondary mt-1 leading-relaxed">
                  {activeExpInfo.desc}
                </p>
              </div>
            </div>
          </div>

          {/* Section: Tần suất & Thời lượng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
            {/* Days per week */}
            <div className="card rounded-2xl p-3.5 sm:p-6 border border-white/80 dark:border-white/10 shadow-neumorph space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-ink flex items-center gap-1.5 sm:gap-2">
                  <Calendar className="h-4 w-4 text-accent" />
                  Số ngày tập / tuần
                </label>
                <span className="font-mono text-sm sm:text-base font-extrabold text-accent bg-accent/10 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-lg border border-accent/20">
                  {days} ngày
                </span>
              </div>

              {/* Day selection pills */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                  const isSelected = days === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDays(d)}
                      className={`h-9 sm:h-11 rounded-lg sm:rounded-xl font-mono text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-accent text-white shadow-accent scale-105'
                          : 'bg-chassis shadow-neumorph-sm text-ink-secondary hover:text-ink hover:border-accent/40'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>

              {/* Coach Advice */}
              <div className="rounded-xl border border-accent/20 bg-accent/5 p-2.5 sm:p-3 text-[11px] sm:text-xs text-ink-secondary flex items-start gap-2 sm:gap-2.5">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent shrink-0 mt-0.5" />
                <span>{daysCoachTip}</span>
              </div>
            </div>

            {/* Session Duration */}
            <div className="card rounded-2xl p-3.5 sm:p-6 border border-white/80 dark:border-white/10 shadow-neumorph space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-ink flex items-center gap-1.5 sm:gap-2">
                  <Clock className="h-4 w-4 text-accent" />
                  Thời lượng mỗi buổi
                </label>
                <span className="font-mono text-sm sm:text-base font-extrabold text-accent bg-accent/10 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-lg border border-accent/20">
                  {duration} phút
                </span>
              </div>

              {/* Duration Presets */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {DURATION_PRESETS.map((m) => {
                  const isSelected = duration === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDuration(m)}
                      className={`flex-1 min-w-[40px] sm:min-w-[50px] py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-mono text-[11px] sm:text-xs font-bold transition-all text-center ${
                        isSelected
                          ? 'bg-accent text-white shadow-accent'
                          : 'bg-chassis shadow-neumorph-sm text-ink-secondary hover:text-ink'
                      }`}
                    >
                      {m}&apos;
                    </button>
                  );
                })}
              </div>

              {/* Fine tuning range slider */}
              <div className="pt-2">
                <input
                  type="range"
                  min={15}
                  max={180}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full accent-[#f97316] cursor-pointer"
                />
                <div className="flex justify-between font-mono text-[10px] text-ink-muted mt-1">
                  <span>15 phút (Nhanh)</span>
                  <span>60 phút (Tiêu chuẩn)</span>
                  <span>180 phút (Chuyên sâu)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CHỈ SỐ THỂ CHẤT & INBODY */}
      {activeTab === 'metrics' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Main Anthropometrics Card */}
          <div className="card rounded-2xl p-4 sm:p-6 border border-white/80 dark:border-white/10 shadow-neumorph space-y-5">
            {/* Header with Title and Unit Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 text-accent shadow-sm">
                  <Ruler className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-extrabold text-ink">
                      Chỉ số nhân trắc học
                    </h2>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                      <Sparkles className="h-2.5 w-2.5" /> Đồng bộ tự động
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-ink-secondary mt-0.5">
                    Chiều cao và cân nặng giúp AI tính BMI, nhu cầu calo và điều chỉnh giáo án.
                  </p>
                </div>
              </div>

              {/* Unit System Toggle Switcher */}
              <div className="inline-flex p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/10 self-start sm:self-auto shadow-inner">
                <button
                  type="button"
                  onClick={() => handleUnitChange('metric')}
                  className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-all duration-200 ${
                    unit === 'metric'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-ink-secondary hover:text-ink hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  Hệ mét · cm, kg
                </button>
                <button
                  type="button"
                  onClick={() => handleUnitChange('imperial')}
                  className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-all duration-200 ${
                    unit === 'imperial'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-ink-secondary hover:text-ink hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  Hệ Anh · in, lb
                </button>
              </div>
            </div>

            {/* Symmetrical Dual Input Cards - Compact 2-column on mobile & desktop */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:gap-6">
              {/* Height Input Box */}
              <div className="rounded-xl sm:rounded-2xl p-2.5 sm:p-4 bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/10 transition-all focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20 space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-ink flex items-center gap-1 sm:gap-1.5 truncate">
                    <Ruler className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent shrink-0" />
                    Chiều cao
                  </span>
                  <span className="text-[10px] sm:text-xs font-semibold text-ink-muted bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                    {unit === 'metric' ? 'cm' : 'in'}
                  </span>
                </div>

                {/* Stepper + Input */}
                <div className="flex items-center justify-between gap-1 sm:gap-2.5 bg-white/70 dark:bg-slate-900/60 rounded-lg sm:rounded-xl p-1 sm:p-2 border border-black/5 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => adjustHeight(-1)}
                    className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-md sm:rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/15 text-ink flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-base sm:text-lg font-bold"
                    aria-label="Giảm chiều cao"
                  >
                    <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>

                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder={unit === 'metric' ? '170' : '67'}
                    className="w-full min-w-0 text-center text-lg sm:text-2xl lg:text-3xl font-bold tabular-nums text-ink bg-transparent focus:outline-none placeholder:text-ink-muted/30 p-0"
                  />

                  <button
                    type="button"
                    onClick={() => adjustHeight(1)}
                    className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-md sm:rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/15 text-ink flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-base sm:text-lg font-bold"
                    aria-label="Tăng chiều cao"
                  >
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                </div>

                {/* Footnote / Conversion */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2 text-[10px] sm:text-xs text-ink-muted px-0.5 font-mono">
                  <span className="truncate">{heightConversionHint ? `Quy đổi: ${heightConversionHint}` : '-'}</span>
                  <span className="hidden sm:inline text-ink-muted/70">{unit === 'metric' ? 'Chuẩn: 150 - 195 cm' : 'Chuẩn: 59 - 77 in'}</span>
                </div>
              </div>

              {/* Weight Input Box */}
              <div className="rounded-xl sm:rounded-2xl p-2.5 sm:p-4 bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/10 transition-all focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20 space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-ink flex items-center gap-1 sm:gap-1.5 truncate">
                    <Scale className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent shrink-0" />
                    Cân nặng
                  </span>
                  <span className="text-[10px] sm:text-xs font-semibold text-ink-muted bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                    {unit === 'metric' ? 'kg' : 'lbs'}
                  </span>
                </div>

                {/* Stepper + Input */}
                <div className="flex items-center justify-between gap-1 sm:gap-2.5 bg-white/70 dark:bg-slate-900/60 rounded-lg sm:rounded-xl p-1 sm:p-2 border border-black/5 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => adjustWeight(-0.5)}
                    className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-md sm:rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/15 text-ink flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-base sm:text-lg font-bold"
                    aria-label="Giảm cân nặng"
                  >
                    <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>

                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder={unit === 'metric' ? '65' : '143'}
                    className="w-full min-w-0 text-center text-lg sm:text-2xl lg:text-3xl font-bold tabular-nums text-ink bg-transparent focus:outline-none placeholder:text-ink-muted/30 p-0"
                  />

                  <button
                    type="button"
                    onClick={() => adjustWeight(0.5)}
                    className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-md sm:rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/15 text-ink flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-base sm:text-lg font-bold"
                    aria-label="Tăng cân nặng"
                  >
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                </div>

                {/* Footnote / Conversion */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2 text-[10px] sm:text-xs text-ink-muted px-0.5 font-mono">
                  <span className="truncate">{weightConversionHint ? `Quy đổi: ${weightConversionHint}` : '-'}</span>
                  <span className="hidden sm:inline text-ink-muted/70">{bmiInfo ? `Lý tưởng: ${bmiInfo.idealRange}` : '18.5 - 22.9'}</span>
                </div>
              </div>
            </div>

            {/* Live BMI & Visual Spectrum Gauge */}
            {bmiInfo ? (
              <div className="rounded-2xl p-4 sm:p-5 bg-white/55 dark:bg-white/[0.03] border border-black/5 dark:border-white/10 space-y-4">
                {/* Header Summary */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 border border-accent/25 text-accent font-bold text-xl tabular-nums">
                      {bmiInfo.value}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-ink">Chỉ số khối cơ thể (BMI)</span>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${bmiInfo.colorClass}`}>
                          {bmiInfo.category}
                        </span>
                      </div>
                      <p className="text-xs text-ink-secondary mt-0.5">
                        Dựa trên tiêu chuẩn nhân trắc học WHO & Thể thao Châu Á
                      </p>
                    </div>
                  </div>

                  {/* Ideal Weight Pill */}
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 self-start sm:self-auto">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div className="text-xs">
                      <span className="text-[11px] font-medium text-ink-muted block">
                        Cân nặng lý tưởng
                      </span>
                      <span className="font-bold tabular-nums text-ink">{bmiInfo.idealRange}</span>
                    </div>
                  </div>
                </div>

                {/* Visual Spectrum Gauge */}
                <div className="space-y-2 pt-1">
                  <div className="relative pt-6 pb-1">
                    {/* Gauge Floating Indicator */}
                    <div
                      className="absolute top-0 -translate-x-1/2 transition-all duration-300 flex flex-col items-center pointer-events-none"
                      style={{ left: `${bmiInfo.gaugePercent}%` }}
                    >
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 shadow-md whitespace-nowrap">
                        {bmiInfo.value}
                      </span>
                      <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900 dark:border-t-slate-100" />
                    </div>

                    {/* Progress Track */}
                    <div className="h-3 rounded-full overflow-hidden flex p-0.5 bg-black/10 dark:bg-white/10 gap-1 shadow-inner">
                      <div className="h-full rounded-l-full bg-sky-400 flex-[17.5]" title="Thiếu cân (< 18.5)" />
                      <div className="h-full bg-emerald-500 flex-[22]" title="Cân đối lý tưởng (18.5 - 22.9)" />
                      <div className="h-full bg-amber-400 flex-[10]" title="Thừa cân nhẹ (23.0 - 24.9)" />
                      <div className="h-full rounded-r-full bg-rose-500 flex-[25]" title="Nguy cơ béo phì (≥ 25.0)" />
                    </div>

                    {/* Zone Scale Labels */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 text-[11px] text-ink-muted mt-2 text-center gap-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
                        <span className="truncate">&lt; 18.5 Gầy</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        <span className="truncate">18.5-22.9 Chuẩn</span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                        <span className="truncate">23-24.9 Thừa</span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                        <span className="truncate">≥ 25 Béo phì</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Coach Feedback Box */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-accent/5 border border-accent/15">
                  <Sparkles className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  <div className="text-xs space-y-1">
                    <p className="text-ink leading-relaxed">
                      <strong className="text-accent font-bold">Gợi ý từ AI Coach: </strong>
                      {bmiInfo.coachTip}
                    </p>
                    <p className="text-[11px] text-ink-muted">
                      💡 BMI là chỉ số tham chiếu cơ bản. Để có độ chính xác cao về tỷ lệ cơ bắp & mỡ từng vùng, bạn có thể quét kết quả InBody.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-6 text-center bg-black/[0.02] dark:bg-white/[0.02] border border-dashed border-black/10 dark:border-white/10 space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent mx-auto">
                  <Activity className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-ink">Chưa đủ thông tin để tính BMI</h4>
                <p className="text-[11px] text-ink-muted max-w-sm mx-auto">
                  Hãy nhập đầy đủ chiều cao và cân nặng ở trên để xem đánh giá thể trạng và dải cân nặng lý tưởng tự động.
                </p>
              </div>
            )}
          </div>

          {/* Feature Highlights: InBody & Weight tracker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* InBody Banner Card */}
            <div className="card rounded-2xl p-6 border border-accent/30 bg-gradient-to-br from-accent/5 via-transparent to-transparent shadow-neumorph flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-accent text-white shadow-accent">
                    <ScanLine className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/15 px-2.5 py-1 rounded-full border border-accent/30">
                    AI Scanner
                  </span>
                </div>
                <h3 className="font-extrabold text-base text-ink">Thành phần cơ thể & InBody</h3>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Tải phiếu InBody để Gemini 3.5 Flash-Lite đọc chỉ số hoặc nhập thủ công tỷ lệ mỡ và khối lượng cơ xương (SMM).
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsInBodyModalOpen(true)}
                  className="btn-primary flex-1 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ScanLine className="h-4 w-4" />
                  <span>Quét InBody ngay</span>
                </button>

                <Link
                  href="/profile/body-composition"
                  className="rounded-xl bg-chassis border border-black/10 dark:border-white/10 hover:border-accent/40 px-3.5 py-2.5 text-xs font-bold text-ink-secondary hover:text-ink flex items-center justify-center transition-colors shadow-neumorph-sm"
                  title="Xem toàn bộ lịch sử đo"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Weight History Card */}
            <div className="card rounded-2xl p-6 border border-white/80 dark:border-white/10 shadow-neumorph flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-accent border border-black/5 dark:border-white/5 shadow-sm">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full">
                    Nhật ký
                  </span>
                </div>
                <h3 className="font-extrabold text-base text-ink">Theo dõi cân nặng hàng ngày</h3>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Cập nhật cân nặng mỗi sáng trước khi ăn để AI vẽ biểu đồ xu hướng 7 ngày và tính mức thâm hụt calo chính xác.
                </p>
              </div>

              <Link
                href="/profile/weight"
                className="btn-ghost w-full text-xs font-bold flex items-center justify-center gap-2"
              >
                <span>Ghi cân nặng hôm nay</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CÁ NHÂN HOÁ AI */}
      {activeTab === 'adaptive' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <AdaptiveProfilePanel />
        </div>
      )}

      {/* TAB 4: TÀI KHOẢN & THEME */}
      {activeTab === 'account' && (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
          {/* Account Profile Details */}
          <div className="card rounded-2xl p-3.5 sm:p-6 border border-white/80 dark:border-white/10 shadow-neumorph space-y-3.5 sm:space-y-5">
            <div>
              <label className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-ink flex items-center gap-1.5 sm:gap-2">
                <User className="h-4 w-4 text-accent" />
                Thông tin tài khoản
              </label>
              <p className="text-[11px] sm:text-xs text-ink-secondary mt-0.5">
                Quản lý tên định danh và email sử dụng trong hệ thống GymAI
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Display Name Input */}
              <div className="space-y-1 sm:space-y-1.5">
                <label className="label text-xs sm:text-sm">Tên hiển thị</label>
                <div className="relative">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ví dụ: Hoàng Minh"
                    className="input pl-9 sm:pl-10 text-xs sm:text-sm font-medium"
                  />
                  <User className="absolute left-3 sm:left-3.5 top-3 sm:top-3.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-ink-muted" />
                </div>
              </div>

              {/* Email (Readonly) */}
              <div className="space-y-1 sm:space-y-1.5">
                <label className="label text-xs sm:text-sm">Email đăng nhập</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="input pl-9 sm:pl-10 font-mono text-[11px] sm:text-xs opacity-75 cursor-not-allowed bg-black/5 dark:bg-white/5"
                  />
                  <Mail className="absolute left-3 sm:left-3.5 top-3 sm:top-3.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-ink-muted" />
                </div>
              </div>
            </div>
          </div>

          {/* Theme Selection */}
          <div className="card rounded-2xl p-3.5 sm:p-6 border border-white/80 dark:border-white/10 shadow-neumorph space-y-3 sm:space-y-4">
            <div>
              <label className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-ink flex items-center gap-1.5 sm:gap-2">
                <Sun className="h-4 w-4 text-accent" />
                Chế độ giao diện (Appearance Theme)
              </label>
              <p className="text-[11px] sm:text-xs text-ink-secondary mt-0.5">
                Tùy biến phong cách hiển thị sáng / tối phù hợp với môi trường tập luyện
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 pt-0.5">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-3 sm:p-4 rounded-xl border text-left transition-all ${
                  theme === 'light'
                    ? 'border-accent bg-accent/[0.08] ring-1 ring-accent shadow-md shadow-accent/20'
                    : 'border-black/5 dark:border-white/5 bg-chassis shadow-neumorph-sm hover:border-accent/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <Sun className={`h-4 w-4 sm:h-5 sm:w-5 ${theme === 'light' ? 'text-accent' : 'text-ink-secondary'}`} />
                  {theme === 'light' && <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />}
                </div>
                <h4 className="font-extrabold text-xs sm:text-sm text-ink">Giao diện Sáng</h4>
                <p className="text-[10px] sm:text-xs text-ink-muted mt-0.5 sm:mt-1">Crisp Neumorphic Steel</p>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-3 sm:p-4 rounded-xl border text-left transition-all ${
                  theme === 'dark'
                    ? 'border-accent bg-accent/[0.08] ring-1 ring-accent shadow-md shadow-accent/20'
                    : 'border-black/5 dark:border-white/5 bg-chassis shadow-neumorph-sm hover:border-accent/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <Moon className={`h-4 w-4 sm:h-5 sm:w-5 ${theme === 'dark' ? 'text-accent' : 'text-ink-secondary'}`} />
                  {theme === 'dark' && <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />}
                </div>
                <h4 className="font-extrabold text-xs sm:text-sm text-ink">Giao diện Tối</h4>
                <p className="text-[10px] sm:text-xs text-ink-muted mt-0.5 sm:mt-1">Tactical Obsidian Dark</p>
              </button>

              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`p-3 sm:p-4 rounded-xl border text-left transition-all ${
                  theme === 'system'
                    ? 'border-accent bg-accent/[0.08] ring-1 ring-accent shadow-md shadow-accent/20'
                    : 'border-black/5 dark:border-white/5 bg-chassis shadow-neumorph-sm hover:border-accent/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <Monitor className={`h-4 w-4 sm:h-5 sm:w-5 ${theme === 'system' ? 'text-accent' : 'text-ink-secondary'}`} />
                  {theme === 'system' && <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />}
                </div>
                <h4 className="font-extrabold text-xs sm:text-sm text-ink">Tự động (Hệ thống)</h4>
                <p className="text-[10px] sm:text-xs text-ink-muted mt-0.5 sm:mt-1">Theo cài đặt thiết bị</p>
              </button>
            </div>
          </div>

          {/* Danger Zone: Logout */}
          <div className="card rounded-2xl p-3.5 sm:p-6 border border-rose-500/20 dark:border-rose-500/20 shadow-neumorph space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-rose-500 flex items-center gap-1.5 sm:gap-2">
                  <LogOut className="h-4 w-4 text-rose-500" />
                  Khu vực tài khoản & Đăng xuất
                </label>
                <p className="text-[11px] sm:text-xs text-ink-secondary mt-0.5">
                  Đăng xuất tài khoản khỏi thiết bị này hoặc chuyển tài khoản khác
                </p>
              </div>

              <Link
                href="/auth/logout"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Đăng xuất</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* InBody Scan & OCR Extraction Modal */}
      <InBodyScanModal
        isOpen={isInBodyModalOpen}
        onClose={() => setIsInBodyModalOpen(false)}
        onSaved={handleInBodySaved}
      />
    </div>
  );
}
