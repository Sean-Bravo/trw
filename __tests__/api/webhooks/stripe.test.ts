/**
 * Tests for POST /api/webhooks/stripe route
 */

import { stripe } from '@/lib/stripe';

jest.mock('@/lib/stripe', () => ({
  stripe: {
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
  queryOne: jest.fn(),
  execute: jest.fn(),
}));
jest.mock('@/lib/api-keys', () => ({
  API_TIERS: {
    free: { monthly_quota: 25, rate_limit_rpm: 10 },
    starter: { monthly_quota: 100, rate_limit_rpm: 30 },
    growth: { monthly_quota: 500, rate_limit_rpm: 60 },
    business: { monthly_quota: 2000, rate_limit_rpm: 120 },
  },
}));

import { POST } from '@/app/api/webhooks/stripe/route';
import * as db from '@/lib/db';

const mockConstructEvent = stripe.webhooks.constructEvent as jest.Mock;
const mockSubsRetrieve = (stripe as any).subscriptions.retrieve as jest.Mock;
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
    // M-3: subscription's actual price matches the claimed tier
    mockSubsRetrieve.mockResolvedValue({
      items: { data: [{ price: { id: 'price_api_growth_monthly' } }] },
    });
    // M-3: api_key ownership matches the metadata userId
    mockQueryOne.mockResolvedValue({ user_id: 'user-1' });

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

  describe('M-3: webhook tier verification', () => {
    function checkoutEvent() {
      mockConstructEvent.mockReturnValue({
        id: 'evt_m3_' + Math.random(),
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_1',
            customer_email: 'u@x.com',
            subscription: 'sub_1',
            metadata: { api_tier: 'business', api_key_id: 'key-1', userId: 'user-1' },
            amount_total: 24900,
          },
        },
      });
    }

    it('refuses upgrade when subscription price does not match claimed tier', async () => {
      checkoutEvent();
      mockExecute.mockResolvedValue({ rowCount: 1 });
      // Subscription is actually STARTER but metadata claims BUSINESS
      mockSubsRetrieve.mockResolvedValue({
        items: { data: [{ price: { id: 'price_api_starter_monthly' } }] },
      });
      mockQueryOne.mockResolvedValue({ user_id: 'user-1' });

      const res = await POST(createRequest('{}', 'sig'));
      expect(res.status).toBe(200);

      // Should NOT have called the api_keys UPDATE
      const updateCalls = mockExecute.mock.calls.filter((c) =>
        typeof c[0] === 'string' && c[0].includes('UPDATE api_keys'),
      );
      expect(updateCalls.length).toBe(0);
    });

    it('refuses upgrade when api_key owner does not match metadata userId', async () => {
      checkoutEvent();
      mockExecute.mockResolvedValue({ rowCount: 1 });
      mockSubsRetrieve.mockResolvedValue({
        items: { data: [{ price: { id: 'price_api_business_monthly' } }] },
      });
      // api_key actually belongs to a different user
      mockQueryOne.mockResolvedValue({ user_id: 'someone-else' });

      const res = await POST(createRequest('{}', 'sig'));
      expect(res.status).toBe(200);

      const updateCalls = mockExecute.mock.calls.filter((c) =>
        typeof c[0] === 'string' && c[0].includes('UPDATE api_keys'),
      );
      expect(updateCalls.length).toBe(0);
    });
  });

  it('handles customer.subscription.deleted — downgrades API key to free (v3)', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_deleted_1',
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_1', id: 'sub_1' } },
    });
    mockQueryOne.mockResolvedValue({ id: 'key-1', user_id: 'user-1' });
    // Three execute calls expected: idempotency insert, deactivate-existing-free
    // (rowCount=0 — no pre-existing free key), downgrade-to-free.
    mockExecute
      .mockResolvedValueOnce({ rowCount: 1 }) // idempotency
      .mockResolvedValueOnce({ rowCount: 0 }) // no pre-existing free key to deactivate
      .mockResolvedValueOnce({ rowCount: 1 }); // downgrade succeeds

    const req = createRequest('{}', 'sig');
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("SET tier = 'free'"),
      [25, 10, 'key-1']
    );
  });

  // --- Phase 3 (v3): D6 collision handling + defensive guard ---

  it('D6 collision: deactivates pre-existing free key with reason+timestamp before downgrading paid key', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_d6_1',
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_1', id: 'sub_1' } },
    });
    mockQueryOne.mockResolvedValue({ id: 'paid-key-id', user_id: 'user-1' });
    mockExecute
      .mockResolvedValueOnce({ rowCount: 1 }) // idempotency
      .mockResolvedValueOnce({ rowCount: 1 }) // 1 pre-existing free key deactivated
      .mockResolvedValueOnce({ rowCount: 1 }); // downgrade succeeds

    const res = await POST(createRequest('{}', 'sig'));
    expect(res.status).toBe(200);

    // The deactivate call: SQL contains deactivated_reason and the params
    // include the user_id, the paid-key id (to exclude itself), and the
    // reason string in the pattern downgraded_replaced_by:<paid_key_id>.
    const deactivateCall = mockExecute.mock.calls.find((c) =>
      typeof c[0] === 'string' && c[0].includes('deactivated_reason')
    );
    expect(deactivateCall).toBeDefined();
    expect(deactivateCall![1]).toEqual([
      'user-1',
      'paid-key-id',
      'downgraded_replaced_by:paid-key-id',
    ]);

    // Followed by the downgrade-to-free UPDATE (SET tier = 'free', not WHERE).
    const downgradeCall = mockExecute.mock.calls.find((c) =>
      typeof c[0] === 'string' && c[0].includes("SET tier = 'free'")
    );
    expect(downgradeCall).toBeDefined();
    expect(downgradeCall![1]).toEqual([25, 10, 'paid-key-id']);
  });

  it('defensive guard: checkout.session.completed with apiTier=free is logged and skipped', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_guard_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_1',
          customer_email: 'u@x.com',
          subscription: 'sub_1',
          metadata: { api_tier: 'free', api_key_id: 'key-1', userId: 'user-1' },
          amount_total: 0,
        },
      },
    });
    // Idempotency insert succeeds
    mockExecute.mockResolvedValue({ rowCount: 1 });

    const res = await POST(createRequest('{}', 'sig'));
    expect(res.status).toBe(200);

    // No tier-upgrade UPDATE on api_keys for the 'free' apiTier.
    const apiKeysUpdate = mockExecute.mock.calls.find((c) =>
      typeof c[0] === 'string' && c[0].includes('UPDATE api_keys') && c[0].includes('tier =')
    );
    expect(apiKeysUpdate).toBeUndefined();
    // Stripe subscription verification should not have been called.
    expect(mockSubsRetrieve).not.toHaveBeenCalled();
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
