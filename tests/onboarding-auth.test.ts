import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  isOnboardingComplete,
  getSafeRedirectPath,
  resolveAuthNextDestination,
} from '../src/lib/onboarding';

test('production auth UI and server actions expose no dev Google test login', () => {
  const authSources = [
    'src/app/auth/register/register-form.tsx',
    'src/app/auth/login/login-form.tsx',
    'src/app/auth/login/actions.ts',
  ].map((path) => readFileSync(path, 'utf8')).join('\n');

  assert.doesNotMatch(authSources, /1-Click Test Google|Localhost Dev|loginWithDevGoogle|google\.dev\.tester/);
});

test('isOnboardingComplete marks standard onboarding_step >= 4 as complete', () => {
  assert.equal(isOnboardingComplete({ onboarding_step: 4 }), true);
  assert.equal(isOnboardingComplete({ onboarding_step: 5 }), true);
  assert.equal(isOnboardingComplete({ onboarding_step: 3 }), false);
  assert.equal(isOnboardingComplete({ onboarding_step: 0 }), false);
  assert.equal(isOnboardingComplete(null), false);
  assert.equal(isOnboardingComplete(undefined), false);
});

test('isOnboardingComplete supports legacy profiles with all 4 required fields', () => {
  const legacyComplete = {
    onboarding_step: 0,
    experience_level: 'intermediate',
    goal: 'muscle_gain',
    preferred_training_days: 4,
    preferred_session_duration: 60,
  };
  assert.equal(isOnboardingComplete(legacyComplete), true);

  const legacyMissingGoal = {
    onboarding_step: 0,
    experience_level: 'intermediate',
    goal: null,
    preferred_training_days: 4,
    preferred_session_duration: 60,
  };
  assert.equal(isOnboardingComplete(legacyMissingGoal), false);

  const legacyMissingDays = {
    onboarding_step: 0,
    experience_level: 'intermediate',
    goal: 'muscle_gain',
    preferred_training_days: null,
    preferred_session_duration: 60,
  };
  assert.equal(isOnboardingComplete(legacyMissingDays), false);

  const legacyMissingDuration = {
    onboarding_step: 0,
    experience_level: 'intermediate',
    goal: 'muscle_gain',
    preferred_training_days: 3,
    preferred_session_duration: 0,
  };
  assert.equal(isOnboardingComplete(legacyMissingDuration), false);
});

test('isOnboardingComplete does NOT gate on equipment count (Bodyweight/No-equipment is valid)', () => {
  const noEquipmentUser = {
    onboarding_step: 4,
    experience_level: 'beginner',
    goal: 'fat_loss',
    preferred_training_days: 3,
    preferred_session_duration: 45,
  };
  // Valid completed profile even with 0 equipment
  assert.equal(isOnboardingComplete(noEquipmentUser), true);
});

test('getSafeRedirectPath blocks open redirects and protocol-relative URLs', () => {
  assert.equal(getSafeRedirectPath('/dashboard'), '/dashboard');
  assert.equal(getSafeRedirectPath('/workouts/new'), '/workouts/new');
  assert.equal(getSafeRedirectPath('/profile?tab=equipment'), '/profile?tab=equipment');

  // Open redirect attempts
  assert.equal(getSafeRedirectPath('https://malicious-site.com'), '/dashboard');
  assert.equal(getSafeRedirectPath('http://malicious-site.com'), '/dashboard');
  assert.equal(getSafeRedirectPath('//malicious-site.com'), '/dashboard');
  assert.equal(getSafeRedirectPath('/\\malicious-site.com'), '/dashboard');
  assert.equal(getSafeRedirectPath('javascript:alert(1)'), '/dashboard');
  assert.equal(getSafeRedirectPath(null), '/dashboard');
  assert.equal(getSafeRedirectPath(''), '/dashboard');
});

test('resolveAuthNextDestination routes new users to onboarding and returning users safely', () => {
  // Incomplete user -> always /onboarding
  assert.equal(
    resolveAuthNextDestination({ isComplete: false, rawNext: '/workouts/new' }),
    '/onboarding',
  );
  assert.equal(
    resolveAuthNextDestination({ isComplete: false, rawNext: null }),
    '/onboarding',
  );

  // Completed user with next=/onboarding -> redirected to /dashboard (not trapped!)
  assert.equal(
    resolveAuthNextDestination({ isComplete: true, rawNext: '/onboarding' }),
    '/dashboard',
  );
  assert.equal(
    resolveAuthNextDestination({ isComplete: true, rawNext: '/onboarding?step=4' }),
    '/dashboard',
  );

  // Completed user with safe next destination -> allowed
  assert.equal(
    resolveAuthNextDestination({ isComplete: true, rawNext: '/workouts/new' }),
    '/workouts/new',
  );
  assert.equal(
    resolveAuthNextDestination({ isComplete: true, rawNext: '/profile' }),
    '/profile',
  );

  // Completed user with unsafe open-redirect next -> redirected to /dashboard
  assert.equal(
    resolveAuthNextDestination({ isComplete: true, rawNext: 'https://evil.com' }),
    '/dashboard',
  );
});
