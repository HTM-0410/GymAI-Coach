'use client';

import { useState } from 'react';
import Image from 'next/image';
import MuscleBody, { MuscleName } from '@/components/ui/MuscleBody';
import { Target, Zap, Shield, Flame, Activity } from 'lucide-react';
import { estimateSessionRecovery, type RecoveryExerciseInput } from '@/lib/programs/recovery';

export type TargetMuscleItem = {
  muscle_name: string;
  muscle_name_vi: string | null;
  role: string;
  target_sets: number;
};

type Props = {
  targetMuscles: TargetMuscleItem[];
  dayName?: string;
  className?: string;
  variant?: 'compact' | 'full';
  exercises?: RecoveryExerciseInput[];
};

// Map muscle strings to MuscleBody MuscleName enum ('CHEST' | 'SHOULDERS' | 'BACK' | 'TRICEPS' | 'BICEPS' | 'ABS' | 'LEGS' | 'GLUTES' | 'FOREARMS')
function getHighlightedMuscleKeys(targets: TargetMuscleItem[], dayName: string = ''): MuscleName[] {
  const result = new Set<MuscleName>();
  const text = (
    targets.map((t) => `${t.muscle_name} ${t.muscle_name_vi ?? ''}`).join(' ') +
    ' ' +
    dayName
  ).toLowerCase();

  if (text.includes('ngực') || text.includes('chest') || text.includes('pec')) {
    result.add('CHEST');
  }
  if (
    text.includes('vai') ||
    text.includes('shoulder') ||
    text.includes('delt') ||
    text.includes('trap') ||
    text.includes('thang')
  ) {
    result.add('SHOULDERS');
  }
  if (
    text.includes('lưng') ||
    text.includes('back') ||
    text.includes('lats') ||
    text.includes('xô') ||
    text.includes('rhomboid')
  ) {
    result.add('BACK');
  }
  if (text.includes('tay trước') || text.includes('bicep')) {
    result.add('BICEPS');
  }
  if (
    text.includes('cẳng tay') ||
    text.includes('forearm') ||
    text.includes('wrist') ||
    text.includes('cổ tay')
  ) {
    result.add('FOREARMS');
  }
  if (text.includes('tay sau') || text.includes('tricep') || text.includes('tam đầu')) {
    result.add('TRICEPS');
  }
  if (
    text.includes('bụng') ||
    text.includes('core') ||
    text.includes('abs') ||
    text.includes('liên sườn')
  ) {
    result.add('ABS');
  }
  if (
    text.includes('đùi') ||
    text.includes('quad') ||
    text.includes('hamstring') ||
    text.includes('chân') ||
    text.includes('leg') ||
    text.includes('bắp chân') ||
    text.includes('calf')
  ) {
    result.add('LEGS');
  }
  if (text.includes('mông') || text.includes('glute')) {
    result.add('GLUTES');
  }

  // If dayName is "Push", ensure Chest + Shoulders + Triceps
  if (text.includes('push') || text.includes('đẩy')) {
    result.add('CHEST');
    result.add('SHOULDERS');
    result.add('TRICEPS');
  }
  // If dayName is "Pull", ensure Back + Biceps
  if (text.includes('pull') || text.includes('kéo')) {
    result.add('BACK');
    result.add('BICEPS');
  }
  // If dayName is "Legs", ensure Legs + Glutes
  if (text.includes('legs') || text.includes('chân')) {
    result.add('LEGS');
    result.add('GLUTES');
  }
  // If dayName is "Upper", ensure Chest + Back + Shoulders + Arms
  if (text.includes('upper')) {
    result.add('CHEST');
    result.add('BACK');
    result.add('SHOULDERS');
  }

  return Array.from(result);
}

function getSingleMuscleKey(item: TargetMuscleItem): MuscleName | null {
  const text = `${item.muscle_name} ${item.muscle_name_vi ?? ''}`.toLowerCase();
  if (text.includes('ngực') || text.includes('chest')) return 'CHEST';
  if (text.includes('vai') || text.includes('shoulder')) return 'SHOULDERS';
  if (text.includes('lưng') || text.includes('back') || text.includes('xô')) return 'BACK';
  if (text.includes('tay trước') || text.includes('bicep')) return 'BICEPS';
  if (text.includes('cẳng tay') || text.includes('forearm')) return 'FOREARMS';
  if (text.includes('tay sau') || text.includes('tricep')) return 'TRICEPS';
  if (text.includes('bụng') || text.includes('core') || text.includes('abs')) return 'ABS';
  if (text.includes('đùi') || text.includes('quad') || text.includes('chân')) return 'LEGS';
  if (text.includes('mông') || text.includes('glute')) return 'GLUTES';
  return null;
}

// Map muscle name to specific PNG asset in /public/muscle-groups/
function getMuscleImagePath(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('ngực') || n.includes('chest')) return '/muscle-groups/full/chest.png';
  if (n.includes('vai') || n.includes('shoulder') || n.includes('delt')) return '/muscle-groups/full/shoulders.png';
  if (n.includes('lưng') || n.includes('back') || n.includes('xô') || n.includes('lat')) return '/muscle-groups/full/back.png';
  if (n.includes('tay trước') || n.includes('bicep')) return '/muscle-groups/full/biceps.png';
  if (n.includes('tay sau') || n.includes('tricep')) return '/muscle-groups/full/triceps.png';
  if (n.includes('đùi trước') || n.includes('quad')) return '/muscle-groups/full/quads.png';
  if (n.includes('đùi sau') || n.includes('hamstring')) return '/muscle-groups/full/hamstrings.png';
  if (n.includes('mông') || n.includes('glute')) return '/muscle-groups/full/glutes.png';
  if (n.includes('bắp chân') || n.includes('calf')) return '/muscle-groups/full/calves.png';
  if (n.includes('bụng') || n.includes('core') || n.includes('abs')) return '/muscle-groups/full/core.png';
  if (n.includes('cẳng tay') || n.includes('forearm')) return '/muscle-groups/full/forearms.png';
  return '/muscle-groups/full/quads.png';
}

export default function DayMuscleMap({
  targetMuscles = [],
  dayName = '',
  className = '',
  variant = 'full',
  exercises = [],
}: Props) {
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleName | null>(null);

  const highlighted = getHighlightedMuscleKeys(targetMuscles, dayName);
  const totalTargetSets = targetMuscles.reduce((sum, m) => sum + (m.target_sets || 0), 0);
  const recovery = estimateSessionRecovery(targetMuscles, exercises);

  // Separate primary and secondary muscles
  const primaryMuscles = targetMuscles.filter((m) => m.role === 'primary');
  const secondaryMuscles = targetMuscles.filter((m) => m.role !== 'primary');

  const primaryKeys = getHighlightedMuscleKeys(primaryMuscles, dayName);
  const secondaryKeys = getHighlightedMuscleKeys(secondaryMuscles, dayName);

  return (
    <div
      className={`rounded-3xl border border-black/[0.08] dark:border-white/10 bg-gradient-to-br from-chassis-hi/90 via-chassis to-chassis-lo/90 p-4 sm:p-5 shadow-neumorph backdrop-blur-md ${className}`}
    >
      <div className="flex flex-col md:flex-row items-stretch gap-5">
        {/* Dual Anatomical Silhouette Map */}
        <div className="relative shrink-0 flex items-center justify-center gap-4 sm:gap-6 bg-slate-100/90 dark:bg-[#090d16] rounded-2xl p-4 sm:p-5 border border-black/[0.06] dark:border-white/15 shadow-neumorph-sm dark:shadow-2xl transition-colors duration-300">
          {/* Subtle Grid Pattern Accent */}
          <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:12px_12px] opacity-30 dark:opacity-15 rounded-2xl pointer-events-none" />

          {/* Front Body */}
          <div className="flex flex-col items-center z-10">
            <div className="relative w-[90px] h-[190px] sm:w-[100px] sm:h-[210px] transition-transform hover:scale-105 duration-300">
              <MuscleBody
                type="front"
                highlighted={primaryKeys}
                secondaryMuscles={secondaryKeys}
                accentColor="#f97316"
                interactive={true}
                hoveredMuscle={hoveredMuscle}
                onHoverMuscle={setHoveredMuscle}
              />
            </div>
            <span className="mt-2.5 font-mono text-[10px] font-extrabold uppercase tracking-widest text-ink-muted dark:text-slate-400 bg-black/5 dark:bg-white/5 px-2.5 py-0.5 rounded-md border border-black/5 dark:border-white/10">
              TRƯỚC
            </span>
          </div>

          {/* Vertical Divider */}
          <div className="h-40 w-px bg-gradient-to-b from-transparent via-black/10 dark:via-white/15 to-transparent z-10" />

          {/* Back Body */}
          <div className="flex flex-col items-center z-10">
            <div className="relative w-[90px] h-[190px] sm:w-[100px] sm:h-[210px] transition-transform hover:scale-105 duration-300">
              <MuscleBody
                type="back"
                highlighted={primaryKeys}
                secondaryMuscles={secondaryKeys}
                accentColor="#f97316"
                interactive={true}
                hoveredMuscle={hoveredMuscle}
                onHoverMuscle={setHoveredMuscle}
              />
            </div>
            <span className="mt-2.5 font-mono text-[10px] font-extrabold uppercase tracking-widest text-ink-muted dark:text-slate-400 bg-black/5 dark:bg-white/5 px-2.5 py-0.5 rounded-md border border-black/5 dark:border-white/10">
              SAU
            </span>
          </div>
        </div>

        {/* Target Muscles Badges & Volume Breakdown */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          {/* Header Info */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_8px_rgba(249,115,22,0.8)] led-pulse" />
              <span className="font-mono text-xs uppercase tracking-widest text-ink font-extrabold">
                Nhóm cơ mục tiêu
              </span>
            </div>
            {totalTargetSets > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/15 border border-accent/30 text-accent font-mono text-xs font-extrabold tracking-wider shadow-xs">
                <Flame className="h-3.5 w-3.5" strokeWidth={2.5} />
                {totalTargetSets} sets mục tiêu
              </span>
            )}
          </div>

          {/* Muscle Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {targetMuscles.length === 0 ? (
              <div className="col-span-full text-xs text-ink-muted italic py-2">
                Tập trung toàn diện theo cấu trúc bài tập.
              </div>
            ) : (
              targetMuscles.map((item, idx) => {
                const isPrimary = item.role === 'primary';
                const imagePath = getMuscleImagePath(item.muscle_name_vi ?? item.muscle_name);
                const displayName = item.muscle_name_vi ?? item.muscle_name;
                const muscleKey = getSingleMuscleKey(item);
                const isCardHovered = hoveredMuscle && muscleKey === hoveredMuscle;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => muscleKey && setHoveredMuscle(muscleKey)}
                    onMouseLeave={() => setHoveredMuscle(null)}
                    className={`group relative flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isCardHovered
                        ? 'bg-accent/25 border-accent scale-105 shadow-accent'
                        : isPrimary
                        ? 'bg-gradient-to-r from-accent/[0.12] to-accent/[0.04] border-accent/30 shadow-[0_0_12px_rgba(249,115,22,0.12)]'
                        : 'bg-chassis/70 border-black/[0.06] dark:border-white/10 hover:border-accent/40'
                    }`}
                  >
                    {/* Muscle Icon Thumbnail */}
                    <div className="relative h-9 w-8 shrink-0 flex items-center justify-center bg-black/5 dark:bg-black/40 rounded-lg p-0.5">
                      <Image
                        src={imagePath}
                        alt={displayName}
                        fill
                        className="object-contain transition-transform group-hover:scale-110 drop-shadow-sm"
                        sizes="32px"
                      />
                    </div>

                    {/* Muscle Name & Role */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs sm:text-sm font-extrabold text-ink leading-tight truncate">
                          {displayName}
                        </span>
                        {item.target_sets > 0 && (
                          <span className="font-mono text-xs text-accent font-extrabold shrink-0">
                            ×{item.target_sets}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded-md font-bold ${
                            isPrimary
                              ? 'bg-accent text-white shadow-[0_0_4px_rgba(249,115,22,0.4)]'
                              : 'bg-black/5 dark:bg-white/10 text-ink-muted'
                          }`}
                        >
                          {isPrimary ? 'Chính' : 'Phụ'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Muscle Categories Active Strip */}
          <div className="mt-4 pt-3 border-t border-black/[0.05] dark:border-white/[0.08] flex items-center justify-between text-xs font-mono text-ink-muted">
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-accent" />
              <span
                title={`${recovery.rationale}. Đây là khoảng ước tính; chỉ tập lại khi hiệu suất và đau mỏi đã hồi phục.`}
              >
                Phục hồi dự kiến: <strong className="text-ink font-extrabold">{recovery.minHours}-{recovery.maxHours} giờ</strong>
              </span>
            </span>
            <span className="flex items-center gap-1.5 font-bold text-accent">
              <Activity className="h-3.5 w-3.5" />
              <span>{targetMuscles.length} nhóm cơ kích hoạt</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
