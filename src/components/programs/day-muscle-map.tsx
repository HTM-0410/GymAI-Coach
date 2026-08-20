'use client';

import Image from 'next/image';
import MuscleBody, { MuscleName } from '@/components/ui/MuscleBody';
import { Target, Zap, Shield, Flame, Activity } from 'lucide-react';

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
};

// Map muscle strings to MuscleBody MuscleName enum ('CHEST' | 'SHOULDERS' | 'BACK' | 'TRICEPS' | 'BICEPS' | 'ABS' | 'LEGS' | 'GLUTES')
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

// Map muscle name to specific PNG asset in /public/muscle-groups/
function getMuscleImagePath(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('ngực') || n.includes('chest')) return '/muscle-groups/chest.png';
  if (n.includes('vai') || n.includes('shoulder') || n.includes('delt')) return '/muscle-groups/shoulders.png';
  if (n.includes('lưng') || n.includes('back') || n.includes('xô') || n.includes('lat')) return '/muscle-groups/back.png';
  if (n.includes('tay trước') || n.includes('bicep')) return '/muscle-groups/biceps.png';
  if (n.includes('tay sau') || n.includes('tricep')) return '/muscle-groups/triceps.png';
  if (n.includes('đùi trước') || n.includes('quad')) return '/muscle-groups/quads.png';
  if (n.includes('đùi sau') || n.includes('hamstring')) return '/muscle-groups/hamstrings.png';
  if (n.includes('mông') || n.includes('glute')) return '/muscle-groups/glutes.png';
  if (n.includes('bắp chân') || n.includes('calf')) return '/muscle-groups/calves.png';
  if (n.includes('bụng') || n.includes('core') || n.includes('abs')) return '/muscle-groups/core.png';
  if (n.includes('cẳng tay') || n.includes('forearm')) return '/muscle-groups/forearms.png';
  return '/muscle-groups/quads.png';
}

export default function DayMuscleMap({
  targetMuscles = [],
  dayName = '',
  className = '',
  variant = 'full',
}: Props) {
  const highlighted = getHighlightedMuscleKeys(targetMuscles, dayName);
  const totalTargetSets = targetMuscles.reduce((sum, m) => sum + (m.target_sets || 0), 0);

  // Separate primary and secondary muscles
  const primaryMuscles = targetMuscles.filter((m) => m.role === 'primary');
  const secondaryMuscles = targetMuscles.filter((m) => m.role !== 'primary');

  return (
    <div
      className={`rounded-2xl border border-white/80 dark:border-white/10 bg-gradient-to-br from-chassis-hi/80 to-chassis-lo/40 p-4 shadow-neumorph-sm backdrop-blur-sm ${className}`}
    >
      <div className="flex flex-col md:flex-row items-stretch gap-4">
        {/* Dual Anatomical Silhouette Map */}
        <div className="relative shrink-0 flex items-center justify-center gap-4 bg-slate-100/80 dark:bg-slate-950/80 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-neumorph-sm">
          {/* Subtle Grid Accent */}
          <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:12px_12px] opacity-20 dark:opacity-30 rounded-2xl pointer-events-none" />

          {/* Front Body */}
          <div className="flex flex-col items-center">
            <div className="relative w-[88px] h-[184px] sm:w-[98px] sm:h-[204px] transition-transform hover:scale-[1.03] duration-300">
              <MuscleBody type="front" highlighted={highlighted} accentColor="#f97316" />
            </div>
            <span className="mt-2.5 font-sans text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">
              TRƯỚC
            </span>
          </div>

          {/* Vertical Divider */}
          <div className="h-36 w-px bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-700/80 to-transparent" />

          {/* Back Body */}
          <div className="flex flex-col items-center">
            <div className="relative w-[88px] h-[184px] sm:w-[98px] sm:h-[204px] transition-transform hover:scale-[1.03] duration-300">
              <MuscleBody type="back" highlighted={highlighted} accentColor="#f97316" />
            </div>
            <span className="mt-2.5 font-sans text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">
              SAU
            </span>
          </div>
        </div>

        {/* Target Muscles Badges & Volume Breakdown */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          {/* Header Info */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">
                Nhóm cơ mục tiêu
              </span>
            </div>
            {totalTargetSets > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 border border-accent/25 text-accent font-mono text-[10px] font-bold tracking-wider">
                <Flame className="h-3 w-3" strokeWidth={2} />
                {totalTargetSets} sets mục tiêu
              </span>
            )}
          </div>

          {/* Muscle Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {targetMuscles.length === 0 ? (
              <div className="col-span-full text-xs text-ink-muted italic py-1">
                Tập trung toàn diện theo cấu trúc bài tập
              </div>
            ) : (
              targetMuscles.map((item, idx) => {
                const isPrimary = item.role === 'primary';
                const imagePath = getMuscleImagePath(item.muscle_name_vi ?? item.muscle_name);
                const displayName = item.muscle_name_vi ?? item.muscle_name;

                return (
                  <div
                    key={idx}
                    className={`group relative flex items-center gap-2.5 p-2 rounded-xl border transition-all duration-200 ${
                      isPrimary
                        ? 'bg-gradient-to-r from-accent/[0.12] to-accent/[0.04] border-accent/30 shadow-[0_0_12px_rgba(249,115,22,0.12)]'
                        : 'bg-chassis/60 border-black/[0.06] dark:border-white/10'
                    }`}
                  >
                    {/* Muscle Icon Thumbnail */}
                    <div className="relative h-8 w-7 shrink-0 flex items-center justify-center bg-black/5 dark:bg-black/30 rounded-lg p-0.5">
                      <Image
                        src={imagePath}
                        alt={displayName}
                        fill
                        className="object-contain transition-transform group-hover:scale-110 drop-shadow-sm"
                        sizes="28px"
                      />
                    </div>

                    {/* Muscle Name & Role */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-ink leading-tight truncate">
                          {displayName}
                        </span>
                        {item.target_sets > 0 && (
                          <span className="font-mono text-[10px] text-accent font-extrabold shrink-0">
                            ×{item.target_sets}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className={`font-mono text-[8px] uppercase tracking-wider px-1 py-0.2 rounded font-bold ${
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
          <div className="mt-3 pt-2.5 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-ink-muted">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-accent" />
              <span>Phục hồi: 48h - 72h</span>
            </span>
            <span className="flex items-center gap-1 font-semibold text-ink-secondary dark:text-ink">
              <Activity className="h-3 w-3 text-accent" />
              <span>{highlighted.length} vùng cơ kích hoạt</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
