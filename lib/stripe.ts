import Stripe from 'stripe'

// Use a placeholder key during build if STRIPE_SECRET_KEY is not set
const stripeSecretKey = process.env['STRIPE_SECRET_KEY'] || 'sk_test_placeholder'

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
})

// API Developer Tier Price IDs — set these in env vars after creating products in Stripe Dashboard
// See docs/STRIPE_SETUP.md for instructions
export const STRIPE_API_PRICES = {
  STARTER: {
    monthly: process.env['STRIPE_PRICE_API_STARTER_MONTHLY'] || 'price_api_starter_monthly',
  },
  GROWTH: {
    monthly: process.env['STRIPE_PRICE_API_GROWTH_MONTHLY'] || 'price_api_growth_monthly',
  },
  BUSINESS: {
    monthly: process.env['STRIPE_PRICE_API_BUSINESS_MONTHLY'] || 'price_api_business_monthly',
  },
} as const

export const API_PRICING = {
  STARTER: { monthly: 29, quota: 100, rpm: 30 },
  GROWTH: { monthly: 99, quota: 500, rpm: 60 },
  BUSINESS: { monthly: 249, quota: 2000, rpm: 120 },
} as const

export type StripeApiPlan = keyof typeof STRIPE_API_PRICES
