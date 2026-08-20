'use client';

import Image from 'next/image';
import { Dumbbell } from 'lucide-react';

interface ExerciseMediaProps {
  jpgUrl?: string | null;
  gifUrl?: string | null;
  name: string;
  caption?: string;
}

const VIDEO_EXT = /\.(mp4|webm|ogg)$/i;

function isVideo(url?: string | null): boolean {
  return !!url && (VIDEO_EXT.test(url) || url.includes('r2'));
}

export default function ExerciseMedia({ jpgUrl, gifUrl, name, caption }: ExerciseMediaProps) {
  // Animation mặc định; fallback sang ảnh tĩnh nếu không có GIF.
  const current = gifUrl ?? jpgUrl ?? null;
  const video = isVideo(current);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-white dark:bg-black/40 border border-white/80 dark:border-white/10 shadow-neumorph-sm">
      {!current ? (
        <div className="flex h-full w-full items-center justify-center">
          <Dumbbell className="h-12 w-12 text-ink-secondary opacity-30" />
        </div>
      ) : video ? (
        <video
          src={current}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <Image
          src={current}
          alt={`${name} - animation`}
          fill
          priority
          unoptimized={current.endsWith('.gif') || current.endsWith('.webp')}
          className="object-contain"
        />
      )}

      {caption && (
        <div className="absolute inset-x-0 bottom-0 bg-ink/75 px-4 py-3 text-sm font-medium text-white">
          {caption}
        </div>
      )}
    </div>
  );
}