'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import {
  Search,
  X,
  Plus,
  Check,
  Dumbbell,
  Sparkles,
  Loader2,
  ChevronRight,
  Flame,
  Timer,
  Layers,
} from 'lucide-react';
import type { PrescriptionMode, WorkoutPhase } from '@/lib/ai/workout-contract';
import { matchExerciseSearch } from '@/lib/exercises-search';

export type SelectedExerciseConfig = {
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

type DbExerciseItem = {
  id: string;
  slug: string;
  name: string;
  name_vi: string | null;
  difficulty: string | null;
  exercise_type: string | null;
  primary_muscle_vi: string | null;
  equipment_vi: string[] | null;
  default_rest_seconds: number | null;
  default_rir: number | null;
  gallery_json: any;
  workout_role: string | null;
  workout_role_review_status: string | null;
};

const MUSCLE_FILTER_CHIPS = [
  { id: 'all', label: 'Tất cả nhóm cơ' },
  { id: 'chest', label: 'Ngực', match: ['ngực', 'chest'] },
  { id: 'back', label: 'Lưng & Xô', match: ['lưng', 'xô', 'back', 'lats'] },
  { id: 'shoulders', label: 'Vai', match: ['vai', 'shoulder', 'delts'] },
  { id: 'biceps', label: 'Tay trước', match: ['tay trước', 'bicep'] },
  { id: 'triceps', label: 'Tay sau', match: ['tay sau', 'tricep'] },
  { id: 'legs', label: 'Chân & Mông', match: ['chân', 'đùi', 'mông', 'quads', 'hamstring', 'glute', 'calves'] },
  { id: 'core', label: 'Bụng & Core', match: ['bụng', 'core', 'abs'] },
  { id: 'cardio', label: 'Cardio', match: ['cardio', 'chạy', 'tim mạch'] },
];

const EQUIPMENT_FILTER_CHIPS = [
  { id: 'all', label: 'Tất cả thiết bị' },
  { id: 'dumbbell', label: 'Tạ đơn (Dumbbell)', match: ['dumbbell', 'tạ đơn'] },
  { id: 'barbell', label: 'Tạ đòn (Barbell)', match: ['barbell', 'tạ đòn'] },
  { id: 'cable', label: 'Cáp (Cable)', match: ['cable', 'cáp'] },
  { id: 'machine', label: 'Máy tập (Machine)', match: ['machine', 'máy'] },
  { id: 'bodyweight', label: 'Bodyweight', match: ['bodyweight', 'thân người', 'tự do'] },
];

let cachedExercises: DbExerciseItem[] | null = null;

export default function ExercisePickerModal({
  isOpen,
  onClose,
  onSelectExercise,
  existingSlugs = [],
  phase = 'main',
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (config: SelectedExerciseConfig) => void;
  existingSlugs?: string[];
  phase?: WorkoutPhase;
}) {
  const [exercises, setExercises] = useState<DbExerciseItem[]>(cachedExercises ?? []);
  const [loading, setLoading] = useState(!cachedExercises);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('all');
  const [selectedEquipment, setSelectedEquipment] = useState('all');
  const [configuringExercise, setConfiguringExercise] = useState<DbExerciseItem | null>(null);

  // Form states for selected exercise
  const [targetSets, setTargetSets] = useState(3);
  const [repMin, setRepMin] = useState(8);
  const [repMax, setRepMax] = useState(12);
  const [restSeconds, setRestSeconds] = useState(120);
  const [targetRir, setTargetRir] = useState(2);
  const [durationSeconds, setDurationSeconds] = useState(90);
  const [holdSeconds, setHoldSeconds] = useState(30);
  const [perSide, setPerSide] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    if (cachedExercises && cachedExercises.length > 0) {
      setExercises(cachedExercises);
      setLoading(false);
      return;
    }

    async function loadExercises() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('exercises')
          .select('id, slug, name, name_vi, difficulty, exercise_type, primary_muscle_vi, equipment_vi, default_rest_seconds, default_rir, gallery_json, workout_role, workout_role_review_status')
          .eq('status', 'published')
          .order('name_vi', { ascending: true });

        if (!error && data) {
          cachedExercises = data as DbExerciseItem[];
          setExercises(data as DbExerciseItem[]);
        }
      } catch (e) {
        console.error('Failed to fetch exercises', e);
      } finally {
        setLoading(false);
      }
    }

    loadExercises();
  }, [isOpen]);

  // Reset configuring exercise when modal closes
  useEffect(() => {
    if (!isOpen) {
      setConfiguringExercise(null);
      setSearchQuery('');
      setSelectedMuscle('all');
      setSelectedEquipment('all');
    }
  }, [isOpen]);

  // Handle opening exercise config
  function handlePick(item: DbExerciseItem) {
    setConfiguringExercise(item);
    setTargetSets(phase === 'main' ? 3 : 1);
    setRepMin(8);
    setRepMax(12);
    setRestSeconds(120);
    setTargetRir(item.default_rir ?? 2);
    setDurationSeconds(90);
    setHoldSeconds(30);
    setPerSide(true);
  }

  function handleConfirmAdd() {
    if (!configuringExercise) return;

    const gallery = configuringExercise.gallery_json as any;
    const views = Array.isArray(gallery?.views) ? gallery.views : [];
    const animatedView = views.find((view: any) =>
      typeof view?.src === 'string' && /\.(gif|webm|mp4)(?:\?|$)/i.test(view.src),
    );

    const prescriptionMode: PrescriptionMode = phase === 'main'
      ? 'reps'
      : phase === 'cooldown' && configuringExercise.workout_role === 'static_stretch'
        ? 'hold'
        : 'time';
    const config: SelectedExerciseConfig = {
      exerciseId: configuringExercise.id,
      exerciseSlug: configuringExercise.slug,
      name: configuringExercise.name,
      nameVi: configuringExercise.name_vi,
      difficulty: configuringExercise.difficulty,
      exerciseType: configuringExercise.exercise_type,
      animationUrl: gallery?.animation ?? animatedView?.src ?? null,
      thumbnailUrl: gallery?.main ?? views[0]?.src ?? null,
      phase,
      prescriptionMode,
      targetSets,
      targetRepMin: prescriptionMode === 'reps' ? repMin : null,
      targetRepMax: prescriptionMode === 'reps' ? repMax : null,
      targetWeight: null,
      targetRir: prescriptionMode === 'reps' ? targetRir : null,
      restSeconds: prescriptionMode === 'reps' ? restSeconds : 0,
      durationSeconds: prescriptionMode === 'time' ? durationSeconds : null,
      holdSeconds: prescriptionMode === 'hold' ? holdSeconds : null,
      perSide: prescriptionMode === 'hold' ? perSide : false,
      aiReason: 'Thêm thủ công từ kho bài tập hệ thống',
    };

    onSelectExercise(config);
    setConfiguringExercise(null);
    onClose();
  }

  // Filtered exercises
  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const muscleChip = MUSCLE_FILTER_CHIPS.find((m) => m.id === selectedMuscle);
    const equipChip = EQUIPMENT_FILTER_CHIPS.find((e) => e.id === selectedEquipment);

    return exercises.filter((ex) => {
      const role = ex.workout_role ?? 'main_strength';
      if (phase === 'main' && role !== 'main_strength') return false;
      if (phase === 'warmup' && (
        ex.workout_role_review_status !== 'reviewed'
        || !['general_warmup', 'dynamic_mobility', 'activation'].includes(role)
      )) return false;
      if (phase === 'cooldown' && (
        ex.workout_role_review_status !== 'reviewed'
        || !['cooldown_aerobic', 'static_stretch'].includes(role)
      )) return false;
      // Search text match (Bilingual: English + Vietnamese + Unaccented)
      if (q && !matchExerciseSearch(q, {
        name: ex.name,
        name_vi: ex.name_vi,
        slug: ex.slug,
        primary_muscle_vi: ex.primary_muscle_vi,
        equipment_vi: ex.equipment_vi,
      })) {
        return false;
      }

      // Muscle match
      if (muscleChip && muscleChip.id !== 'all' && muscleChip.match) {
        const pm = (ex.primary_muscle_vi || '').toLowerCase();
        const matchesMuscle = muscleChip.match.some((keyword) => pm.includes(keyword));
        if (!matchesMuscle) return false;
      }

      // Equipment match
      if (equipChip && equipChip.id !== 'all' && equipChip.match) {
        const eqList = (ex.equipment_vi || []).map((e) => e.toLowerCase());
        const matchesEquip = equipChip.match.some((keyword) =>
          eqList.some((e) => e.includes(keyword)) || ex.slug.includes(keyword),
        );
        if (!matchesEquip) return false;
      }

      return true;
    });
  }, [exercises, searchQuery, selectedMuscle, selectedEquipment, phase]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="card shadow-neumorph-lg rounded-3xl w-full max-w-2xl bg-chassis border border-black/10 dark:border-white/15 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-black/[0.06] dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-accent text-white flex items-center justify-center shadow-xs">
              <Dumbbell className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-ink">Kho bài tập hệ thống</h2>
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                {exercises.length} bài tập chuẩn hóa GymAI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] flex items-center justify-center text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content: Either Step 1 (Search & Select) or Step 2 (Configure sets/reps) */}
        {!configuringExercise ? (
          <>
            {/* Search & Filter Controls */}
            <div className="p-4 sm:p-5 border-b border-black/[0.06] dark:border-white/10 space-y-3 shrink-0 bg-black/[0.015] dark:bg-white/[0.02]">
              {/* Search Bar */}
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-ink-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên bài (ví dụ: Đẩy ngực, Incline Press, Squat, Kéo xô...)"
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent shadow-inset-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 text-ink-muted hover:text-ink cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Muscle Chips Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {MUSCLE_FILTER_CHIPS.map((chip) => {
                  const isSelected = selectedMuscle === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setSelectedMuscle(chip.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-accent text-white shadow-xs font-bold'
                          : 'bg-black/[0.03] dark:bg-white/[0.05] text-ink-secondary hover:text-ink hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-black/[0.05] dark:border-white/[0.08]'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              {/* Equipment Chips Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {EQUIPMENT_FILTER_CHIPS.map((chip) => {
                  const isSelected = selectedEquipment === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setSelectedEquipment(chip.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-ink text-chassis dark:bg-white dark:text-black font-bold shadow-xs'
                          : 'bg-transparent text-ink-muted hover:text-ink border border-black/10 dark:border-white/10'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
              {loading ? (
                <div className="py-12 text-center text-ink-muted space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" />
                  <p className="font-mono text-xs">Đang tải danh mục bài tập...</p>
                </div>
              ) : filteredList.length === 0 ? (
                <div className="py-12 text-center text-ink-muted space-y-1.5">
                  <p className="font-mono text-sm font-bold text-ink">Không tìm thấy bài tập phù hợp</p>
                  <p className="text-xs">Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc</p>
                </div>
              ) : (
                filteredList.map((item) => {
                  const isAlreadyAdded = existingSlugs.includes(item.slug);
                  const gallery = item.gallery_json as any;
                  const thumb = gallery?.main || gallery?.views?.[0]?.src || null;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handlePick(item)}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                        isAlreadyAdded
                          ? 'border-accent/30 bg-accent/[0.04] hover:bg-accent/[0.07]'
                          : 'border-black/[0.06] dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.02] hover:border-accent/40 hover:bg-accent/[0.02]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Thumbnail */}
                        <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden bg-white border border-black/[0.06] dark:border-white/10 shrink-0 flex items-center justify-center shadow-xs">
                          {thumb ? (
                            <Image
                              src={thumb}
                              alt={item.name_vi || item.name}
                              fill
                              unoptimized
                              sizes="60px"
                              className="object-contain p-0.5"
                            />
                          ) : (
                            <Dumbbell className="h-5 w-5 text-ink-muted opacity-40" />
                          )}
                        </div>

                        {/* Title & Metadata */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-xs sm:text-sm text-ink truncate group-hover:text-accent transition-colors">
                              {item.name_vi || item.name}
                            </h3>
                            {isAlreadyAdded && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded bg-accent/15 text-accent font-mono text-[9px] font-bold">
                                Đã có
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-[10px] text-ink-muted uppercase truncate mt-0.5">
                            {item.slug}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {item.primary_muscle_vi && (
                              <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent font-mono text-[10px] font-bold">
                                {item.primary_muscle_vi}
                              </span>
                            )}
                            {Array.isArray(item.equipment_vi) && item.equipment_vi.length > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-black/[0.03] dark:bg-white/[0.05] text-ink-secondary font-mono text-[10px]">
                                {item.equipment_vi.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        type="button"
                        className="h-8 w-8 rounded-xl bg-accent/10 group-hover:bg-accent text-accent group-hover:text-white flex items-center justify-center shrink-0 transition-all shadow-xs"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          /* Step 2: Configure Exercise Sets / Reps / Rest */
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-accent/[0.06] border border-accent/25">
              <div className="h-10 w-10 rounded-xl bg-accent text-white flex items-center justify-center font-bold shrink-0">
                <Dumbbell className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase font-bold text-accent">
                    Cấu hình bài tập
                  </span>
                </div>
                <h3 className="font-black text-base text-ink truncate">
                  {configuringExercise.name_vi || configuringExercise.name}
                </h3>
                <p className="font-mono text-[10px] text-ink-muted uppercase">
                  {configuringExercise.slug} · Cơ chính: {configuringExercise.primary_muscle_vi || 'Toàn thân'}
                </p>
              </div>
            </div>

            {/* Form Fields */}
            {phase === 'main' ? (
            <div className="grid grid-cols-2 gap-3">
              {/* Target Sets */}
              <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/10 space-y-2">
                <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-ink-muted">
                  <Flame className="h-3.5 w-3.5 text-accent" />
                  <span>Số hiệp (Sets)</span>
                </label>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetSets((s) => Math.max(1, s - 1))}
                    className="h-8 w-8 rounded-lg bg-black/[0.05] dark:bg-white/[0.08] hover:bg-accent/20 hover:text-accent font-mono font-bold text-ink text-sm flex items-center justify-center cursor-pointer select-none"
                  >
                    −
                  </button>
                  <span className="font-mono text-base font-black text-ink">{targetSets} sets</span>
                  <button
                    type="button"
                    onClick={() => setTargetSets((s) => Math.min(10, s + 1))}
                    className="h-8 w-8 rounded-lg bg-black/[0.05] dark:bg-white/[0.08] hover:bg-accent/20 hover:text-accent font-mono font-bold text-ink text-sm flex items-center justify-center cursor-pointer select-none"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Rep Range */}
              <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/10 space-y-2">
                <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-ink-muted">
                  <Layers className="h-3.5 w-3.5 text-blue-500" />
                  <span>Khoảng Reps</span>
                </label>
                <div className="flex items-center justify-between gap-1">
                  <input
                    type="number"
                    value={repMin}
                    onChange={(e) => setRepMin(Math.max(1, Number(e.target.value) || 1))}
                    className="w-12 py-1 px-1.5 rounded-lg text-center font-mono font-bold text-sm bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 text-ink"
                  />
                  <span className="font-mono text-xs text-ink-muted font-bold">-</span>
                  <input
                    type="number"
                    value={repMax}
                    onChange={(e) => setRepMax(Math.max(repMin, Number(e.target.value) || repMin))}
                    className="w-12 py-1 px-1.5 rounded-lg text-center font-mono font-bold text-sm bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 text-ink"
                  />
                  <span className="font-mono text-xs text-ink-muted">reps</span>
                </div>
              </div>

              {/* Rest Seconds */}
              <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/10 space-y-2">
                <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-ink-muted">
                  <Timer className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Nghỉ giữa hiệp</span>
                </label>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setRestSeconds((s) => Math.max(30, s - 15))}
                    className="h-8 w-8 rounded-lg bg-black/[0.05] dark:bg-white/[0.08] hover:bg-accent/20 hover:text-accent font-mono font-bold text-ink text-sm flex items-center justify-center cursor-pointer select-none"
                  >
                    −
                  </button>
                  <span className="font-mono text-base font-black text-ink">{restSeconds}s</span>
                  <button
                    type="button"
                    onClick={() => setRestSeconds((s) => Math.min(300, s + 15))}
                    className="h-8 w-8 rounded-lg bg-black/[0.05] dark:bg-white/[0.08] hover:bg-accent/20 hover:text-accent font-mono font-bold text-ink text-sm flex items-center justify-center cursor-pointer select-none"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Target RIR */}
              <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/10 space-y-2">
                <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-ink-muted">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  <span>Mục tiêu RIR</span>
                </label>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetRir((r) => Math.max(0, r - 1))}
                    className="h-8 w-8 rounded-lg bg-black/[0.05] dark:bg-white/[0.08] hover:bg-accent/20 hover:text-accent font-mono font-bold text-ink text-sm flex items-center justify-center cursor-pointer select-none"
                  >
                    −
                  </button>
                  <span className="font-mono text-base font-black text-ink">RIR {targetRir}</span>
                  <button
                    type="button"
                    onClick={() => setTargetRir((r) => Math.min(4, r + 1))}
                    className="h-8 w-8 rounded-lg bg-black/[0.05] dark:bg-white/[0.08] hover:bg-accent/20 hover:text-accent font-mono font-bold text-ink text-sm flex items-center justify-center cursor-pointer select-none"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            ) : (
              <div className="rounded-2xl border border-accent/20 bg-accent/[0.05] p-4 space-y-3">
                <p className="font-mono text-[10px] uppercase font-bold text-accent">
                  {phase === 'warmup' ? 'Prescription khởi động' : 'Prescription giãn cơ'}
                </p>
                {phase === 'cooldown' && configuringExercise.workout_role === 'static_stretch' ? (
                  <>
                    <label className="block text-xs font-bold text-ink">
                      Giữ tư thế: {holdSeconds} giây
                      <input
                        type="range"
                        min={20}
                        max={90}
                        step={5}
                        value={holdSeconds}
                        onChange={(event) => setHoldSeconds(Number(event.target.value))}
                        className="mt-2 w-full accent-[#f97316]"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-ink-secondary cursor-pointer">
                      <input type="checkbox" checked={perSide} onChange={(event) => setPerSide(event.target.checked)} />
                      Thực hiện cho mỗi bên
                    </label>
                  </>
                ) : (
                  <label className="block text-xs font-bold text-ink">
                    Thực hiện: {durationSeconds} giây
                    <input
                      type="range"
                      min={30}
                      max={180}
                      step={15}
                      value={durationSeconds}
                      onChange={(event) => setDurationSeconds(Number(event.target.value))}
                      className="mt-2 w-full accent-[#f97316]"
                    />
                  </label>
                )}
                <p className="text-[11px] text-ink-secondary">
                  Bài time/hold không dùng mức tạ hoặc RIR và không được tính vào working volume.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfiguringExercise(null)}
                className="py-3 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-chassis hover:bg-chassis-hi text-ink font-bold text-xs cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleConfirmAdd}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-accent to-accent-dim text-white font-extrabold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer hover:brightness-110"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                <span>Thêm bài vào buổi tập</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
