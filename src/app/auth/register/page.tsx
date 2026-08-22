import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import RegisterForm from './register-form';

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/onboarding');
  return (
    <main className="min-h-screen bg-chassis flex items-center justify-center px-4 py-12 blueprint-grid">
      <div className="w-full max-w-md">
        {/* Industrial panel wrapper */}
        <div className="card shadow-neumorph-lg rounded-2xl p-8">
          {/* Status header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-chassis-lo">
            <span className="h-3 w-3 rounded-full bg-accent shadow-[0_0_8px_rgba(249,115,22,0.7)] led-pulse flex-shrink-0" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted leading-none">GymAI Coach</p>
              <h1 className="font-mono text-sm font-bold uppercase tracking-widest text-ink mt-0.5">Tạo tài khoản mới</h1>
            </div>
          </div>
          <RegisterForm />
        </div>
        {/* Footer */}
        <p className="text-center font-mono text-[10px] text-ink-muted mt-4 uppercase tracking-wider">
          Miễn phí - Không cam kết - Khởi đầu ngay
        </p>
      </div>
    </main>
  );
}
