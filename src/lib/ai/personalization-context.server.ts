import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import {
  buildPersonalizationContextV1,
  type PersonalizationContextV1,
  type PersonalizationSurface,
} from './personalization-context';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

function assertQuerySucceeded(label: string, error: { message: string } | null): void {
  if (error) throw new Error(`Không thể tải ${label}: ${error.message}`);
}

/**
 * The only database-backed builder for PersonalizationContextV1.
 * RLS still applies to every query; userId is also included explicitly so this
 * function fails closed if it is ever called with a mismatched authenticated user.
 */
export async function buildPersonalizationContextForUser(
  userId: string,
  surface: PersonalizationSurface,
  now: Date = new Date(),
): Promise<PersonalizationContextV1> {
  const supabase = await createClient();
  const [profileRes, constraintsRes, preferencesRes, readinessRes, measurementsRes, sessionsRes, statsRes] = await Promise.all([
    supabase.from('profiles').select('goal, experience_level, preferred_training_days, preferred_session_duration, updated_at').eq('user_id', userId).maybeSingle(),
    supabase.from('training_constraints').select('*').eq('user_id', userId),
    supabase.from('exercise_preferences').select('*').eq('user_id', userId),
    supabase.from('readiness_checkins').select('*').eq('user_id', userId).order('checked_at', { ascending: false }).limit(10),
    supabase.from('body_composition_measurements').select('*, body_composition_segments(*)').eq('user_id', userId).eq('review_status', 'confirmed').order('measured_at', { ascending: false }).limit(20),
    supabase.from('workouts').select('id, date, status, planned_duration, started_at, completed_at').eq('user_id', userId).order('date', { ascending: false }).limit(12),
    supabase.from('exercise_user_stats').select('exercise_id, last_weight, last_reps, best_weight, best_reps, estimated_1rm, total_volume_kg, total_sets, last_performed_at, updated_at').eq('user_id', userId).order('last_performed_at', { ascending: false }).limit(30),
  ]);

  [
    ['hồ sơ', profileRes.error],
    ['giới hạn tập luyện', constraintsRes.error],
    ['sở thích bài tập', preferencesRes.error],
    ['readiness', readinessRes.error],
    ['thành phần cơ thể', measurementsRes.error],
    ['lịch sử buổi tập', sessionsRes.error],
    ['xu hướng bài tập', statsRes.error],
  ].forEach(([label, error]) => assertQuerySucceeded(label as string, error as { message: string } | null));

  const profile = profileRes.data as Pick<ProfileRow,
    'goal' | 'experience_level' | 'preferred_training_days' | 'preferred_session_duration' | 'updated_at'> | null;
  const sessions = (sessionsRes.data ?? []) as Array<{
    id: string; date: string; status: string; planned_duration: number | null;
    started_at: string | null; completed_at: string | null;
  }>;
  const stats = (statsRes.data ?? []) as Array<{
    exercise_id: string; last_weight: number | null; last_reps: number | null;
    best_weight: number | null; best_reps: number | null; estimated_1rm: number | null;
    total_volume_kg: number; total_sets: number; last_performed_at: string | null; updated_at: string;
  }>;
  const completedCount = sessions.filter((session) => session.status === 'completed').length;

  return buildPersonalizationContextV1({
    declared: {
      goal: profile?.goal ?? null,
      experienceLevel: profile?.experience_level ?? null,
      preferredTrainingDays: profile?.preferred_training_days ?? null,
      preferredSessionMinutes: profile?.preferred_session_duration ?? null,
      observedAt: profile?.updated_at ?? null,
    },
    constraints: (constraintsRes.data ?? []) as Database['public']['Tables']['training_constraints']['Row'][],
    preferences: (preferencesRes.data ?? []) as Database['public']['Tables']['exercise_preferences']['Row'][],
    readinessCheckins: (readinessRes.data ?? []) as Database['public']['Tables']['readiness_checkins']['Row'][],
    performance: {
      recentSessions: sessions.map((session) => ({
        sessionId: session.id,
        date: session.date,
        status: session.status,
        plannedDuration: session.planned_duration,
        startedAt: session.started_at,
        completedAt: session.completed_at,
      })),
      exerciseTrends: stats.map((stat) => ({
        exerciseId: stat.exercise_id,
        lastWeight: stat.last_weight,
        lastReps: stat.last_reps,
        bestWeight: stat.best_weight,
        bestReps: stat.best_reps,
        estimated1rm: stat.estimated_1rm,
        totalVolumeKg: stat.total_volume_kg,
        totalSets: stat.total_sets,
        lastPerformedAt: stat.last_performed_at,
        observedAt: stat.updated_at,
      })),
      adherence: sessions.length > 0 ? {
        completedSessions: completedCount,
        observedSessions: sessions.length,
        completionRate: Number((completedCount / sessions.length).toFixed(3)),
      } : null,
    },
    bodyCompositionMeasurements: (measurementsRes.data ?? []) as Database['public']['Tables']['body_composition_measurements']['Row'][],
    consents: [],
  }, { now, surface });
}
