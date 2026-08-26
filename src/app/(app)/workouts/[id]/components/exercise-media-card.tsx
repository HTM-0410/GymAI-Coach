'use client';

import React, { useState, useEffect } from 'react';
import { Maximize2, Image as ImageIcon } from 'lucide-react';

type ExerciseMediaCardProps = {
  name: string;
  animationUrl: string | null;
  thumbnailUrl: string | null;
  onOpenFullscreen: () => void;
};

export default function ExerciseMediaCard({
  name,
  animationUrl,
  thumbnailUrl,
  onOpenFullscreen,
}: ExerciseMediaCardProps) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(animationUrl || thumbnailUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCurrentSrc(animationUrl || thumbnailUrl);
    setHasError(false);
  }, [animationUrl, thumbnailUrl]);

  function handleError() {
    if (currentSrc === animationUrl && thumbnailUrl) {
      setCurrentSrc(thumbnailUrl);
    } else {
      setHasError(true);
    }
  }

  return (
    <div className="relative w-full h-[145px] sm:h-[175px] rounded-2xl overflow-hidden bg-white border border-black/10 dark:border-white/15 shadow-sm flex items-center justify-center group">
      {currentSrc && !hasError ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentSrc}
            alt={name}
            onError={handleError}
            className="w-full h-full object-contain p-1"
          />

          {/* Bottom Left Badge */}
          <div className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-xs text-[10px] font-mono font-bold text-white/90 border border-white/10">
            {currentSrc.endsWith('.gif') ? 'GIF' : 'Minh họa'}
          </div>

          {/* Top Right Fullscreen Button */}
          <button
            type="button"
            onClick={onOpenFullscreen}
            className="absolute top-2 right-2 h-8 w-8 rounded-xl bg-black/60 hover:bg-black/85 backdrop-blur-xs text-white/90 hover:text-white flex items-center justify-center border border-white/15 shadow-sm active:scale-95 transition-all touch-manipulation cursor-pointer"
            title="Xem toàn màn hình"
            aria-label="Xem toàn màn hình"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 text-ink-muted">
          <ImageIcon className="h-7 w-7 opacity-40" />
          <span className="font-mono text-[11px]">Chưa có hình ảnh minh họa</span>
        </div>
      )}
    </div>
  );
}
