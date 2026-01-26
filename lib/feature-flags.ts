/**
 * Feature Flags for TaxFormatter
 *
 * MVP_MODE: When true, all users get access to all features regardless of tier.
 * Set to false when ready to enforce paid tiers.
 */

// MVP Mode - Set to false when ready to enable paid tier restrictions
export const MVP_MODE = process.env['NEXT_PUBLIC_MVP_MODE'] !== 'false';

/**
 * Check if a user has access to a feature based on their tier.
 * During MVP, all features are available to all tiers.
 */
export function hasFeatureAccess(
  userTier: 'free' | 'pro' | 'premium' | string | undefined,
  requiredTier: 'free' | 'pro' | 'premium'
): boolean {
  // During MVP, everyone gets all features
  if (MVP_MODE) {
    return true;
  }

  const tier = userTier || 'free';
  const tierLevels: Record<string, number> = {
    free: 0,
    pro: 1,
    premium: 2,
  };

  const userLevel = tierLevels[tier] ?? 0;
  const requiredLevel = tierLevels[requiredTier] ?? 0;

  return userLevel >= requiredLevel;
}

/**
 * Get effective tier for display purposes.
 * During MVP, shows actual tier but features work as premium.
 */
export function getEffectiveTier(userTier: string | undefined): string {
  return userTier || 'free';
}

/**
 * Check if bank statement feature is available
 */
export function canAccessBankStatements(userTier: string | undefined): boolean {
  return hasFeatureAccess(userTier, 'pro');
}

/**
 * Check if AI insights feature is available
 */
export function canAccessAIInsights(userTier: string | undefined): boolean {
  return hasFeatureAccess(userTier, 'pro');
}

/**
 * Check if priority processing is available
 */
export function canAccessPriorityProcessing(userTier: string | undefined): boolean {
  return hasFeatureAccess(userTier, 'premium');
}
