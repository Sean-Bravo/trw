# Stripe Setup Guide

This guide walks you through setting up Stripe products and prices for TaxFormatter subscriptions.

## Prerequisites

1. A Stripe account (create one at [stripe.com](https://stripe.com))
2. Access to the [Stripe Dashboard](https://dashboard.stripe.com)

## Step 1: Create Products

Go to **Products** in your Stripe Dashboard and create two products:

### Product 1: Pro Plan

1. Click **Add Product**
2. Fill in:
   - **Name**: `Pro Plan` (or `TaxFormatter Pro`)
   - **Description**: `Unlimited CSV uploads, full export, priority parsing`
3. Click **Save product**

### Product 2: Premium Plan

1. Click **Add Product**
2. Fill in:
   - **Name**: `Premium Plan` (or `TaxFormatter Premium`)
   - **Description**: `Everything in Pro plus AI reports, audit-ready notes`
3. Click **Save product**

## Step 2: Create Prices

For each product, create both monthly and annual prices:

### Pro Plan Prices

1. Open the Pro Plan product
2. Click **Add price**
3. **Monthly Price**:
   - Pricing model: `Standard pricing`
   - Price: `$9.00`
   - Billing period: `Monthly`
   - Click **Save price**
   - Copy the Price ID (starts with `price_`)

4. Click **Add another price**
5. **Annual Price**:
   - Pricing model: `Standard pricing`
   - Price: `$89.00`
   - Billing period: `One time` (for annual pass)
   - Click **Save price**
   - Copy the Price ID

### Premium Plan Prices

1. Open the Premium Plan product
2. Click **Add price**
3. **Monthly Price**:
   - Price: `$19.00`
   - Billing period: `Monthly`
   - Copy the Price ID

4. **Annual Price**:
   - Price: `$189.00`
   - Billing period: `One time`
   - Copy the Price ID

## Step 3: Configure Environment Variables

Add the Price IDs to your `.env.local` file:

```bash
# Pro Plan
STRIPE_PRICE_PRO_MONTHLY=price_1ABC...    # $9/month recurring
STRIPE_PRICE_PRO_ANNUAL=price_1DEF...     # $89 one-time

# Premium Plan
STRIPE_PRICE_PREMIUM_MONTHLY=price_1GHI...  # $19/month recurring
STRIPE_PRICE_PREMIUM_ANNUAL=price_1JKL...   # $189 one-time
```

## Step 4: Set Up Webhooks

1. Go to **Developers** > **Webhooks**
2. Click **Add endpoint**
3. Enter your endpoint URL:
   - Development: `https://your-ngrok-url.ngrok.io/api/webhooks/stripe`
   - Production: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to your `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Step 5: Get API Keys

1. Go to **Developers** > **API keys**
2. Copy your keys:

```bash
# Test mode (for development)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Live mode (for production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

## Pricing Summary

| Plan    | Monthly | Annual | Savings |
|---------|---------|--------|---------|
| Pro     | $9/mo   | $89/yr | 17%     |
| Premium | $19/mo  | $189/yr| 17%     |

## Testing

### Test Cards

Use these test card numbers in test mode:

| Scenario | Card Number |
|----------|-------------|
| Success | `4242 4242 4242 4242` |
| Decline | `4000 0000 0000 0002` |
| 3D Secure | `4000 0027 6000 3184` |

### Testing Webhooks Locally

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. Copy the webhook secret it provides

## Checkout Flow

The checkout API (`/api/checkout`) accepts:

```json
{
  "plan": "pro",       // "pro" or "premium"
  "billing": "annual"  // "monthly" or "annual"
}
```

- Monthly billing creates a **subscription** (recurring)
- Annual billing creates a **one-time payment**

## Customer Portal

To allow customers to manage their subscriptions:

1. Go to **Settings** > **Billing** > **Customer portal**
2. Configure what customers can do:
   - Update payment method
   - Cancel subscription
   - View invoice history
3. Add portal link to your dashboard (future feature)

## Going Live Checklist

- [ ] Create products in **Live mode**
- [ ] Update environment variables with live keys
- [ ] Set up webhook endpoint for production URL
- [ ] Test full purchase flow with real card
- [ ] Verify webhook events are received
- [ ] Set up tax collection if required
