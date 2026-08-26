'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { BodyMuscleGroup } from '@/lib/recovery/muscle-groups';
import { getRecoveryGroupUiMetadata } from '@/lib/recovery/ui-metadata';

type Props = {
  group: BodyMuscleGroup;
  mode?: 'decorative' | 'meaningful';
  className?: string;
  sizes?: string;
};

export default function MuscleGroupThumbnail({
  group,
  mode = 'meaningful',
  className = '',
  sizes = '72px',
}: Props) {
  const metadata = getRecoveryGroupUiMetadata(group);
  const [hasError, setHasError] = useState(false);
  const decorative = mode === 'decorative';

  useEffect(() => setHasError(false), [metadata.thumbnailPath]);

  return (
    <span
      className={`relative flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-center text-xs font-bold text-ink-muted dark:bg-white/5 ${className}`}
      aria-hidden={decorative ? true : undefined}
      role={!decorative && hasError ? 'img' : undefined}
      aria-label={!decorative && hasError ? `Minh họa nhóm cơ ${metadata.label}` : undefined}
    >
      {hasError ? (
        <span aria-hidden="true" className="px-2">
          {metadata.label}
        </span>
      ) : (
        <Image
          src={metadata.thumbnailPath}
          alt={decorative ? '' : `Minh họa nhóm cơ ${metadata.label}`}
          fill
          sizes={sizes}
          className="object-contain"
          onError={() => setHasError(true)}
        />
      )}
    </span>
  );
}
