import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_PRICES, getPriceId, StripePlan, BillingPeriod } from '@/lib/stripe'
import { getServerSession } from 'next-auth'
import { captureException, setContext } from '@/lib/sentry'
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limit: 100 requests per minute (general API limit)
  const identifier = getClientIdentifier(request)
  const rateLimit = await rateLimiters.api.check(identifier)
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  let plan: string | undefined
  let billing: string | undefined
  let session: any

  try {
    session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'You must be signed in to purchase' },
        { status: 401 }
      )
    }

    const body = await request.json()
    plan = body.plan?.toUpperCase()
    billing = body.billing || 'annual'

    // Validate plan
    if (!plan || !STRIPE_PRICES[plan as StripePlan]) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      )
    }

    // Validate billing period
    if (billing !== 'monthly' && billing !== 'annual') {
      return NextResponse.json(
        { error: 'Invalid billing period' },
        { status: 400 }
      )
    }

    const priceId = getPriceId(plan as StripePlan, billing as BillingPeriod)

    // Determine checkout mode based on billing period
    // Monthly = recurring subscription, Annual = one-time payment
    const isSubscription = billing === 'monthly'

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      customer_email: session.user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000'}/#pricing`,
      metadata: {
        userId: session.user.email,
        plan: plan.toLowerCase(),
        billing: billing,
      },
      allow_promotion_codes: true,
      // For subscriptions, allow customer portal management
      ...(isSubscription && {
        subscription_data: {
          metadata: {
            plan: plan.toLowerCase(),
          },
        },
      }),
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error: any) {
    console.error('Checkout error:', error)

    // Send error to Sentry with context
    setContext('checkout', {
      plan,
      billing,
      userEmail: session?.user?.email,
    })
    captureException(error)

    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
