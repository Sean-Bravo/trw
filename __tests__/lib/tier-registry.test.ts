/**
 * Drift guard: one price list, one model list.
 *
 * - lib/tier-registry.ts is the price list. API_TIERS (what Stripe checkout
 *   writes into api_keys) derives from it, and every public surface that
 *   names a price, quota, rate limit, or plan reads from it.
 * - lib/insights-engine.ts is the model list. It must mirror TIER_CONFIG in
 *   backend/services/ai_insights.py, and model/vendor names may appear only
 *   in the API docs and blog Updates posts — never on marketing pages or the
 *   dashboard, which show an insights level and an engine version instead.
 *
 * Regression: the playground CTA said "Free tier includes 10 files/mo" (it's
 * 25), the settings page showed "Plan: Starter" to every user, two blog posts
 * called Business "Scale", and the API docs table named three vendors.
 */

import fs from 'fs';
import path from 'path';
import {
  TIERS,
  TIER_BY_ID,
  PAID_TIERS,
  CHEAPEST_PAID_TIER,
  BANK_PDF_TIER,
  INSIGHTS_LABELS,
  tierName,
  insightsLabel,
  formatFiles,
} from '@/lib/tier-registry';
import { INSIGHTS_MODELS, INSIGHTS_ENGINE_VERSION, engineLabel } from '@/lib/insights-engine';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Minimal reader for TIER_CONFIG in ai_insights.py — avoids a Python dependency. */
function readBackendTierConfig(): Record<string, { provider: string; model: string }> {
  const src = read('backend/services/ai_insights.py');
  const block = /TIER_CONFIG\s*=\s*\{([\s\S]*?)\n\}/.exec(src)?.[1] ?? '';
  const out: Record<string, { provider: string; model: string }> = {};
  for (const m of block.matchAll(/"(\w+)":\s*\{\s*"provider":\s*"([^"]+)",\s*"model":\s*"([^"]+)"/g)) {
    out[m[1]] = { provider: m[2], model: m[3] };
  }
  return out;
}

/** Surfaces that may show a plan or price but must read it from the registry. */
const PRICE_SURFACES = [
  'components/marketing/APIPricing.tsx',
  'components/marketing/FAQ.tsx',
  'components/marketing/Footer.tsx',
  'components/marketing/APIHero.tsx',
  'components/marketing/APICapabilities.tsx',
  'components/seo/SoftwareApplicationSchema.tsx',
  'app/playground/page.tsx',
  'components/dashboard/DashboardHeader.tsx',
  'app/dashboard/settings/SettingsClient.tsx',
];

/** Surfaces that may never say which model serves a plan. */
const NO_VENDOR_SURFACES = [
  ...PRICE_SURFACES,
  'components/marketing/TrustEngine.tsx',
  'components/marketing/AgentSection.tsx',
  'components/dashboard/AIInsightsPanel.tsx',
  'app/dashboard/jobs/[jobId]/JobDetailClient.tsx',
  'app/upload/page.tsx',
  'app/security/page.tsx',
  'app/terms/page.tsx',
];

// Model identifiers, not vendor words: "Claude Code" is an MCP client we
// support, the privacy policy must name Anthropic/Google as subprocessors, and
// "Gemini" alone is an exchange we parse. What must not appear is which model
// serves a plan.
const VENDOR_OR_MODEL =
  /\b(Opus|Sonnet|Haiku|GPT-?\d|gemini-\d|Gemini (2\.\d|Flash|Pro|AI)|claude-\d|Claude (Opus|Sonnet|Haiku|\d))\b/;

const PRICES = TIERS.map((t) => t.priceUsd).filter((p) => p > 0);
const HARDCODED_PRICE = new RegExp(`\\$(${PRICES.join('|')})\\b`);
const HARDCODED_QUOTA = /\b\d{1,3}(,\d{3})?\s*(files?|API calls)\s*(\/|per)\s*(mo|month)\b/i;

describe('plan registry', () => {
  it('lists the four plans in ascending price order with ascending limits', () => {
    expect(TIERS.map((t) => t.id)).toEqual(['free', 'starter', 'growth', 'business']);
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].priceUsd).toBeGreaterThan(TIERS[i - 1].priceUsd);
      expect(TIERS[i].filesPerMonth).toBeGreaterThan(TIERS[i - 1].filesPerMonth);
      expect(TIERS[i].requestsPerMinute).toBeGreaterThan(TIERS[i - 1].requestsPerMinute);
    }
  });

  it('derives the helpers from the list', () => {
    expect(PAID_TIERS.map((t) => t.id)).toEqual(['starter', 'growth', 'business']);
    expect(CHEAPEST_PAID_TIER.id).toBe('starter');
    expect(BANK_PDF_TIER.id).toBe('growth');
    expect(formatFiles(TIER_BY_ID.business)).toBe('2,000');
  });

  it('falls back to Free for unknown tier ids instead of throwing', () => {
    expect(tierName('business')).toBe('Business');
    expect(tierName('enterprise')).toBe('Free');
    expect(tierName(undefined)).toBe('Free');
    expect(insightsLabel('growth')).toBe('Advanced insights');
    expect(insightsLabel(null)).toBe('Standard insights');
  });

  it('API_TIERS (what checkout writes to api_keys) derives from the registry', async () => {
    const { API_TIERS } = await import('@/lib/api-keys');
    for (const t of TIERS) {
      expect(API_TIERS[t.id]).toEqual({
        monthly_quota: t.filesPerMonth,
        rate_limit_rpm: t.requestsPerMinute,
        price: t.priceUsd,
      });
    }
  });
});

describe('insights engine mirrors backend/services/ai_insights.py', () => {
  const backend = readBackendTierConfig();

  it('finds TIER_CONFIG (test is wired to the real file)', () => {
    expect(Object.keys(backend).sort()).toEqual(['business', 'free', 'growth', 'starter']);
  });

  it.each(TIERS.map((t) => t.id))('%s: level → model matches the Lambda', (id) => {
    const level = TIER_BY_ID[id].insights;
    expect(INSIGHTS_MODELS[level]).toEqual(backend[id]);
  });

  it('exposes an engine version, not a vendor', () => {
    expect(INSIGHTS_ENGINE_VERSION).toBeGreaterThanOrEqual(1);
    expect(engineLabel()).toBe(`engine v${INSIGHTS_ENGINE_VERSION}`);
    expect(engineLabel()).not.toMatch(VENDOR_OR_MODEL);
    for (const label of Object.values(INSIGHTS_LABELS)) {
      expect(label).not.toMatch(VENDOR_OR_MODEL);
    }
  });
});

describe('public surfaces generate from the registry', () => {
  it.each(PRICE_SURFACES)('%s hard-codes no price or monthly quota', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(HARDCODED_PRICE);
    expect(src).not.toMatch(HARDCODED_QUOTA);
  });

  it.each(NO_VENDOR_SURFACES)('%s names no AI model', (rel) => {
    expect(read(rel)).not.toMatch(VENDOR_OR_MODEL);
  });

  it('pricing cards and docs use the insights-level labels, not categorization grades', () => {
    const src = read('components/marketing/APIPricing.tsx');
    expect(src).not.toMatch(/(Standard|Detailed|Highest-accuracy) categorization/);
    expect(src).not.toMatch(/SLA/);
    expect(src).toContain('INSIGHTS_LABELS');
  });
});

describe('docs: content/docs/api/index.md tier table mirrors the registry', () => {
  const md = read('content/docs/api/index.md');

  it.each(TIERS.map((t) => t.id))('%s row: files, rpm, bank PDF, insights level, price', (id) => {
    const t = TIER_BY_ID[id];
    const row = new RegExp(`^\\|\\s*${t.name}\\s*\\|([^\\n]*)$`, 'm').exec(md);
    expect(row).not.toBeNull();
    const [files, rpm, bankPdf, insights, price] = row![1].split('|').map((c) => c.trim());
    expect(Number(files.replace(/,/g, ''))).toBe(t.filesPerMonth);
    expect(Number(rpm)).toBe(t.requestsPerMinute);
    expect(bankPdf).toBe(t.bankPdf ? '✓' : '—');
    expect(insights.toLowerCase()).toBe(t.insights);
    expect(price).toBe(t.priceUsd === 0 ? '$0' : `$${t.priceUsd}/mo`);
  });

  it('publishes the engine version and each level\'s model exactly as the engine map says', () => {
    expect(md).toContain(`Insights engine (v${INSIGHTS_ENGINE_VERSION})`);
    for (const level of Object.keys(INSIGHTS_MODELS) as Array<keyof typeof INSIGHTS_MODELS>) {
      expect(md).toContain(`\`${INSIGHTS_MODELS[level].model}\``);
    }
  });
});

describe('blog posts use registry plan names and prices', () => {
  const posts = fs
    .readdirSync(path.join(ROOT, 'content/blog'))
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => path.join('content/blog', f));
  const names = TIERS.map((t) => t.name).join('|');

  it.each(posts)('%s never calls Business "Scale"', (rel) => {
    expect(read(rel)).not.toMatch(/\bScale (tier|plan)\b|\*\*Scale \(/);
  });

  it.each(posts)('%s quotes only registry monthly prices', (rel) => {
    const src = read(rel);
    for (const m of src.matchAll(/\$(\d{1,3}(?:,\d{3})?)\s*(?:\/|per)\s*(?:mo|month)\b/g)) {
      const usd = Number(m[1].replace(/,/g, ''));
      expect(TIERS.map((t) => t.priceUsd)).toContain(usd);
    }
  });

  it.each(posts)('%s pairs each plan heading with its registry price', (rel) => {
    const src = read(rel);
    for (const m of src.matchAll(new RegExp(`^##\\s+(${names})\\s+—\\s+\\$(\\d+)/month`, 'gm'))) {
      const tier = TIERS.find((t) => t.name === m[1])!;
      expect(Number(m[2])).toBe(tier.priceUsd);
    }
  });
});
