/**
 * Tests for lib/bank-upload-client — the process request carries the jobId
 * only; the server supplies the S3 key it recorded at presign (issue #2).
 */

import { processBankStatement } from '@/lib/bank-upload-client';

describe('processBankStatement', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sends jobId, outputFormat and filename, and no s3Key', async () => {
    await processBankStatement('job-1', 'qbo', 'statement.pdf');

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('/api/bank/process');
    expect(JSON.parse(init.body)).toEqual({ jobId: 'job-1', outputFormat: 'qbo', filename: 'statement.pdf' });
  });
});
