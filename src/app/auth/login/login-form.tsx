'use client';
import { useState, type FormEvent } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { loginWithPassword, type LoginState } from './actions';
import { Sparkles } from 'lucide-react';

const initialState: LoginState = { error: null };

function LoginSubmitButton({ disabled, clientPending }: { disabled: boolean; clientPending: boolean }) {
  const { pending } = useFormStatus();
  const isPending = pending || clientPending;

  return (
    <button type="submit" disabled={disabled || isPending} className="btn-primary w-full">
      {isPending ? 'Đang xác thực…' : 'Khởi động'}
    </button>
  );
}

function translateLoginError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Email hoặc mật khẩu không chính xác.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Email chưa được xác thực. Vui lòng kiểm tra hộp thư.';
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Bạn đã thử quá nhiều lần. Vui lòng chờ ít phút.';
  }
  if (lower.includes('fetch failed')) {
    return 'Không thể kết nối máy chủ xác thực. Vui lòng kiểm tra mạng hoặc thử lại.';
  }
  return message;
}

export default function LoginForm({ callbackError = false }: { callbackError?: boolean }) {
  const [state, formAction] = useFormState(loginWithPassword, initialState);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(
    callbackError ? 'Google chưa thể hoàn tất đăng nhập. Vui lòng thử lại hoặc sử dụng email và mật khẩu.' : null,
  );

  async function handleClientSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    if (!email || !password) {
      setPasswordError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setPasswordError(translateLoginError(error.message));
        return;
      }

      window.location.assign('/dashboard');
    } catch {
      setPasswordError('Không thể kết nối máy chủ đăng nhập. Vui lòng thử lại.');
    } finally {
      setPasswordLoading(false);
    }
  }

  async function signInWithGoogle() {
    setOauthLoading(true);
    setOauthError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) {
        setOauthError(translateLoginError(error.message));
      }
    } catch {
      setOauthError('Không thể kết nối Google. Vui lòng thử lại hoặc sử dụng email và mật khẩu.');
    } finally {
      setOauthLoading(false);
    }
  }

  const error = passwordError ?? oauthError ?? (state.error ? translateLoginError(state.error) : null);

  return (
    <div className="space-y-5">
      <form action={formAction} onSubmit={handleClientSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="login-email" className="label">
            Email
          </label>
          <input
            id="login-email"
            className="input"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="operator@gymai.app"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="label">
            Mật khẩu
          </label>
          <input
            id="login-password"
            className="input"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="bg-chassis shadow-inset-sm rounded-md px-4 py-3 border border-danger/20"
          >
            <p className="font-mono text-xs text-danger">
              {error}
            </p>
          </div>
        )}

        <LoginSubmitButton disabled={oauthLoading} clientPending={passwordLoading} />
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-chassis-lo" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-chassis px-3 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            Hoặc kết nối Google
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        {/* Real Google OAuth Button */}
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={oauthLoading}
          className="btn-ghost w-full flex items-center justify-center gap-2"
          aria-label="Đăng nhập bằng tài khoản Google"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>{oauthLoading ? 'Đang chuyển hướng Google…' : 'Tiếp tục với Google'}</span>
        </button>
      </div>

      <p className="text-sm text-center text-ink-secondary font-medium">
        Chưa có tài khoản?{' '}
        <Link href="/auth/register" className="text-accent hover:underline font-semibold">
          Đăng ký ngay
        </Link>
      </p>
    </div>
  );
}
