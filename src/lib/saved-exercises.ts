'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Fetch all saved exercise slugs for a user
 */
export async function fetchUserSavedExerciseSlugs(userId?: string): Promise<string[]> {
  if (!userId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_saved_exercises')
    .select('exercise_id, exercises!inner(slug)')
    .eq('user_id', userId);

  if (error || !data) {
    return [];
  }

  return data
    .map((row: any) => row.exercises?.slug)
    .filter(Boolean);
}

/**
 * Toggle bookmark / save state for an exercise by slug
 */
export async function toggleSaveExerciseAction(
  slug: string,
): Promise<{ success: boolean; saved: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, saved: false, error: 'Bạn cần đăng nhập để lưu bài tập.' };
    }

    // 1. Find exercise ID by slug
    const { data: ex, error: exErr } = await supabase
      .from('exercises')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (exErr || !ex) {
      return { success: false, saved: false, error: 'Không tìm thấy bài tập.' };
    }

    // 2. Check if already saved
    const { data: existing } = await supabase
      .from('user_saved_exercises')
      .select('id')
      .eq('user_id', user.id)
      .eq('exercise_id', ex.id)
      .maybeSingle();

    if (existing) {
      // Remove bookmark
      const { error: delErr } = await supabase
        .from('user_saved_exercises')
        .delete()
        .eq('id', existing.id);

      if (delErr) {
        return { success: false, saved: true, error: 'Lỗi khi bỏ lưu bài tập.' };
      }

      revalidatePath('/exercises');
      revalidatePath(`/exercises/${slug}`);
      return { success: true, saved: false };
    } else {
      // Add bookmark
      const { error: insErr } = await supabase
        .from('user_saved_exercises')
        .insert({
          user_id: user.id,
          exercise_id: ex.id,
        });

      if (insErr) {
        return { success: false, saved: false, error: 'Lỗi khi lưu bài tập.' };
      }

      revalidatePath('/exercises');
      revalidatePath(`/exercises/${slug}`);
      return { success: true, saved: true };
    }
  } catch (err: any) {
    return { success: false, saved: false, error: err.message || 'Lỗi hệ thống.' };
  }
}
