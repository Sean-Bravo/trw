/**
 * Public plan registry — the one price list.
 *
 * Every surface that names a plan, a price, a quota, a rate limit, or an
 * insights level (pricing cards, FAQ, footer, playground CTA, SEO offers,
 * dashboard header/settings, API docs tier table, README) reads this file.
 * `API_TIERS` in lib/api-keys.ts derives from it, so the numbers that
 * Stripe checkout writes into api_keys are the numbers the pricing page shows.
 * __tests__/lib/tier-registry.test.ts fails if any of those surfaces drift.
 *
 * This module is pure (no db/crypto imports) so client components can use it.
 *
 * Model names do not live here. Tiers expose an insights *level*
 * (Standard / Advanced / Premium); the level → engine mapping is in
 * lib/insights-engine.ts and is published only in the API docs and changelog.
 */

export type TierId = 'free' | 'starter' | 'growth' | 'business';
export type InsightsLevel = 'standard' | 'advanced' | 'premium';

export interface Tier {
  id: TierId;
  /** Public plan name. */
  name: string;
  /** USD per month. 0 = free. */
  priceUsd: number;
  /** Monthly file quota (api_keys.monthly_quota). */
  filesPerMonth: number;
  /** Per-key rate limit (api_keys.rate_limit_rpm). */
  requestsPerMinute: number;
  /** Bank statement PDF parsing unlocked. */
  bankPdf: boolean;
  /** AI insights level on the dashboard and API. */
  insights: InsightsLevel;
}

export const TIERS: readonly Tier[] = [
  { id: 'free',     name: 'Free',     priceUsd: 0,   filesPerMonth: 25,   requestsPerMinute: 10,  bankPdf: false, insights: 'standard' },
  { id: 'starter',  name: 'Starter',  priceUsd: 29,  filesPerMonth: 100,  requestsPerMinute: 30,  bankPdf: false, insights: 'standard' },
  { id: 'growth',   name: 'Growth',   priceUsd: 99,  filesPerMonth: 500,  requestsPerMinute: 60,  bankPdf: true,  insights: 'advanced' },
  { id: 'business', name: 'Business', priceUsd: 249, filesPerMonth: 2000, requestsPerMinute: 120, bankPdf: true,  insights: 'premium' },
];

export const TIER_BY_ID: Record<TierId, Tier> = Object.fromEntries(
  TIERS.map((t) => [t.id, t])
) as Record<TierId, Tier>;

export const PAID_TIERS = TIERS.filter((t) => t.priceUsd > 0);
export const FREE_TIER = TIER_BY_ID.free;
/** Lowest-priced paid plan — "Plans start at …". TIERS is price-ascending. */
export const CHEAPEST_PAID_TIER: Tier = PAID_TIERS[0] ?? TIER_BY_ID.starter;
/** First plan with bank PDF parsing — the feature-gate upgrade target. */
export const BANK_PDF_TIER: Tier = TIERS.find((t) => t.bankPdf) ?? TIER_BY_ID.growth;

/** Plan-card / docs wording for each insights level. */
export const INSIGHTS_LABELS: Record<InsightsLevel, string> = {
  standard: 'Standard insights',
  advanced: 'Advanced insights',
  premium: 'Premium insights',
};

export function isTierId(value: string | undefined | null): value is TierId {
  return value != null && value in TIER_BY_ID;
}

/** "$29" — price with no period. */
export function formatPrice(tier: Tier): string {
  return `$${tier.priceUsd}`;
}

/** "$29/mo" — inline price. */
export function formatMonthlyPrice(tier: Tier): string {
  return `${formatPrice(tier)}/mo`;
}

/** "2,000" — quota with thousands separator, as the pricing cards show it. */
export function formatFiles(tier: Tier): string {
  return tier.filesPerMonth.toLocaleString('en-US');
}

/** Public plan name for a tier id, falling back to Free for unknown values. */
export function tierName(id: string | undefined | null): string {
  return isTierId(id) ? TIER_BY_ID[id].name : FREE_TIER.name;
}

/** "Premium insights" for a tier id, falling back to the Free level. */
export function insightsLabel(id: string | undefined | null): string {
  const tier = isTierId(id) ? TIER_BY_ID[id] : FREE_TIER;
  return INSIGHTS_LABELS[tier.insights];
}
