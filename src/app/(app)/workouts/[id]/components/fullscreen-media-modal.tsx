'use client';

import React from 'react';
import { X, Image as ImageIcon } from 'lucide-react';

type FullscreenMediaModalProps = {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  mediaUrl: string | null;
};

export default function FullscreenMediaModal({
  isOpen,
  onClose,
  name,
  mediaUrl,
}: FullscreenMediaModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-2xl bg-[#0b1018] rounded-3xl border border-white/15 overflow-hidden shadow-2xl p-4 flex flex-col items-center gap-3 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="w-full flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <h3 className="font-extrabold text-base text-white truncate">{name}</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Large Media Box */}
        <div className="relative w-full aspect-square sm:aspect-video rounded-2xl overflow-hidden bg-white flex items-center justify-center p-2">
          {mediaUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={mediaUrl}
              alt={name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-white/50">
              <ImageIcon className="h-10 w-10 opacity-50" />
              <span className="font-mono text-xs">Không có hình ảnh</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
