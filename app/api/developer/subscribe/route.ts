import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { stripe, STRIPE_API_PRICES, type StripeApiPlan } from '@/lib/stripe';
import { queryOne } from '@/lib/db';
import { createApiKey } from '@/lib/api-keys';

/**
 * POST /api/developer/subscribe
 * Create a Stripe Checkout session for an API tier upgrade.
 * Body: { tier: "starter" | "growth" | "business", apiKeyId?: string }
 * When apiKeyId is omitted, the user's existing active free key is upgraded
 * (or one is created if they have none).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const tier = body.tier?.toUpperCase() as StripeApiPlan | undefined;
    let apiKeyId = body.apiKeyId as string | undefined;

    if (!tier || !STRIPE_API_PRICES[tier]) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be one of: starter, growth, business' },
        { status: 400 },
      );
    }

    // The pricing-page auto-subscribe flow omits apiKeyId. Every verified
    // user already holds an auto-provisioned free key (D3) and the one-free-
    // key cap (D2) rejects creating another, so resolve the key server-side:
    // upgrade the existing free key, and only create one if none exists.
    if (!apiKeyId) {
      const freeKey = await queryOne<{ id: string }>(
        `SELECT id FROM api_keys
         WHERE user_id = $1 AND tier = 'free' AND is_active = true
         ORDER BY created_at ASC
         LIMIT 1`,
        [session.user.id],
      );
      if (freeKey) {
        apiKeyId = freeKey.id;
      } else {
        const created = await createApiKey(session.user.id, 'My API Key', 'free');
        apiKeyId = created.id;
      }
    }

    // H-1: verify the API key belongs to the authenticated user before
    // letting Stripe checkout reference it. Without this, an attacker could
    // POST a victim's apiKeyId and trigger an upgrade on someone else's key.
    const apiKey = await queryOne<{ user_id: string }>(
      'SELECT user_id FROM api_keys WHERE id = $1',
      [apiKeyId],
    );
    if (!apiKey || apiKey.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const priceId = STRIPE_API_PRICES[tier].monthly;

    const idempotencyKey = `checkout_${session.user.id}_${apiKeyId}_${tier.toLowerCase()}`

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
    }, {
      idempotencyKey,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('[Developer Subscribe] Error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
