import { RateLimiter } from './rate-limit';

export const UPSTREAM_BASE_URL = 'https://api.taxformatter.com/v1';

// Playground caps JSON body at 1 MB to stay inside Next's default JSON limit.
// The full public API supports up to 10 MB — documented in the 413 response.
export const PLAYGROUND_MAX_BASE64_BYTES = 1_000_000;

// Accept both crypto (docs) and bank-statement output formats. The upstream
// decides what's valid for the file; we only reject clearly bogus values to
// avoid forwarding unvalidated input.
export const VALID_OUTPUT_FORMATS = [
  'koinly',
  'turbotax',
  'coinledger',
  'zenledger',
  'csv',
  'qbo',
  'xero',
  'excel',
] as const;

const DEMO_KEY_DAILY_QUOTA = Number(process.env['DEMO_KEY_DAILY_QUOTA']) || 500;

// Global counter on the shared demo key. RELIABILITY.md §9.3: rotating IPs
// can drain a per-IP limit; a single global counter closes that hole. In-
// memory per process — migrates with the rest of the limiters to Upstash.
const demoKeyQuota = new RateLimiter({
  interval: 24 * 60 * 60 * 1000,
  uniqueTokenPerInterval: DEMO_KEY_DAILY_QUOTA,
});

export class PlaygroundError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus: number,
  ) {
    super(message);
    this.name = 'PlaygroundError';
  }
}

export interface PlaygroundParseRequest {
  file_content: string;
  filename: string;
  output_format?: string;
  exchange?: string;
  api_key?: string;
}

export interface SelectedKey {
  key: string;
  source: 'byok' | 'demo';
}

/**
 * Pick which X-API-Key to send upstream. BYOK takes precedence — the user
 * pastes their own key and assumes their own quota cost. Falls back to the
 * server-side DEMO_API_KEY when absent; that's the whole point of an
 * unauthenticated sandbox.
 */
export function selectApiKey(body: PlaygroundParseRequest): SelectedKey {
  const byok = body.api_key?.trim();
  if (byok) {
    if (!/^tf_(live|test)_[A-Za-z0-9]+$/.test(byok)) {
      throw new PlaygroundError(
        'invalid_api_key_format',
        'API key must start with tf_live_ or tf_test_.',
        400,
      );
    }
    return { key: byok, source: 'byok' };
  }

  const demo = process.env['DEMO_API_KEY']?.trim();
  if (!demo) {
    throw new PlaygroundError(
      'demo_key_not_configured',
      'Playground demo key is not configured yet. Paste your own tf_live_ key to continue.',
      503,
    );
  }
  return { key: demo, source: 'demo' };
}

export function validateBase64Size(file_content: string): void {
  if (file_content.length > PLAYGROUND_MAX_BASE64_BYTES) {
    throw new PlaygroundError(
      'file_too_large',
      `Playground cap is 1 MB of base64 (your payload is ${Math.round(
        file_content.length / 1024,
      )} KB). The full public API accepts up to 10 MB.`,
      413,
    );
  }
}

export function validateOutputFormat(format: string | undefined): void {
  if (!format) return;
  if (!VALID_OUTPUT_FORMATS.includes(format as (typeof VALID_OUTPUT_FORMATS)[number])) {
    throw new PlaygroundError(
      'invalid_output_format',
      `Unknown output_format "${format}". Valid: ${VALID_OUTPUT_FORMATS.join(', ')}.`,
      400,
    );
  }
}

/**
 * Global daily cap on the shared demo key. No-op for BYOK — the user's own
 * tier/quota enforces their spend upstream.
 */
export async function assertDemoKeyQuota(source: SelectedKey['source']): Promise<void> {
  if (source === 'byok') return;
  const result = await demoKeyQuota.check('playground:demo:global');
  if (!result.success) {
    throw new PlaygroundError(
      'demo_quota_exhausted',
      'Daily demo quota reached — try again tomorrow or paste your own API key.',
      429,
    );
  }
}

export function isPlaygroundKilled(): boolean {
  return process.env['PLAYGROUND_KILLSWITCH'] === 'true';
}
