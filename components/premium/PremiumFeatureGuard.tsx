'use client';

import React from 'react';
import { UpgradePrompt } from './UpgradePrompt';

type SubscriptionTier = 'free' | 'pro' | 'premium';

interface PremiumFeatureGuardProps {
  /** Minimum tier required to access this feature */
  requiredTier: 'pro' | 'premium';
  /** User's current subscription tier */
  currentTier: SubscriptionTier | undefined;
  /** Feature name to display in upgrade prompt */
  feature: string;
  /** Content to show if user has access */
  children: React.ReactNode;
}

const TIER_LEVELS: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
  premium: 2,
};

/**
 * Guard component that shows upgrade prompt if user lacks required tier
 */
export function PremiumFeatureGuard({
  requiredTier,
  currentTier = 'free',
  feature,
  children,
}: PremiumFeatureGuardProps) {
  const currentLevel = TIER_LEVELS[currentTier];
  const requiredLevel = TIER_LEVELS[requiredTier];
  const hasAccess = currentLevel >= requiredLevel;

  if (hasAccess) {
    return <>{children}</>;
  }

  return <UpgradePrompt feature={feature} requiredTier={requiredTier} />;
}
