'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  Dumbbell,
  Flame,
  Timer,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Grid
} from 'lucide-react';
import type { ProgramDay } from '@/lib/programs/types';
import { DAY_OF_WEEK_LABELS_VI } from '@/lib/programs/types';
import DayMuscleMap from '@/components/programs/day-muscle-map';

import { getSessionName, getShortSessionName, formatRest } from '@/lib/programs/utils';

interface ProgramDaysViewerProps {
  days: ProgramDay[];
}

export default function ProgramDaysViewer({ days }: ProgramDaysViewerProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | 'all'>(0);

  if (!days || days.length === 0) {
    return (
      <div className="card shadow-neumorph-sm rounded-3xl p-8 text-center border border-white/80 dark:border-white/10">
        <p className="text-sm text-ink-muted">Chưa có buổi tập nào cho chương trình này.</p>
      </div>
    );
  }

  const isAllView = selectedIdx === 'all';
  const currentDay = typeof selectedIdx === 'number' ? days[selectedIdx] : null;

  const goToPrevDay = () => {
    if (typeof selectedIdx === 'number') {
      setSelectedIdx((prev) => (typeof prev === 'number' && prev > 0 ? prev - 1 : days.length - 1));
    }
  };

  const goToNextDay = () => {
    if (typeof selectedIdx === 'number') {
      setSelectedIdx((prev) => (typeof prev === 'number' && prev < days.length - 1 ? prev + 1 : 0));
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Top Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-accent" strokeWidth={2} />
          <h2 className="text-lg font-extrabold text-ink tracking-tight">
            Cấu trúc các buổi tập ({days.length} buổi)
          </h2>
        </div>

        {/* View mode toggle pill */}
        {days.length > 1 && (
          <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.05] p-1 rounded-xl border border-black/[0.04] dark:border-white/10 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedIdx(typeof selectedIdx === 'number' ? selectedIdx : 0)}
              className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 ${
                !isAllView
                  ? 'bg-chassis-hi text-accent shadow-neumorph-sm border border-black/[0.04] dark:border-white/10'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Xem từng buổi</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIdx('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 ${
                isAllView
                  ? 'bg-chassis-hi text-accent shadow-neumorph-sm border border-black/[0.04] dark:border-white/10'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              <span>Tất cả ({days.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Modern Session Navigation Tabs (Sticky on Scroll, Frosted Glass, Exercise Count on Bottom Right) */}
      {days.length > 1 && (
        <div className="sticky top-14 z-30 -mx-4 px-4 sm:mx-0 sm:px-0 py-2 bg-chassis/95 dark:bg-[#0c1017]/95 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] sm:border-none sm:bg-transparent sm:backdrop-blur-none sm:static sm:py-0 shadow-xs sm:shadow-none">
          <div className="bg-gradient-to-r from-chassis-hi/80 via-chassis to-chassis-lo/80 p-1.5 sm:p-2 rounded-2xl border border-black/[0.06] dark:border-white/10 shadow-neumorph-sm backdrop-blur-md">
            <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5">
              {days.map((day, idx) => {
                const isSelected = selectedIdx === idx;
                const shortName = getShortSessionName(day.name_vi, day.name);
                const weekdayLabel = DAY_OF_WEEK_LABELS_VI[day.day_of_week] ?? `D${idx + 1}`;

                return (
                  <button
                    type="button"
                    key={day.id}
                    onClick={() => setSelectedIdx(idx)}
                    className={`group relative flex-1 min-w-[140px] sm:min-w-[160px] p-3 rounded-xl text-left transition-all duration-200 border cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#ff6b00] via-[#f97316] to-[#ea580c] text-white border-orange-400/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_3px_10px_rgba(249,115,22,0.22)]'
                        : 'bg-white/50 dark:bg-white/[0.04] hover:bg-white/80 dark:hover:bg-white/[0.08] text-ink border-black/[0.04] dark:border-white/[0.06] hover:border-accent/40 shadow-xs'
                    }`}
                  >
                    {/* Top Bar: Weekday Badge + Session Tag */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span
                        className={`font-mono text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md transition-colors ${
                          isSelected
                            ? 'bg-white/25 text-white shadow-xs backdrop-blur-xs'
                            : 'bg-accent/10 dark:bg-accent/20 text-accent font-bold'
                        }`}
                      >
                        {weekdayLabel}
                      </span>
                      <span
                        className={`font-mono text-[10px] uppercase font-bold tracking-wider ${
                          isSelected ? 'text-white/90' : 'text-ink-muted'
                        }`}
                      >
                        Buổi {idx + 1}
                      </span>
                    </div>

                    {/* Bottom Row: Session Title on left + Exercise Count on bottom right */}
                    <div className="flex items-baseline justify-between gap-1.5 pb-1">
                      <p
                        className={`text-xs sm:text-sm font-extrabold leading-snug truncate transition-colors ${
                          isSelected ? 'text-white drop-shadow-xs' : 'text-ink group-hover:text-accent'
                        }`}
                      >
                        {shortName}
                      </p>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-black/20 text-white/95'
                            : 'bg-black/[0.04] dark:bg-white/[0.06] text-ink-muted'
                        }`}
                      >
                        {day.exercises.length} bài
                      </span>
                    </div>

                    {/* Active Neon Underline Pip (Nested Safely Inside) */}
                    {isSelected && (
                      <div className="absolute bottom-1.5 inset-x-3.5 h-[2px] rounded-full bg-white/80 shadow-[0_0_6px_rgba(255,255,255,0.9)]" />
                    )}
                  </button>
                );
              })}

              {/* "Tất cả" Tab */}
              <button
                type="button"
                onClick={() => setSelectedIdx('all')}
                className={`shrink-0 px-4 py-3 rounded-xl font-mono text-xs font-bold transition-all duration-200 border flex items-center gap-1.5 cursor-pointer ${
                  isAllView
                    ? 'bg-gradient-to-br from-[#ff6b00] via-[#f97316] to-[#ea580c] text-white border-orange-400/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_3px_10px_rgba(249,115,22,0.22)]'
                    : 'bg-white/50 dark:bg-white/[0.04] hover:bg-white/80 dark:hover:bg-white/[0.08] text-ink-muted hover:text-ink border-black/[0.04] dark:border-white/[0.06] hover:border-accent/40 shadow-xs'
                }`}
              >
                <Grid className="h-3.5 w-3.5" />
                <span>Tất cả ({days.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workout Content Display */}
      {isAllView ? (
        /* View All Mode: Render each day card sequentially */
        <div className="space-y-8">
          {days.map((day, dayIdx) => (
            <DayCard key={day.id} day={day} dayIdx={dayIdx} />
          ))}
        </div>
      ) : currentDay ? (
        /* Single Day Focused View: Clean, zero obstruction */
        <DayCard
          day={currentDay}
          dayIdx={typeof selectedIdx === 'number' ? selectedIdx : 0}
          totalDays={days.length}
          onPrev={days.length > 1 ? goToPrevDay : undefined}
          onNext={days.length > 1 ? goToNextDay : undefined}
        />
      ) : null}
    </div>
  );
}

function DayCard({
  day,
  dayIdx,
  totalDays,
  onPrev,
  onNext,
}: {
  day: ProgramDay;
  dayIdx: number;
  totalDays?: number;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const dayTotalSets = day.exercises.reduce((s, e) => s + e.target_sets, 0);
  const estMinutes = Math.round(dayTotalSets * 2.8 + day.exercises.length * 1.5);
  const sessionTitle = getSessionName(day.name_vi, day.name);
  const weekday = DAY_OF_WEEK_LABELS_VI[day.day_of_week] ?? `Day ${dayIdx + 1}`;

  return (
    <article
      id={`day-${dayIdx + 1}`}
      className="card shadow-neumorph rounded-3xl overflow-hidden border border-white/80 dark:border-white/10 transition-all duration-300"
    >
      {/* Day Card Header */}
      <div className="p-5 sm:p-6 border-b border-black/[0.05] dark:border-white/10 bg-gradient-to-r from-chassis-hi/90 via-chassis to-chassis-lo/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Badge, Weekday, Session Title */}
          <div className="flex items-start gap-3.5">
            <span className="inline-flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent-dim text-white shadow-accent shrink-0">
              <span className="font-mono text-[9px] uppercase font-bold opacity-85 leading-none">
                {weekday}
              </span>
              <span className="font-mono text-base font-extrabold leading-none mt-0.5">
                {dayIdx + 1}
              </span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-accent font-bold">
                  Buổi tập #{dayIdx + 1}
                </span>
                <span className="text-ink-muted font-mono text-[10px]">•</span>
                <span className="font-mono text-[10px] text-ink-muted uppercase">
                  Thứ {weekday}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight mt-0.5">
                {sessionTitle}
              </h3>
            </div>
          </div>

          {/* Right: Quick Day Switch Arrows + Stats */}
          <div className="flex flex-wrap items-center gap-2 sm:self-center">
            {/* Quick Prev / Next Buttons in Single Day mode */}
            {onPrev && onNext && totalDays && totalDays > 1 && (
              <div className="flex items-center gap-1 mr-2 bg-black/[0.03] dark:bg-white/[0.05] p-1 rounded-xl border border-black/[0.04] dark:border-white/10">
                <button
                  type="button"
                  onClick={onPrev}
                  className="p-1.5 rounded-lg text-ink-muted hover:text-accent hover:bg-chassis-hi transition-colors flex items-center gap-1 text-xs font-mono"
                  title="Buổi trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden md:inline font-bold">Trước</span>
                </button>
                <span className="text-[10px] font-mono text-ink-muted px-1 font-bold">
                  {dayIdx + 1}/{totalDays}
                </span>
                <button
                  type="button"
                  onClick={onNext}
                  className="p-1.5 rounded-lg text-ink-muted hover:text-accent hover:bg-chassis-hi transition-colors flex items-center gap-1 text-xs font-mono"
                  title="Buổi sau"
                >
                  <span className="hidden md:inline font-bold">Sau</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Quick Meta Badges */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/10 font-mono text-xs font-bold text-ink">
              <Dumbbell className="h-3.5 w-3.5 text-accent" />
              {day.exercises.length} bài
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/10 font-mono text-xs font-bold text-ink">
              <Flame className="h-3.5 w-3.5 text-accent" />
              {dayTotalSets} sets
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/10 font-mono text-xs font-bold text-ink">
              <Timer className="h-3.5 w-3.5 text-accent" />
              ~{estMinutes}p
            </span>
          </div>
        </div>
      </div>

      {/* Body Anatomy Silhouette & Target Muscles Visual Card (Completely Unobstructed!) */}
      <div className="p-5 sm:p-6 bg-black/[0.02] dark:bg-black/20 border-b border-black/[0.05] dark:border-white/10">
        <DayMuscleMap
          targetMuscles={day.target_muscles}
          dayName={sessionTitle}
          exercises={day.exercises}
        />
      </div>

      {/* Exercise List */}
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">
              Danh sách bài tập ({day.exercises.length})
            </span>
          </div>
          <span className="text-[10px] font-mono text-ink-muted uppercase">
            Sets × Reps / RIR / Nghỉ
          </span>
        </div>

        {day.exercises.length === 0 ? (
          <div className="py-8 text-center text-xs text-ink-muted">
            Buổi này chưa có bài tập chi tiết.
          </div>
        ) : (
          <div className="space-y-2.5">
            {day.exercises.map((pe, exIdx) => {
              const isCompound =
                pe.exercise.exercise_type === 'compound' ||
                (!pe.exercise.exercise_type && exIdx < 2);

              return (
                <div
                  key={pe.id}
                  className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-br from-chassis-hi/60 to-chassis-lo/30 border border-black/[0.04] dark:border-white/10 hover:border-accent/40 shadow-neumorph-sm transition-all duration-200 hover:-translate-y-0.5"
                >
                  {/* Left: Index & Exercise Details */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] font-mono text-xs font-extrabold text-ink-muted group-hover:text-accent group-hover:bg-accent/10 transition-colors shrink-0">
                      {String(exIdx + 1).padStart(2, '0')}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/exercises/${pe.exercise.slug}`}
                          className="font-extrabold text-sm text-ink group-hover:text-accent transition-colors leading-tight hover:underline flex items-center gap-1"
                        >
                          <span>{pe.exercise.name_vi ?? pe.exercise.name}</span>
                          <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-accent shrink-0" />
                        </Link>

                        {/* Compound / Isolation Tag */}
                        <span
                          className={`px-2 py-0.5 rounded-md font-mono text-[9px] uppercase tracking-wider font-bold ${
                            isCompound
                              ? 'bg-accent/15 text-accent border border-accent/20'
                              : 'bg-black/5 dark:bg-white/10 text-ink-muted'
                          }`}
                        >
                          {isCompound ? 'Compound' : 'Isolation'}
                        </span>

                        {pe.exercise.difficulty && (
                          <span className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">
                            {pe.exercise.difficulty}
                          </span>
                        )}
                      </div>

                      {pe.exercise.name_vi && (
                        <p className="text-xs text-ink-muted font-medium truncate mt-0.5">
                          {pe.exercise.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Sets × Reps & Prescriptions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/[0.04] dark:border-white/[0.06]">
                    {/* Volume badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-accent/[0.08] border border-accent/20 text-accent font-mono text-xs font-extrabold">
                      <span>{pe.target_sets} sets</span>
                      <span className="opacity-50">×</span>
                      <span>
                        {pe.target_rep_min}
                        {pe.target_rep_max !== pe.target_rep_min && `-${pe.target_rep_max}`} reps
                      </span>
                    </div>

                    {/* Prescriptions info */}
                    <div className="flex items-center gap-2 text-right">
                      {pe.target_rir !== null && (
                        <span className="px-2 py-0.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] text-[10px] font-mono font-bold text-ink-secondary dark:text-ink uppercase tracking-wider">
                          RIR {pe.target_rir}
                        </span>
                      )}
                      {pe.rest_seconds && (
                        <span className="px-2 py-0.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] text-[10px] font-mono text-ink-muted uppercase tracking-wider">
                          {formatRest(pe.rest_seconds)} nghỉ
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}
