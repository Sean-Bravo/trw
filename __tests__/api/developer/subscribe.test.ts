/**
 * Tests for /api/developer/subscribe route
 */

import { POST } from '@/app/api/developer/subscribe/route';
import { createMockRequest } from '../../utils/mock-request';

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));
jest.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  },
  STRIPE_API_PRICES: {
    STARTER: { monthly: 'price_api_starter_monthly' },
    GROWTH: { monthly: 'price_api_growth_monthly' },
    BUSINESS: { monthly: 'price_api_business_monthly' },
  },
}));

import { getServerSession } from 'next-auth';
import { stripe } from '@/lib/stripe';

const mockGetServerSession = getServerSession as jest.Mock;
const mockCheckoutCreate = stripe.checkout.sessions.create as jest.Mock;

describe('POST /api/developer/subscribe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckoutCreate.mockResolvedValue({
      url: 'https://checkout.stripe.com/session-123',
    });
  });

  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const request = createMockRequest({ tier: 'starter', apiKeyId: 'key-1' });

    const response = await POST(request as any);
    expect(response.status).toBe(401);
  });

  it('returns 401 when session has no email', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    const request = createMockRequest({ tier: 'starter', apiKeyId: 'key-1' });

    const response = await POST(request as any);
    expect(response.status).toBe(401);
  });

  it('creates Stripe checkout with correct tier and returns URL', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    const request = createMockRequest({ tier: 'starter', apiKeyId: 'key-1' });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBe('https://checkout.stripe.com/session-123');
  });

  it('passes correct metadata to Stripe', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    const request = createMockRequest({ tier: 'growth', apiKeyId: 'key-abc' });

    await POST(request as any);

    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          api_tier: 'growth',
          api_key_id: 'key-abc',
          userId: 'user-1',
        }),
      }),
      expect.objectContaining({
        idempotencyKey: 'checkout_user-1_key-abc_growth',
      })
    );
  });

  it('uses correct price ID for tier', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    const request = createMockRequest({ tier: 'business', apiKeyId: 'key-1' });

    await POST(request as any);

    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_api_business_monthly', quantity: 1 }],
      }),
      expect.objectContaining({
        idempotencyKey: expect.any(String),
      })
    );
  });

  it('returns 400 for invalid tier', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    const request = createMockRequest({ tier: 'invalid', apiKeyId: 'key-1' });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid tier');
  });

  it('returns 400 when apiKeyId is missing', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    const request = createMockRequest({ tier: 'starter' });

    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it('normalizes tier case (lowercase to uppercase lookup)', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    const request = createMockRequest({ tier: 'STARTER', apiKeyId: 'key-1' });

    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });

  it('sets subscription mode', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    const request = createMockRequest({ tier: 'starter', apiKeyId: 'key-1' });

    await POST(request as any);

    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'subscription' }),
      expect.objectContaining({ idempotencyKey: expect.any(String) })
    );
  });

  it('returns 500 when Stripe throws', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    mockCheckoutCreate.mockRejectedValue(new Error('Stripe error'));
    const request = createMockRequest({ tier: 'starter', apiKeyId: 'key-1' });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to create checkout');
  });
});
