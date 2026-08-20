'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    })();
  }, [router]);
  return <main className="min-h-screen bg-chassis flex items-center justify-center">
    <div className="text-center">
      <span className="h-4 w-4 rounded-full bg-accent shadow-[0_0_8px_rgba(249,115,22,0.7)] led-pulse mx-auto mb-3 block" />
      <p className="font-mono text-sm text-ink-secondary uppercase tracking-wider">Đang đăng xuất…</p>
    </div>
  </main>;
}