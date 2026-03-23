/**
 * Feature Flags for TaxFormatter
 *
 * Consumer tiers (Pro/Premium) have been removed.
 * All consumer features are available to all users.
 * API features are gated by API key tier (Starter/Growth/Business) in lib/api-keys.ts.
 */

// All consumer features are now free — no tier gating
export function hasFeatureAccess(
  _userTier: string | undefined,
  _requiredTier: string
): boolean {
  return true
}

export function getEffectiveTier(_userTier: string | undefined): string {
  return 'free'
}

export function canAccessBankStatements(_userTier: string | undefined): boolean {
  return true
}

export function canAccessAIInsights(_userTier: string | undefined): boolean {
  return true
}

export function canAccessPriorityProcessing(_userTier: string | undefined): boolean {
  return true
}
