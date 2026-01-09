# Stripe Integration Setup Guide

## ✅ What's Already Done

Your Stripe integration is **fully implemented** with the following features:

- ✅ **Stripe SDK installed** (`stripe` and `@stripe/stripe-js`)
- ✅ **Checkout API** (`/api/checkout`) - Creates payment sessions
- ✅ **Webhook Handler** (`/api/webhooks/stripe`) - Processes payment events
- ✅ **Customer Portal** (`/api/customer-portal`) - Allows users to manage purchases
- ✅ **Success Page** (`/success`) - Post-payment confirmation
- ✅ **TypeScript types** - Fully typed Stripe integration
- ✅ **Environment variables** - Configured in `.env.example`

---

## 📋 Setup Checklist

### Step 1: Get Your Stripe Keys

1. Go to your Stripe Dashboard: https://dashboard.stripe.com/apikeys
2. Copy your keys:
   - **Publishable key**: `pk_test_...` (for test mode) or `pk_live_...` (for production)
   - **Secret key**: `sk_test_...` (for test mode) or `sk_live_...` (for production)

### Step 2: Create Products in Stripe

1. Go to: https://dashboard.stripe.com/products
2. Click "**Add product**"

#### Create Pro Plan:
- **Name**: TaxFormatter Pro
- **Description**: Tax-compliant corrected CSV with cost basis adjustments
- **Pricing**: One-time payment
- **Price**: $89 USD
- Click "**Save product**"
- **Copy the Price ID** (starts with `price_...`)

#### Create Premium Plan:
- **Name**: TaxFormatter Premium
- **Description**: Audit-ready documentation and full AI explanations
- **Pricing**: One-time payment
- **Price**: $189 USD
- Click "**Save product**"
- **Copy the Price ID** (starts with `price_...`)

### Step 3: Configure Environment Variables

Create or update `/Users/sean/Desktop/trw/.env.local`:

```bash
# Stripe API Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...  # From Step 1
STRIPE_SECRET_KEY=sk_test_51...                    # From Step 1

# Stripe Price IDs (from Step 2)
STRIPE_PRICE_ID_PRO=price_1...                     # Pro plan price ID
STRIPE_PRICE_ID_PREMIUM=price_1...                 # Premium plan price ID

# Webhook Secret (will get this in Step 4)
STRIPE_WEBHOOK_SECRET=whsec_...

# App URL
NEXT_PUBLIC_APP_URL=https://taxformatter.com  # Or http://localhost:3000 for dev
```

### Step 4: Set Up Webhooks

#### For Local Development:

```bash
# Install Stripe CLI (if not already installed)
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This will output a webhook signing secret like `whsec_...`. Add it to your `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### For Production:

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "**Add endpoint**"
3. Enter endpoint URL: `https://taxformatter.com/api/webhooks/stripe`
4. Select events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
5. Click "**Add endpoint**"
6. Copy the "**Signing secret**" (starts with `whsec_`)
7. Add to your production environment variables

### Step 5: Test the Integration

```bash
# Start your dev server
npm run dev

# In another terminal, start webhook forwarding
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Visit your pricing page
open http://localhost:3000#pricing
```

#### Test a Payment:

1. Click "Download Fixed CSV" or "Get Audit-Ready Output" button
2. You'll be redirected to Stripe Checkout
3. Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
4. Complete the payment
5. You should be redirected to `/success`
6. Check your webhook terminal for the `checkout.session.completed` event

### Step 6: Enable Customer Portal (Optional but Recommended)

The Customer Portal allows users to view receipts and manage their purchases.

1. Go to: https://dashboard.stripe.com/settings/billing/portal
2. Click "**Activate**"
3. Configure settings:
   - Allow customers to view their invoice history: ✅
   - Allow customers to update payment methods: ❌ (one-time payments)
4. Click "**Save changes**"

---

## 🔧 How to Use in Your Code

### Trigger Checkout from Pricing Component:

```typescript
'use client'

import { useCheckout } from '@/hooks/useCheckout'

function PricingCard() {
  const { checkout, loading, error } = useCheckout()

  return (
    <button
      onClick={() => checkout('PRO')} // or 'PREMIUM'
      disabled={loading}
    >
      {loading ? 'Processing...' : 'Purchase Pro'}
    </button>
  )
}
```

### Access Customer Portal:

```typescript
const handleManageBilling = async () => {
  const response = await fetch('/api/customer-portal', {
    method: 'POST',
  })
  const data = await response.json()
  window.location.href = data.url
}
```

---

## 🗄️ Database Integration (TODO)

You should update your database when payments succeed. In `/app/api/webhooks/stripe/route.ts`:

```typescript
case 'checkout.session.completed': {
  const session = event.data.object as Stripe.Checkout.Session

  // Update your database
  await prisma.user.update({
    where: { email: session.customer_email },
    data: {
      plan: session.metadata?.plan,
      paidAt: new Date(),
      stripeCustomerId: session.customer as string,
      stripePaymentId: session.payment_intent as string,
    }
  })

  // Send confirmation email
  await sendEmail({
    to: session.customer_email,
    subject: 'Payment Received - TaxFormatter',
    template: 'payment-success',
  })

  break
}
```

### Recommended Database Schema:

Add to your User model:

```prisma
model User {
  id                 String   @id @default(cuid())
  email              String   @unique

  // Stripe fields
  stripeCustomerId   String?  @unique
  stripePaymentId    String?
  plan               String?  // "PRO" or "PREMIUM"
  paidAt             DateTime?
  taxYear            Int?     // Track which tax year they paid for
}
```

---

## 🧪 Testing

### Test Cards:

| Card Number         | Result                    |
|---------------------|---------------------------|
| 4242424242424242    | Success                   |
| 4000000000000002    | Card declined             |
| 4000002500003155    | Requires authentication   |

### Testing Webhooks Locally:

```bash
# Terminal 1: Run your dev server
npm run dev

# Terminal 2: Forward webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 3: Trigger test events
stripe trigger checkout.session.completed
stripe trigger payment_intent.succeeded
```

---

## 🚀 Going Live

Before launching to production:

1. ✅ Switch to **Live mode** in Stripe Dashboard
2. ✅ Get live API keys (`pk_live_...` and `sk_live_...`)
3. ✅ Update environment variables in production
4. ✅ Set up production webhooks (Step 4)
5. ✅ Test with real card (use small amount first)
6. ✅ Verify webhook events are being received
7. ✅ Test the full flow: checkout → payment → success → database update

---

## 📞 Support

- **Stripe Docs**: https://stripe.com/docs
- **Stripe Test Cards**: https://stripe.com/docs/testing
- **Webhook Events**: https://stripe.com/docs/api/events/types

---

## ✅ Verification Checklist

Before going live, verify:

- [ ] Stripe publishable key is set
- [ ] Stripe secret key is set
- [ ] Price IDs for Pro and Premium plans are configured
- [ ] Webhook secret is configured
- [ ] Webhook endpoint is accessible from internet
- [ ] Success page displays correctly
- [ ] Database is updated when payment succeeds
- [ ] Confirmation emails are sent
- [ ] Customer Portal is activated
- [ ] Test payments work end-to-end

---

## 🎉 You're All Set!

Your Stripe integration is ready to accept payments. Just:

1. Add your keys to `.env.local`
2. Create products in Stripe Dashboard
3. Update the price IDs
4. Test with test cards
5. Go live! 🚀
