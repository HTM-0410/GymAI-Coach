'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Check, ArrowRight } from 'lucide-react';
import {
  advanceTimer,
  pauseTimer,
  resetTimer as createResetTimer,
  restoreTimer,
  resumeTimer,
  type TimerSnapshot,
} from '@/lib/training/timed-exercise';
import { distanceToCanonical, distanceUnitLabel, formatDistance, roundCanonical, type UnitSystem } from '@/lib/workouts/metrics';

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

type TimedExerciseLoggerProps = {
  exercise: {
    id: string;
    hold_seconds: number | null;
    duration_seconds: number | null;
    target_duration_seconds?: number | null;
    target_distance_meters?: number | null;
    per_side: boolean | null;
    completed_at: string | null;
  };
  mode: 'duration' | 'duration_distance';
  unitSystem?: UnitSystem;
  onBegin: () => void;
  onComplete: (actual: { durationSeconds: number; distanceMeters: number | null }) => void;
  onNext: () => void;
  isLastExercise: boolean;
};

export default function TimedExerciseLogger({
  exercise,
  mode,
  unitSystem = 'metric',
  onBegin,
  onComplete,
  onNext,
  isLastExercise,
}: TimedExerciseLoggerProps) {
  const durationTarget = exercise.target_duration_seconds ?? exercise.hold_seconds ?? exercise.duration_seconds;
  const isDistanceOnly = mode === 'duration_distance' && !(Number(durationTarget) > 0);
  const secondsPerSide = Math.max(1, Number(durationTarget) || 1);
  const targetSeconds = isDistanceOnly ? 0 : secondsPerSide * (exercise.per_side ? 2 : 1);
  const storageKey = `gym-ai:timer:${exercise.id}`;
  const [timerState, setTimerState] = useState<TimerSnapshot>(() => createResetTimer(Math.max(1, targetSeconds), Date.now()));
  const [countUpSeconds, setCountUpSeconds] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const completionSent = useRef(false);
  const completionDue = useRef(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as TimerSnapshot & { countUp?: boolean; elapsedSeconds?: number };
        if (isDistanceOnly && parsed.countUp) {
          const elapsed = Math.max(0, Number(parsed.elapsedSeconds) || 0);
          const restoredElapsed = parsed.running ? elapsed + Math.max(0, Math.floor((Date.now() - parsed.updatedAtMs) / 1000)) : elapsed;
          setCountUpSeconds(restoredElapsed);
          setTimerState({ targetSeconds: 1, remainingSeconds: 1, running: parsed.running, updatedAtMs: Date.now() });
        } else if (!isDistanceOnly && parsed.targetSeconds === targetSeconds && parsed.remainingSeconds >= 0) {
          const restored = restoreTimer(parsed, Date.now());
          completionDue.current = parsed.running && restored.remainingSeconds === 0;
          setTimerState(restored);
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }
    setHydrated(true);
  }, [isDistanceOnly, storageKey, targetSeconds]);

  useEffect(() => {
    if (!hydrated || exercise.completed_at) return;
    window.localStorage.setItem(storageKey, JSON.stringify(isDistanceOnly
      ? { ...timerState, countUp: true, elapsedSeconds: countUpSeconds }
      : timerState));
  }, [countUpSeconds, exercise.completed_at, hydrated, isDistanceOnly, storageKey, timerState]);

  useEffect(() => {
    if (!hydrated || !timerState.running || exercise.completed_at) return;
    if (isDistanceOnly) {
      const timer = window.setInterval(() => {
        setCountUpSeconds((value) => value + 1);
        setTimerState((current) => ({ ...current, updatedAtMs: Date.now() }));
      }, 1000);
      return () => window.clearInterval(timer);
    }
    if (timerState.remainingSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setTimerState((current) => {
        const next = advanceTimer(current, Date.now());
        if (current.running && next.remainingSeconds === 0) completionDue.current = true;
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [exercise.completed_at, hydrated, isDistanceOnly, timerState.remainingSeconds, timerState.running]);

  useEffect(() => {
    if (isDistanceOnly || !hydrated || timerState.remainingSeconds !== 0 || !completionDue.current || completionSent.current || exercise.completed_at) return;
    if (mode === 'duration_distance' && distanceMeters <= 0) {
      setValidationError('Nhập quãng đường thực tế lớn hơn 0 để hoàn thành.');
      return;
    }
    completionSent.current = true;
    window.localStorage.removeItem(storageKey);
    onComplete({ durationSeconds: targetSeconds, distanceMeters: mode === 'duration_distance' ? roundCanonical(distanceToCanonical(distanceMeters, unitSystem)) : null });
  }, [distanceMeters, exercise.completed_at, hydrated, isDistanceOnly, mode, onComplete, storageKey, targetSeconds, timerState.remainingSeconds, unitSystem]);

  const remaining = timerState.remainingSeconds;
  const running = timerState.running;
  const completed = Boolean(exercise.completed_at);
  const activeSide = exercise.per_side && remaining > 0
    ? remaining > secondsPerSide ? 1 : 2
    : null;
  const displayedRemaining = activeSide === 1 ? remaining - secondsPerSide : remaining;
  const progressPercent = isDistanceOnly ? 0 : Math.min(100, Math.max(0, ((targetSeconds - remaining) / targetSeconds) * 100));

  function toggleTimer() {
    if (completed) return;
    if (!running) onBegin();
    setTimerState((current) => isDistanceOnly
      ? { ...current, running: !current.running, updatedAtMs: Date.now() }
      : current.running ? pauseTimer(current, Date.now()) : resumeTimer(current, Date.now()));
  }

  function resetTimer() {
    completionSent.current = false;
    completionDue.current = false;
    const reset = createResetTimer(Math.max(1, targetSeconds), Date.now());
    setCountUpSeconds(0);
    setValidationError(null);
    window.localStorage.setItem(storageKey, JSON.stringify(reset));
    setTimerState(reset);
  }

  function finishEarly() {
    if (completed) return;
    const elapsed = isDistanceOnly ? countUpSeconds : Math.max(1, targetSeconds - timerState.remainingSeconds);
    if (elapsed <= 0) {
      setValidationError('Hãy bắt đầu bấm giờ trước khi hoàn thành.');
      return;
    }
    if (mode === 'duration_distance' && distanceMeters <= 0) {
      setValidationError('Nhập quãng đường thực tế lớn hơn 0 để hoàn thành.');
      return;
    }
    setValidationError(null);
    completionSent.current = true;
    completionDue.current = true;
    window.localStorage.removeItem(storageKey);
    setTimerState((current) => ({ ...current, remainingSeconds: 0, running: false, updatedAtMs: Date.now() }));
    onComplete({ durationSeconds: elapsed, distanceMeters: mode === 'duration_distance' ? roundCanonical(distanceToCanonical(distanceMeters, unitSystem)) : null });
  }

  return (
    <div className="rounded-2xl border border-black/[0.08] dark:border-white/10 bg-chassis-hi dark:bg-[#0c121e] p-5 sm:p-6 shadow-neumorph text-center space-y-4">
      {/* Target description */}
      <div className="flex items-center justify-center gap-2 font-mono text-xs font-bold text-ink-muted">
        <span>{exercise.hold_seconds ? 'Giữ tĩnh' : 'Thực hiện'}</span>
        <span className="text-accent">{isDistanceOnly ? 'Theo quãng đường' : `${targetSeconds} giây`}</span>
        {exercise.per_side && <span>(mỗi bên {secondsPerSide}s)</span>}
      </div>

      {mode === 'duration_distance' && !completed && (
        <label className="block max-w-xs mx-auto text-left font-mono text-xs font-bold text-ink-muted">
          Quãng đường thực tế ({distanceUnitLabel(unitSystem)})
          {exercise.target_distance_meters ? <span className="ml-2 font-normal">Mục tiêu {formatDistance(exercise.target_distance_meters, unitSystem)}</span> : null}
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={unitSystem === 'imperial' ? 0.01 : 10}
            value={distanceMeters || ''}
            onChange={(event) => setDistanceMeters(Math.max(0, Number(event.target.value) || 0))}
            className="mt-1 w-full rounded-xl border border-black/10 bg-chassis px-3 py-3 text-center text-lg font-black text-ink dark:border-white/10"
          />
        </label>
      )}

      {validationError && <p role="alert" className="text-xs font-bold text-danger">{validationError}</p>}

      {/* Big Display Clock */}
      <div className="py-2">
        <span
          suppressHydrationWarning
          className="font-mono text-5xl sm:text-6xl font-black tabular-nums tracking-tight text-ink"
        >
          {formatDuration(isDistanceOnly ? countUpSeconds : exercise.per_side ? displayedRemaining : remaining)}
        </span>
        {activeSide && (
          <span className="block mt-2 font-mono text-xs font-extrabold text-accent">
            Đang thực hiện bên: Bên {activeSide === 1 ? 'Thứ Nhất' : 'Thứ Hai'}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {!isDistanceOnly && <div className="h-2.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden max-w-md mx-auto">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            completed ? 'bg-emerald-500' : 'bg-accent'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>}

      {/* Controller Buttons */}
      {!completed ? (
        <div className="flex items-center justify-center gap-3 pt-2 max-w-md mx-auto">
          <button
            type="button"
            onClick={resetTimer}
            className="p-3 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-ink-muted hover:text-ink transition-colors cursor-pointer"
            title="Đặt lại đồng hồ"
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={toggleTimer}
            className="flex-1 py-4 px-6 rounded-2xl bg-accent hover:brightness-110 active:scale-98 text-white font-extrabold text-base shadow-accent-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {running ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
            <span>{running ? 'Tạm dừng' : 'Bắt đầu bấm giờ'}</span>
          </button>

          <button
            type="button"
            onClick={finishEarly}
            className="py-3 px-4 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-xs font-mono font-bold text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            {isDistanceOnly ? 'Hoàn thành' : 'Xong sớm'}
          </button>
        </div>
      ) : (
        <div className="space-y-3 pt-2 max-w-md mx-auto animate-in fade-in duration-200">
          <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
            <Check className="h-5 w-5 stroke-[3]" />
            <span>Đã hoàn thành bài tập!</span>
          </div>

          <button
            type="button"
            onClick={onNext}
            className="w-full py-4 px-6 rounded-2xl bg-accent hover:brightness-110 active:scale-98 text-white font-extrabold text-sm sm:text-base shadow-accent-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span>{isLastExercise ? 'Hoàn tất buổi tập' : 'Chuyển sang bài tiếp theo'}</span>
            <ArrowRight className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>
      )}
    </div>
  );
}
