/**
 * Google Ads Conversion Tracking
 *
 * Use these functions to track conversions in Google Ads
 */

// Declare gtag function for TypeScript
declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, any>
    ) => void
  }
}

/**
 * Track a purchase conversion
 * Call this on the success page after Stripe payment
 */
export const trackPurchase = (transactionId: string, value: number, currency = 'USD') => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: `${process.env['NEXT_PUBLIC_GOOGLE_ADS_ID']}/purchase`,
      transaction_id: transactionId,
      value: value,
      currency: currency,
    })

    console.log('🎯 Google Ads: Purchase conversion tracked', { transactionId, value })
  }
}

/**
 * Track a sign-up/start conversion
 * Call this when user clicks "Start Free" button
 */
export const trackSignUp = () => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: `${process.env['NEXT_PUBLIC_GOOGLE_ADS_ID']}/signup`,
    })

    console.log('🎯 Google Ads: Sign-up conversion tracked')
  }
}

/**
 * Track custom conversion events
 */
export const trackConversion = (conversionLabel: string, value?: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: `${process.env['NEXT_PUBLIC_GOOGLE_ADS_ID']}/${conversionLabel}`,
      value: value,
    })

    console.log(`🎯 Google Ads: ${conversionLabel} conversion tracked`, { value })
  }
}
