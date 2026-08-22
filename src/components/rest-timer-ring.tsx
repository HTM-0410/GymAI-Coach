'use client';

import React, { useEffect, useRef } from 'react';
import { Plus, Minus, Zap, X, Check, Play } from 'lucide-react';

interface RestTimerRingProps {
  totalSeconds: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
  onDismiss: () => void;
  lastSetNumber?: number;
  lastWeight?: number | null;
  lastReps?: number | null;
  onUpdateLastSet?: (patch: { weight?: number | null; reps?: number | null }) => void;
  nextSetNumber?: number;
  nextWeight?: number | null;
  nextReps?: number | null;
  aiTip?: string | null;
}

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function RestTimerRing({
  totalSeconds,
  remainingSeconds,
  elapsedSeconds,
  onAdjust,
  onSkip,
  onDismiss,
  lastSetNumber,
  lastWeight,
  lastReps,
  onUpdateLastSet,
  nextSetNumber,
  nextWeight,
  nextReps,
  aiTip,
}: RestTimerRingProps) {
  const hasAlertedRef = useRef(false);

  // Play a gentle audio chime when countdown reaches zero
  useEffect(() => {
    if (remainingSeconds <= 0 && !hasAlertedRef.current) {
      hasAlertedRef.current = true;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const now = ctx.currentTime;

          // Chime Note 1
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(880, now);
          gain1.gain.setValueAtTime(0.15, now);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.start(now);
          osc1.stop(now + 0.4);

          // Chime Note 2 (higher harmony)
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1320, now + 0.15);
          gain2.gain.setValueAtTime(0.2, now + 0.15);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(now + 0.15);
          osc2.stop(now + 0.6);
        }
      } catch (_) {}

      // Trigger vibration on supported mobile devices
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([150, 100, 200]);
        } catch (_) {}
      }
    } else if (remainingSeconds > 0) {
      hasAlertedRef.current = false;
    }
  }, [remainingSeconds]);

  // SVG Circular math - Compact size
  const size = 110;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const isFinished = remainingSeconds <= 0;
  const safeTotal = Math.max(1, totalSeconds);
  const progressRatio = isFinished ? 1 : Math.max(0, Math.min(1, (safeTotal - remainingSeconds) / safeTotal));
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <div
      className={`sticky top-3 z-40 rounded-2xl border p-4 sm:p-5 shadow-neumorph backdrop-blur-xl transition-all duration-300 ${
        isFinished
          ? 'border-emerald-500/40 bg-emerald-950/15 dark:bg-emerald-950/35'
          : 'border-accent/30 bg-chassis-hi/95 dark:bg-[#0c121e]/95'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        {/* Left Column: Compact Circular Ring + Quick ±30s Buttons */}
        <div className="flex flex-row sm:flex-col items-center justify-center gap-3 shrink-0">
          <div className="relative flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
              {/* Background Track Circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                className="stroke-black/10 dark:stroke-white/10"
                strokeWidth={strokeWidth}
                fill="transparent"
              />

              {/* Range Dashed Tick Marks */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius - 7}
                className={isFinished ? 'stroke-emerald-500/20' : 'stroke-accent/20'}
                strokeWidth={1.5}
                strokeDasharray="3 5"
                fill="transparent"
              />

              {/* Animated Progress Stroke */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                className={`transition-all duration-500 ease-linear ${
                  isFinished ? 'stroke-emerald-500' : 'stroke-accent'
                }`}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Center Time Readout */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="font-mono text-[8px] uppercase tracking-wider text-ink-muted font-bold">
                {isFinished ? 'HẾT GIỜ' : 'NGHỈ'}
              </span>
              <span
                className={`font-mono text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums ${
                  isFinished ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink'
                }`}
              >
                {isFinished ? `+${formatDuration(elapsedSeconds - safeTotal)}` : formatDuration(remainingSeconds)}
              </span>
              <span className="font-mono text-[8px] text-ink-muted">
                / {formatDuration(safeTotal)}
              </span>
            </div>
          </div>

          {/* Quick Adjust Buttons Below Ring */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onAdjust(-30)}
              className="h-6 px-2 rounded-md bg-chassis border border-black/5 dark:border-white/10 text-ink-muted hover:text-ink font-mono text-[10px] font-bold flex items-center gap-0.5 cursor-pointer shadow-xs"
              title="Giảm 30 giây nghỉ"
            >
              <Minus className="h-2.5 w-2.5" />
              <span>30s</span>
            </button>
            <button
              type="button"
              onClick={() => onAdjust(30)}
              className="h-6 px-2 rounded-md bg-chassis border border-black/5 dark:border-white/10 text-accent font-mono text-[10px] font-bold flex items-center gap-0.5 cursor-pointer shadow-xs"
              title="Thêm 30 giây nghỉ"
            >
              <Plus className="h-2.5 w-2.5" />
              <span>30s</span>
            </button>
          </div>
        </div>

        {/* Right Column: Unified Log & Next Action Section */}
        <div className="flex-1 min-w-0 w-full flex flex-col justify-between gap-3">
          {/* Top Row: Last Set Confirmation */}
          {lastSetNumber && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                  <span>Xác nhận kết quả Hiệp {lastSetNumber}:</span>
                </span>
                {nextSetNumber && (
                  <span className="font-mono text-[10px] text-ink-muted hidden sm:inline">
                    ⚡ Chuẩn bị Hiệp {nextSetNumber}: <strong className="text-accent">{nextWeight ?? 20}kg × {nextReps ?? 10} reps</strong>
                  </span>
                )}
              </div>

              {/* Weight & Reps Steppers Row */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Weight Input + Stepper */}
                <div className="flex items-center rounded-xl bg-chassis border border-black/5 dark:border-white/10 p-1 shadow-inset-sm">
                  <button
                    type="button"
                    onClick={() => onUpdateLastSet?.({ weight: Math.max(0, (lastWeight ?? 20) - 2.5) })}
                    className="h-6 w-6 rounded-lg bg-chassis-hi hover:bg-accent/15 hover:text-accent flex items-center justify-center font-bold text-ink-muted transition-colors cursor-pointer"
                    title="Giảm 2.5kg"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <div className="flex items-center px-1.5">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.5}
                      value={lastWeight ?? ''}
                      onChange={(e) =>
                        onUpdateLastSet?.({
                          weight: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      className="w-12 bg-transparent text-center font-mono text-xs font-extrabold text-ink focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                    />
                    <span className="text-[10px] font-mono text-ink-muted font-bold">kg</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateLastSet?.({ weight: (lastWeight ?? 20) + 2.5 })}
                    className="h-6 w-6 rounded-lg bg-chassis-hi hover:bg-accent/15 hover:text-accent flex items-center justify-center font-bold text-ink-muted transition-colors cursor-pointer"
                    title="Tăng 2.5kg"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {/* Reps Input + Stepper */}
                <div className="flex items-center rounded-xl bg-chassis border border-black/5 dark:border-white/10 p-1 shadow-inset-sm">
                  <button
                    type="button"
                    onClick={() => onUpdateLastSet?.({ reps: Math.max(1, (lastReps ?? 10) - 1) })}
                    className="h-6 w-6 rounded-lg bg-chassis-hi hover:bg-accent/15 hover:text-accent flex items-center justify-center font-bold text-ink-muted transition-colors cursor-pointer"
                    title="Giảm 1 rep"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <div className="flex items-center px-1.5">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={lastReps ?? ''}
                      onChange={(e) =>
                        onUpdateLastSet?.({
                          reps: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      className="w-10 bg-transparent text-center font-mono text-xs font-extrabold text-ink focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                    />
                    <span className="text-[10px] font-mono text-ink-muted font-bold">reps</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateLastSet?.({ reps: (lastReps ?? 10) + 1 })}
                    className="h-6 w-6 rounded-lg bg-chassis-hi hover:bg-accent/15 hover:text-accent flex items-center justify-center font-bold text-ink-muted transition-colors cursor-pointer"
                    title="Tăng 1 rep"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Action Row */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onSkip}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs ${
                isFinished
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-[#d95d12] hover:bg-[#ea580c] dark:bg-[#c24e0b] dark:hover:bg-[#d95d12] text-white'
              }`}
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{nextSetNumber ? `Bắt đầu Hiệp ${nextSetNumber}` : 'Vào Set ngay'}</span>
            </button>

            <button
              type="button"
              onClick={onDismiss}
              className="p-2.5 rounded-xl border border-black/5 dark:border-white/10 text-ink-muted hover:text-danger hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Ẩn đồng hồ nghỉ"
              aria-label="Ẩn"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
