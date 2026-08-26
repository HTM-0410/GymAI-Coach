'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Dumbbell, ScanFace } from 'lucide-react';

const POSES = [
  {
    src: '/images/landing/robot-poses-v2/pose-ready-v2.png',
    label: 'Bám sát mục tiêu',
    shortLabel: 'Mục tiêu',
    alt: 'Robot GymAI Coach trong tư thế sẵn sàng',
  },
  {
    src: '/images/landing/robot-poses-v2/pose-thumbs-up.png',
    label: 'Coach luôn đồng hành',
    shortLabel: 'AI Coach',
    alt: 'Robot GymAI Coach giơ ngón tay cái',
  },
  {
    src: '/images/landing/robot-poses-v2/pose-double-biceps.png',
    label: 'Tối ưu hiệu suất',
    shortLabel: 'Hiệu suất',
    alt: 'Robot GymAI Coach trong tư thế double biceps',
  },
  {
    src: '/images/landing/robot-poses-v2/pose-side-chest.png',
    label: 'Phát triển cân bằng',
    shortLabel: 'Cân bằng',
    alt: 'Robot GymAI Coach trong tư thế side chest',
  },
  {
    src: '/images/landing/robot-poses-v2/pose-cta-point.png',
    label: 'Bắt đầu ngay',
    shortLabel: 'Bắt đầu',
    alt: 'Robot GymAI Coach chỉ về nút bắt đầu tập luyện',
  },
] as const;

export function LandingRobotCoach() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [activePose, setActivePose] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || paused) return;

    const interval = window.setInterval(() => {
      if (!document.hidden) setActivePose((pose) => (pose + 1) % POSES.length);
    }, 3400);

    return () => window.clearInterval(interval);
  }, [paused]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage || event.pointerType === 'touch') return;
    const bounds = stage.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    stage.style.setProperty('--robot-shift-x', `${x * 8}px`);
    stage.style.setProperty('--robot-shift-y', `${y * 6}px`);
    stage.style.setProperty('--robot-rotate-y', `${x * 1.5}deg`);
    stage.style.setProperty('--robot-rotate-x', `${y * -1.2}deg`);
  };

  const resetPointer = () => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.style.setProperty('--robot-shift-x', '0px');
    stage.style.setProperty('--robot-shift-y', '0px');
    stage.style.setProperty('--robot-rotate-y', '0deg');
    stage.style.setProperty('--robot-rotate-x', '0deg');
  };

  return (
    <div
      ref={stageRef}
      className="landing-robot-stage group relative aspect-[2/3] w-full overflow-hidden rounded-[1.7rem] bg-[#07090d]"
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => { setPaused(false); resetPointer(); }}
      aria-label="GymAI Robot Coach với năm tư thế có thể lựa chọn"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,9,13,.02),rgba(7,9,13,.22))]" />

      <div className="landing-robot-float pointer-events-none absolute inset-0">
        {POSES.map((pose, index) => (
          <Image
            key={pose.src}
            src={pose.src}
            alt={pose.alt}
            fill
            priority={index === 0}
            sizes="(max-width: 1024px) 82vw, 470px"
            className={`landing-robot-image object-cover transition-[opacity,transform,filter] duration-700 ease-out ${
              activePose === index
                ? 'scale-100 opacity-100 blur-0'
                : 'pointer-events-none scale-[1.025] opacity-0 blur-[2px]'
            }`}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-4 top-4 flex items-center justify-between gap-3 sm:inset-x-5 sm:top-5">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#060a11]/70 px-3 py-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-slate-200 shadow-xl backdrop-blur-xl sm:text-[9px]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_9px_#34d399]" /> AI Coach online
        </span>
        <span className="hidden items-center gap-1.5 font-mono text-[8px] font-bold uppercase tracking-wider text-slate-300/80 sm:inline-flex">
          <ScanFace className="h-3.5 w-3.5" /> Di chuyển để tương tác
        </span>
      </div>

      <div className="absolute inset-x-4 bottom-4 flex flex-col gap-2 sm:inset-x-5 sm:bottom-5">
        <div className="hidden max-w-[250px] self-start rounded-2xl border border-white/10 bg-[#060a11]/78 px-4 py-2.5 shadow-2xl backdrop-blur-xl sm:block">
          <p className="font-mono text-[7px] font-bold uppercase tracking-[0.2em] text-slate-500">GymAI hỗ trợ bạn</p>
          <p aria-live="polite" className="mt-1 flex items-center gap-2 whitespace-nowrap text-xs font-extrabold text-white">
            <Dumbbell className="h-3.5 w-3.5 shrink-0 text-orange-400" /> {POSES[activePose].label}
          </p>
        </div>

        <div className="flex w-full rounded-full border border-white/10 bg-[#060a11]/82 p-1 shadow-2xl backdrop-blur-xl" role="group" aria-label="Khám phá giá trị GymAI">
          {POSES.map((pose, index) => (
            <button
              key={pose.shortLabel}
              type="button"
              onClick={() => setActivePose(index)}
              className={`h-7 min-w-0 flex-1 whitespace-nowrap rounded-full px-1 font-mono text-[6.5px] font-black uppercase tracking-normal transition sm:h-8 sm:px-1.5 sm:text-[7px] sm:tracking-wide ${
                activePose === index
                  ? 'bg-orange-500 text-white shadow-[0_0_18px_rgba(249,115,22,.38)]'
                  : 'text-slate-400 hover:bg-white/[0.07] hover:text-white'
              }`}
              aria-pressed={activePose === index}
            >
              {pose.shortLabel}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
