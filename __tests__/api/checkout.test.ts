/**
 * Tests for POST /api/checkout
 * Consumer checkout has been removed — route returns 410 Gone.
 */

import { POST } from '@/app/api/checkout/route';
import { createMockRequest } from '../utils/mock-request';

describe('POST /api/checkout', () => {
  it('returns 410 Gone', async () => {
    const res = await POST(createMockRequest({ plan: 'PRO', billing: 'annual' }) as any);
    const data = await res.json();
    expect(res.status).toBe(410);
    expect(data.error).toMatch(/removed|Consumer/i);
  });

  it('returns 410 regardless of body content', async () => {
    const res = await POST(createMockRequest({}) as any);
    expect(res.status).toBe(410);
  });
});
