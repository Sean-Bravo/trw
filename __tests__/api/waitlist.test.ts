/**
 * Tests for /api/waitlist route
 */

import { POST } from '@/app/api/waitlist/route';
import { createMockRequest } from '../utils/mock-request';

jest.mock('@/lib/sentry', () => ({
  captureException: jest.fn(),
  setContext: jest.fn(),
}));
jest.mock('@/lib/mailchimp', () => ({
  addSubscriber: jest.fn(),
  isMailchimpConfigured: jest.fn(),
}));

import { addSubscriber, isMailchimpConfigured } from '@/lib/mailchimp';

const mockAddSubscriber = addSubscriber as jest.Mock;
const mockIsMailchimpConfigured = isMailchimpConfigured as jest.Mock;

describe('POST /api/waitlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMailchimpConfigured.mockReturnValue(true);
    mockAddSubscriber.mockResolvedValue({ alreadySubscribed: false });
  });

  it('subscribes a valid email, normalised by validateEmail', async () => {
    const response = await POST(createMockRequest({ email: ' Alice@Example.com ' }) as any);

    expect(response.status).toBe(200);
    expect(mockAddSubscriber).toHaveBeenCalledWith('alice@example.com', expect.any(Object));
  });

  it('rejects a missing email', async () => {
    const response = await POST(createMockRequest({}) as any);

    expect(response.status).toBe(400);
    expect(mockAddSubscriber).not.toHaveBeenCalled();
  });

  it('rejects a malformed email', async () => {
    const response = await POST(createMockRequest({ email: 'not-an-email' }) as any);

    expect(response.status).toBe(400);
    expect(mockAddSubscriber).not.toHaveBeenCalled();
  });

  it('rejects an email longer than 254 characters', async () => {
    const email = `${'a'.repeat(250)}@example.com`;
    const response = await POST(createMockRequest({ email }) as any);

    expect(response.status).toBe(400);
    expect(mockAddSubscriber).not.toHaveBeenCalled();
  });

  // Security report #13: the old /^[^\s@]+@[^\s@]+\.[^\s@]+$/ backtracked
  // quadratically on this shape and pinned the worker for seconds.
  it('rejects an adversarial ReDoS payload quickly', async () => {
    const email = `a@${'.'.repeat(50_000)} `;
    const start = Date.now();
    const response = await POST(createMockRequest({ email }) as any);
    const elapsed = Date.now() - start;

    expect(response.status).toBe(400);
    expect(elapsed).toBeLessThan(500);
    expect(mockAddSubscriber).not.toHaveBeenCalled();
  });
});
