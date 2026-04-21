/**
 * Unit tests for lib/playground-proxy.ts
 *
 * The global demo-key quota is stateful (RateLimiter keyed on 'playground:demo:global'
 * lives at module scope). We import the module once and run quota tests in one
 * describe block so counters don't leak between unrelated cases.
 */

import {
  PLAYGROUND_MAX_BASE64_BYTES,
  PlaygroundError,
  VALID_OUTPUT_FORMATS,
  assertDemoKeyQuota,
  isPlaygroundKilled,
  selectApiKey,
  validateBase64Size,
  validateOutputFormat,
} from '../playground-proxy';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('selectApiKey', () => {
  it('prefers BYOK when present and well-formed', () => {
    const result = selectApiKey({
      file_content: 'x',
      filename: 'f.csv',
      api_key: 'tf_live_abc123',
    });
    expect(result).toEqual({ key: 'tf_live_abc123', source: 'byok' });
  });

  it('accepts tf_test_ keys', () => {
    const result = selectApiKey({
      file_content: 'x',
      filename: 'f.csv',
      api_key: 'tf_test_xyz',
    });
    expect(result.source).toBe('byok');
  });

  it('rejects malformed BYOK keys', () => {
    expect(() =>
      selectApiKey({ file_content: 'x', filename: 'f.csv', api_key: 'sk_bogus' }),
    ).toThrow(PlaygroundError);
  });

  it('falls back to DEMO_API_KEY when BYOK absent', () => {
    process.env['DEMO_API_KEY'] = 'tf_live_server_demo';
    const result = selectApiKey({ file_content: 'x', filename: 'f.csv' });
    expect(result).toEqual({ key: 'tf_live_server_demo', source: 'demo' });
  });

  it('throws demo_key_not_configured when neither BYOK nor DEMO_API_KEY set', () => {
    delete process.env['DEMO_API_KEY'];
    try {
      selectApiKey({ file_content: 'x', filename: 'f.csv' });
      fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(PlaygroundError);
      expect((err as PlaygroundError).code).toBe('demo_key_not_configured');
      expect((err as PlaygroundError).httpStatus).toBe(503);
    }
  });

  it('treats whitespace-only BYOK as absent and falls back to demo', () => {
    process.env['DEMO_API_KEY'] = 'tf_live_demo';
    const result = selectApiKey({
      file_content: 'x',
      filename: 'f.csv',
      api_key: '   ',
    });
    expect(result.source).toBe('demo');
  });
});

describe('validateBase64Size', () => {
  it('accepts payloads under the cap', () => {
    expect(() => validateBase64Size('a'.repeat(500_000))).not.toThrow();
  });

  it('accepts exactly at the cap', () => {
    expect(() => validateBase64Size('a'.repeat(PLAYGROUND_MAX_BASE64_BYTES))).not.toThrow();
  });

  it('rejects payloads over the cap with 413', () => {
    try {
      validateBase64Size('a'.repeat(PLAYGROUND_MAX_BASE64_BYTES + 1));
      fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(PlaygroundError);
      expect((err as PlaygroundError).code).toBe('file_too_large');
      expect((err as PlaygroundError).httpStatus).toBe(413);
    }
  });
});

describe('validateOutputFormat', () => {
  it('accepts undefined (upstream default applies)', () => {
    expect(() => validateOutputFormat(undefined)).not.toThrow();
  });

  it('accepts every whitelisted value', () => {
    for (const fmt of VALID_OUTPUT_FORMATS) {
      expect(() => validateOutputFormat(fmt)).not.toThrow();
    }
  });

  it('rejects unknown values with 400', () => {
    try {
      validateOutputFormat('eviltxt');
      fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(PlaygroundError);
      expect((err as PlaygroundError).code).toBe('invalid_output_format');
      expect((err as PlaygroundError).httpStatus).toBe(400);
    }
  });
});

describe('assertDemoKeyQuota', () => {
  it('no-ops for BYOK regardless of quota state', async () => {
    await expect(assertDemoKeyQuota('byok')).resolves.toBeUndefined();
  });

  it('allows demo calls under the quota', async () => {
    await expect(assertDemoKeyQuota('demo')).resolves.toBeUndefined();
  });
});

describe('isPlaygroundKilled', () => {
  it('returns true when PLAYGROUND_KILLSWITCH="true"', () => {
    process.env['PLAYGROUND_KILLSWITCH'] = 'true';
    expect(isPlaygroundKilled()).toBe(true);
  });

  it('returns false when unset', () => {
    delete process.env['PLAYGROUND_KILLSWITCH'];
    expect(isPlaygroundKilled()).toBe(false);
  });

  it('returns false for any non-"true" value (e.g. "false", "1")', () => {
    process.env['PLAYGROUND_KILLSWITCH'] = 'false';
    expect(isPlaygroundKilled()).toBe(false);
    process.env['PLAYGROUND_KILLSWITCH'] = '1';
    expect(isPlaygroundKilled()).toBe(false);
  });
});
