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
jest.mock('@/lib/db', () => ({
  queryOne: jest.fn(),
}));
jest.mock('@/lib/api-keys', () => ({
  createApiKey: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { stripe } from '@/lib/stripe';
import { queryOne } from '@/lib/db';
import { createApiKey } from '@/lib/api-keys';

const mockGetServerSession = getServerSession as jest.Mock;
const mockCheckoutCreate = stripe.checkout.sessions.create as jest.Mock;
const mockQueryOne = queryOne as jest.Mock;
const mockCreateApiKey = createApiKey as jest.Mock;

describe('POST /api/developer/subscribe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // mockReset also drops any leftover mockResolvedValueOnce queue from a
    // previous test so sequenced query mocks can't leak across cases.
    mockQueryOne.mockReset();
    mockCreateApiKey.mockReset();
    mockCheckoutCreate.mockResolvedValue({
      url: 'https://checkout.stripe.com/session-123',
    });
    // default: API key belongs to the authenticated user
    mockQueryOne.mockResolvedValue({ user_id: 'user-1' });
    mockCreateApiKey.mockResolvedValue({ id: 'created-key', key: 'tf_live_created', prefix: 'created' });
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

  describe('apiKeyId omitted (pricing-page auto-subscribe)', () => {
    // Regression: every verified user already has an auto-provisioned free
    // key (D3) and the one-free-key cap (D2) rejects a second one. The old
    // client flow created a key first and 409'd before checkout could start,
    // so nobody arriving from the pricing page could reach Stripe.
    it('upgrades the existing active free key instead of creating one', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });
      mockQueryOne
        .mockResolvedValueOnce({ id: 'default-free-key' }) // free-key lookup
        .mockResolvedValueOnce({ user_id: 'user-1' });     // H-1 ownership check
      const request = createMockRequest({ tier: 'growth' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBe('https://checkout.stripe.com/session-123');
      expect(mockCreateApiKey).not.toHaveBeenCalled();
      expect(mockQueryOne).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("tier = 'free' AND is_active = true"),
        ['user-1']
      );
      expect(mockCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            api_tier: 'growth',
            api_key_id: 'default-free-key',
            userId: 'user-1',
          }),
          subscription_data: {
            metadata: { api_tier: 'growth', api_key_id: 'default-free-key' },
          },
        }),
        expect.objectContaining({
          idempotencyKey: 'checkout_user-1_default-free-key_growth',
        })
      );
    });

    it('creates a free key when the user has none, then checks out against it', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });
      mockQueryOne
        .mockResolvedValueOnce(null)                    // no active free key
        .mockResolvedValueOnce({ user_id: 'user-1' });  // H-1 ownership check
      mockCreateApiKey.mockResolvedValue({ id: 'new-key', key: 'tf_live_x', prefix: 'x' });
      const request = createMockRequest({ tier: 'starter' });

      const response = await POST(request as any);

      expect(response.status).toBe(200);
      expect(mockCreateApiKey).toHaveBeenCalledWith('user-1', 'My API Key', 'free');
      expect(mockCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ api_key_id: 'new-key' }),
        }),
        expect.anything()
      );
    });

    it('still enforces H-1 on the resolved key', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });
      mockQueryOne
        .mockResolvedValueOnce({ id: 'some-key' })
        .mockResolvedValueOnce({ user_id: 'someone-else' });
      const request = createMockRequest({ tier: 'starter' });

      const response = await POST(request as any);

      expect(response.status).toBe(403);
      expect(mockCheckoutCreate).not.toHaveBeenCalled();
    });

    it('returns 500 (not a partial checkout) when key creation fails', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });
      mockQueryOne.mockResolvedValueOnce(null);
      mockCreateApiKey.mockRejectedValue(new Error('Maximum of 5 active API keys allowed'));
      const request = createMockRequest({ tier: 'starter' });

      const response = await POST(request as any);

      expect(response.status).toBe(500);
      expect(mockCheckoutCreate).not.toHaveBeenCalled();
    });
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

  it('H-1: returns 403 when apiKeyId belongs to a different user', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    mockQueryOne.mockResolvedValue({ user_id: 'someone-else' });
    const request = createMockRequest({ tier: 'business', apiKeyId: 'victim-key' });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
  });

  it('H-1: returns 403 when apiKeyId does not exist', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    mockQueryOne.mockResolvedValue(null);
    const request = createMockRequest({ tier: 'starter', apiKeyId: 'no-such-key' });

    const response = await POST(request as any);
    expect(response.status).toBe(403);
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
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
