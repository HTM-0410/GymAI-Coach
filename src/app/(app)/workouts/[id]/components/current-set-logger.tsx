'use client';

import React, { useState, useEffect } from 'react';
import { Minus, Plus, Check, Sparkles } from 'lucide-react';
import type { TrackedSet, PerceivedEffort } from '../objective-set-tracker';
import { loadFromCanonical, loadToCanonical, loadUnitLabel, roundCanonical, type UnitSystem } from '@/lib/workouts/metrics';
import {
  getSetDraftStorageKey,
  parseSetDraftCache,
  serializeSetDraftCache,
} from '@/lib/workouts/set-draft-cache';

type CurrentSetLoggerProps = {
  activeSet: TrackedSet;
  totalTargetSets: number;
  minReps: number;
  maxReps: number;
  targetWeight: number | null;
  targetRir: number | null;
  suggestedWeight: number | null;
  suggestedReps: number | null;
  availableWeightsKg?: number[];
  showWeight?: boolean;
  unitSystem?: UnitSystem;
  onCompleteSet: (set: TrackedSet) => void;
  isLoading?: boolean;
};

export const EFFORT_OPTIONS: Array<{
  value: PerceivedEffort;
  label: string;
  estimatedRir: number;
  description: string;
}> = [
  {
    value: 'too_hard',
    label: 'Quá sức',
    estimatedRir: 0,
    description: 'Gần như kiệt sức.',
  },
  {
    value: 'hard',
    label: 'Nặng',
    estimatedRir: 1,
    description: 'Khó rõ rệt nhưng vẫn hoàn thành được.',
  },
  {
    value: 'appropriate',
    label: 'Vừa sức',
    estimatedRir: 2,
    description: 'Thử thách vừa đủ, vẫn kiểm soát tốt.',
  },
  {
    value: 'easy',
    label: 'Nhẹ',
    estimatedRir: 4,
    description: 'Còn khá nhiều sức.',
  },
];

function resolveDefaultEffort(setEffort?: PerceivedEffort | null, setRir?: number | null, targetRir?: number | null): PerceivedEffort {
  if (setEffort) return setEffort;
  const rir = setRir ?? targetRir;
  if (rir == null) return 'appropriate';
  if (rir <= 0) return 'too_hard';
  if (rir === 1) return 'hard';
  if (rir >= 4) return 'easy';
  return 'appropriate';
}

export default function CurrentSetLogger({
  activeSet,
  totalTargetSets,
  minReps,
  maxReps,
  targetWeight,
  targetRir,
  suggestedWeight,
  suggestedReps,
  availableWeightsKg,
  showWeight = true,
  unitSystem = 'metric',
  onCompleteSet,
  isLoading = false,
}: CurrentSetLoggerProps) {
  // Local state for immediate responsiveness
  const [weight, setWeight] = useState<number>(
    loadFromCanonical(activeSet.weight ?? suggestedWeight ?? targetWeight ?? 20, unitSystem)
  );
  const [reps, setReps] = useState<number>(
    activeSet.reps ?? suggestedReps ?? minReps ?? 10
  );
  const [effort, setEffort] = useState<PerceivedEffort>(
    resolveDefaultEffort(activeSet.perceived_effort, activeSet.rir, targetRir)
  );
  const [draftHydrated, setDraftHydrated] = useState(false);
  const storageKey = getSetDraftStorageKey(activeSet.id);

  // Restore unfinished input after leaving and returning to the workout route.
  useEffect(() => {
    setDraftHydrated(false);
    setWeight(loadFromCanonical(activeSet.weight ?? suggestedWeight ?? targetWeight ?? 20, unitSystem));
    setReps(activeSet.reps ?? suggestedReps ?? minReps ?? 10);
    setEffort(resolveDefaultEffort(activeSet.perceived_effort, activeSet.rir, targetRir));
    try {
      const cached = parseSetDraftCache(window.localStorage.getItem(storageKey));
      if (cached) {
        setWeight(cached.weight);
        setReps(cached.reps);
        setEffort(cached.effort);
      }
    } catch {
      // Storage can be unavailable in private browsing or after quota errors.
    }
    setDraftHydrated(true);
  }, [activeSet.id, storageKey, unitSystem]);

  useEffect(() => {
    if (!draftHydrated) return;
    try {
      window.localStorage.setItem(storageKey, serializeSetDraftCache({ weight, reps, effort }));
    } catch {
      // The server write remains the source of truth when local storage is unavailable.
    }
  }, [draftHydrated, effort, reps, storageKey, weight]);

  const isBonus = activeSet.note === 'bonus' || activeSet.set_number > totalTargetSets;
  const selectedOption = EFFORT_OPTIONS.find((opt) => opt.value === effort) ?? EFFORT_OPTIONS[2];

  function handleAdjustWeight(delta: number) {
    const availableWeights = availableWeightsKg?.map((value) => loadFromCanonical(value, unitSystem));
    if (availableWeights && availableWeights.length > 0) {
      const current = weight;
      if (delta > 0) {
        const next = availableWeights.find((w) => w > current);
        if (next != null) setWeight(next);
        else setWeight(Math.max(0, current + delta));
      } else {
        const prev = [...availableWeights].reverse().find((w) => w < current);
        if (prev != null) setWeight(prev);
        else setWeight(Math.max(0, current + delta));
      }
    } else {
      setWeight((prev) => Math.max(0, Math.round((prev + delta) * 10) / 10));
    }
  }

  function handleAdjustReps(delta: number) {
    setReps((prev) => Math.max(1, prev + delta));
  }

  function handleComplete() {
    onCompleteSet({
      ...activeSet,
      weight: showWeight ? roundCanonical(loadToCanonical(weight, unitSystem)) : null,
      reps,
      rir: selectedOption.estimatedRir,
      perceived_effort: effort,
    });
  }

  return (
    <div className="rounded-2xl border border-black/[0.08] dark:border-white/10 bg-chassis-hi dark:bg-[#0c121e] p-3.5 sm:p-4 shadow-neumorph relative overflow-hidden space-y-3">
      {/* Set Header Bar: Minimal badge */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="h-6 px-2.5 rounded-md font-mono text-[11px] font-extrabold bg-accent text-white flex items-center justify-center shadow-accent">
            HIỆP {activeSet.set_number}/{totalTargetSets}
          </div>
          {isBonus && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25">
              Bonus
            </span>
          )}
        </div>
      </div>

      {/* 1. MỨC TẠ (WEIGHT) */}
      {showWeight && <div>
        <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1 px-0.5">
          Mức tạ
        </span>
        <div className="h-[52px] sm:h-[56px] px-2 rounded-xl bg-chassis border border-black/5 dark:border-white/10 shadow-inset-sm flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => handleAdjustWeight(unitSystem === 'imperial' ? -5 : -2.5)}
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-lg bg-black/[0.04] dark:bg-white/[0.08] hover:bg-accent/20 hover:text-accent active:scale-95 flex items-center justify-center font-bold text-ink transition-all touch-manipulation cursor-pointer shrink-0"
            title={`Giảm ${unitSystem === 'imperial' ? '5 lb' : '2.5 kg'}`}
            aria-label="Giảm tạ"
          >
            <Minus className="h-4 w-4" strokeWidth={2.5} />
          </button>

          <div className="flex-1 flex items-baseline justify-center gap-1 min-w-0">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              value={weight}
              onChange={(e) => setWeight(Math.max(0, Number(e.target.value) || 0))}
              className="w-20 bg-transparent text-center font-mono text-2xl font-black text-ink focus:outline-none focus:text-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="font-mono text-xs font-bold text-ink-muted">{loadUnitLabel(unitSystem)}</span>
          </div>

          <button
            type="button"
            onClick={() => handleAdjustWeight(unitSystem === 'imperial' ? 5 : 2.5)}
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-lg bg-black/[0.04] dark:bg-white/[0.08] hover:bg-accent/20 hover:text-accent active:scale-95 flex items-center justify-center font-bold text-ink transition-all touch-manipulation cursor-pointer shrink-0"
            title={`Tăng ${unitSystem === 'imperial' ? '5 lb' : '2.5 kg'}`}
            aria-label="Tăng tạ"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>}

      {/* 2. SỐ REPS */}
      <div>
        <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1 px-0.5">
          Số reps
        </span>
        <div className="h-[52px] sm:h-[56px] px-2 rounded-xl bg-chassis border border-black/5 dark:border-white/10 shadow-inset-sm flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => handleAdjustReps(-1)}
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-lg bg-black/[0.04] dark:bg-white/[0.08] hover:bg-accent/20 hover:text-accent active:scale-95 flex items-center justify-center font-bold text-ink transition-all touch-manipulation cursor-pointer shrink-0"
            title="Giảm 1 rep"
            aria-label="Giảm reps"
          >
            <Minus className="h-4 w-4" strokeWidth={2.5} />
          </button>

          <div className="flex-1 flex items-baseline justify-center gap-1 min-w-0">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={reps}
              onChange={(e) => setReps(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-16 bg-transparent text-center font-mono text-2xl font-black text-ink focus:outline-none focus:text-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="font-mono text-xs font-bold text-ink-muted">reps</span>
          </div>

          <button
            type="button"
            onClick={() => handleAdjustReps(1)}
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-lg bg-black/[0.04] dark:bg-white/[0.08] hover:bg-accent/20 hover:text-accent active:scale-95 flex items-center justify-center font-bold text-ink transition-all touch-manipulation cursor-pointer shrink-0"
            title="Tăng 1 rep"
            aria-label="Tăng reps"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* 3. NATURAL EFFORT DIFFICULTY SELECTOR */}
      <div>
        <div className="mb-1.5 px-0.5">
          <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-ink">
            Cảm nhận hiệp vừa rồi
          </span>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Hiệp này khó đến mức nào?
          </p>
        </div>

        {/* 4 Effort Buttons (2x2 on mobile, 4 on desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {EFFORT_OPTIONS.map((opt) => {
            const isSelected = effort === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEffort(opt.value)}
                className={`min-h-[44px] py-2 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center border cursor-pointer touch-manipulation flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-accent text-white border-accent shadow-xs'
                    : 'bg-chassis text-ink-secondary border-black/5 dark:border-white/10 hover:border-accent/40 hover:text-ink'
                }`}
              >
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Option Helper Line */}
        <div className="mt-1.5 py-1 px-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] text-[11px] text-ink-secondary flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
          <span>{selectedOption.description}</span>
        </div>
      </div>

      {/* 4. PRIMARY FULL-WIDTH CTA */}
      <button
        type="button"
        disabled={isLoading}
        onClick={handleComplete}
        className="w-full h-[52px] sm:h-[56px] flex items-center justify-center gap-2 rounded-2xl bg-accent hover:brightness-110 active:scale-[0.98] text-white font-extrabold text-sm sm:text-base tracking-wide shadow-accent-lg transition-all touch-manipulation cursor-pointer disabled:opacity-50"
      >
        <Check className="h-4 w-4 sm:h-5 sm:w-5 stroke-[3]" />
        <span>HOÀN THÀNH HIỆP {activeSet.set_number}</span>
      </button>
    </div>
  );
}
