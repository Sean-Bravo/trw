/**
 * Tests for POST /api/webhooks/stripe route
 */

import { POST } from '@/app/api/webhooks/stripe/route';
import * as authDb from '@/lib/auth-db';
import * as db from '@/lib/db';
import * as email from '@/lib/email';
import { stripe } from '@/lib/stripe';

jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: jest.fn() },
    subscriptions: { retrieve: jest.fn() },
  },
  STRIPE_PRICES: {},
  getPriceId: jest.fn(),
}));
jest.mock('@/lib/auth-db');
jest.mock('@/lib/db');
jest.mock('@/lib/email');

const mockConstructEvent = stripe.webhooks.constructEvent as jest.Mock;
const mockSubscriptionsRetrieve = stripe.subscriptions.retrieve as jest.Mock;
const mockFindUserByStripeCustomerId = authDb.findUserByStripeCustomerId as jest.MockedFunction<typeof authDb.findUserByStripeCustomerId>;
const mockFindUserByEmailWithSubscription = authDb.findUserByEmailWithSubscription as jest.MockedFunction<typeof authDb.findUserByEmailWithSubscription>;
const mockUpdateSubscription = authDb.updateSubscription as jest.MockedFunction<typeof authDb.updateSubscription>;
const mockQueryOne = db.queryOne as jest.MockedFunction<typeof db.queryOne>;
const mockSendSubscriptionEmail = email.sendSubscriptionEmail as jest.MockedFunction<typeof email.sendSubscriptionEmail>;

function createRequest(body: string, signature: string) {
  return {
    text: () => Promise.resolve(body),
    headers: { get: (n: string) => (n.toLowerCase() === 'stripe-signature' ? signature : null) },
  } as any;
}

describe('POST /api/webhooks/stripe', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV, STRIPE_WEBHOOK_SECRET: 'whsec_test' };
    mockConstructEvent.mockReset();
    mockSendSubscriptionEmail?.mockResolvedValue?.({ success: true });
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('returns 400 when stripe-signature is missing', async () => {
    const req = createRequest('{}', '');
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/signature|No signature/i);
  });

  it('returns 500 when STRIPE_WEBHOOK_SECRET is not set', async () => {
    delete process.env['STRIPE_WEBHOOK_SECRET'];
    const req = createRequest('{}', 'sig');
    const res = await POST(req);
    expect(res.status).toBe(500);
    const d = await res.json();
    expect(d.error).toMatch(/secret|configured/i);
  });

  it('rejects invalid signature', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('Invalid signature'); });
    const req = createRequest('{"type":"checkout.session.completed"}', 'invalid');
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Webhook|signature|Invalid/i);
  });

  it('handles checkout.session.completed and updates subscription', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_1',
          customer_email: 'u@x.com',
          subscription: 'sub_1',
          metadata: { plan: 'pro' },
          amount_total: 8900,
        },
      },
    });
    mockFindUserByStripeCustomerId.mockResolvedValue({ id: 'user-1', email: 'u@x.com' } as any);
    mockSubscriptionsRetrieve.mockResolvedValue({ items: { data: [{ current_period_end: 1735689600 }] } });

    const req = createRequest('{}', 'sig');
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
    expect(mockUpdateSubscription).toHaveBeenCalledWith(
      'user-1',
      'pro',
      'active',
      'cus_1',
      'sub_1',
      expect.any(Date)
    );
  });

  it('handles customer.subscription.deleted and downgrades to free', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_1', id: 'sub_1' } },
    });
    mockFindUserByStripeCustomerId.mockResolvedValue({ id: 'user-1' } as any);

    const req = createRequest('{}', 'sig');
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdateSubscription).toHaveBeenCalledWith('user-1', 'free', 'canceled', 'cus_1', undefined, undefined);
  });

  it('handles customer.subscription.updated', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: 'cus_1',
          id: 'sub_1',
          status: 'active',
          items: { data: [{ current_period_end: 1735689600 }] },
        },
      },
    });
    mockFindUserByStripeCustomerId.mockResolvedValue({ id: 'user-1' } as any);
    mockQueryOne.mockResolvedValue({ tier: 'pro' });

    const req = createRequest('{}', 'sig');
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdateSubscription).toHaveBeenCalled();
  });

  it('handles payment_intent.succeeded', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1' } },
    });
    const req = createRequest('{}', 'sig');
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('handles payment_intent.payment_failed', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_1' } },
    });
    const req = createRequest('{}', 'sig');
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('handles unknown event type gracefully', async () => {
    mockConstructEvent.mockReturnValue({ type: 'unknown.event', data: {} });
    const req = createRequest('{}', 'sig');
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
  });

  it('returns 500 when handler throws', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { customer: 'c1', customer_email: 'e@x.com', subscription: null, metadata: { plan: 'pro' } } },
    });
    mockFindUserByStripeCustomerId.mockResolvedValue({ id: 'u1' } as any);
    mockUpdateSubscription.mockRejectedValue(new Error('DB error'));

    const req = createRequest('{}', 'sig');
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/handler|failed|Webhook/i);
  });
});
