import Stripe from 'stripe'

// Use a placeholder key during build if STRIPE_SECRET_KEY is not set
const stripeSecretKey = process.env['STRIPE_SECRET_KEY'] || 'sk_test_placeholder'

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
})

// Stripe Price IDs - Set these in your environment variables after creating products in Stripe Dashboard
// See docs/STRIPE_SETUP.md for instructions on creating products
export const STRIPE_PRICES = {
  PRO: {
    monthly: process.env['STRIPE_PRICE_PRO_MONTHLY'] || 'price_pro_monthly',
    annual: process.env['STRIPE_PRICE_PRO_ANNUAL'] || 'price_pro_annual',
  },
  PREMIUM: {
    monthly: process.env['STRIPE_PRICE_PREMIUM_MONTHLY'] || 'price_premium_monthly',
    annual: process.env['STRIPE_PRICE_PREMIUM_ANNUAL'] || 'price_premium_annual',
  },
} as const

// Pricing amounts (in USD) - keep in sync with Stripe Dashboard
export const PRICING = {
  PRO: {
    monthly: 9,
    annual: 89,
  },
  PREMIUM: {
    monthly: 19,
    annual: 189,
  },
} as const

export type StripePlan = keyof typeof STRIPE_PRICES
export type BillingPeriod = 'monthly' | 'annual'

// Helper to get price ID for a plan and billing period
export function getPriceId(plan: StripePlan, billing: BillingPeriod): string {
  return STRIPE_PRICES[plan][billing]
}

// Legacy export for backwards compatibility
export const STRIPE_PLANS = {
  PRO: STRIPE_PRICES.PRO.annual,
  PREMIUM: STRIPE_PRICES.PREMIUM.annual,
} as const
