import Stripe from 'stripe'

// Use a placeholder key during build if STRIPE_SECRET_KEY is not set
const stripeSecretKey = process.env['STRIPE_SECRET_KEY'] || 'sk_test_placeholder'

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
})

// API Developer Tier Price IDs — set these in env vars after creating products in Stripe Dashboard
// See docs/STRIPE_SETUP.md for instructions
function getApiPrice(tier: string): string {
  const envVar = `STRIPE_API_PRICE_${tier}`
  const value = process.env[envVar]
  if (!value) {
    throw new Error(`Missing env var: ${envVar}. Set it in Vercel or .env.local.`)
  }
  return value
}

// Lazy-loaded price IDs — will throw at checkout time if env vars are missing, not at import time
export const STRIPE_API_PRICES = {
  get STARTER() { return { monthly: getApiPrice('STARTER') } },
  get GROWTH() { return { monthly: getApiPrice('GROWTH') } },
  get BUSINESS() { return { monthly: getApiPrice('BUSINESS') } },
}

export const API_PRICING = {
  STARTER: { monthly: 29, quota: 100, rpm: 30 },
  GROWTH: { monthly: 99, quota: 500, rpm: 60 },
  BUSINESS: { monthly: 249, quota: 2000, rpm: 120 },
} as const

export type StripeApiPlan = 'STARTER' | 'GROWTH' | 'BUSINESS'

// Validate that all required Stripe env vars are set
export function validateStripeConfig(): { valid: boolean; missing: string[] } {
  const required = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_API_PRICE_STARTER',
    'STRIPE_API_PRICE_GROWTH',
    'STRIPE_API_PRICE_BUSINESS',
  ]
  const missing = required.filter((key) => !process.env[key])
  return { valid: missing.length === 0, missing }
}
