import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

// Stripe Price IDs - Update these with your actual price IDs from Stripe Dashboard
export const STRIPE_PLANS = {
  PRO: process.env.STRIPE_PRICE_ID_PRO || 'price_pro', // Replace with actual price_xxx
  PREMIUM: process.env.STRIPE_PRICE_ID_PREMIUM || 'price_premium', // Replace with actual price_xxx
} as const

export type StripePlan = keyof typeof STRIPE_PLANS
