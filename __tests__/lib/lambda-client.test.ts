/**
 * internalGatewayHeaders (WS1): every Next.js → API Gateway call carries the
 * server-to-server shared secret, and a missing env var degrades to a single
 * logged error instead of a thrown exception.
 */

import fs from 'fs';
import path from 'path';

// Fresh module per test so the "warn once" flag starts unset.
async function loadFresh() {
  jest.resetModules();
  return import('@/lib/lambda-client');
}

describe('internalGatewayHeaders', () => {
  const original = process.env['INTERNAL_GATEWAY_TOKEN'];
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    if (original === undefined) delete process.env['INTERNAL_GATEWAY_TOKEN'];
    else process.env['INTERNAL_GATEWAY_TOKEN'] = original;
  });

  it('adds X-Internal-Token from INTERNAL_GATEWAY_TOKEN', async () => {
    process.env['INTERNAL_GATEWAY_TOKEN'] = 'test-internal-token';
    const { internalGatewayHeaders } = await loadFresh();

    expect(internalGatewayHeaders()).toEqual({ 'X-Internal-Token': 'test-internal-token' });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('merges into existing fetch headers without dropping them', async () => {
    process.env['INTERNAL_GATEWAY_TOKEN'] = 'test-internal-token';
    const { internalGatewayHeaders } = await loadFresh();

    expect({ 'Content-Type': 'application/json', ...internalGatewayHeaders() }).toEqual({
      'Content-Type': 'application/json',
      'X-Internal-Token': 'test-internal-token',
    });
  });

  it('returns no header and logs once, without throwing, when the var is unset', async () => {
    delete process.env['INTERNAL_GATEWAY_TOKEN'];
    const { internalGatewayHeaders } = await loadFresh();

    expect(internalGatewayHeaders()).toEqual({});
    expect(internalGatewayHeaders()).toEqual({});
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain('INTERNAL_GATEWAY_TOKEN');
  });

  it('reads the var at call time, so a later-set token is picked up', async () => {
    delete process.env['INTERNAL_GATEWAY_TOKEN'];
    const { internalGatewayHeaders } = await loadFresh();
    expect(internalGatewayHeaders()).toEqual({});

    process.env['INTERNAL_GATEWAY_TOKEN'] = 'rotated-token';
    expect(internalGatewayHeaders()).toEqual({ 'X-Internal-Token': 'rotated-token' });
  });
});

describe('gateway routes send the header', () => {
  // Guard against a new gateway-calling route forgetting the helper.
  it('every app/api route that fetches API_GATEWAY_URL uses internalGatewayHeaders', () => {
    const root = path.join(__dirname, '..', '..', 'app', 'api');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name)) files.push(full);
      }
    };
    walk(root);

    const callers = files.filter((f) => fs.readFileSync(f, 'utf8').includes('${API_GATEWAY_URL}'));
    expect(callers.length).toBeGreaterThanOrEqual(12);

    const missing = callers.filter((f) => {
      const src = fs.readFileSync(f, 'utf8');
      const fetches = (src.match(/fetch\(\s*`\$\{API_GATEWAY_URL\}/g) || []).length;
      const uses = (src.match(/\.\.\.internalGatewayHeaders\(\)/g) || []).length;
      return uses < fetches;
    });
    expect(missing.map((f) => path.relative(root, f))).toEqual([]);
  });
});
