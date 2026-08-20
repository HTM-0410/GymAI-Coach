import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const Body = z.object({
  tier: z.enum(['pro', 'elite']),
});

// Demo endpoint — would normally hit Stripe checkout session API
// Stripe keys: STRIPE_SECRET_KEY, STRIPE_PRICE_PRO, STRIPE_PRICE_ELITE

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = Body.parse(await req.json());

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    // Demo mode — directly upgrade
    await supabase.from('profiles').update({
      subscription_tier: body.tier,
      subscription_renews_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
    }).eq('user_id', user.id);
    return NextResponse.json({ demo: true, tier: body.tier });
  }

  // Real Stripe checkout session
  try {
    const priceId = body.tier === 'pro'
      ? process.env.STRIPE_PRICE_PRO
      : process.env.STRIPE_PRICE_ELITE;

    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('line_items[0][price]', priceId!);
    params.append('line_items[0][quantity]', '1');
    params.append('success_url', `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/billing?success=1`);
    params.append('cancel_url', `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/billing?canceled=1`);
    params.append('client_reference_id', user.id);

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${stripeKey}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: 'stripe_failed', detail: data.error?.message }, { status: 500 });
    return NextResponse.json({ url: data.url });
  } catch (e: any) {
    return NextResponse.json({ error: 'failed', detail: String(e?.message ?? e) }, { status: 500 });
  }
}