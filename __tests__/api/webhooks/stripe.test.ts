/**
 * Tests for POST /api/webhooks/stripe route
 */

import { stripe } from '@/lib/stripe';

jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: jest.fn() },
  },
}));
jest.mock('@/lib/db', () => ({
  queryOne: jest.fn(),
  execute: jest.fn(),
}));
jest.mock('@/lib/api-keys', () => ({
  API_TIERS: {
    starter: { monthly_quota: 100, rate_limit_rpm: 30 },
    growth: { monthly_quota: 500, rate_limit_rpm: 60 },
    business: { monthly_quota: 2000, rate_limit_rpm: 120 },
  },
}));

import { POST } from '@/app/api/webhooks/stripe/route';
import * as db from '@/lib/db';

const mockConstructEvent = stripe.webhooks.constructEvent as jest.Mock;
const mockQueryOne = db.queryOne as jest.Mock;
const mockExecute = db.execute as jest.Mock;

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
    jest.clearAllMocks();
    // M-1: idempotency insert succeeds by default (rowCount=1 means
    // "first time we've seen this event"). Tests can override.
    mockExecute.mockResolvedValue({ rowCount: 1 });
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('returns 400 when stripe-signature is missing', async () => {
    const req = createRequest('{}', '');
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/signature/i);
  });

  it('returns 500 when STRIPE_WEBHOOK_SECRET is not set', async () => {
    delete process.env['STRIPE_WEBHOOK_SECRET'];
    const req = createRequest('{}', 'sig');
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/secret|configured/i);
  });

  it('rejects invalid signature', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('Invalid signature'); });
    const req = createRequest('{}', 'invalid');
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('handles checkout.session.completed — upgrades API key', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_checkout_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_1',
          customer_email: 'u@x.com',
          subscription: 'sub_1',
          metadata: { api_tier: 'growth', api_key_id: 'key-1', userId: 'user-1' },
          amount_total: 9900,
        },
      },
    });
    mockExecute.mockResolvedValue({ rowCount: 1 });

    const req = createRequest('{}', 'sig');
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);

    // Persists stripe_customer_id
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users SET stripe_customer_id'),
      ['cus_1', 'u@x.com']
    );

    // Upgrades API key
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE api_keys'),
      ['growth', 500, 60, 'sub_1', 'key-1']
    );
  });

  it('handles customer.subscription.deleted — downgrades API key', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_deleted_1',
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_1', id: 'sub_1' } },
    });
    mockQueryOne.mockResolvedValue({ id: 'key-1' });
    mockExecute.mockResolvedValue({ rowCount: 1 });

    const req = createRequest('{}', 'sig');
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("tier = 'starter'"),
      [100, 30, 'key-1']
    );
  });

  it('handles customer.subscription.updated — logs past due', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_updated_1',
      type: 'customer.subscription.updated',
      data: {
        object: { id: 'sub_1', status: 'past_due' },
      },
    });
    mockQueryOne.mockResolvedValue({ id: 'key-1' });

    const req = createRequest('{}', 'sig');
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('handles invoice.payment_failed — disables API key', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_inv_fail_1',
      type: 'invoice.payment_failed',
      data: { object: { subscription: 'sub_1' } },
    });
    mockQueryOne.mockResolvedValue({ id: 'key-1' });
    mockExecute.mockResolvedValue({ rowCount: 1 });

    const req = createRequest('{}', 'sig');
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('is_active = false'),
      ['key-1']
    );
  });

  it('handles invoice.payment_succeeded — re-enables API key', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_inv_ok_1',
      type: 'invoice.payment_succeeded',
      data: { object: { subscription: 'sub_1' } },
    });
    mockQueryOne.mockResolvedValue({ id: 'key-1' });
    mockExecute.mockResolvedValue({ rowCount: 1 });

    const req = createRequest('{}', 'sig');
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('is_active = true'),
      ['key-1']
    );
  });

  // Old in-memory dedup test removed — superseded by the M-1
  // describe block below which exercises the Postgres-backed
  // ON CONFLICT DO NOTHING idempotency.

  it('handles payment_intent.succeeded', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_pi_ok_1',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1' } },
    });
    const req = createRequest('{}', 'sig');
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('handles payment_intent.payment_failed', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_pi_fail_1',
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_1' } },
    });
    const req = createRequest('{}', 'sig');
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('handles unknown event type gracefully', async () => {
    mockConstructEvent.mockReturnValue({ id: 'evt_unknown_1', type: 'unknown.event', data: {} });
    const req = createRequest('{}', 'sig');
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
  });

  describe('M-1: idempotency', () => {
    it('returns duplicate=true when the event was already processed', async () => {
      mockConstructEvent.mockReturnValue({
        id: 'evt_dup_1',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_1' } },
      });
      // ON CONFLICT DO NOTHING → 0 rows inserted = already processed.
      mockExecute.mockResolvedValueOnce({ rowCount: 0 });

      const req = createRequest('{}', 'sig');
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.duplicate).toBe(true);
    });

    it('returns 500 when the idempotency insert errors so Stripe retries', async () => {
      mockConstructEvent.mockReturnValue({
        id: 'evt_idem_err_1',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_1' } },
      });
      mockExecute.mockRejectedValueOnce(new Error('connection refused'));

      const req = createRequest('{}', 'sig');
      const res = await POST(req);

      expect(res.status).toBe(500);
    });
  });

  it('returns 500 when handler throws', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_throw_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_1',
          customer_email: 'e@x.com',
          subscription: 'sub_1',
          metadata: { api_tier: 'growth', api_key_id: 'key-1' },
        },
      },
    });
    mockExecute.mockRejectedValue(new Error('DB error'));

    const req = createRequest('{}', 'sig');
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
