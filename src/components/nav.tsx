'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Dumbbell, CalendarDays, Brain, TrendingUp, User, LogOut,
  Sparkles, MessageCircle, Menu, X, Target, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { BrandLogo } from './brand-logo';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isAi?: boolean;
  badge?: string | null;
};

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Tập luyện',
    items: [
      { href: '/dashboard',    label: 'Tổng quan',        icon: LayoutDashboard },
      { href: '/workouts/new', label: 'Tập luyện AI',     icon: Brain, isAi: true, badge: 'HOT' },
      { href: '/exercises',    label: 'Thư viện bài tập', icon: Dumbbell },
      { href: '/programs',     label: 'Chương trình tập', icon: CalendarDays },
      { href: '/gyms',         label: 'Phòng gym cá nhân', icon: Target },
    ],
  },
  {
    title: 'Trí tuệ AI & Dữ liệu',
    items: [
      { href: '/coach',           label: 'Chat AI Coach',    icon: MessageCircle, isAi: true },
      { href: '/recommendations', label: 'Đề xuất tối ưu',   icon: Sparkles, isAi: true },
      { href: '/progress',        label: 'Tiến độ & Kỷ lục', icon: TrendingUp },
      { href: '/weekly',          label: 'Báo cáo tuần',     icon: BarChart3 },
    ],
  },
];

const mobileTabs: NavItem[] = [
  { href: '/dashboard',    label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/exercises',    label: 'Bài tập',   icon: Dumbbell },
  { href: '/workouts/new', label: 'AI Tập',    icon: Brain, isAi: true },
  { href: '/coach',        label: 'Coach',     icon: MessageCircle, isAi: true },
  { href: '/profile',      label: 'Tôi',       icon: User },
];

export default function Nav({ displayName }: { displayName: string }) {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const enterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  function handleMouseEnter() {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    enterTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 50);
  }

  function handleMouseLeave() {
    if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150);
  }

  const initial = (displayName || 'U').charAt(0).toUpperCase();

  return (
    <>
      {/* ── DESKTOP AUTO-HOVER PEAK RAIL SIDEBAR (Zero Shift Architecture) ── */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'hidden md:flex fixed inset-y-0 left-0 flex-col z-50 overflow-hidden',
          'bg-chassis-hi/95 dark:bg-[#0b0e14]/95 backdrop-blur-2xl',
          'border-r border-black/[0.06] dark:border-white/[0.08]',
          'transition-[width,box-shadow] duration-250 ease-out',
          isHovered
            ? 'w-64 shadow-[12px_0_40px_rgba(0,0,0,0.4)] dark:shadow-[12px_0_40px_rgba(0,0,0,0.8)]'
            : 'w-16',
        )}
      >
        {/* Brand Header — Exactly centered at 64px rail (36px logo + 2x14px padding) */}
        <div className="h-16 flex items-center shrink-0 border-b border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 group w-full px-3.5"
          >
            {/* Logo Mark */}
            <BrandLogo size="md" className="shrink-0" />

            <div
              className={cn(
                'min-w-0 flex-1 overflow-hidden transition-all duration-200 whitespace-nowrap',
                isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'
              )}
            >
              <div className="font-bold text-sm tracking-tight text-ink flex items-center gap-1.5 leading-none">
                GymAI
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/30 leading-none shadow-[0_0_8px_rgba(249,115,22,0.3)]">
                  2.0
                </span>
              </div>
              <span className="font-mono text-[9px] text-ink-muted uppercase tracking-wider font-semibold mt-0.5 block truncate">
                Coach System
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 py-3 space-y-4 overflow-y-auto overflow-x-hidden px-2">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              <div
                className={cn(
                  'px-2.5 pb-1 font-mono text-[9px] uppercase tracking-widest text-ink-muted font-bold transition-opacity duration-200 h-4',
                  isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
              >
                {section.title}
              </div>

              <div className="space-y-1">
                {section.items.map((it) => {
                  const Icon = it.icon;
                  const active = pathname === it.href || (it.href !== '/dashboard' && pathname.startsWith(it.href + '/'));

                  return (
                    <div key={it.href} className="relative group">
                      <Link
                        href={it.href}
                        className={cn(
                          'flex items-center h-10 w-full rounded-xl pl-[15px] pr-2.5 gap-3 text-sm font-medium transition-colors relative overflow-hidden',
                          active
                            ? 'bg-accent/15 text-accent font-semibold shadow-xs dark:shadow-none'
                            : 'text-ink-secondary hover:text-ink hover:bg-black/[0.04] dark:hover:bg-white/[0.05]',
                        )}
                      >
                        {/* Active indicator */}
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-accent" />
                        )}

                        <Icon
                          className={cn(
                            'h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105',
                            active ? 'text-accent' : 'text-ink-muted group-hover:text-ink',
                            it.isAi && !active && 'text-accent/80',
                          )}
                          strokeWidth={active ? 1.75 : 1.4}
                        />

                        <div
                          className={cn(
                            'flex items-center justify-between flex-1 min-w-0 transition-opacity duration-200',
                            isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                          )}
                        >
                          <span className="tracking-tight text-xs truncate">{it.label}</span>
                          {it.isAi && (
                            <span className="text-[8px] font-mono uppercase font-bold text-accent bg-accent/10 px-1 py-0.2 rounded border border-accent/20 shrink-0 ml-1">
                              AI
                            </span>
                          )}
                        </div>
                      </Link>

                      {/* Floating Tooltip when Collapsed */}
                      {!isHovered && (
                        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 px-2 py-1 rounded-md bg-ink text-chassis dark:bg-white dark:text-ink text-xs font-semibold whitespace-nowrap shadow-xl opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none transition-all duration-150">
                          {it.label} {it.isAi && '(AI)'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Widget — Zero Layout Shift */}
        <div className="p-2 border-t border-black/[0.04] dark:border-white/[0.06] shrink-0">
          <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] p-1 flex flex-col gap-1">
            
            {/* Theme Toggle Row — 100% Stable Position, NEVER MOVES */}
            <div className="h-9 w-full rounded-lg pl-[7px] pr-2 flex items-center gap-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors overflow-hidden group/theme">
              <div className="shrink-0 flex items-center justify-center">
                <ThemeToggle />
              </div>
              <span
                className={cn(
                  'text-xs font-semibold text-ink-muted group-hover/theme:text-ink transition-opacity duration-200 whitespace-nowrap',
                  isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
              >
                Giao diện Sáng/Tối
              </span>
            </div>

            {/* User Profile Row — 100% Stable Position, NEVER MOVES */}
            <div className="h-9 w-full rounded-lg pl-[7px] pr-1.5 flex items-center justify-between gap-2 pt-0.5 border-t border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
              <Link href="/profile" className="flex items-center gap-2.5 min-w-0 flex-1 group">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-accent-dim text-white font-mono font-bold text-xs flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  {initial}
                </div>
                <div
                  className={cn(
                    'min-w-0 transition-opacity duration-200',
                    isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  )}
                >
                  <div className="text-xs font-semibold text-ink truncate group-hover:text-accent transition-colors">
                    {displayName}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-success led-pulse" />
                    <span className="font-mono text-[9px] text-ink-muted uppercase font-semibold">Online</span>
                  </div>
                </div>
              </Link>

              <Link
                href="/auth/logout"
                title="Đăng xuất"
                className={cn(
                  'h-7 w-7 rounded-lg text-ink-muted hover:text-danger hover:bg-danger/10 flex items-center justify-center transition-all shrink-0',
                  isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
                )}
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>
            </div>

          </div>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <header className="md:hidden sticky top-0 z-40 h-14 px-4
                        bg-chassis-hi/80 dark:bg-[#0c1017]/90 backdrop-blur-2xl
                        border-b border-black/[0.06] dark:border-white/[0.08]
                        flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <BrandLogo size="sm" />
          <span className="font-extrabold text-sm text-ink tracking-tight">GymAI Coach</span>
        </Link>

        {/* Right Tools */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="h-8 w-8 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-ink"
            aria-label="Menu"
          >
            {mobileDrawerOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* ── MOBILE EXPANDABLE DRAWER ── */}
      {mobileDrawerOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="md:hidden fixed top-14 left-0 right-0 z-50 max-h-[calc(100vh-8rem)] overflow-y-auto
                          bg-chassis-hi dark:bg-[#0e1218] border-b border-black/[0.08] dark:border-white/[0.1]
                          p-4 shadow-2xl space-y-4 animate-in slide-in-from-top duration-200">
            {navSections.map((section) => (
              <div key={section.title} className="space-y-1.5">
                <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold px-1">
                  {section.title}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {section.items.map((it) => {
                    const Icon = it.icon;
                    const active = pathname === it.href;
                    return (
                      <Link
                        key={it.href}
                        href={it.href}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={cn(
                          'flex items-center gap-2.5 p-3 rounded-xl text-xs font-semibold border transition-all',
                          active
                            ? 'bg-accent/15 text-accent border-accent/30'
                            : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/[0.04] dark:border-white/[0.06] text-ink',
                        )}
                      >
                        <Icon className={cn('h-4 w-4', active ? 'text-accent' : 'text-ink-muted')} />
                        <span className="truncate">{it.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
              <Link
                href="/profile"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex items-center gap-2 text-xs font-bold text-ink"
              >
                <div className="h-7 w-7 rounded-lg bg-accent text-white font-mono flex items-center justify-center">
                  {initial}
                </div>
                <span>{displayName}</span>
              </Link>
              <Link
                href="/auth/logout"
                onClick={() => setMobileDrawerOpen(false)}
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-danger hover:underline px-2 py-1"
              >
                <LogOut className="h-3.5 w-3.5" />
                Đăng xuất
              </Link>
            </div>
          </div>
        </>
      )}

      {/* ── MOBILE FLOATING CYBERNETIC DOCK ── */}
      <nav className="md:hidden fixed bottom-3 inset-x-3 z-40 h-16
                      bg-chassis-hi/90 dark:bg-[#0c1017]/95 backdrop-blur-2xl
                      border border-black/[0.08] dark:border-white/[0.12] rounded-2xl
                      shadow-[0_10px_30px_rgba(0,0,0,0.3)]
                      px-2 flex items-center justify-around">
        {mobileTabs.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.href;

          if (it.isAi && it.href === '/workouts/new') {
            return (
              <Link
                key={it.href}
                href={it.href}
                className="relative -top-4 flex flex-col items-center group"
              >
                <div className="relative h-13 w-13 rounded-2xl bg-gradient-to-tr from-accent to-accent-dim text-white shadow-accent-lg flex items-center justify-center group-hover:scale-105 active:scale-95 transition-transform border-2 border-white/40">
                  <Brain className="h-6 w-6" strokeWidth={2.25} />
                  <span className="absolute -bottom-1 h-1.5 w-6 rounded-full bg-accent/60 blur-xs" />
                </div>
                <span className="text-[9px] font-mono font-bold text-accent mt-0.5 uppercase tracking-wider">AI Tập</span>
              </Link>
            );
          }

          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all',
                active ? 'text-accent font-bold scale-105' : 'text-ink-muted hover:text-ink',
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              <span className="text-[9px] font-medium tracking-tight leading-none">{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
