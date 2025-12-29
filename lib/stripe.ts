import Stripe from 'stripe'

// Use a placeholder key during build if STRIPE_SECRET_KEY is not set
const stripeSecretKey = process.env['STRIPE_SECRET_KEY'] || 'sk_test_placeholder'

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
})

// Stripe Price IDs - Update these with your actual price IDs from Stripe Dashboard
export const STRIPE_PLANS = {
  PRO: process.env['STRIPE_PRICE_ID_PRO'] || 'price_pro', // Replace with actual price_xxx
  PREMIUM: process.env['STRIPE_PRICE_ID_PREMIUM'] || 'price_premium', // Replace with actual price_xxx
} as const

export type StripePlan = keyof typeof STRIPE_PLANS
