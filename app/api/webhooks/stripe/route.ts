import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_API_PRICES, type StripeApiPlan } from '@/lib/stripe'
import Stripe from 'stripe'
import { queryOne, execute } from '@/lib/db'
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

  // M-1: Persistent webhook idempotency.
  //
  // The previous Set<string> evaporated on cold start and didn't share
  // across concurrent warm instances, allowing Stripe retries to
  // double-apply tier upgrades and duplicate billing events.
  //
  // INSERT ... ON CONFLICT DO NOTHING gives atomic check-and-set: only
  // one concurrent handler wins; the loser short-circuits with
  // duplicate=true. SECURITY_AUDIT.md §M-1
  try {
    const claim = await execute(
      `INSERT INTO processed_webhook_events (id, event_type)
       VALUES ($1, $2)
       ON CONFLICT (id) DO NOTHING`,
      [event.id, event.type]
    )
    if (claim.rowCount === 0) {
      return NextResponse.json({ received: true, duplicate: true })
    }
  } catch (err) {
    // If the idempotency insert fails, it's safer to return 500 so
    // Stripe retries than to process the event without a duplicate
    // guard. Returning 200 here would silently process duplicates.
    console.error('[webhook] idempotency insert failed:', err)
    return NextResponse.json(
      { error: 'Idempotency store unavailable' },
      { status: 500 }
    )
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const apiTier = session.metadata?.['api_tier'] as ApiTier | undefined
        const apiKeyId = session.metadata?.['api_key_id'] as string | undefined
        const subscriptionId = session.subscription as string | undefined
        const customerId = session.customer as string | undefined

        console.log('Payment successful:', {
          customer: session.customer_email,
          apiTier,
          amount: session.amount_total,
        })

        // Persist stripe_customer_id to users table
        if (customerId && session.customer_email) {
          await execute(
            `UPDATE users SET stripe_customer_id = $1 WHERE email = $2 AND stripe_customer_id IS NULL`,
            [customerId, session.customer_email]
          )
        }

        // Defensive guard (Phase 3): 'free' should never appear in checkout
        // metadata — it's not a Stripe-billable tier. If it ever does, log
        // and skip rather than letting the M-3 verification crash on a
        // missing price ID lookup.
        if (apiTier === 'free') {
          console.warn('[webhook] checkout.session.completed with apiTier=free — skipping; free is not a Stripe tier', {
            apiKeyId,
            subscriptionId,
          })
          break
        }

        // Handle API tier subscription
        if (apiTier && apiKeyId && subscriptionId) {
          const tierConfig = API_TIERS[apiTier]
          if (tierConfig) {
            // M-3: cross-verify the claimed tier against the actual
            // subscription's price ID. The metadata is set by our own
            // code at checkout time so it's not attacker-controlled
            // today, but defense-in-depth — if H-1's ownership check
            // is ever bypassed, this stops the attacker from claiming
            // BUSINESS while paying for STARTER.
            // SECURITY_AUDIT.md §M-3
            const tierUpper = apiTier.toUpperCase() as StripeApiPlan
            const expectedPriceId = STRIPE_API_PRICES[tierUpper]?.monthly
            let priceMatches = false
            try {
              const sub = await stripe.subscriptions.retrieve(subscriptionId)
              const actualPriceIds = sub.items.data.map((i) => i.price.id)
              priceMatches = expectedPriceId
                ? actualPriceIds.includes(expectedPriceId)
                : false
              if (!priceMatches) {
                console.error('[webhook] tier/price mismatch', {
                  apiTier,
                  expectedPriceId,
                  actualPriceIds,
                  apiKeyId,
                })
              }
              // Also re-verify api_key ownership matches the userId in
              // metadata as belt-and-suspenders behind H-1.
              const metaUserId = session.metadata?.['userId'] as string | undefined
              if (metaUserId) {
                const ownerCheck = await queryOne<{ user_id: string }>(
                  'SELECT user_id FROM api_keys WHERE id = $1',
                  [apiKeyId]
                )
                if (ownerCheck && ownerCheck.user_id !== metaUserId) {
                  console.error('[webhook] api_key ownership mismatch', {
                    apiKeyId,
                    metaUserId,
                    actualOwner: ownerCheck.user_id,
                  })
                  priceMatches = false
                }
              }
            } catch (verifyErr) {
              console.error('[webhook] subscription verification failed:', verifyErr)
            }

            if (priceMatches) {
              await execute(
                `UPDATE api_keys
                 SET tier = $1, monthly_quota = $2, rate_limit_rpm = $3, stripe_subscription_id = $4
                 WHERE id = $5`,
                [apiTier, tierConfig.monthly_quota, tierConfig.rate_limit_rpm, subscriptionId, apiKeyId]
              )
              console.log(`[Stripe] Updated API key ${apiKeyId} to tier ${apiTier}`)
            } else {
              console.error(`[webhook] refusing tier upgrade for ${apiKeyId} due to verification failure`)
            }
          }
        }

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        // Update API key tier status if this is an API subscription
        const updatedKey = await queryOne<{ id: string }>(
          `SELECT id FROM api_keys WHERE stripe_subscription_id = $1`,
          [subscription.id]
        )
        if (updatedKey) {
          const isPastDue = subscription.status === 'past_due' || subscription.status === 'unpaid'
          if (isPastDue) {
            console.log(`[Stripe] API key ${updatedKey.id} subscription past due: ${subscription.status}`)
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Downgrade API key to free tier (D4). Pre-existing free key for the
        // same user is deactivated first to avoid colliding with the partial
        // unique index from migration 013 (D6). Paid history > free history,
        // so the canceled paid key "wins" and keeps the user's history.
        const apiKey = await queryOne<{ id: string; user_id: string }>(
          `SELECT id, user_id FROM api_keys WHERE stripe_subscription_id = $1`,
          [subscription.id]
        )
        if (apiKey) {
          const deactivateResult = await execute(
            `UPDATE api_keys
             SET is_active = false,
                 deactivated_reason = $3,
                 deactivated_at = NOW()
             WHERE user_id = $1
               AND tier = 'free'
               AND is_active = true
               AND id != $2`,
            [apiKey.user_id, apiKey.id, `downgraded_replaced_by:${apiKey.id}`]
          )
          if (deactivateResult.rowCount > 0) {
            console.log('[Stripe] Deactivated pre-existing free key on paid downgrade', {
              user_id: apiKey.user_id,
              replaced_by_key_id: apiKey.id,
              deactivated_count: deactivateResult.rowCount,
            })
          }

          const freeTier = API_TIERS['free']
          await execute(
            `UPDATE api_keys
             SET tier = 'free', monthly_quota = $1, rate_limit_rpm = $2, stripe_subscription_id = NULL
             WHERE id = $3`,
            [freeTier.monthly_quota, freeTier.rate_limit_rpm, apiKey.id]
          )
          console.log(`[Stripe] API key ${apiKey.id} downgraded to free tier`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = (invoice as any).subscription as string | undefined
        if (subscriptionId) {
          const apiKey = await queryOne<{ id: string }>(
            `SELECT id FROM api_keys WHERE stripe_subscription_id = $1`,
            [subscriptionId]
          )
          if (apiKey) {
            await execute(
              `UPDATE api_keys SET is_active = false WHERE id = $1`,
              [apiKey.id]
            )
            console.log(`[Stripe] API key ${apiKey.id} disabled — payment failed`)
          }
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = (invoice as any).subscription as string | undefined
        if (subscriptionId) {
          const apiKey = await queryOne<{ id: string }>(
            `SELECT id FROM api_keys WHERE stripe_subscription_id = $1`,
            [subscriptionId]
          )
          if (apiKey) {
            await execute(
              `UPDATE api_keys SET is_active = true WHERE id = $1`,
              [apiKey.id]
            )
            console.log(`[Stripe] API key ${apiKey.id} re-enabled — payment succeeded`)
          }
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
