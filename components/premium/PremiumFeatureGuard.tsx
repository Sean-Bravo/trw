'use client';

import React from 'react';

interface PremiumFeatureGuardProps {
  requiredTier?: string;
  currentTier?: string;
  feature?: string;
  children: React.ReactNode;
}

/**
 * All consumer features are now free — this guard always renders children.
 * API billing is handled separately via API key tiers.
 */
export function PremiumFeatureGuard({ children }: PremiumFeatureGuardProps) {
  return <>{children}</>;
}
