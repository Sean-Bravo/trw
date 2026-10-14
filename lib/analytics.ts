/**
 * Google Ads conversion tracking + GA4 funnel events.
 *
 * trackPurchase / trackSignUp / trackConversion fire Google Ads conversions
 * (unchanged). trackEvent fires a GA4 event and attaches the visitor's
 * acquisition attribution (funnel, source, medium, campaign — see
 * lib/attribution.ts) so the developer and bank funnels can be told apart
 * in every report.
 */
import { inferFunnel, readAttributionFromDocument } from './attribution';

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
      send_to: `${process.env['NEXT_PUBLIC_GOOGLE_ADS_ID']}/${process.env['NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL']}`,
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

export type EventParams = Record<string, string | number | boolean | null | undefined>;

/**
 * GA4 event with the acquisition attribution attached. `params` win over
 * the attribution fields, so a caller can force a funnel when it knows better.
 */
export const trackEvent = (name: string, params: EventParams = {}) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  const attr = readAttributionFromDocument();
  const base: EventParams = {
    funnel: attr?.funnel ?? inferFunnel(window.location.pathname),
    acquisition_source: attr?.source ?? 'direct',
    acquisition_medium: attr?.medium ?? undefined,
    acquisition_campaign: attr?.campaign ?? undefined,
    landing_path: attr?.landing ?? undefined,
  };
  window.gtag('event', name, { ...base, ...params });
};
