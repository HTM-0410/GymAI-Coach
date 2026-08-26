import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { LayoutDashboard, Dumbbell, Brain, HeartPulse, User } from 'lucide-react';
import { getMobileTabs, isMobileTabActive, navItems, type NavItem } from '../src/components/nav';

const navContent = readFileSync('src/components/nav.tsx', 'utf8');
const layoutContent = readFileSync('src/app/(app)/layout.tsx', 'utf8');
const exercisesContent = readFileSync('src/app/(app)/exercises/page.tsx', 'utf8');
const programsContent = readFileSync('src/app/(app)/programs/page.tsx', 'utf8');
const tabsContent = readFileSync('src/components/training-library-tabs.tsx', 'utf8');

test('TIP-MOB-01: mobile tabs provide 5 items with Recovery when feature flag is enabled', () => {
  const tabs = getMobileTabs(true);
  assert.equal(tabs.length, 5);
  assert.deepEqual(
    tabs.map((t) => ({ href: t.href, label: t.label })),
    [
      { href: '/dashboard', label: 'Tổng quan' },
      { href: '/exercises', label: 'Bài tập' },
      { href: '/workouts/new', label: 'Tập ngay' },
      { href: '/recovery', label: 'Phục hồi' },
      { href: '/profile', label: 'Tôi' },
    ],
  );
  assert.equal(tabs[2].isAi, true);
});

test('TIP-MOB-01: mobile tabs fallback to Programs when Recovery feature flag is disabled', () => {
  const tabs = getMobileTabs(false);
  assert.equal(tabs.length, 5);
  assert.deepEqual(
    tabs.map((t) => ({ href: t.href, label: t.label })),
    [
      { href: '/dashboard', label: 'Tổng quan' },
      { href: '/exercises', label: 'Bài tập' },
      { href: '/workouts/new', label: 'Tập ngay' },
      { href: '/programs', label: 'Giáo án' },
      { href: '/profile', label: 'Tôi' },
    ],
  );
});

test('TIP-MOB-01: mobile route matching keeps Tab 2 (Bài tập) active for exercises and programs', () => {
  const exercisesTab: NavItem = { href: '/exercises', label: 'Bài tập', icon: Dumbbell };

  // When recovery is enabled:
  assert.equal(isMobileTabActive(exercisesTab, '/exercises', true), true);
  assert.equal(isMobileTabActive(exercisesTab, '/exercises/bench-press', true), true);
  assert.equal(isMobileTabActive(exercisesTab, '/programs', true), true);
  assert.equal(isMobileTabActive(exercisesTab, '/programs/hypertrophy-1', true), true);

  // Unrelated routes do not activate Bài tập
  assert.equal(isMobileTabActive(exercisesTab, '/dashboard', true), false);
  assert.equal(isMobileTabActive(exercisesTab, '/recovery', true), false);
  assert.equal(isMobileTabActive(exercisesTab, '/profile', true), false);

  // When recovery is disabled, tab 2 only matches exercises
  assert.equal(isMobileTabActive(exercisesTab, '/exercises', false), true);
  assert.equal(isMobileTabActive(exercisesTab, '/exercises/bench-press', false), true);
  assert.equal(isMobileTabActive(exercisesTab, '/programs', false), false);
});

test('TIP-MOB-01: mobile route matching keeps Tab 4 (Phục hồi) active for all recovery routes', () => {
  const recoveryTab: NavItem = { href: '/recovery', label: 'Phục hồi', icon: HeartPulse };

  assert.equal(isMobileTabActive(recoveryTab, '/recovery', true), true);
  assert.equal(isMobileTabActive(recoveryTab, '/recovery/groups', true), true);
  assert.equal(isMobileTabActive(recoveryTab, '/recovery/groups/chest', true), true);

  assert.equal(isMobileTabActive(recoveryTab, '/exercises', true), false);
  assert.equal(isMobileTabActive(recoveryTab, '/programs', true), false);
  assert.equal(isMobileTabActive(recoveryTab, '/dashboard', true), false);
});

test('TIP-MOB-01: mobile route matching handles Dashboard, Workouts and Profile routes', () => {
  const dashTab: NavItem = { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard };
  const workoutTab: NavItem = { href: '/workouts/new', label: 'Tập ngay', icon: Brain, isAi: true };
  const profileTab: NavItem = { href: '/profile', label: 'Tôi', icon: User };

  assert.equal(isMobileTabActive(dashTab, '/dashboard', true), true);
  assert.equal(isMobileTabActive(dashTab, '/', true), true);
  assert.equal(isMobileTabActive(dashTab, '/exercises', true), false);

  assert.equal(isMobileTabActive(workoutTab, '/workouts/new', true), true);
  assert.equal(isMobileTabActive(workoutTab, '/workouts/custom-123', true), true);
  assert.equal(isMobileTabActive(workoutTab, '/exercises', true), false);

  assert.equal(isMobileTabActive(profileTab, '/profile', true), true);
  assert.equal(isMobileTabActive(profileTab, '/profile/body-composition', true), true);
  assert.equal(isMobileTabActive(profileTab, '/recovery', true), false);
});

test('TIP-MOB-01: safe-area insets are applied to mobile dock and layout container', () => {
  assert.match(navContent, /env\(safe-area-inset-bottom/);
  assert.match(layoutContent, /env\(safe-area-inset-bottom/);
});

test('TIP-MOB-02: TrainingLibraryTabs renders Kho bài tập and Giáo trình with mobile constraint', () => {
  assert.match(tabsContent, /sm:hidden/);
  assert.match(tabsContent, /href="\/exercises"/);
  assert.match(tabsContent, /href="\/programs"/);
  assert.match(tabsContent, /Kho bài tập/);
  assert.match(tabsContent, /Giáo trình/);
  assert.match(tabsContent, /bg-accent text-white/);
});

test('TIP-MOB-02: Exercises and Programs pages include TrainingLibraryTabs', () => {
  assert.match(exercisesContent, /<TrainingLibraryTabs activeTab="exercises"/);
  assert.match(programsContent, /<TrainingLibraryTabs activeTab="programs"/);
});

test('TIP-MOB-03: Desktop sidebar remains intact and unchanged', () => {
  assert.equal(navItems.some((it) => it.href === '/exercises' && it.label === 'Thư viện bài tập'), true);
  assert.equal(navItems.some((it) => it.href === '/programs' && it.label === 'Chương trình tập'), true);
  assert.equal(navItems.some((it) => it.href === '/gyms' && it.label === 'Phòng gym cá nhân'), true);
  assert.equal(navItems.some((it) => it.href === '/progress' && it.label === 'Tiến độ & Kỷ lục'), true);
});
