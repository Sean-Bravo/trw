/**
 * Insights engine — the one model list.
 *
 * Maps each insights level from lib/tier-registry.ts to the model that
 * serves it, mirroring TIER_CONFIG in backend/services/ai_insights.py
 * (__tests__/lib/tier-registry.test.ts fails if they drift).
 *
 * Model names are published in exactly two places: the "Insights engine"
 * note in content/docs/api/index.md and blog Updates posts (the changelog).
 * Marketing pages and the dashboard show the level and engine version only —
 * never a vendor or model name — so a model swap is a docs + changelog
 * change, not a pricing-page change.
 */
import type { InsightsLevel } from './tier-registry';

/**
 * Bump when the level → model mapping or the insights prompt changes, and
 * say so in an Updates post. Shown to users as "engine v1".
 */
export const INSIGHTS_ENGINE_VERSION = 1;

export interface InsightsModel {
  provider: 'google' | 'anthropic';
  model: string;
}

export const INSIGHTS_MODELS: Record<InsightsLevel, InsightsModel> = {
  standard: { provider: 'google',    model: 'gemini-2.5-flash' },
  advanced: { provider: 'anthropic', model: 'claude-sonnet-4-6' },
  premium:  { provider: 'anthropic', model: 'claude-opus-4-7' },
};

/** "engine v1" — the only engine identifier user-facing surfaces show. */
export function engineLabel(): string {
  return `engine v${INSIGHTS_ENGINE_VERSION}`;
}
