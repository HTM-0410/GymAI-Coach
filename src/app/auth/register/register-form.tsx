'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('already registered') || lower.includes('user already exists')) {
    return 'Địa chỉ email này đã được đăng ký tài khoản. Vui lòng đăng nhập.';
  }
  if (lower.includes('password') && (lower.includes('short') || lower.includes('at least'))) {
    return 'Mật khẩu phải có ít nhất 8 ký tự.';
  }
  if (lower.includes('invalid email') || lower.includes('email format')) {
    return 'Địa chỉ email không đúng định dạng.';
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Bạn đã thực hiện quá nhiều lần thử. Vui lòng đợi trong giây lát.';
  }
  return `Đăng ký không thành công: ${message}`;
}

export default function RegisterForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation in Vietnamese
    if (!displayName.trim()) {
      setError('Vui lòng nhập tên hiển thị.');
      nameInputRef.current?.focus();
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailPattern.test(email.trim())) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.');
      emailInputRef.current?.focus();
      return;
    }

    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      passwordInputRef.current?.focus();
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: displayName.trim() } },
    });
    setLoading(false);

    if (signUpError) {
      setError(translateAuthError(signUpError.message));
      passwordInputRef.current?.focus();
      return;
    }

    router.push('/onboarding');
    router.refresh();
  }

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (oauthError) {
      setError(translateAuthError(oauthError.message));
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="register-display-name" className="label">
            Tên hiển thị
          </label>
          <input
            id="register-display-name"
            ref={nameInputRef}
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ví dụ: Hoàng"
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="register-email" className="label">
            Email
          </label>
          <input
            id="register-email"
            ref={emailInputRef}
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="operator@gymai.app"
          />
        </div>
        <div>
          <label htmlFor="register-password" className="label">
            Mật khẩu (tối thiểu 8 ký tự)
          </label>
          <input
            id="register-password"
            ref={passwordInputRef}
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
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

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
          aria-label="Tạo tài khoản GymAI Coach"
        >
          {loading ? 'Đang khởi tạo…' : 'Tạo tài khoản'}
        </button>
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
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading}
          className="btn-ghost w-full flex items-center justify-center gap-2"
          aria-label="Tiếp tục đăng ký bằng tài khoản Google"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Tiếp tục với Google</span>
        </button>
      </div>

      <p className="text-sm text-center text-ink-secondary font-medium">
        Đã có tài khoản?{' '}
        <Link href="/auth/login" className="text-accent hover:underline font-semibold">
          Đăng nhập ngay
        </Link>
      </p>
    </div>
  );
}
