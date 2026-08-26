'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type LoginState = {
  error: string | null;
};

export async function loginWithPassword(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Vui lòng nhập đầy đủ email và mật khẩu.' };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return {
        error: error.message === 'fetch failed'
          ? 'Máy chủ phát triển không thể kết nối Supabase. Vui lòng thử lại trên trình duyệt.'
          : error.message,
      };
    }

    let isComplete = false;
    if (data?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_step, experience_level, goal, preferred_training_days, preferred_session_duration')
        .eq('user_id', data.user.id)
        .maybeSingle();

      const { isOnboardingComplete } = await import('@/lib/onboarding');
      isComplete = isOnboardingComplete(profile);
    }

    redirect(isComplete ? '/dashboard' : '/onboarding');
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    return { error: 'Không thể kết nối máy chủ đăng nhập. Vui lòng thử lại.' };
  }
}
