# Stripe Integration — API-Only Billing

TaxFormatter uses Stripe for API tier subscriptions. Consumer tiers (Pro/Premium) were removed — all upload features are free. Billing is only for API access.

---

## API Tiers

| Tier | Price | Monthly Quota | Rate Limit |
|------|-------|---------------|------------|
| Starter | $29/mo | 100 files | 30 rpm |
| Growth | $99/mo | 500 files | 60 rpm |
| Business | $249/mo | 2,000 files | 120 rpm |

Products are created in [Stripe Dashboard > Products](https://dashboard.stripe.com/products).

---

## Environment Variables

Set these in Vercel (or `.env.local` for dev):

```bash
STRIPE_SECRET_KEY=sk_live_...              # Stripe API secret key
STRIPE_PUBLISHABLE_KEY=pk_live_...         # Stripe publishable key
STRIPE_WEBHOOK_SECRET=whsec_...            # Webhook signing secret

# Price IDs from Stripe Dashboard (one per product)
STRIPE_API_PRICE_STARTER=price_...
STRIPE_API_PRICE_GROWTH=price_...
STRIPE_API_PRICE_BUSINESS=price_...
```

The app will throw at checkout time if any price ID env var is missing (no silent fallbacks).

Use `validateStripeConfig()` from `lib/stripe.ts` to check all vars at once.

---

## Webhook Endpoint

**URL:** `https://taxformatter.com/api/webhooks/stripe`

### Events (7 total)

| Event | What it does |
|-------|-------------|
| `checkout.session.completed` | Upgrades API key tier, persists `stripe_customer_id` |
| `customer.subscription.updated` | Logs past-due status |
| `customer.subscription.deleted` | Downgrades API key to starter |
| `invoice.payment_failed` | Disables API key (`is_active = false`) |
| `invoice.payment_succeeded` | Re-enables API key (`is_active = true`) |
| `payment_intent.succeeded` | Logged |
| `payment_intent.payment_failed` | Logged |

### Webhook hardening

- **Event idempotency:** Duplicate `event.id`s are skipped (in-memory set, capped at 10k)
- **Checkout idempotency:** `idempotencyKey` on checkout session creation prevents double-charges

---

## Checkout Flow

1. User creates API key at `/dashboard/developer`
2. Clicks upgrade → `POST /api/developer/subscribe` with `{ tier, apiKeyId }`
3. Stripe Checkout session created → user redirected to Stripe
4. After payment → redirected to `/dashboard/developer?upgraded=true`
5. Webhook fires `checkout.session.completed` → API key tier updated in DB

---

## Customer Portal

`POST /api/customer-portal` creates a Stripe Billing Portal session.

Looks up `stripe_customer_id` from the `users` table. Falls back to creating a new Stripe customer and persisting the ID.

Activate the portal at: https://dashboard.stripe.com/settings/billing/portal

---

## Local Development

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local dev server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Use the `whsec_...` output as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

---

## Test Cards

| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Declined |
| 4000 0025 0000 3155 | Requires authentication |

```bash
# Trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
stripe trigger invoice.payment_succeeded
```

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/stripe.ts` | Stripe client, price IDs, `validateStripeConfig()` |
| `app/api/developer/subscribe/route.ts` | Creates checkout sessions |
| `app/api/webhooks/stripe/route.ts` | Processes webhook events |
| `app/api/customer-portal/route.ts` | Billing portal sessions |
| `components/dashboard/ApiKeyManager.tsx` | UI for keys + upgrade flow |
| `db/migrations/007_add_stripe_customer_id.sql` | `stripe_customer_id` column |
