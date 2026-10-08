/**
 * Paid-tier entitlement: checkout → Stripe webhook → key limits.
 *
 * Runs the real /api/developer/subscribe handler and the real
 * /api/webhooks/stripe handler back to back, with Stripe and the DB mocked at
 * the edges only. The checkout metadata the first handler produces is what
 * the second one consumes — no hand-written event fixtures — so a drift
 * between the two routes fails here even if each route's own unit tests pass.
 *
 * It also pins the numbers in lib/api-keys.ts API_TIERS to what we publish
 * on the pricing page and in the API docs. The Lambda enforces whatever the
 * key row says (backend/services/api_auth.py reads rate_limit_rpm and
 * monthly_quota straight off the row), so the row is the entitlement and
 * these numbers are the contract. The Python mirror of PUBLISHED lives in
 * backend/tests/test_api_auth.py (TestPaidTierLimitsFromKeyRow) — keep both
 * in sync when pricing changes.
 */

import fs from 'fs';
import path from 'path';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));
jest.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: { sessions: { create: jest.fn() } },
    webhooks: { constructEvent: jest.fn() },
    subscriptions: { retrieve: jest.fn() },
  },
  STRIPE_API_PRICES: {
    STARTER: { monthly: 'price_api_starter_monthly' },
    GROWTH: { monthly: 'price_api_growth_monthly' },
    BUSINESS: { monthly: 'price_api_business_monthly' },
  },
}));
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn(),
}));
// @/lib/api-keys is deliberately NOT mocked: API_TIERS is the thing under test.

import { getServerSession } from 'next-auth';
import { stripe } from '@/lib/stripe';
import { queryOne, execute } from '@/lib/db';
import { API_TIERS, type ApiTier } from '@/lib/api-keys';
import { POST as subscribePOST } from '@/app/api/developer/subscribe/route';
import { POST as webhookPOST } from '@/app/api/webhooks/stripe/route';

const mockGetServerSession = getServerSession as jest.Mock;
const mockCheckoutCreate = stripe.checkout.sessions.create as jest.Mock;
const mockConstructEvent = stripe.webhooks.constructEvent as jest.Mock;
const mockSubsRetrieve = (stripe as any).subscriptions.retrieve as jest.Mock;
const mockQueryOne = queryOne as jest.Mock;
const mockExecute = execute as jest.Mock;

// What we publish. Price in USD/month, files/month, requests/minute, and
// whether bank-PDF parsing is included. Change this only when pricing changes.
const PUBLISHED: Record<Exclude<ApiTier, 'free'>, { price: number; files: number; rpm: number; bankPdf: boolean }> = {
  starter:  { price: 29,  files: 100,  rpm: 30,  bankPdf: false },
  growth:   { price: 99,  files: 500,  rpm: 60,  bankPdf: true },
  business: { price: 249, files: 2000, rpm: 120, bankPdf: true },
};
const PUBLISHED_FREE = { price: 0, files: 25, rpm: 10, bankPdf: false };

const PAID_TIERS = Object.keys(PUBLISHED) as Array<keyof typeof PUBLISHED>;

function subscribeRequest(body: unknown) {
  return { json: () => Promise.resolve(body) } as any;
}

function webhookRequest() {
  return {
    text: () => Promise.resolve('{}'),
    headers: { get: (n: string) => (n.toLowerCase() === 'stripe-signature' ? 'sig' : null) },
  } as any;
}

describe('paid-tier entitlement: checkout → webhook → key limits', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV, STRIPE_WEBHOOK_SECRET: 'whsec_test', NEXT_PUBLIC_APP_URL: 'https://taxformatter.com' };
    jest.clearAllMocks();
    mockQueryOne.mockReset();
    mockExecute.mockReset();
    mockExecute.mockResolvedValue({ rowCount: 1 });
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1', email: 'dev@example.com' } });
    mockCheckoutCreate.mockResolvedValue({ id: 'cs_1', url: 'https://checkout.stripe.com/c/s' });
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it.each(PAID_TIERS)('%s: the key ends up with exactly the published limits', async (tier) => {
    // --- 1. Pricing page → POST /api/developer/subscribe { tier } ---
    mockQueryOne
      .mockResolvedValueOnce({ id: 'key-free' })     // existing active free key
      .mockResolvedValueOnce({ user_id: 'user-1' }); // H-1 ownership check

    const subRes = await subscribePOST(subscribeRequest({ tier }));
    expect(subRes.status).toBe(200);
    expect((await subRes.json()).url).toBe('https://checkout.stripe.com/c/s');

    expect(mockCheckoutCreate).toHaveBeenCalledTimes(1);
    const [checkoutParams] = mockCheckoutCreate.mock.calls[0];
    const priceId: string = checkoutParams.line_items[0].price;
    expect(priceId).toBe(`price_api_${tier}_monthly`);
    expect(checkoutParams.mode).toBe('subscription');
    expect(checkoutParams.metadata).toEqual({
      api_tier: tier,
      api_key_id: 'key-free',
      userId: 'user-1',
    });

    // --- 2. Stripe completes checkout → POST /api/webhooks/stripe ---
    // The subscription carries the price Checkout was created with, and the
    // event carries the metadata the subscribe route wrote. Nothing here is
    // typed by hand.
    const subscriptionId = `sub_${tier}`;
    mockConstructEvent.mockReturnValue({
      id: `evt_${tier}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_1',
          customer_email: 'dev@example.com',
          subscription: subscriptionId,
          metadata: checkoutParams.metadata,
          amount_total: PUBLISHED[tier].price * 100,
        },
      },
    });
    mockSubsRetrieve.mockResolvedValue({ items: { data: [{ price: { id: priceId } }] } });
    mockQueryOne.mockResolvedValueOnce({ user_id: 'user-1' }); // webhook owner re-check

    const whRes = await webhookPOST(webhookRequest());
    expect(whRes.status).toBe(200);
    const whBody = await whRes.json();
    expect(whBody.received).toBe(true);
    expect(whBody.duplicate).toBeUndefined();

    // --- 3. The key row — which is what the Lambda enforces from ---
    const update = mockExecute.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('UPDATE api_keys') && c[0].includes('SET tier = $1'),
    );
    expect(update).toBeDefined();
    expect(update![1]).toEqual([
      tier,
      API_TIERS[tier].monthly_quota,
      API_TIERS[tier].rate_limit_rpm,
      subscriptionId,
      'key-free',
    ]);

    // --- 4. ...and those are the numbers we sell ---
    expect(API_TIERS[tier].price).toBe(PUBLISHED[tier].price);
    expect(API_TIERS[tier].monthly_quota).toBe(PUBLISHED[tier].files);
    expect(API_TIERS[tier].rate_limit_rpm).toBe(PUBLISHED[tier].rpm);
  });

  it('free never reaches Stripe: subscribe rejects tier=free before checkout', async () => {
    const res = await subscribePOST(subscribeRequest({ tier: 'free' }));
    expect(res.status).toBe(400);
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
    expect(API_TIERS.free.monthly_quota).toBe(PUBLISHED_FREE.files);
    expect(API_TIERS.free.rate_limit_rpm).toBe(PUBLISHED_FREE.rpm);
    expect(API_TIERS.free.price).toBe(PUBLISHED_FREE.price);
  });
});

describe('published pricing surfaces match API_TIERS', () => {
  const root = path.join(__dirname, '..', '..');
  const allTiers = { free: PUBLISHED_FREE, ...PUBLISHED };
  const display: Record<string, string> = { free: 'Free', starter: 'Starter', growth: 'Growth', business: 'Business' };

  it('lib/tier-registry.ts (what APIPricing.tsx and the SEO offers render from)', () => {
    // The pricing cards build from the registry, so pin the registry to the
    // published numbers and check the cards contain no literals of their own.
    // __tests__/components/marketing/Pricing.test.tsx asserts the rendered text.
    const { TIER_BY_ID } = jest.requireActual('@/lib/tier-registry');
    for (const [tier, t] of Object.entries(allTiers)) {
      expect(TIER_BY_ID[tier]).toMatchObject({
        name: display[tier],
        priceUsd: t.price,
        filesPerMonth: t.files,
        requestsPerMinute: t.rpm,
        bankPdf: t.bankPdf,
      });
    }
    const src = fs.readFileSync(path.join(root, 'components/marketing/APIPricing.tsx'), 'utf8');
    expect(src).toContain("from '@/lib/tier-registry'");
    expect(src).not.toMatch(/\$(29|99|249)\b/);
    expect(src).not.toMatch(/\b\d[\d,]* files \/ month\b/);
  });

  it('content/docs/api/index.md tier table (files, rpm, bank PDF, price)', () => {
    const md = fs.readFileSync(path.join(root, 'content/docs/api/index.md'), 'utf8');
    for (const [tier, t] of Object.entries(allTiers)) {
      // | Tier | Files/month | Requests/minute | Bank PDF | AI Insights | Price |
      const row = new RegExp(`^\\|\\s*${display[tier]}\\s*\\|([^\\n]*)$`, 'm').exec(md);
      expect(row).not.toBeNull();
      const cells = row![1].split('|').map((c) => c.trim());
      const [files, rpm, bankPdf, , price] = cells;
      expect(Number(files.replace(/,/g, ''))).toBe(t.files);
      expect(Number(rpm)).toBe(t.rpm);
      expect(bankPdf).toBe(t.bankPdf ? '✓' : '—');
      expect(price).toBe(t.price === 0 ? '$0' : `$${t.price}/mo`);
    }
  });
});
