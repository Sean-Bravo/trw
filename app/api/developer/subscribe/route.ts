import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { stripe, STRIPE_API_PRICES, type StripeApiPlan } from '@/lib/stripe';

/**
 * POST /api/developer/subscribe
 * Create a Stripe Checkout session for an API tier upgrade.
 * Body: { tier: "starter" | "growth" | "business", apiKeyId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const tier = body.tier?.toUpperCase() as StripeApiPlan | undefined;
    const apiKeyId = body.apiKeyId as string | undefined;

    if (!tier || !STRIPE_API_PRICES[tier]) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be one of: starter, growth, business' },
        { status: 400 },
      );
    }

    if (!apiKeyId) {
      return NextResponse.json(
        { error: 'apiKeyId is required' },
        { status: 400 },
      );
    }

    const priceId = STRIPE_API_PRICES[tier].monthly;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: session.user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000'}/dashboard/developer?upgraded=true`,
      cancel_url: `${process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000'}/dashboard/developer`,
      metadata: {
        api_tier: tier.toLowerCase(),
        api_key_id: apiKeyId,
        userId: session.user.id,
      },
      subscription_data: {
        metadata: {
          api_tier: tier.toLowerCase(),
          api_key_id: apiKeyId,
        },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('[Developer Subscribe] Error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
