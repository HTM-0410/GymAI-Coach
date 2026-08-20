'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, LayoutDashboard, Brain, Dumbbell, CalendarDays, Target,
  MessageCircle, Sparkles, TrendingUp, BarChart3, User, Moon, Sun,
  LogOut, CornerDownLeft, X, ArrowRight,
} from 'lucide-react';
import { useTheme } from './theme-provider';

type CommandItem = {
  id: string;
  title: string;
  category: 'Trang' | 'Tính năng AI' | 'Hệ thống';
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  badge?: string;
};

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandItem[] = [
    // Navigation
    { id: 'dash', title: 'Tổng quan (Dashboard)', category: 'Trang', icon: LayoutDashboard, action: () => router.push('/dashboard') },
    { id: 'ex', title: 'Thư viện bài tập', category: 'Trang', icon: Dumbbell, action: () => router.push('/exercises') },
    { id: 'prog', title: 'Chương trình tập luyện', category: 'Trang', icon: CalendarDays, action: () => router.push('/programs') },
    { id: 'gyms', title: 'Phòng gym cá nhân', category: 'Trang', icon: Target, action: () => router.push('/gyms') },
    { id: 'progress', title: 'Tiến độ & Kỷ lục cá nhân', category: 'Trang', icon: TrendingUp, action: () => router.push('/progress') },
    { id: 'weekly', title: 'Báo cáo phân tích tuần', category: 'Trang', icon: BarChart3, action: () => router.push('/weekly') },
    { id: 'profile', title: 'Hồ sơ cá nhân', category: 'Trang', icon: User, action: () => router.push('/profile') },

    // AI Actions
    { id: 'ai-workout', title: 'Tạo buổi tập AI mới ngay', category: 'Tính năng AI', icon: Brain, badge: 'HOT', action: () => router.push('/workouts/new') },
    { id: 'ai-coach', title: 'Hỏi AI Coach về form & giáo án', category: 'Tính năng AI', icon: MessageCircle, badge: 'AI', action: () => router.push('/coach') },
    { id: 'ai-recs', title: 'Xem đề xuất tăng tạ / deload', category: 'Tính năng AI', icon: Sparkles, badge: 'AI', action: () => router.push('/recommendations') },

    // System
    {
      id: 'theme-toggle',
      title: theme === 'dark' ? 'Chuyển sang giao diện Sáng (Light)' : 'Chuyển sang giao diện Tối (Dark)',
      category: 'Hệ thống',
      icon: theme === 'dark' ? Sun : Moon,
      action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    },
    { id: 'logout', title: 'Đăng xuất tài khoản', category: 'Hệ thống', icon: LogOut, action: () => router.push('/auth/logout') },
  ];

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = useCallback((cmd: CommandItem) => {
    onClose();
    cmd.action();
  }, [onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose(); else { setQuery(''); }
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        handleSelect(filtered[selectedIndex]);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filtered, selectedIndex, handleSelect]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-xl bg-chassis dark:bg-[#121720] border border-black/10 dark:border-white/15 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08] bg-chassis-hi/60 dark:bg-black/20">
          <Search className="h-5 w-5 text-accent shrink-0" strokeWidth={2} />
          <input
            autoFocus
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-ink placeholder:text-ink-muted text-sm font-medium"
            placeholder="Gõ lệnh hoặc tìm kiếm nhanh trang, bài tập..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="h-6 w-6 rounded-md text-ink-muted hover:text-ink flex items-center justify-center text-xs"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-ink-muted border border-black/10 dark:border-white/10">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[340px] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-ink-muted text-sm font-mono">
              Không tìm thấy lệnh hoặc trang phù hợp.
            </div>
          ) : (
            filtered.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-accent text-white shadow-accent'
                      : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-ink'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-black/[0.04] dark:bg-white/[0.06] text-accent'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate leading-tight">
                        {item.title}
                      </div>
                      <span className={`text-[10px] font-mono uppercase tracking-wider ${
                        isSelected ? 'text-white/80' : 'text-ink-muted'
                      }`}>
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.badge && (
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-white text-accent'
                          : 'bg-accent/15 text-accent border border-accent/30'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="h-4 w-4 text-white/90" strokeWidth={2} />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 bg-black/[0.02] dark:bg-black/40 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-ink-muted">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10">↑↓</kbd> Di chuyển
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10">↵</kbd> Chọn
            </span>
          </div>
          <span>GymAI Command</span>
        </div>
      </div>
    </div>
  );
}
