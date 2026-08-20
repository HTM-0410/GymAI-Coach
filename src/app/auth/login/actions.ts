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
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return {
        error: error.message === 'fetch failed'
          ? 'Máy chủ phát triển không thể kết nối Supabase. Vui lòng thử lại trên trình duyệt.'
          : error.message,
      };
    }
  } catch {
    return { error: 'Không thể kết nối máy chủ đăng nhập. Vui lòng thử lại.' };
  }

  redirect('/dashboard');
}
