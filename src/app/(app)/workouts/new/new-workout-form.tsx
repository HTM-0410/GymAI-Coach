'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Brain,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Dumbbell,
  Flame,
  Globe,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Trash2,
} from 'lucide-react';
import ExercisePickerModal, { type SelectedExerciseConfig } from '@/components/exercise-picker-modal';
import {
  allocatePhaseBudgets,
  type PrescriptionMode,
  type WorkoutPhase,
} from '@/lib/ai/workout-contract';

type Day = { id: string; name: string; name_vi?: string | null; day_of_week: number; training_day_targets: any[] };

type ProgramItem = {
  id: string;
  name: string;
  name_vi?: string | null;
  description?: string | null;
  type: string;
  duration_weeks?: number | null;
  training_program_days: Day[];
};

type DraftExercise = {
  exerciseId: string;
  exerciseSlug: string;
  name: string;
  nameVi: string | null;
  difficulty: string | null;
  exerciseType: string | null;
  animationUrl: string | null;
  thumbnailUrl: string | null;
  phase: WorkoutPhase;
  prescriptionMode: PrescriptionMode;
  targetSets: number;
  targetRepMin: number | null;
  targetRepMax: number | null;
  targetWeight: number | null;
  targetRir: number | null;
  restSeconds: number;
  durationSeconds: number | null;
  holdSeconds: number | null;
  perSide: boolean;
  aiReason: string;
};

type WorkoutDraft = {
  programDayId: string;
  gymId: string | null;
  durationMinutes: number;
  options: { includeWarmup: boolean; includeCooldown: boolean };
  phaseBudgets: { warmup: number; main: number; cooldown: number };
  exercises: DraftExercise[];
};

const PHASE_META: Record<WorkoutPhase, { label: string; description: string }> = {
  warmup: { label: 'Khởi động', description: 'Chuẩn bị cơ thể và khớp cho phần tập chính' },
  main: { label: 'Bài tập chính', description: 'Working sets tạo tiến bộ và khối lượng tập' },
  cooldown: { label: 'Hạ nhiệt & giãn cơ', description: 'Hạ nhịp và kết thúc buổi tập có kiểm soát' },
};

function normalizeWorkoutDraft(value: any): WorkoutDraft {
  const options = value?.options ?? { includeWarmup: false, includeCooldown: false };
  return {
    ...value,
    options,
    phaseBudgets: value?.phaseBudgets ?? allocatePhaseBudgets(value.durationMinutes, options),
    exercises: (value?.exercises ?? []).map((exercise: any) => ({
      ...exercise,
      phase: exercise.phase ?? 'main',
      prescriptionMode: exercise.prescriptionMode ?? 'reps',
      durationSeconds: exercise.durationSeconds ?? null,
      holdSeconds: exercise.holdSeconds ?? null,
      perSide: exercise.perSide ?? false,
    })),
  };
}

export function normalizeHyphens(text: string): string {
  if (!text) return '';
  return text.replace(/[\u2013\u2014\u2015]/g, '-');
}

function cleanProgramName(name?: string | null): string {
  if (!name) return '';
  const cleaned = name.replace(/\s*\(\d+\s*buổi(?:\/tuần)?\)\s*$/i, '').trim();
  return normalizeHyphens(cleaned);
}

function ProgramDropdown({
  programs,
  selectedProgramId,
  activeProgramId,
  onSelect,
}: {
  programs: ProgramItem[];
  selectedProgramId: string;
  activeProgramId: string | null;
  onSelect: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProg = programs.find((p) => p.id === selectedProgramId) || programs[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative shrink-0">
      {/* Custom Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-2 cursor-pointer shadow-xs select-none ${
          isOpen
            ? 'bg-accent/15 border-accent text-accent ring-1 ring-accent/50'
            : 'bg-white/80 dark:bg-black/50 border-black/10 dark:border-white/15 text-ink hover:border-accent/50 hover:bg-white dark:hover:bg-black/70'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 max-w-[180px] sm:max-w-[240px] truncate">
          {selectedProg?.id === activeProgramId ? (
            <span className="text-accent text-xs">⭐</span>
          ) : (
            <span className="h-2 w-2 rounded-full bg-accent/60 shrink-0" />
          )}
          <span className="truncate">{cleanProgramName(selectedProg?.name || selectedProg?.name_vi || 'Chọn Program')}</span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-ink-muted transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-accent' : ''
          }`}
        />
      </button>

      {/* Custom Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[280px] sm:w-[320px] rounded-2xl bg-chassis border border-black/10 dark:border-white/15 shadow-neumorph-lg p-1.5 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 space-y-1">
          <div className="px-3 py-1.5 border-b border-black/[0.05] dark:border-white/[0.08] flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-wider font-bold text-ink-muted">
              Đổi chương trình tập ({programs.length})
            </span>
          </div>

          <div className="max-h-[260px] overflow-y-auto space-y-1 p-0.5 pr-1.5 custom-scrollbar">
            {programs.map((p) => {
              const isSelected = p.id === selectedProgramId;
              const isActive = p.id === activeProgramId;
              const displayName = cleanProgramName(p.name || p.name_vi);
              const daysCount = p.training_program_days?.length ?? 0;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelect(p.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between gap-2.5 cursor-pointer select-none group ${
                    isSelected
                      ? 'bg-accent/15 border border-accent/30 text-accent shadow-xs'
                      : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-ink border border-transparent'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {isActive && <span className="text-accent text-[11px]">⭐</span>}
                      <p
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-accent' : 'text-ink group-hover:text-accent'
                        } transition-colors`}
                      >
                        {displayName}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isActive && (
                        <span className="font-mono text-[8px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          Đang kích hoạt
                        </span>
                      )}
                      <span className="font-mono text-[9px] text-ink-muted">
                        {daysCount} buổi/tuần
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewWorkoutForm({
  programs = [],
  activeProgramId = null,
  gyms,
  defaultDuration,
}: {
  programs: ProgramItem[];
  activeProgramId: string | null;
  gyms: {
    id: string;
    name: string;
    description?: string | null;
    gym_dumbbell_inventory?: { weight_kg: number; quantity: number }[];
    gym_equipment?: any[];
  }[];
  defaultDuration: number;
}) {
  const router = useRouter();
  const initialProgram = programs.find((p) => p.id === activeProgramId) ?? programs[0] ?? null;
  const [selectedProgramId, setSelectedProgramId] = useState<string>(initialProgram?.id ?? '');

  const currentProgram = programs.find((p) => p.id === selectedProgramId) ?? initialProgram;
  const [dayId, setDayId] = useState(currentProgram?.training_program_days?.[0]?.id ?? '');
  const [gymId, setGymId] = useState<string>(gyms[0]?.id ?? '');

  function handleSwitchProgram(newProgId: string) {
    setSelectedProgramId(newProgId);
    const targetProg = programs.find((p) => p.id === newProgId);
    if (targetProg && targetProg.training_program_days?.length > 0) {
      setDayId(targetProg.training_program_days[0].id);
    }
  }

  const [duration, setDuration] = useState(defaultDuration);
  const [includeWarmup, setIncludeWarmup] = useState(false);
  const [includeCooldown, setIncludeCooldown] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerPhase, setPickerPhase] = useState<WorkoutPhase>('main');

  const selectedGym = gyms.find((gym) => gym.id === gymId);
  const phaseBudgets = allocatePhaseBudgets(duration, { includeWarmup, includeCooldown });
  const dumbbellInventory = [...(selectedGym?.gym_dumbbell_inventory ?? [])]
    .sort((a, b) => Number(a.weight_kg) - Number(b.weight_kg));

  async function generateDraft(
    event?: React.FormEvent,
    promptOverride?: string,
    isFullReset: boolean = false,
    regeneratePhase?: WorkoutPhase,
  ) {
    event?.preventDefault();
    setGenerating(true);
    setError(null);

    const activePrompt = promptOverride !== undefined ? promptOverride : customPrompt;
    if (promptOverride !== undefined) {
      setCustomPrompt(promptOverride);
    }

    const currentExercisesToSend = (!isFullReset && draft)
      ? draft.exercises.map((e) => ({
          exerciseSlug: e.exerciseSlug,
          name: e.name,
          nameVi: e.nameVi,
          phase: e.phase ?? 'main',
          prescriptionMode: e.prescriptionMode ?? 'reps',
          targetSets: e.targetSets,
          targetRepMin: e.targetRepMin,
          targetRepMax: e.targetRepMax,
          targetWeight: e.targetWeight,
          targetRir: e.targetRir,
          restSeconds: e.restSeconds,
          durationSeconds: e.durationSeconds,
          holdSeconds: e.holdSeconds,
          perSide: e.perSide,
          aiReason: e.aiReason,
        }))
      : null;

    try {
      const response = await fetch('/api/workout/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          programDayId: dayId,
          gymId: gymId || null,
          durationMinutes: duration,
          options: { includeWarmup, includeCooldown },
          regeneratePhase,
          userPrompt: activePrompt.trim() || null,
          currentExercises: currentExercisesToSend,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? data.error ?? 'Không thể tạo buổi tập');
      setDraft(normalizeWorkoutDraft(data.draft));
    } catch (requestError: any) {
      setError(requestError?.message ?? 'Không thể tạo buổi tập');
    } finally {
      setGenerating(false);
    }
  }

  async function confirmDraft() {
    if (!draft || draft.exercises.length === 0) return;
    setConfirming(true);
    setError(null);

    try {
      const response = await fetch('/api/workout/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? data.error ?? 'Không thể lưu buổi tập');
      router.push(`/workouts/${data.workoutId}`);
    } catch (requestError: any) {
      setError(requestError?.message ?? 'Không thể lưu buổi tập');
      setConfirming(false);
    }
  }

  function removeExercise(exerciseId: string) {
    setDraft((current) => current
      ? {
          ...current,
          exercises: current.exercises.filter((exercise) => exercise.exerciseId !== exerciseId),
        }
      : current);
  }

  function handleAddExerciseFromPicker(config: SelectedExerciseConfig) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
          exercises: [...current.exercises, { ...config, phase: pickerPhase }]
            .sort((a, b) => ['warmup', 'main', 'cooldown'].indexOf(a.phase) - ['warmup', 'main', 'cooldown'].indexOf(b.phase)),
      };
    });
  }

  if (!currentProgram) {
    return (
      <div className="card shadow-neumorph-lg rounded-2xl p-8 text-center">
        <p className="font-mono text-sm text-ink-muted uppercase tracking-wider mb-4">
          Bạn chưa có program nào.
        </p>
        <Link href="/programs" className="btn-primary">Chọn program</Link>
      </div>
    );
  }

  if (draft) {
    const totalSets = draft.exercises
      .filter((exercise) => (exercise.phase ?? 'main') === 'main')
      .reduce((sum, exercise) => sum + exercise.targetSets, 0);
    return (
      <section className="card shadow-neumorph-lg rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-black/[0.06] dark:border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_7px_rgba(249,115,22,0.75)]" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-accent font-bold">
                Bước 2/2 · Xác nhận
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-ink">Danh sách AI đề xuất</h2>
            <p className="text-xs text-ink-secondary mt-1">
              Kiểm tra kỹ trước khi lưu và bắt đầu buổi tập.
            </p>
          </div>
          <CheckCircle2 className="h-6 w-6 text-accent shrink-0" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <ReviewStat label="Bài tập" value={`${draft.exercises.length} bài`} />
          <ReviewStat label="Khối lượng" value={`${totalSets} sets`} />
          <ReviewStat label="Thời lượng" value={`~${draft.durationMinutes}p`} />
        </div>

        {customPrompt.trim() && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent/10 border border-accent/25 text-xs text-ink font-mono">
            <Sparkles className="h-4 w-4 text-accent shrink-0" />
            <div className="flex-1 min-w-0 truncate">
              <span className="font-bold text-accent">Đang áp dụng yêu cầu: </span>
              <span className="text-ink font-semibold">&ldquo;{customPrompt.trim()}&rdquo;</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCustomPrompt('');
                generateDraft(undefined, '', true);
              }}
              title="Xoá yêu cầu riêng"
              className="text-[10px] font-bold text-ink-muted hover:text-danger px-1.5 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Xoá
            </button>
          </div>
        )}

        <div className="space-y-3">
          {draft.exercises.map((exercise, index) => (
            <Fragment key={`${exercise.phase ?? 'main'}-${exercise.exerciseId}`}>
              {(index === 0 || (draft.exercises[index - 1].phase ?? 'main') !== (exercise.phase ?? 'main')) && (
                <div className="rounded-xl border border-accent/20 bg-accent/[0.05] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-sm text-ink">
                        {PHASE_META[exercise.phase ?? 'main'].label}
                      </h3>
                      <p className="text-[11px] text-ink-secondary mt-0.5">
                        {PHASE_META[exercise.phase ?? 'main'].description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-accent">
                        ~{draft.phaseBudgets?.[exercise.phase ?? 'main'] ?? 0} phút
                      </span>
                      <button
                        type="button"
                        disabled={generating}
                        onClick={() => generateDraft(undefined, customPrompt, false, exercise.phase ?? 'main')}
                        className="rounded-lg border border-accent/25 px-2 py-1 font-mono text-[9px] font-bold text-accent hover:bg-accent/10 disabled:opacity-50"
                      >
                        Tạo lại phần này
                      </button>
                    </div>
                  </div>
                </div>
              )}
            <article
              className="rounded-2xl border border-black/[0.08] dark:border-white/10 bg-gradient-to-br from-chassis-hi/95 via-chassis to-chassis-lo/90 p-3.5 sm:p-4 shadow-neumorph-sm transition-all hover:border-accent/40"
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 sm:gap-4">
                {/* Visual Thumbnail (Left Column) */}
                <div className="relative w-full sm:w-36 md:w-44 h-36 sm:h-32 shrink-0 rounded-xl overflow-hidden bg-white border border-black/[0.08] dark:border-white/15 shadow-xs flex items-center justify-center">
                  <ExercisePreviewCompact
                    animationUrl={exercise.animationUrl}
                    thumbnailUrl={exercise.thumbnailUrl}
                    name={exercise.nameVi ?? exercise.name}
                  />
                  {exercise.animationUrl && (
                    <span className="absolute left-1.5 top-1.5 rounded-md border border-accent/30 bg-black/80 px-2 py-0.5 font-mono text-[9px] font-extrabold uppercase tracking-wider text-accent backdrop-blur-xs shadow-xs">
                      GIF ĐỘNG TÁC
                    </span>
                  )}
                </div>

                {/* Exercise Details & Tactical Badges (Right Column) */}
                <div className="flex-1 min-w-0 flex flex-col justify-between gap-2.5">
                  {/* Title & Remove Button */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-dim text-white font-mono text-xs font-extrabold shadow-accent">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-base text-ink leading-tight">
                          {exercise.nameVi ?? exercise.name}
                        </h3>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted mt-0.5 font-semibold">
                          {exercise.exerciseSlug}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeExercise(exercise.exerciseId)}
                      aria-label={`Bỏ ${exercise.nameVi ?? exercise.name}`}
                      title="Xóa bài tập này"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-xl text-ink-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0 cursor-pointer border border-transparent hover:border-danger/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* High-Readability Tactical Badges Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Prescription */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/15 border border-accent/30 text-accent shadow-xs">
                      <Flame className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span className="font-mono text-xs font-extrabold">
                        {exercise.prescriptionMode === 'time'
                          ? `${exercise.targetSets} hiệp × ${exercise.durationSeconds ?? 0} giây`
                          : exercise.prescriptionMode === 'hold'
                            ? `${exercise.targetSets} hiệp × giữ ${exercise.holdSeconds ?? 0} giây${exercise.perSide ? ' mỗi bên' : ''}`
                            : `${exercise.targetSets} sets × ${exercise.targetRepMin ?? '?'}-${exercise.targetRepMax ?? '?'} reps`}
                      </span>
                    </div>

                    {/* RIR Target */}
                    {exercise.prescriptionMode === 'reps' && exercise.targetRir != null && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/25 text-blue-600 dark:text-blue-400">
                        <Target className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-mono text-xs font-bold">RIR {exercise.targetRir}</span>
                      </div>
                    )}

                    {/* Rest Time */}
                    {exercise.restSeconds > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400">
                        <Timer className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-mono text-xs font-bold">Nghỉ {exercise.restSeconds}s</span>
                      </div>
                    )}

                    {/* Weight (Only show if specific target weight is set) */}
                    {exercise.prescriptionMode === 'reps' && Boolean(exercise.targetWeight) && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/25 text-purple-600 dark:text-purple-400">
                        <Dumbbell className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-mono text-xs font-bold">
                          {exercise.targetWeight}kg
                        </span>
                      </div>
                    )}
                  </div>

                  {/* AI Rationale (Clear, Prominent Callout) */}
                  {exercise.aiReason && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] text-xs text-ink-secondary leading-relaxed">
                      <Sparkles className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                      <p>
                        <strong className="text-accent font-extrabold">AI: </strong>
                        {exercise.aiReason}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </article>
            </Fragment>
          ))}
        </div>

        {/* Phase-aware manual add */}
        <div className="grid sm:grid-cols-3 gap-2">
          {(['warmup', 'main', 'cooldown'] as WorkoutPhase[])
            .filter((phase) => phase === 'main' || (phase === 'warmup' && draft.options.includeWarmup) || (phase === 'cooldown' && draft.options.includeCooldown))
            .map((phase) => (
              <button
                key={phase}
                type="button"
                onClick={() => { setPickerPhase(phase); setIsPickerOpen(true); }}
                className="py-3 px-3 rounded-2xl border-2 border-dashed border-accent/35 hover:border-accent bg-accent/[0.03] hover:bg-accent/[0.08] text-accent font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Thêm vào {PHASE_META[phase].label}
              </button>
            ))}
        </div>

        {/* Interactive AI Custom Prompt Adjustment Box */}
        <div className="rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/[0.06] via-chassis-hi/80 to-chassis-lo/80 p-4 shadow-neumorph-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-accent text-white flex items-center justify-center shadow-accent shrink-0">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs sm:text-sm text-ink">Yêu cầu AI điều chỉnh buổi tập</h3>
                <p className="text-[10px] text-ink-secondary">Thêm/bớt bài, đổi bài tập, tập trung nhóm cơ hoặc tránh bài gây đau khớp...</p>
              </div>
            </div>
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customPrompt.trim() && !generating) {
                  e.preventDefault();
                  generateDraft();
                }
              }}
              placeholder="Ví dụ: Bỏ bài đẩy vai, thêm bài ép ngực cáp, hôm nay đau vai nên dùng máy..."
              className="w-full pl-3 pr-28 py-2.5 rounded-xl bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent shadow-inset-xs"
            />
            <button
              type="button"
              onClick={() => generateDraft()}
              disabled={generating || !customPrompt.trim()}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-gradient-to-r from-accent to-accent-dim text-white font-mono text-[11px] font-bold shadow-xs hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {generating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Đang gen...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Gen lại</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Preset Prompt Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="font-mono text-[9px] text-ink-muted uppercase font-bold tracking-wider mr-1">
              Gợi ý nhanh:
            </span>
            {[
              'Tập trung ngực trên',
              'Ưu tiên dùng máy (Machine), bỏ tạ tự do',
              'Hôm nay mỏi vai, tập nhẹ',
              'Thêm 1 bài tay trước & tay sau',
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setCustomPrompt(preset);
                  generateDraft(undefined, preset);
                }}
                disabled={generating}
                className="px-2.5 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-accent/15 hover:text-accent hover:border-accent/30 border border-black/[0.05] dark:border-white/[0.08] text-[10px] font-medium text-ink-secondary transition-all cursor-pointer"
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>

        {draft.exercises.length === 0 && (
          <div className="rounded-xl border border-danger/20 bg-danger/[0.06] px-4 py-3 text-xs text-danger">
            Cần giữ lại ít nhất một bài tập để xác nhận.
          </div>
        )}

        <div className="rounded-xl border border-accent/15 bg-accent/[0.04] px-3.5 py-3 flex gap-2.5">
          <ShieldCheck className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-ink-secondary">
            Đây mới là bản nháp. Hệ thống chưa tạo workout cho đến khi bạn bấm xác nhận.
          </p>
        </div>

        {error && <ErrorMessage message={error} />}

        <div className="grid sm:grid-cols-[auto_auto_1fr] gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => { setDraft(null); setError(null); }}
            disabled={confirming || generating}
            className="btn-ghost inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Chỉnh điều kiện
          </button>
          <button
            type="button"
            onClick={() => generateDraft(undefined, undefined, true)}
            disabled={confirming || generating}
            className="btn-ghost inline-flex items-center justify-center gap-2"
          >
            {generating
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RefreshCw className="h-4 w-4" />}
            Tạo lại
          </button>
          <button
            type="button"
            onClick={confirmDraft}
            disabled={confirming || generating || draft.exercises.length === 0}
                      className="btn-primary inline-flex items-center justify-center gap-2"
          >
            {confirming
              ? <><Loader2 className="h-4 w-4 animate-spin" />Đang lưu…</>
              : <><CheckCircle2 className="h-4 w-4" />Xác nhận & bắt đầu</>}
          </button>
        </div>

        <ExercisePickerModal
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onSelectExercise={handleAddExerciseFromPicker}
          existingSlugs={draft.exercises.map((e) => e.exerciseSlug)}
          phase={pickerPhase}
        />
      </section>
    );
  }

  return (
    <form onSubmit={generateDraft} className="card shadow-neumorph-lg rounded-2xl p-4 sm:p-6 space-y-6 w-full max-w-full overflow-hidden">
      {/* ── PROGRAM & TRAINING DAYS ── */}
      <div className="space-y-3">
        {/* Program Header with Active Status & Quick Switcher */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/10 bg-gradient-to-r from-accent/[0.08] via-chassis-hi/80 to-chassis-lo/80 p-3.5 sm:p-4 shadow-neumorph-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-accent text-white flex items-center justify-center font-bold shadow-xs shrink-0 mt-0.5">
                <Layers className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-accent font-bold">
                    Lịch tập đang chọn
                  </span>
                  {currentProgram?.id === activeProgramId && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-mono text-[9px] font-bold border border-emerald-500/25">
                      ✓ Đang kích hoạt
                    </span>
                  )}
                  {currentProgram?.type === 'system' && (
                    <span className="px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] text-ink-muted font-mono text-[9px]">
                      Hệ thống
                    </span>
                  )}
                </div>
                <h3 className="font-black text-sm sm:text-base text-ink truncate mt-0.5">
                  {cleanProgramName(currentProgram?.name || currentProgram?.name_vi || 'Chưa chọn chương trình')}
                </h3>
                {currentProgram?.description && (
                  <p className="text-[11px] text-ink-secondary truncate mt-0.5">
                    {currentProgram.description}
                  </p>
                )}
              </div>
            </div>

            {/* Custom Program Switcher Dropdown */}
            {programs.length > 1 && (
              <ProgramDropdown
                programs={programs}
                selectedProgramId={selectedProgramId}
                activeProgramId={activeProgramId}
                onSelect={handleSwitchProgram}
              />
            )}
          </div>
        </div>

        {/* Training Days in Selected Program */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label flex items-center gap-2 mb-0">
              <Calendar className="h-4 w-4 text-accent" />
              <span>Ngày tập hôm nay</span>
            </label>
            <span className="font-mono text-[10px] text-ink-muted sm:hidden">
              {(currentProgram?.training_program_days ?? []).length} buổi
            </span>
          </div>

          {/* MOBILE: Compact Horizontal Day Strip (sm:hidden) */}
          <div className="sm:hidden space-y-2 w-full max-w-full">
            <div className="flex items-stretch gap-2 overflow-x-auto py-1 w-full no-scrollbar">
              {(currentProgram?.training_program_days ?? []).map((day) => {
                const isSelected = dayId === day.id;
                const dayLabel = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][day.day_of_week];
                const rawName = normalizeHyphens(day.name_vi || day.name);
                // Clean short title: "Buổi 1 - Đẩy" -> "Đẩy"
                const cleanShortTitle = rawName.replace(/^Buổi\s*\d+\s*[-:]\s*/i, '');

                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => setDayId(day.id)}
                    className={`flex flex-col items-center justify-center p-2 min-w-[76px] shrink-0 rounded-xl border text-center transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'border-accent bg-accent/10 text-accent shadow-neumorph-sm ring-1 ring-accent/60 font-bold'
                        : 'border-black/[0.08] dark:border-white/10 bg-chassis text-ink hover:border-accent/40'
                    }`}
                  >
                    <span
                      className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-black flex items-center justify-center mb-1 transition-colors ${
                        isSelected
                          ? 'bg-accent text-white shadow-xs'
                          : 'bg-black/[0.05] dark:bg-white/[0.08] text-ink-muted'
                      }`}
                    >
                      {dayLabel}
                    </span>
                    <span className="text-xs font-bold truncate w-full leading-tight">
                      {cleanShortTitle || rawName}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Day Detail Capsule on Mobile */}
            {(() => {
              const activeDay = (currentProgram?.training_program_days ?? []).find((d) => d.id === dayId);
              if (!activeDay) return null;
              const targets = (activeDay.training_day_targets ?? [])
                .filter((t: any) => t.role === 'primary')
                .map((t: any) => t.muscles?.name_vi || t.muscles?.slug)
                .filter(Boolean);

              return (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-accent/[0.06] border border-accent/25 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                  <div className="min-w-0 flex-1 truncate">
                    <span className="font-extrabold text-ink mr-1">
                      {normalizeHyphens(activeDay.name_vi || activeDay.name)}
                    </span>
                    {targets.length > 0 && (
                      <span className="text-[11px] text-ink-secondary">
                        · Cơ chính: <strong className="text-accent font-semibold">{targets.join(', ')}</strong>
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* DESKTOP: 2-Column Cards Grid (hidden sm:grid) */}
          <div className="hidden sm:grid grid-cols-2 gap-2.5">
            {(currentProgram?.training_program_days ?? []).map((day) => {
              const isSelected = dayId === day.id;
              const dayLabel = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][day.day_of_week];
              const primaryTargets = (day.training_day_targets ?? [])
                .filter((t: any) => t.role === 'primary')
                .map((t: any) => t.muscles?.name_vi || t.muscles?.slug)
                .filter(Boolean);

              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setDayId(day.id)}
                  className={`text-left p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between cursor-pointer select-none min-w-0 overflow-hidden ${
                    isSelected
                      ? 'border-accent bg-accent/[0.08] shadow-neumorph-sm ring-1 ring-accent/60'
                      : 'border-black/[0.07] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] hover:border-accent/40 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 w-full min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`h-8 w-8 rounded-xl font-mono text-xs font-black flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-accent text-white shadow-xs'
                            : 'bg-black/[0.05] dark:bg-white/[0.08] text-ink-muted'
                        }`}
                      >
                        {dayLabel}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-xs sm:text-sm text-ink truncate" title={normalizeHyphens(day.name_vi || day.name)}>
                          {normalizeHyphens(day.name_vi || day.name)}
                        </h4>
                        <p className="text-[10px] text-ink-secondary mt-0.5 truncate">
                          {primaryTargets.length > 0
                            ? `Cơ chính: ${primaryTargets.join(', ')}`
                            : 'Theo lịch trình của program'}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Phòng gym & Thiết bị */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-accent" />
            <span>Phòng gym & Thiết bị</span>
          </label>
          <Link
            href="/gyms/new"
            className="text-[11px] font-mono text-accent hover:underline flex items-center gap-1 font-bold"
          >
            <Plus className="h-3 w-3" />
            <span>Thêm phòng gym</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Option 1: Không ràng buộc thiết bị */}
          <button
            type="button"
            onClick={() => setGymId('')}
            className={`text-left p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between cursor-pointer select-none min-w-0 overflow-hidden ${
              gymId === ''
                ? 'border-accent bg-accent/[0.08] shadow-neumorph-sm ring-1 ring-accent/60'
                : 'border-black/[0.07] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] hover:border-accent/40 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
            }`}
          >
            <div className="flex items-start justify-between gap-2 w-full min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    gymId === '' ? 'bg-accent text-white shadow-xs' : 'bg-black/[0.05] dark:bg-white/[0.08] text-ink-muted'
                  }`}
                >
                  <Globe className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-xs sm:text-sm text-ink truncate">Không ràng buộc</h4>
                  <p className="text-[10px] text-ink-secondary mt-0.5 truncate">Toàn bộ thiết bị chuẩn</p>
                </div>
              </div>
              {gymId === '' && (
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              )}
            </div>

            <div className="mt-2.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-accent/15 text-accent font-mono text-[9px] font-bold">
                Tự do
              </span>
              <span className="font-mono text-[10px] text-ink-muted">Kho bài tập đầy đủ</span>
            </div>
          </button>

          {/* Cards for User's Saved Gyms */}
          {gyms.map((gym) => {
            const isSelected = gymId === gym.id;
            const dbCount = gym.gym_dumbbell_inventory?.length ?? 0;
            const eqCount = gym.gym_equipment?.length ?? 0;
            return (
              <button
                key={gym.id}
                type="button"
                onClick={() => setGymId(gym.id)}
                className={`text-left p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between cursor-pointer select-none min-w-0 overflow-hidden ${
                  isSelected
                    ? 'border-accent bg-accent/[0.08] shadow-neumorph-sm ring-1 ring-accent/60'
                    : 'border-black/[0.07] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] hover:border-accent/40 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 w-full min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-accent text-white shadow-xs' : 'bg-black/[0.05] dark:bg-white/[0.08] text-ink-muted'
                      }`}
                    >
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-extrabold text-xs sm:text-sm text-ink truncate">{gym.name}</h4>
                      <p className="text-[10px] text-ink-secondary mt-0.5 truncate">
                        {gym.description || 'Phòng gym đã lưu'}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  )}
                </div>

                <div className="mt-2.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center gap-1.5 flex-wrap">
                  {dbCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent font-mono text-[9px] font-bold">
                      {dbCount} mức tạ đơn
                    </span>
                  )}
                  {eqCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] text-ink-secondary font-mono text-[9px]">
                      {eqCount} thiết bị
                    </span>
                  )}
                  {dbCount === 0 && eqCount === 0 && (
                    <span className="font-mono text-[9px] text-ink-muted">Chưa cấu hình chi tiết</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label">
          Thời lượng: <span className="text-accent font-bold font-mono">{duration} phút</span>
        </label>
        <input
          type="range"
          min={15}
          max={240}
          step={15}
          value={duration}
          onChange={(event) => setDuration(Number(event.target.value))}
          className="w-full accent-[#f97316]"
        />
        <div className="flex justify-between mt-1">
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          <span className="font-mono text-[10px] text-ink-muted">15&apos;</span>
          <span className="font-mono text-[10px] text-ink-muted">120&apos;</span>
          <span className="font-mono text-[10px] text-ink-muted">240&apos;</span>
        </div>
      </div>

      {/* Khởi động & Giãn cơ (Tùy chọn) */}
      <div className="space-y-2">
        <label className="label mb-0 flex items-center gap-1.5 font-bold">
          <Layers className="h-3.5 w-3.5 text-accent" />
          <span>Khởi động & Giãn cơ</span>
        </label>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Khởi động */}
          <button
            type="button"
            onClick={() => setIncludeWarmup(!includeWarmup)}
            className={`flex items-center justify-between px-3.5 py-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer select-none ${
              includeWarmup
                ? 'bg-accent/10 border-accent text-accent shadow-neumorph-sm ring-1 ring-accent/60'
                : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/[0.08] dark:border-white/10 text-ink-muted hover:border-accent/40 hover:text-ink'
            }`}
          >
            <span className="truncate">Khởi động</span>
            <div
              className={`h-5 w-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                includeWarmup ? 'bg-accent text-white shadow-xs' : 'bg-black/[0.06] dark:bg-white/[0.08] text-ink-muted'
              }`}
            >
              {includeWarmup ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : <Plus className="h-3.5 w-3.5" />}
            </div>
          </button>

          {/* Giãn cơ */}
          <button
            type="button"
            onClick={() => setIncludeCooldown(!includeCooldown)}
            className={`flex items-center justify-between px-3.5 py-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer select-none ${
              includeCooldown
                ? 'bg-accent/10 border-accent text-accent shadow-neumorph-sm ring-1 ring-accent/60'
                : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/[0.08] dark:border-white/10 text-ink-muted hover:border-accent/40 hover:text-ink'
            }`}
          >
            <span className="truncate">Giãn cơ</span>
            <div
              className={`h-5 w-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                includeCooldown ? 'bg-accent text-white shadow-xs' : 'bg-black/[0.06] dark:bg-white/[0.08] text-ink-muted'
              }`}
            >
              {includeCooldown ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : <Plus className="h-3.5 w-3.5" />}
            </div>
          </button>
        </div>
      </div>

      <div>
        <label className="label flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span>Yêu cầu riêng cho AI (Tùy chọn)</span>
        </label>
        <input
          type="text"
          value={customPrompt}
          onChange={(event) => setCustomPrompt(event.target.value)}
          placeholder="Ví dụ: Tập trung ngực trên, tránh bài đau cổ tay, ưu tiên máy..."
          className="input text-xs placeholder:text-ink-muted"
        />
      </div>

      {error && <ErrorMessage message={error} />}

      <button disabled={generating || !dayId} className="btn-primary w-full inline-flex items-center justify-center gap-2">
        {generating
          ? <><Loader2 className="h-4 w-4 animate-spin" />AI đang lập danh sách…</>
          : <><Brain className="h-4 w-4" />Tạo danh sách với AI</>}
      </button>
    </form>
  );
}

function ReviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/[0.05] dark:border-white/[0.08] bg-black/[0.025] dark:bg-white/[0.025] px-3 py-2.5 text-center">
      <p className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="font-mono text-xs font-extrabold text-ink mt-0.5">{value}</p>
    </div>
  );
}

function PhaseToggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.06] dark:border-white/10 bg-chassis-hi px-3.5 py-3 cursor-pointer">
      <span>
        <span className="block text-xs font-extrabold text-ink">{label}</span>
        <span className="block text-[10px] text-ink-muted mt-0.5">{description}</span>
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
          aria-label={label}
        />
        <span className="absolute inset-0 rounded-full bg-black/15 dark:bg-white/15 peer-checked:bg-accent transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2" />
        <span className="relative ml-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function ExercisePreviewCompact({
  animationUrl,
  thumbnailUrl,
  name,
}: {
  animationUrl: string | null;
  thumbnailUrl: string | null;
  name: string;
}) {
  const source = animationUrl ?? thumbnailUrl;
  if (!source) {
    return (
      <div className="flex h-full w-full items-center justify-center text-ink-muted">
        <Dumbbell className="h-6 w-6 opacity-35" />
      </div>
    );
  }

  const isVideo = /\.(mp4|webm|ogg)(?:\?|$)/i.test(source);
  return (
    <div className="relative h-full w-full bg-white">
      {isVideo ? (
        <video
          src={source}
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-contain"
        />
      ) : (
        <Image
          src={source}
          alt={`Minh hoạ động tác ${name}`}
          fill
          unoptimized={/\.gif(?:\?|$)/i.test(source)}
          sizes="(max-width: 768px) 180px, 200px"
          className="object-contain p-1"
        />
      )}
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-chassis shadow-inset-sm rounded-md px-4 py-3">
      <p className="font-mono text-xs text-danger font-bold uppercase tracking-wider">ERR: {message}</p>
    </div>
  );
}
