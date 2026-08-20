'use client';

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from './theme-provider';

export function ThemeToggle({ className = '', variant = 'compact' }: { className?: string; variant?: 'compact' | 'segmented' }) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  if (variant === 'segmented') {
    return (
      <div className={`recessed-bay p-1 flex items-center gap-1 rounded-xl ${className}`}>
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
            theme === 'light'
              ? 'bg-gradient-to-br from-accent to-accent-dim text-white shadow-accent'
              : 'text-ink-muted hover:text-ink'
          }`}
          title="Giao diện Sáng"
        >
          <Sun className="h-3.5 w-3.5" strokeWidth={2} />
          <span>Sáng</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-accent to-accent-dim text-white shadow-accent'
              : 'text-ink-muted hover:text-ink'
          }`}
          title="Giao diện Tối (Tactical Dark)"
        >
          <Moon className="h-3.5 w-3.5" strokeWidth={2} />
          <span>Tối</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('system')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
            theme === 'system'
              ? 'bg-gradient-to-br from-accent to-accent-dim text-white shadow-accent'
              : 'text-ink-muted hover:text-ink'
          }`}
          title="Tự động theo Hệ thống"
        >
          <Monitor className="h-3.5 w-3.5" strokeWidth={2} />
          <span>Auto</span>
        </button>
      </div>
    );
  }

  // Compact toggle button (cycles Light -> Dark)
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`relative h-8 w-8 rounded-xl bg-chassis border border-white/80 dark:border-white/10 shadow-neumorph-sm hover:shadow-neumorph flex items-center justify-center text-ink-secondary hover:text-accent active:shadow-pressed transition-all duration-200 ${className}`}
      title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
      aria-label="Chuyển đổi giao diện"
    >
      {isDark ? (
        <Moon className="h-4 w-4 text-accent transition-transform duration-200 rotate-0 scale-100" strokeWidth={2} />
      ) : (
        <Sun className="h-4 w-4 text-accent transition-transform duration-200 rotate-0 scale-100" strokeWidth={2} />
      )}
    </button>
  );
}
