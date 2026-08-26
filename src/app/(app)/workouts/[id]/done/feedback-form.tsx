'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import type { WorkoutFeedbackValue } from '@/lib/workouts/summary-insights';

interface FeedbackFormProps {
  workoutId: string;
  initialFeedback?: {
    difficulty: number;
    energy: number;
    quality: number;
    note: string | null;
  } | null;
  onFeedbackChange?: (feedback: WorkoutFeedbackValue) => void;
}

const DIFFICULTY_OPTIONS = [
  { value: 2, label: 'Nhẹ' },
  { value: 3, label: 'Vừa sức' },
  { value: 4, label: 'Nặng' },
];

const ENERGY_OPTIONS = [
  { value: 2, label: 'Thấp' },
  { value: 3, label: 'Ổn định' },
  { value: 4, label: 'Tốt' },
];

const BODY_OPTIONS = [
  { value: 5, label: 'Bình thường' },
  { value: 3, label: 'Mệt mỏi' },
  { value: 1, label: 'Đau / khó chịu' },
];

const PAIN_AREAS = ['Vai', 'Lưng', 'Gối', 'Cổ tay', 'Khác'];

function extractPainAreas(note: string | null | undefined): string[] {
  const match = note?.match(/^\[Đau\/khó chịu: ([^\]]+)\]/);
  return match ? match[1].split(',').map((item) => item.trim()).filter(Boolean) : [];
}

function composeFeedbackNote(bodyVal: number, painList: string[], noteVal: string): string | null {
  let fullNote = noteVal.trim();
  if (bodyVal === 1 && painList.length > 0) {
    const painPrefix = `[Đau/khó chịu: ${painList.join(', ')}]`;
    fullNote = fullNote ? `${painPrefix} ${fullNote}` : painPrefix;
  }
  return fullNote || null;
}

export default function FeedbackForm({ workoutId, initialFeedback, onFeedbackChange }: FeedbackFormProps) {
  const [difficulty, setDifficulty] = useState<number>(initialFeedback?.difficulty ?? 3);
  const [energy, setEnergy] = useState<number>(initialFeedback?.energy ?? 3);
  const [bodyFeeling, setBodyFeeling] = useState<number>(initialFeedback?.quality ?? 5);
  const [selectedPainAreas, setSelectedPainAreas] = useState<string[]>(() => extractPainAreas(initialFeedback?.note));
  const [note, setNote] = useState<string>(() => {
    if (!initialFeedback?.note) return '';
    return initialFeedback.note.replace(/^\[Đau\/khó chịu: [^\]]+\]\s*/, '');
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    initialFeedback ? 'saved' : 'idle'
  );

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  function notifyFeedbackChange(
    diffVal: number,
    energyVal: number,
    bodyVal: number,
    painList: string[],
    noteVal: string,
  ) {
    onFeedbackChange?.({
      difficulty: diffVal,
      energy: energyVal,
      quality: bodyVal,
      note: composeFeedbackNote(bodyVal, painList, noteVal),
    });
  }

  // Core background autosave function
  async function performAutoSave(
    diffVal: number,
    energyVal: number,
    bodyVal: number,
    painList: string[],
    noteVal: string
  ) {
    setSaveStatus('saving');
    const supabase = createClient();

    const fullNote = composeFeedbackNote(bodyVal, painList, noteVal);

    const { error } = await supabase.from('workout_feedback').upsert({
      workout_id: workoutId,
      difficulty: diffVal,
      energy: energyVal,
      quality: bodyVal,
      note: fullNote,
    });

    if (!error) {
      setSaveStatus('saved');
    } else {
      setSaveStatus('idle');
    }
  }

  // Handle immediate change & auto-save for buttons
  function handleSelectDifficulty(val: number) {
    setDifficulty(val);
    notifyFeedbackChange(val, energy, bodyFeeling, selectedPainAreas, note);
    performAutoSave(val, energy, bodyFeeling, selectedPainAreas, note);
  }

  function handleSelectEnergy(val: number) {
    setEnergy(val);
    notifyFeedbackChange(difficulty, val, bodyFeeling, selectedPainAreas, note);
    performAutoSave(difficulty, val, bodyFeeling, selectedPainAreas, note);
  }

  function handleSelectBodyFeeling(val: number) {
    setBodyFeeling(val);
    const newPainList = val === 1 ? selectedPainAreas : [];
    if (val !== 1) setSelectedPainAreas([]);
    notifyFeedbackChange(difficulty, energy, val, newPainList, note);
    performAutoSave(difficulty, energy, val, newPainList, note);
  }

  function togglePainArea(area: string) {
    const next = selectedPainAreas.includes(area)
      ? selectedPainAreas.filter((a) => a !== area)
      : [...selectedPainAreas, area];
    setSelectedPainAreas(next);
    notifyFeedbackChange(difficulty, energy, bodyFeeling, next, note);
    performAutoSave(difficulty, energy, bodyFeeling, next, note);
  }

  function scheduleNoteSave(noteVal: string) {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      performAutoSave(difficulty, energy, bodyFeeling, selectedPainAreas, noteVal);
    }, 600);
  }

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return (
    <section className="card shadow-neumorph rounded-2xl p-4 sm:p-5 border border-black/[0.08] dark:border-white/10 space-y-3.5">
      <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.06] pb-2.5">
        <div>
          <h2 className="font-extrabold text-sm text-ink uppercase tracking-wide">
            Buổi tập hôm nay thế nào?
          </h2>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Phản hồi nhanh giúp AI tối ưu giáo án buổi sau
          </p>
        </div>

        {/* Live Auto-save Status Indicator */}
        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
          {saveStatus === 'saving' ? (
            <span className="inline-flex items-center gap-1 text-ink-muted">
              <Loader2 className="h-3 w-3 animate-spin text-accent" />
              <span>Đang lưu...</span>
            </span>
          ) : saveStatus === 'saved' ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Đã lưu</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* 1. Độ khó */}
      <div className="space-y-1">
        <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">
          Độ khó
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {DIFFICULTY_OPTIONS.map((opt) => {
            const isSel = difficulty === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelectDifficulty(opt.value)}
                className={`h-10 rounded-xl font-bold text-xs transition-all flex items-center justify-center cursor-pointer border ${
                  isSel
                    ? 'bg-accent text-white border-accent shadow-xs'
                    : 'bg-chassis text-ink-secondary border-black/5 dark:border-white/10 hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Năng lượng */}
      <div className="space-y-1">
        <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">
          Năng lượng
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {ENERGY_OPTIONS.map((opt) => {
            const isSel = energy === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelectEnergy(opt.value)}
                className={`h-10 rounded-xl font-bold text-xs transition-all flex items-center justify-center cursor-pointer border ${
                  isSel
                    ? 'bg-accent text-white border-accent shadow-xs'
                    : 'bg-chassis text-ink-secondary border-black/5 dark:border-white/10 hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Cơ thể hôm nay */}
      <div className="space-y-1">
        <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">
          Cơ thể hôm nay
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {BODY_OPTIONS.map((opt) => {
            const isSel = bodyFeeling === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelectBodyFeeling(opt.value)}
                className={`h-10 rounded-xl font-bold text-xs transition-all flex items-center justify-center cursor-pointer border ${
                  isSel
                    ? opt.value === 1
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'bg-accent text-white border-accent shadow-xs'
                    : 'bg-chassis text-ink-secondary border-black/5 dark:border-white/10 hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Revealed Pain Tag Selector */}
        {bodyFeeling === 1 && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5 animate-in fade-in duration-200 mt-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Bạn cảm thấy đau/khó chịu ở vùng nào?</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {PAIN_AREAS.map((area) => {
                const isAreaSel = selectedPainAreas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => togglePainArea(area)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                      isAreaSel
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-chassis text-ink-secondary border-black/10 dark:border-white/15 hover:text-ink'
                    }`}
                  >
                    {area}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Ghi chú (tùy chọn) */}
      <div className="pt-0.5">
        <label htmlFor="feedback-note" className="block font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">
          Ghi chú (tuỳ chọn)
        </label>
        <input
          id="feedback-note"
          type="text"
          className="w-full px-3.5 py-2.5 rounded-xl bg-chassis border border-black/10 dark:border-white/15 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
          value={note}
          onChange={(e) => {
            const next = e.target.value;
            setNote(next);
            notifyFeedbackChange(difficulty, energy, bodyFeeling, selectedPainAreas, next);
            scheduleNoteSave(next);
          }}
          placeholder="Có gì đáng chú ý trong buổi hôm nay?"
        />
      </div>
    </section>
  );
}
