/**
 * Tests for POST /api/checkout (P1)
 */

import { getServerSession } from 'next-auth';
import { POST } from '@/app/api/checkout/route';
import { createMockRequest } from '../utils/mock-request';
import * as rateLimit from '@/lib/rate-limit';
import { stripe } from '@/lib/stripe';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({
  rateLimiters: { api: { check: jest.fn().mockResolvedValue({ success: true }) } },
  getClientIdentifier: jest.fn().mockReturnValue('ip'),
}));
jest.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: { create: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/session' }) },
    },
  },
  STRIPE_PRICES: { PRO: { monthly: 'p_pro_m', annual: 'p_pro_a' }, PREMIUM: { monthly: 'p_prem_m', annual: 'p_prem_a' } },
  getPriceId: jest.fn((p: string, b: string) => `price_${p}_${b}`),
}));
jest.mock('@/lib/sentry', () => ({ captureException: jest.fn(), setContext: jest.fn() }));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockCheckoutCreate = stripe.checkout.sessions.create as jest.Mock;

describe('POST /api/checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit.rateLimiters.api.check as jest.Mock).mockResolvedValue({ success: true });
    mockGetServerSession.mockResolvedValue({ user: { email: 'u@x.com' }, expires: '2025' });
    mockCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/s' });
  });

  it('returns session URL for valid plan and billing', async () => {
    const res = await POST(createMockRequest({ plan: 'PRO', billing: 'annual' }) as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.url).toMatch(/checkout\.stripe|stripe\.com/);
    expect(mockCheckoutCreate).toHaveBeenCalled();
  });

  it('validates plan: rejects invalid', async () => {
    const res = await POST(createMockRequest({ plan: 'INVALID', billing: 'annual' }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid plan/i);
  });

  it('validates billing: monthly and annual only', async () => {
    const res = await POST(createMockRequest({ plan: 'PRO', billing: 'weekly' }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid billing|billing period/i);
  });

  it('requires authentication', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(createMockRequest({ plan: 'PRO', billing: 'annual' }) as any);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/signed in|Unauthorized/i);
  });

  it('uses subscription mode for monthly', async () => {
    await POST(createMockRequest({ plan: 'PRO', billing: 'monthly' }) as any);
    expect(mockCheckoutCreate).toHaveBeenCalledWith(expect.objectContaining({ mode: 'subscription' }));
  });

  it('uses payment mode for annual', async () => {
    await POST(createMockRequest({ plan: 'PRO', billing: 'annual' }) as any);
    expect(mockCheckoutCreate).toHaveBeenCalledWith(expect.objectContaining({ mode: 'payment' }));
  });

  it('returns 429 when rate limited', async () => {
    (rateLimit.rateLimiters.api.check as jest.Mock).mockResolvedValue({ success: false });
    const res = await POST(createMockRequest({ plan: 'PRO', billing: 'annual' }) as any);
    expect(res.status).toBe(429);
  });

  it('returns 500 when Stripe throws', async () => {
    mockCheckoutCreate.mockRejectedValue(new Error('Stripe API error'));
    const res = await POST(createMockRequest({ plan: 'PRO', billing: 'annual' }) as any);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Stripe|checkout|Failed/i);
  });
});
