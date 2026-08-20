'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function RegisterForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (password.length < 8) { setError('Mật khẩu phải có ít nhất 8 ký tự'); setLoading(false); return; }
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: displayName } },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push('/onboarding');
    router.refresh();
  }

  async function signInWithGoogle() {
    setLoading(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="label">Tên hiển thị</label>
        <input
          className="input"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Ví dụ: Hoàng"
        />
      </div>
      <div>
        <label className="label">Email</label>
        <input
          className="input"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="operator@gymai.app"
        />
      </div>
      <div>
        <label className="label">Mật khẩu (tối thiểu 8 ký tự)</label>
        <input
          className="input"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="bg-chassis shadow-inset-sm rounded-md px-4 py-3">
          <p className="font-mono text-xs text-danger">
            <span className="font-bold uppercase tracking-wider mr-1">ERR:</span>
            {error}
          </p>
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Đang khởi tạo…' : 'Tạo tài khoản'}
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-chassis-lo" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-chassis px-3 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            Hoặc kết nối
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading}
        className="btn-ghost w-full"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Tiếp tục với Google
      </button>

      <p className="text-sm text-center text-ink-secondary font-medium">
        Đã có tài khoản?{' '}
        <Link href="/auth/login" className="text-accent hover:underline font-semibold">
          Đăng nhập ngay
        </Link>
      </p>
    </form>
  );
}
