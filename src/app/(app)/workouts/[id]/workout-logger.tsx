'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Dumbbell,
  Lightbulb,
  ListChecks,
  TriangleAlert,
  Play,
  Pause,
  Clock,
} from 'lucide-react';
import PreviousPerformance from '@/components/previous-performance';
import ObjectiveSetTracker, {
  type TrackedSet,
  type TrackingExercise,
} from './objective-set-tracker';
import {
  advanceTimer,
  pauseTimer,
  resetTimer as createResetTimer,
  restoreTimer,
  resumeTimer,
  type TimerSnapshot,
} from '@/lib/training/timed-exercise';
import { resolveRequestedExerciseIndex } from '@/lib/training/workout-phases';

type WEx = TrackingExercise & {
  order_index: number;
  phase: 'warmup' | 'main' | 'cooldown' | null;
  prescription_mode: 'reps' | 'time' | 'hold' | null;
  duration_seconds: number | null;
  hold_seconds: number | null;
  per_side: boolean | null;
  target_weight: number | null;
  target_rir: number | null;
  rest_seconds: number | null;
  ai_reason: string | null;
  exercises: {
    slug: string;
    name: string;
    name_vi: string | null;
    default_rest_seconds: number | null;
    default_rir: number | null;
    animation_url: string | null;
    thumbnail_url: string | null;
    instructions_list: string[];
    tips_list: string[];
    common_mistakes_list: string[];
    exercise_equipment?: { equipment: { slug: string } | null }[];
  };
  workout_sets: TrackedSet[];
};

type WorkoutPhase = 'warmup' | 'main' | 'cooldown';
type PrescriptionMode = 'reps' | 'time' | 'hold';

const phaseOf = (exercise: WEx): WorkoutPhase => exercise.phase ?? 'main';
const modeOf = (exercise: WEx): PrescriptionMode => exercise.prescription_mode ?? 'reps';
const phaseLabel: Record<WorkoutPhase, string> = {
  warmup: 'Khởi động',
  main: 'Bài chính',
  cooldown: 'Hạ nhiệt',
};

type Workout = {
  id: string;
  date: string;
  status: string;
  planned_duration: number | null;
  started_at: string | null;
  completed_at: string | null;
  workout_exercises: WEx[];
};

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function WorkoutLogger({
  workout,
  availableDumbbellWeights = [],
}: {
  workout: Workout;
  availableDumbbellWeights?: number[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialExerciseIndex = resolveRequestedExerciseIndex(
    searchParams.get('exercise'),
    workout.workout_exercises.length,
  );

  const [exIdx, setExIdx] = useState(initialExerciseIndex);
  const [exercises, setExercises] = useState(workout.workout_exercises);
  const [startedAt, setStartedAt] = useState<string | null>(workout.started_at);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedSeconds, setPausedSeconds] = useState(0);
  const [now, setNow] = useState(Date.now());

  const ex = exercises[exIdx];

  // Timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isPaused) {
        setNow(Date.now());
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused]);

  // Workout duration calculation
  const totalSeconds = startedAt && !isPaused
    ? Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000) - pausedSeconds)
    : 0;

  const totalCompletedUnits = exercises.reduce(
    (acc, curr) => acc + (modeOf(curr) === 'reps'
      ? curr.workout_sets.filter((s) => s.completed).length
      : curr.completed_at ? 1 : 0),
    0,
  );
  const totalPlannedUnits = exercises.reduce(
    (acc, curr) => acc + (modeOf(curr) === 'reps' ? curr.target_sets : 1),
    0,
  );

  async function handleStartWorkout() {
    if (startedAt) return;
    const startedIso = new Date().toISOString();
    setStartedAt(startedIso);
    const supabase = createClient();
    await supabase
      .from('workouts')
      .update({ status: 'in_progress', started_at: startedIso })
      .eq('id', workout.id);
  }

  function handleTogglePause() {
    setIsPaused((prev) => !prev);
  }

  function updateExercise(updated: TrackingExercise) {
    // If workout hasn't started yet and a set is modified, automatically start workout
    if (!startedAt) {
      handleStartWorkout();
    }
    setExercises((current) =>
      current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
    );
  }

  async function finishExercise(exercise: WEx) {
    if (modeOf(exercise) !== 'reps') return;
    if (!exercise.started_at || exercise.completed_at) return;
    const completedAt = new Date().toISOString();
    const supabase = createClient();
    const { error } = await supabase
      .from('workout_exercises')
      .update({ completed_at: completedAt })
      .eq('id', exercise.id);
    if (!error) {
      setExercises((current) =>
        current.map((item) =>
          item.id === exercise.id ? { ...item, completed_at: completedAt } : item,
        ),
      );
    }
  }

  async function beginTimedExercise(exercise: WEx) {
    if (!startedAt) await handleStartWorkout();
    if (exercise.started_at) return;
    const exerciseStartedAt = new Date().toISOString();
    const supabase = createClient();
    const { error } = await supabase
      .from('workout_exercises')
      .update({ started_at: exerciseStartedAt })
      .eq('id', exercise.id);
    if (!error) {
      setExercises((current) => current.map((item) =>
        item.id === exercise.id ? { ...item, started_at: exerciseStartedAt } : item,
      ));
    }
  }

  async function completeTimedExercise(exercise: WEx) {
    if (exercise.completed_at) return;
    const timestamp = new Date().toISOString();
    const supabase = createClient();
    const { error } = await supabase
      .from('workout_exercises')
      .update({ started_at: exercise.started_at ?? timestamp, completed_at: timestamp })
      .eq('id', exercise.id);
    if (!error) {
      setExercises((current) => current.map((item) =>
        item.id === exercise.id
          ? { ...item, started_at: item.started_at ?? timestamp, completed_at: timestamp }
          : item,
      ));
    }
  }

  async function goToExercise(index: number) {
    if (index > exIdx) await finishExercise(ex);
    setExIdx(index);
    router.replace(`/workouts/${workout.id}?exercise=${index}`, { scroll: false });
  }

  async function completeWorkout() {
    await finishExercise(ex);
    const supabase = createClient();
    await supabase
      .from('workouts')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', workout.id);
    router.push(`/workouts/${workout.id}/done`);
    router.refresh();
  }

  const nextExercise = exercises[exIdx + 1];
  const nextExerciseName = nextExercise
    ? nextExercise.exercises.name_vi ?? nextExercise.exercises.name
    : null;
  const isLastExercise = exIdx === exercises.length - 1;

  function handleNextExercise() {
    if (isLastExercise) {
      completeWorkout();
    } else {
      goToExercise(exIdx + 1);
    }
  }

  function skipCurrentPhase() {
    const currentPhase = phaseOf(ex);
    const nextPhaseIndex = exercises.findIndex(
      (item, index) => index > exIdx && phaseOf(item) !== currentPhase,
    );
    if (nextPhaseIndex >= 0) {
      goToExercise(nextPhaseIndex);
    } else {
      completeWorkout();
    }
  }

  const currentPhase = phaseOf(ex);
  const currentMode = modeOf(ex);

  return (
    <div className="min-h-screen bg-chassis blueprint-grid px-4 py-4 sm:py-6 pb-28">
      {/* ── STICKY WORKOUT HUD BAR ── */}
      <header className="sticky top-0 z-30 -mx-4 px-4 py-2.5 mb-5 bg-chassis-hi/90 dark:bg-[#0c1017]/95 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08] shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Workout Timer + Status */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-black/[0.04] dark:bg-white/[0.06] px-3 py-1.5 rounded-xl border border-black/[0.06] dark:border-white/10">
              <Clock className={`h-4 w-4 ${startedAt ? (isPaused ? 'text-warn' : 'text-accent animate-pulse') : 'text-ink-muted'}`} />
              <span className="font-mono text-sm sm:text-base font-extrabold tabular-nums text-ink">
                {startedAt ? formatDuration(totalSeconds) : '00:00'}
              </span>
              {startedAt && (
                <button
                  type="button"
                  onClick={handleTogglePause}
                  className="ml-1 p-1 rounded-md text-ink-muted hover:text-ink hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title={isPaused ? 'Tiếp tục buổi tập' : 'Tạm dừng buổi tập'}
                  aria-label={isPaused ? 'Tiếp tục' : 'Tạm dừng'}
                >
                  {isPaused ? <Play className="h-3 w-3 fill-current text-success" /> : <Pause className="h-3 w-3 fill-current" />}
                </button>
              )}
            </div>

            {/* Overall Sets Progress */}
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs font-bold text-ink-muted">
              <span>Tiến độ:</span>
              <span className="text-accent">{totalCompletedUnits}/{totalPlannedUnits} mục</span>
            </div>
          </div>

          {/* Exercise Selector Quick Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {exercises.map((item, idx) => {
              const isCurrent = idx === exIdx;
              const isDone = modeOf(item) === 'reps'
                ? item.workout_sets.length > 0 && item.workout_sets.every((s) => s.completed)
                : Boolean(item.completed_at);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goToExercise(idx)}
                  className={`h-7 px-3 rounded-lg text-xs font-mono font-extrabold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                    isCurrent
                      ? 'bg-gradient-to-r from-accent to-accent-dim text-white border border-orange-400/40 shadow-xs'
                      : isDone
                        ? 'bg-success/15 text-success border border-success/30'
                        : 'bg-black/[0.04] dark:bg-white/[0.06] text-ink-muted hover:text-ink hover:bg-black/[0.08] dark:hover:bg-white/[0.1] border border-black/[0.04] dark:border-white/[0.06]'
                  }`}
                >
                  <span>#{idx + 1}</span>
                  {isDone && <Check className="h-3 w-3 stroke-[2.5]" />}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── PRE-WORKOUT HERO BANNER (If not started yet) ── */}
      {!startedAt && (
        <section className="mb-6 rounded-2xl border border-accent/40 bg-gradient-to-r from-accent/15 via-accent/5 to-transparent p-5 sm:p-6 shadow-neumorph relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_#f97316] led-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-accent font-bold">
                  Sẵn sàng tập luyện
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight">
                Khởi động và bấm Bắt đầu buổi tập
              </h2>
              <p className="text-xs sm:text-sm text-ink-secondary mt-1 max-w-xl font-medium">
                Đồng hồ tổng và bộ đếm thời gian từng set sẽ bắt đầu tính khi bạn sẵn sàng thực hiện bài tập.
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartWorkout}
              className="btn-primary text-sm sm:text-base px-6 py-3.5 shadow-accent-lg shrink-0 flex items-center gap-2.5 font-bold uppercase tracking-wider hover:scale-105 transition-transform cursor-pointer w-full sm:w-auto justify-center"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Bắt đầu buổi tập</span>
            </button>
          </div>
        </section>
      )}

      {/* ── EXERCISE HEADER ── */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">
            {phaseLabel[currentPhase]} · Bài {exIdx + 1} / {exercises.length}
          </span>
          {currentPhase !== 'main' && (
            <button
              type="button"
              onClick={skipCurrentPhase}
              className="ml-auto font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted hover:text-accent"
            >
              Bỏ qua phần này
            </button>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          {ex.exercises.name_vi ?? ex.exercises.name}
        </h1>
        <p className="text-sm text-ink-secondary mt-1 font-mono">
          Mục tiêu:{' '}
          <span className="text-accent font-bold">
            {currentMode === 'reps'
              ? `${ex.target_sets} sets × ${ex.target_rep_min ?? '?'}-${ex.target_rep_max ?? '?'} reps`
              : `${currentMode === 'hold' ? 'Giữ' : 'Thực hiện'} ${currentMode === 'hold' ? ex.hold_seconds ?? 0 : ex.duration_seconds ?? 0} giây${ex.per_side ? ' mỗi bên' : ''}`}
          </span>
        </p>
        {ex.ai_reason && (
          <p className="text-xs text-ink-secondary mt-2 italic bg-chassis-hi dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] rounded-xl px-3.5 py-2 shadow-neumorph-sm">
            💡 {ex.ai_reason}
          </p>
        )}
      </div>

      {/* Exercise Video / Animation & Guide */}
      <ExerciseGuide
        exercise={ex.exercises}
        returnTo={`/workouts/${workout.id}?exercise=${exIdx}`}
      />

      {/* Previous performance reference */}
      {currentPhase === 'main' && currentMode === 'reps' && (
        <div className="mb-5">
          <PreviousPerformance previous={ex.previous_performance} />
        </div>
      )}

      {/* ── OBJECTIVE SET TRACKER MATRIX ── */}
      {currentMode === 'reps' ? (
        <ObjectiveSetTracker
          exercise={ex}
          workoutStartedAt={startedAt}
          onStartWorkout={handleStartWorkout}
          defaultRestSeconds={ex.exercises.default_rest_seconds}
          availableWeightsKg={
            ex.exercises.exercise_equipment?.some(
              (item) => item.equipment?.slug === 'dumbbell' || item.equipment?.slug === 'ta-don',
            )
              ? availableDumbbellWeights
              : undefined
          }
          onChange={updateExercise}
          onNextExercise={handleNextExercise}
          nextExerciseName={nextExerciseName}
          isLastExercise={isLastExercise}
        />
      ) : (
        <TimedExerciseTracker
          key={ex.id}
          exercise={ex}
          mode={currentMode}
          onBegin={() => beginTimedExercise(ex)}
          onComplete={() => completeTimedExercise(ex)}
          onNext={handleNextExercise}
          isLastExercise={isLastExercise}
        />
      )}

      {/* Bottom Navigation */}
      <nav className="flex items-center justify-between gap-3 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
        <button
          type="button"
          disabled={exIdx === 0}
          onClick={() => goToExercise(exIdx - 1)}
          className="btn-ghost inline-flex items-center gap-1.5 px-4 py-2.5 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          <span>Bài trước</span>
        </button>

        {exIdx < exercises.length - 1 ? (
          <button
            type="button"
            onClick={() => goToExercise(exIdx + 1)}
            className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 shadow-accent"
          >
            <span>Bài tiếp theo</span>
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        ) : (
          <button
            type="button"
            onClick={completeWorkout}
            className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 shadow-accent bg-gradient-to-r from-emerald-600 to-emerald-500 hover:brightness-110"
          >
            <Check className="h-4 w-4 stroke-[2.5]" />
            <span>Hoàn thành buổi tập</span>
          </button>
        )}
      </nav>
    </div>
  );
}

function TimedExerciseTracker({
  exercise,
  mode,
  onBegin,
  onComplete,
  onNext,
  isLastExercise,
}: {
  exercise: WEx;
  mode: 'time' | 'hold';
  onBegin: () => void;
  onComplete: () => void;
  onNext: () => void;
  isLastExercise: boolean;
}) {
  const secondsPerSide = Math.max(
    1,
    mode === 'hold' ? exercise.hold_seconds ?? 1 : exercise.duration_seconds ?? 1,
  );
  const targetSeconds = secondsPerSide * (exercise.per_side ? 2 : 1);
  const storageKey = `gym-ai:timer:${exercise.id}`;
  const [timerState, setTimerState] = useState<TimerSnapshot>(() => createResetTimer(targetSeconds, Date.now()));
  const [hydrated, setHydrated] = useState(false);
  const completionSent = useRef(false);
  const completionDue = useRef(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as TimerSnapshot;
        if (parsed.targetSeconds === targetSeconds && parsed.remainingSeconds >= 0) {
          const restored = restoreTimer(parsed, Date.now());
          completionDue.current = parsed.running && restored.remainingSeconds === 0;
          setTimerState(restored);
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }
    setHydrated(true);
  }, [storageKey, targetSeconds]);

  useEffect(() => {
    if (!hydrated || exercise.completed_at) return;
    window.localStorage.setItem(storageKey, JSON.stringify(timerState));
  }, [exercise.completed_at, hydrated, storageKey, timerState]);

  useEffect(() => {
    if (!hydrated || !timerState.running || timerState.remainingSeconds <= 0 || exercise.completed_at) return;
    const timer = window.setInterval(() => {
      setTimerState((current) => {
        const next = advanceTimer(current, Date.now());
        if (current.running && next.remainingSeconds === 0) completionDue.current = true;
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [exercise.completed_at, hydrated, timerState.remainingSeconds, timerState.running]);

  useEffect(() => {
    if (!hydrated || timerState.remainingSeconds !== 0 || !completionDue.current || completionSent.current || exercise.completed_at) return;
    completionSent.current = true;
    window.localStorage.removeItem(storageKey);
    onComplete();
  }, [exercise.completed_at, hydrated, onComplete, storageKey, timerState.remainingSeconds]);

  const remaining = timerState.remainingSeconds;
  const running = timerState.running;
  const completed = Boolean(exercise.completed_at) || (remaining === 0 && completionDue.current);
  const activeSide = exercise.per_side && remaining > 0
    ? remaining > secondsPerSide ? 1 : 2
    : null;
  const displayedRemaining = activeSide === 1 ? remaining - secondsPerSide : remaining;

  function toggleTimer() {
    if (completed) return;
    if (!running) onBegin();
    setTimerState((current) => current.running ? pauseTimer(current, Date.now()) : resumeTimer(current, Date.now()));
  }

  function resetTimer() {
    completionSent.current = false;
    completionDue.current = false;
    const reset = createResetTimer(targetSeconds, Date.now());
    window.localStorage.setItem(storageKey, JSON.stringify(reset));
    setTimerState(reset);
  }

  function finishEarly() {
    if (completed) return;
    completionSent.current = true;
    completionDue.current = true;
    window.localStorage.removeItem(storageKey);
    setTimerState((current) => ({ ...current, remainingSeconds: 0, running: false, updatedAtMs: Date.now() }));
    onComplete();
  }

  return (
    <section className="card mb-5 rounded-2xl border border-black/[0.06] p-5 shadow-neumorph dark:border-white/10">
      <div className="flex flex-col items-center text-center">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
          {mode === 'hold' ? 'Đồng hồ giữ tư thế' : 'Đồng hồ vận động'}
          {activeSide ? ` · bên ${activeSide}/2` : exercise.per_side ? ' · mỗi bên' : ''}
        </span>
        <div className={`my-5 font-mono text-6xl font-black tabular-nums ${completed ? 'text-success' : 'text-ink'}`}>
          {formatDuration(displayedRemaining)}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={toggleTimer}
            disabled={completed}
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 disabled:opacity-50"
          >
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {running ? 'Tạm dừng' : 'Bắt đầu'}
          </button>
          <button type="button" onClick={resetTimer} className="btn-ghost px-4 py-3">
            Đặt lại
          </button>
          {!completed && (
            <button type="button" onClick={finishEarly} className="btn-ghost px-4 py-3 text-success">
              Hoàn thành sớm
            </button>
          )}
        </div>
        {completed && (
          <div className="mt-5 flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-2 font-mono text-sm font-bold text-success">
              <Check className="h-4 w-4" /> Đã hoàn thành
            </div>
            <button type="button" onClick={onNext} className="btn-primary px-6 py-2.5">
              {isLastExercise ? 'Hoàn thành buổi tập' : 'Sang bài tiếp theo'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function ExerciseGuide({
  exercise,
  returnTo,
}: {
  exercise: WEx['exercises'];
  returnTo: string;
}) {
  const source = exercise.animation_url ?? exercise.thumbnail_url;
  const isVideo = !!source && /\.(mp4|webm|ogg)(?:\?|$)/i.test(source);
  const hasGuidance =
    exercise.instructions_list.length > 0 ||
    exercise.tips_list.length > 0 ||
    exercise.common_mistakes_list.length > 0;

  return (
    <section className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
      <div className="card overflow-hidden rounded-2xl border border-black/[0.06] shadow-neumorph dark:border-white/10">
        <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.65)]" />
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
              Minh hoạ động tác
            </h2>
          </div>
          {exercise.animation_url && (
            <span className="rounded-md bg-accent/10 px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-wider text-accent border border-accent/20">
              GIF
            </span>
          )}
        </div>
        <div className="relative aspect-video bg-white dark:bg-white">
          {!source ? (
            <div className="flex h-full flex-col items-center justify-center text-ink-muted">
              <Dumbbell className="h-10 w-10 opacity-35" />
              <p className="mt-2 font-mono text-[9px] uppercase tracking-wider">Chưa có GIF minh hoạ</p>
            </div>
          ) : isVideo ? (
            <video
              key={source}
              src={source}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <Image
              key={source}
              src={source}
              alt={`GIF hướng dẫn ${exercise.name_vi ?? exercise.name}`}
              fill
              priority
              unoptimized={/\.gif(?:\?|$)/i.test(source)}
              sizes="(max-width: 1024px) 100vw, 520px"
              className="object-contain"
            />
          )}
        </div>
      </div>

      <div className="card rounded-2xl border border-black/[0.06] p-4 shadow-neumorph dark:border-white/10 flex flex-col justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 border-b border-black/[0.06] pb-3 dark:border-white/10">
            <ListChecks className="h-4 w-4 text-accent" />
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
              Hướng dẫn & lưu ý
            </h2>
          </div>

          {exercise.instructions_list.length > 0 && (
            <GuideBlock title="Cách thực hiện" icon={ListChecks} items={exercise.instructions_list} />
          )}
          {exercise.tips_list.length > 0 && (
            <GuideBlock title="Mẹo kỹ thuật" icon={Lightbulb} items={exercise.tips_list} tone="tip" />
          )}
          {exercise.common_mistakes_list.length > 0 && (
            <GuideBlock
              title="Lỗi cần tránh"
              icon={TriangleAlert}
              items={exercise.common_mistakes_list}
              tone="warning"
            />
          )}

          {!hasGuidance && (
            <p className="rounded-xl bg-chassis shadow-inset-sm px-3 py-3 text-xs leading-relaxed text-ink-secondary">
              Bài tập này chưa có hướng dẫn chi tiết trong dữ liệu.
            </p>
          )}
        </div>

        <Link
          href={{
            pathname: `/exercises/${exercise.slug}`,
            query: { returnTo },
          }}
          className="mt-3 inline-flex text-[11px] font-bold text-accent transition-colors hover:text-accent/80"
        >
          Xem trang chi tiết bài tập →
        </Link>
      </div>
    </section>
  );
}

function GuideBlock({
  title,
  icon: Icon,
  items,
  tone = 'default',
}: {
  title: string;
  icon: typeof ListChecks;
  items: string[];
  tone?: 'default' | 'tip' | 'warning';
}) {
  const color =
    tone === 'warning'
      ? 'text-danger'
      : tone === 'tip'
        ? 'text-accent'
        : 'text-ink-secondary';

  return (
    <div className="mb-3 last:mb-0">
      <div className={`mb-1.5 flex items-center gap-1.5 ${color}`}>
        <Icon className="h-3.5 w-3.5" />
        <h3 className="font-mono text-[9px] font-bold uppercase tracking-wider">{title}</h3>
      </div>
      <ol className="space-y-1.5">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2 text-[11px] leading-relaxed text-ink-secondary">
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-chassis shadow-neumorph-sm font-mono text-[8px] font-bold text-accent">
              {index + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
