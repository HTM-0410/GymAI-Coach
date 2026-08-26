'use client';

import React, { useState } from 'react';
import { Check, Plus, Save, X } from 'lucide-react';
import type { TrackedSet, PerceivedEffort } from '../objective-set-tracker';
import { EFFORT_OPTIONS } from './current-set-logger';
import { formatLoad, loadFromCanonical, loadToCanonical, loadUnitLabel, roundCanonical, type UnitSystem } from '@/lib/workouts/metrics';

type CompletedSetsCompactProps = {
  completedSets: TrackedSet[];
  upcomingSets: TrackedSet[];
  targetSets: number;
  minReps: number;
  maxReps: number;
  showWeight?: boolean;
  unitSystem?: UnitSystem;
  onUpdateSet: (set: TrackedSet) => void;
  onAddSet: () => void;
};

function getEffortLabel(set: TrackedSet): string {
  if (set.perceived_effort) {
    const found = EFFORT_OPTIONS.find((opt) => opt.value === set.perceived_effort);
    if (found) return found.label;
  }
  if (set.rir != null) {
    if (set.rir <= 0) return 'Quá sức';
    if (set.rir === 1) return 'Nặng';
    if (set.rir >= 4) return 'Nhẹ';
    return 'Vừa sức';
  }
  return 'Vừa sức';
}

function resolveEffortFromSet(set: TrackedSet): PerceivedEffort {
  if (set.perceived_effort) return set.perceived_effort;
  if (set.rir != null) {
    if (set.rir <= 0) return 'too_hard';
    if (set.rir === 1) return 'hard';
    if (set.rir >= 4) return 'easy';
    return 'appropriate';
  }
  return 'appropriate';
}

export default function CompletedSetsCompact({
  completedSets,
  upcomingSets,
  targetSets,
  minReps,
  maxReps,
  showWeight = true,
  unitSystem = 'metric',
  onUpdateSet,
  onAddSet,
}: CompletedSetsCompactProps) {
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState<number>(0);
  const [editReps, setEditReps] = useState<number>(0);
  const [editEffort, setEditEffort] = useState<PerceivedEffort>('appropriate');

  function startEdit(set: TrackedSet) {
    setEditingSetId(set.id);
    setEditWeight(loadFromCanonical(set.weight ?? 0, unitSystem));
    setEditReps(set.reps ?? 10);
    setEditEffort(resolveEffortFromSet(set));
  }

  function handleSaveEdit(set: TrackedSet) {
    const selectedOption = EFFORT_OPTIONS.find((opt) => opt.value === editEffort) ?? EFFORT_OPTIONS[2];
    onUpdateSet({
      ...set,
      weight: showWeight ? roundCanonical(loadToCanonical(editWeight, unitSystem)) : null,
      reps: editReps,
      rir: selectedOption.estimatedRir,
      perceived_effort: editEffort,
    });
    setEditingSetId(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-ink-muted px-1">
        <span>CÁC HIỆP · {completedSets.length}/{targetSets}</span>
        {completedSets.length >= targetSets && (
          <button
            type="button"
            onClick={onAddSet}
            className="inline-flex items-center gap-1 text-accent hover:underline cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>Thêm hiệp</span>
          </button>
        )}
      </div>

      {/* Completed sets list */}
      <div className="space-y-1.5">
        {completedSets.map((set) => {
          const isEditing = editingSetId === set.id;
          const isBonus = set.note === 'bonus' || set.set_number > targetSets;
          const effortLabel = getEffortLabel(set);

          if (isEditing) {
            return (
              <div
                key={set.id}
                className="p-3.5 rounded-2xl border border-accent/40 bg-accent/[0.04] space-y-3 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between font-mono text-xs font-bold text-ink">
                  <span>Chỉnh sửa Hiệp {set.set_number}</span>
                  <button
                    type="button"
                    onClick={() => setEditingSetId(null)}
                    className="p-1 text-ink-muted hover:text-ink"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className={`grid gap-2 ${showWeight ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {showWeight && <div>
                    <label className="block text-[9px] font-mono text-ink-muted uppercase">Mức tạ ({loadUnitLabel(unitSystem)})</label>
                    <input
                      type="number"
                      step={0.5}
                      value={editWeight}
                      onChange={(e) => setEditWeight(Number(e.target.value) || 0)}
                      className="w-full mt-0.5 p-2 rounded-xl bg-chassis border border-black/10 dark:border-white/15 font-mono text-sm font-bold text-center text-ink"
                    />
                  </div>}
                  <div>
                    <label className="block text-[9px] font-mono text-ink-muted uppercase">Số Reps</label>
                    <input
                      type="number"
                      value={editReps}
                      onChange={(e) => setEditReps(parseInt(e.target.value, 10) || 1)}
                      className="w-full mt-0.5 p-2 rounded-xl bg-chassis border border-black/10 dark:border-white/15 font-mono text-sm font-bold text-center text-ink"
                    />
                  </div>
                </div>

                {/* Effort Buttons */}
                <div>
                  <label className="block text-[9px] font-mono text-ink-muted uppercase mb-1">Cảm nhận độ khó</label>
                  <div className="grid grid-cols-4 gap-1">
                    {EFFORT_OPTIONS.map((opt) => {
                      const isSel = editEffort === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setEditEffort(opt.value)}
                          className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all text-center border cursor-pointer ${
                            isSel
                              ? 'bg-accent text-white border-accent shadow-xs'
                              : 'bg-chassis text-ink-muted border-black/5 dark:border-white/10 hover:text-ink'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveEdit(set)}
                  className="w-full py-2.5 rounded-xl bg-accent text-white text-xs font-extrabold flex items-center justify-center gap-1 shadow-xs hover:brightness-110 active:scale-98 transition-all"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            );
          }

          return (
            <div
              key={set.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/[0.05] dark:bg-emerald-500/[0.03] border border-emerald-500/20"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500 text-white font-mono text-xs font-extrabold shrink-0">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </span>
                <div className="font-mono text-xs truncate">
                  <span className="font-bold text-ink">Hiệp {set.set_number}: </span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    {showWeight ? `${formatLoad(Number(set.weight), unitSystem)} × ` : ''}{set.reps ?? 0} reps
                  </span>
                  <span className="text-ink-muted ml-1.5 text-[11px]">· {effortLabel}</span>
                  {isBonus && (
                    <span className="ml-1.5 text-[9px] px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/25">
                      Bonus
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => startEdit(set)}
                className="text-xs font-mono font-semibold px-2 py-1 rounded-lg text-ink-muted hover:text-ink hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title="Chỉnh sửa hiệp này"
              >
                Sửa
              </button>
            </div>
          );
        })}

        {/* Upcoming sets (compact queue) */}
        {upcomingSets.map((set) => (
          <div
            key={set.id}
            className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.015] dark:bg-white/[0.02] border border-dashed border-black/[0.06] dark:border-white/[0.08] opacity-50"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-black/5 dark:bg-white/5 text-ink-muted font-mono text-[10px] font-bold">
                ○
              </span>
              <span className="font-mono text-xs text-ink-muted">
                Hiệp {set.set_number}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
