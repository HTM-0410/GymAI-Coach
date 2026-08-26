import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isOnboardingComplete, resolveAuthNextDestination } from '@/lib/onboarding';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const providerError = req.nextUrl.searchParams.get('error');
  const errorDescription = req.nextUrl.searchParams.get('error_description');

  if (!code || providerError) {
    const errorParam = providerError || 'provider';
    return NextResponse.redirect(
      new URL(
        `/auth/login?oauth_error=${encodeURIComponent(errorParam)}${errorDescription ? `&desc=${encodeURIComponent(errorDescription)}` : ''}`,
        req.url,
      ),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/login?oauth_error=exchange&desc=${encodeURIComponent(error.message)}`, req.url),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login?oauth_error=no_user', req.url));
  }

  let { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_step, experience_level, goal, preferred_training_days, preferred_session_duration')
    .eq('user_id', user.id)
    .maybeSingle();

  // Ensure profile row exists for first-time Google OAuth logins
  if (!profile) {
    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.user_metadata?.display_name ||
      user.email?.split('@')[0] ||
      'Học viên Google';

    await supabase.from('profiles').upsert(
      {
        user_id: user.id,
        display_name: displayName,
        unit_system: 'metric',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    const { data: refetched } = await supabase
      .from('profiles')
      .select('onboarding_step, experience_level, goal, preferred_training_days, preferred_session_duration')
      .eq('user_id', user.id)
      .maybeSingle();
    profile = refetched;
  }

  const isComplete = isOnboardingComplete(profile);
  const rawNext = req.nextUrl.searchParams.get('next');
  const destination = resolveAuthNextDestination({ isComplete, rawNext });

  return NextResponse.redirect(new URL(destination, req.url));
}
