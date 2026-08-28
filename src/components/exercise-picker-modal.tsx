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
  RefreshCw,
} from 'lucide-react';
import type { PrescriptionMode, TrackingMode, WorkoutPhase } from '@/lib/ai/workout-contract';
import { matchExerciseSearch } from '@/lib/exercises-search';
import { distanceFromCanonical, distanceToCanonical, distanceUnitLabel, normalizeTrackingMode, roundCanonical, type UnitSystem } from '@/lib/workouts/metrics';
import { rankSimilarExercises } from '@/lib/training/exercise-similarity';

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
  targetDurationSeconds: number | null;
  targetDistanceMeters: number | null;
  durationStyle: 'active' | 'hold' | null;
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
  default_tracking_mode: TrackingMode | null;
  allowed_tracking_modes: TrackingMode[] | null;
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
  replacementConfig = null,
  phase = 'main',
  unitSystem = 'metric',
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (config: SelectedExerciseConfig) => void;
  existingSlugs?: string[];
  replacementConfig?: SelectedExerciseConfig | null;
  phase?: WorkoutPhase;
  unitSystem?: UnitSystem;
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
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('reps');
  const [distanceMeters, setDistanceMeters] = useState(() => distanceFromCanonical(1000, unitSystem));

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
          .select('id, slug, name, name_vi, difficulty, exercise_type, primary_muscle_vi, equipment_vi, default_rest_seconds, default_rir, gallery_json, workout_role, workout_role_review_status, default_tracking_mode, allowed_tracking_modes, tracking_mode_review_status, load_basis')
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
    const previousMode = replacementConfig
      ? normalizeTrackingMode(replacementConfig.prescriptionMode, {
          targetWeight: replacementConfig.targetWeight,
          targetRir: replacementConfig.targetRir,
        })
      : null;
    const allowedModes = item.allowed_tracking_modes?.length
      ? item.allowed_tracking_modes
      : [item.default_tracking_mode ?? 'reps'];
    const nextMode = previousMode && allowedModes.includes(previousMode)
      ? previousMode
      : (item.default_tracking_mode ?? 'reps');
    setTargetSets(replacementConfig?.targetSets ?? (phase === 'main' ? 3 : 1));
    setRepMin(replacementConfig?.targetRepMin ?? 8);
    setRepMax(replacementConfig?.targetRepMax ?? 12);
    setRestSeconds(replacementConfig?.restSeconds ?? 120);
    setTargetRir(replacementConfig?.targetRir ?? item.default_rir ?? 2);
    setDurationSeconds(replacementConfig?.targetDurationSeconds ?? 90);
    setHoldSeconds(replacementConfig?.targetDurationSeconds ?? 30);
    setPerSide(replacementConfig?.perSide ?? true);
    setTrackingMode(nextMode);
    setDistanceMeters(distanceFromCanonical(replacementConfig?.targetDistanceMeters ?? 1000, unitSystem));
  }

  function handleConfirmAdd() {
    if (!configuringExercise) return;

    const gallery = configuringExercise.gallery_json as any;
    const views = Array.isArray(gallery?.views) ? gallery.views : [];
    const animatedView = views.find((view: any) =>
      typeof view?.src === 'string' && /\.(gif|webm|mp4)(?:\?|$)/i.test(view.src),
    );

    const prescriptionMode: PrescriptionMode = trackingMode;
    const isRepMode = trackingMode === 'reps' || trackingMode === 'weight_reps';
    const isHold = trackingMode === 'duration' && configuringExercise.workout_role === 'static_stretch';
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
      targetRepMin: isRepMode ? repMin : null,
      targetRepMax: isRepMode ? repMax : null,
      targetWeight: null,
      targetRir: trackingMode === 'weight_reps' ? targetRir : null,
      restSeconds: isRepMode ? restSeconds : 0,
      durationSeconds: null,
      holdSeconds: null,
      targetDurationSeconds: isRepMode ? null : isHold ? holdSeconds : durationSeconds,
      targetDistanceMeters: trackingMode === 'duration_distance' ? roundCanonical(distanceToCanonical(distanceMeters, unitSystem)) : null,
      durationStyle: isHold ? 'hold' : trackingMode === 'duration' || trackingMode === 'duration_distance' ? 'active' : null,
      perSide: isHold ? perSide : false,
      aiReason: replacementConfig
        ? `Đổi nhanh từ ${replacementConfig.nameVi ?? replacementConfig.name} sang bài tương tự.`
        : 'Thêm thủ công từ kho bài tập hệ thống',
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

    const phaseCandidates = exercises.filter((ex) => {
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
    if (!replacementConfig) {
      return phaseCandidates.filter((exercise) => !existingSlugs.includes(exercise.slug));
    }
    const source = exercises.find((exercise) => exercise.slug === replacementConfig.exerciseSlug);
    if (!source) return [];
    return rankSimilarExercises(
      {
        slug: source.slug,
        name: source.name,
        nameVi: source.name_vi,
        primaryMuscleVi: source.primary_muscle_vi,
        exerciseType: source.exercise_type,
        equipmentVi: source.equipment_vi,
      },
      phaseCandidates.map((exercise) => ({
        ...exercise,
        nameVi: exercise.name_vi,
        primaryMuscleVi: exercise.primary_muscle_vi,
        exerciseType: exercise.exercise_type,
        equipmentVi: exercise.equipment_vi,
      })),
      existingSlugs,
    );
  }, [exercises, searchQuery, selectedMuscle, selectedEquipment, phase, existingSlugs, replacementConfig]);

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
              <h2 className="font-extrabold text-base text-ink">
                {replacementConfig ? 'Đổi sang bài tương tự' : 'Kho bài tập hệ thống'}
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                {replacementConfig
                  ? `Thay ${replacementConfig.nameVi ?? replacementConfig.name}`
                  : `${exercises.length} bài tập chuẩn hóa GymAI`}
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
                  <p className="text-xs">
                    {replacementConfig
                      ? 'Không còn bài cùng cơ chính phù hợp trong danh mục hiện tại'
                      : 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc'}
                  </p>
                </div>
              ) : (
                filteredList.map((item) => {
                  const gallery = item.gallery_json as any;
                  const thumb = gallery?.main || gallery?.views?.[0]?.src || null;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handlePick(item)}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                        'border-black/[0.06] dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.02] hover:border-accent/40 hover:bg-accent/[0.02]'
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
                        {replacementConfig ? <RefreshCw className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
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
            {(configuringExercise.allowed_tracking_modes?.length ?? 0) > 1 && (
              <label className="block text-xs font-bold text-ink">
                Cách ghi nhận
                <select value={trackingMode} onChange={(event) => setTrackingMode(event.target.value as TrackingMode)} className="mt-2 w-full rounded-xl border border-black/10 bg-chassis p-3 text-ink dark:border-white/10">
                  {(configuringExercise.allowed_tracking_modes ?? [configuringExercise.default_tracking_mode ?? 'reps']).map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </label>
            )}
            {trackingMode === 'reps' || trackingMode === 'weight_reps' ? (
            <div className="grid grid-cols-2 gap-3">
              {/* Target Sets */}
              {trackingMode === 'weight_reps' && <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/10 space-y-2">
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
              </div>}

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
                {configuringExercise.workout_role === 'static_stretch' && trackingMode === 'duration' ? (
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
                {trackingMode === 'duration_distance' && (
                  <label className="block text-xs font-bold text-ink">
                    Quãng đường mục tiêu ({distanceUnitLabel(unitSystem)})
                    <input type="number" min={unitSystem === 'imperial' ? 0.01 : 1} step={unitSystem === 'imperial' ? 0.1 : 100} value={distanceMeters} onChange={(event) => setDistanceMeters(Math.max(unitSystem === 'imperial' ? 0.01 : 1, Number(event.target.value) || 0))} className="mt-2 w-full rounded-xl border border-black/10 bg-chassis p-3 text-ink dark:border-white/10" />
                  </label>
                )}
                <p className="text-[11px] text-ink-secondary">
                  Bài theo thời gian hoặc quãng đường không dùng mức tạ hay RIR và không được tính vào lifting volume.
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
                <span>{replacementConfig ? 'Đổi sang bài này' : 'Thêm bài vào buổi tập'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
