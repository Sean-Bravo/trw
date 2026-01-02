import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'
import { updateSubscription, findUserByStripeCustomerId, findUserByEmailWithSubscription } from '@/lib/auth-db'
import { queryOne } from '@/lib/db'

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
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string | undefined

        console.log('Payment successful:', {
          customer: session.customer_email,
          plan,
          amount: session.amount_total,
        })

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
