'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';

interface UpgradePromptProps {
  /** Feature name that requires upgrade */
  feature: string;
  /** Minimum tier required */
  requiredTier: 'pro' | 'premium';
}

const TIER_INFO = {
  pro: {
    name: 'Pro',
    price: '$89',
    period: '/tax year',
  },
  premium: {
    name: 'Premium',
    price: '$189',
    period: '/tax year',
  },
};

export function UpgradePrompt({ feature, requiredTier }: UpgradePromptProps) {
  const tier = TIER_INFO[requiredTier];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-2xl rounded-full" />

        {/* Lock icon */}
        <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-800/80 border border-white/10 mb-6">
          <Lock className="w-8 h-8 text-slate-400" />
        </div>
      </div>

      <h3 className="text-xl font-semibold text-white mb-2">
        {feature}
      </h3>

      <p className="text-slate-400 text-center mb-6 max-w-sm">
        Upgrade to {tier.name} to unlock this feature and see exactly what changes were made to your data.
      </p>

      {/* Pricing badge */}
      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-3xl font-bold text-white">{tier.price}</span>
        <span className="text-slate-400 text-sm">{tier.period}</span>
      </div>

      <Link
        href="/#pricing"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:from-cyan-400 hover:to-blue-400 transition-all"
      >
        <Sparkles className="w-4 h-4" />
        Upgrade to {tier.name}
      </Link>

      <p className="text-slate-400 text-xs mt-4">
        One-time payment. No subscriptions.
      </p>
    </div>
  );
}
