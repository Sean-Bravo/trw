import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'
import { updateSubscription, findUserByStripeCustomerId, findUserByEmailWithSubscription } from '@/lib/auth-db'
import { queryOne, execute } from '@/lib/db'
import { sendSubscriptionEmail } from '@/lib/email'
import { API_TIERS, type ApiTier } from '@/lib/api-keys'

// Disable body parsing for webhooks
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature found' },
      { status: 400 }
    )
  }

  if (!process.env['STRIPE_WEBHOOK_SECRET']) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env['STRIPE_WEBHOOK_SECRET']
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    )
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const plan = session.metadata?.['plan'] as 'pro' | 'premium' | undefined
        const apiTier = session.metadata?.['api_tier'] as ApiTier | undefined
        const apiKeyId = session.metadata?.['api_key_id'] as string | undefined
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string | undefined

        console.log('Payment successful:', {
          customer: session.customer_email,
          plan,
          apiTier,
          amount: session.amount_total,
        })

        // Handle API tier subscription
        if (apiTier && apiKeyId && subscriptionId) {
          const tierConfig = API_TIERS[apiTier]
          if (tierConfig) {
            await execute(
              `UPDATE api_keys
               SET tier = $1, monthly_quota = $2, rate_limit_rpm = $3, stripe_subscription_id = $4
               WHERE id = $5`,
              [apiTier, tierConfig.monthly_quota, tierConfig.rate_limit_rpm, subscriptionId, apiKeyId]
            )
            console.log(`[Stripe] Updated API key ${apiKeyId} to tier ${apiTier}`)
          }
          break
        }

        // Handle consumer subscription
        // Find user by email or stripe customer ID
        let user = await findUserByStripeCustomerId(customerId)
        if (!user && session.customer_email) {
          user = await findUserByEmailWithSubscription(session.customer_email)
        }

        if (user && plan) {
          // Get subscription end date from Stripe
          let periodEnd: Date | undefined
          if (subscriptionId) {
            const stripeSub = await stripe.subscriptions.retrieve(subscriptionId, {
              expand: ['items.data']
            })
            const firstItem = stripeSub.items?.data?.[0]
            if (firstItem?.current_period_end) {
              periodEnd = new Date(firstItem.current_period_end * 1000)
            }
          }

          await updateSubscription(
            user.id,
            plan,
            'active',
            customerId,
            subscriptionId,
            periodEnd
          )
          console.log(`[Stripe] Updated subscription for user ${user.id} to ${plan}`)

          // Send subscription confirmation email
          if (session.customer_email) {
            await sendSubscriptionEmail(session.customer_email, plan)
          }
        }

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const user = await findUserByStripeCustomerId(customerId)
        if (user) {
          // Map Stripe status to our status
          const statusMap: Record<string, 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused'> = {
            'active': 'active',
            'trialing': 'trialing',
            'past_due': 'past_due',
            'canceled': 'canceled',
            'unpaid': 'past_due',
            'paused': 'paused',
          }
          const status = statusMap[subscription.status] || 'active'
          // Get period end from subscription items
          const firstItem = subscription.items?.data?.[0]
          const periodEnd = firstItem?.current_period_end
            ? new Date(firstItem.current_period_end * 1000)
            : undefined

          // Get current tier from our DB
          const currentSub = await queryOne<{ tier: string }>(
            `SELECT tier FROM subscriptions WHERE user_id = $1`,
            [user.id]
          )

          await updateSubscription(
            user.id,
            (currentSub?.tier as 'pro' | 'premium') || 'pro',
            status,
            customerId,
            subscription.id,
            periodEnd
          )
          console.log(`[Stripe] Subscription updated for user ${user.id}: ${status}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Check if this is an API tier subscription
        const apiKey = await queryOne<{ id: string }>(
          `SELECT id FROM api_keys WHERE stripe_subscription_id = $1`,
          [subscription.id]
        )
        if (apiKey) {
          const freeTier = API_TIERS['free']
          await execute(
            `UPDATE api_keys
             SET tier = 'free', monthly_quota = $1, rate_limit_rpm = $2, stripe_subscription_id = NULL
             WHERE id = $3`,
            [freeTier.monthly_quota, freeTier.rate_limit_rpm, apiKey.id]
          )
          console.log(`[Stripe] API key ${apiKey.id} downgraded to free tier`)
          break
        }

        // Consumer subscription cancellation
        const user = await findUserByStripeCustomerId(customerId)
        if (user) {
          await updateSubscription(
            user.id,
            'free',
            'canceled',
            customerId,
            undefined,
            undefined
          )
          console.log(`[Stripe] Subscription canceled for user ${user.id}`)
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('PaymentIntent was successful:', paymentIntent.id)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.error('Payment failed:', paymentIntent.id)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    console.error('Error handling webhook:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
