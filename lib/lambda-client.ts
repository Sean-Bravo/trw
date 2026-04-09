/**
 * Centralized Lambda API Gateway URL with allowlist (M-14).
 *
 * Previously every route did:
 *   const API_GATEWAY_URL = process.env['API_GATEWAY_URL']
 *     || 'https://api.taxformatter.com';
 *
 * If API_GATEWAY_URL was ever tampered with at deploy time (compromised
 * CI, malicious PR to env config, vercel env pull leak), every Next.js
 * route using it became a blind SSRF proxy sending authenticated user
 * data to wherever the env var pointed.
 *
 * This module checks the configured URL against an allowlist at module
 * load time and crashes the worker if it doesn't match. Valid origins
 * are the production gateway, optional staging gateway, and localhost
 * for dev.
 *
 * SECURITY_AUDIT.md §M-14
 */

const ALLOWED_GATEWAY_ORIGINS = new Set<string>([
  'https://api.taxformatter.com',
  'https://api-staging.taxformatter.com',
]);

if (process.env.NODE_ENV !== 'production') {
  ALLOWED_GATEWAY_ORIGINS.add('http://localhost:3001');
  ALLOWED_GATEWAY_ORIGINS.add('http://127.0.0.1:3001');
}

function resolveGatewayUrl(): string {
  const raw = process.env['API_GATEWAY_URL'] || 'https://api.taxformatter.com';
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`API_GATEWAY_URL is not a valid URL: ${raw}`);
  }
  if (!ALLOWED_GATEWAY_ORIGINS.has(parsed.origin)) {
    throw new Error(
      `API_GATEWAY_URL origin not in allowlist: ${parsed.origin}. ` +
        `Edit lib/lambda-client.ts ALLOWED_GATEWAY_ORIGINS to add new origins.`,
    );
  }
  // Strip any trailing slash for consistent path joining downstream.
  return raw.replace(/\/$/, '');
}

export const API_GATEWAY_URL = resolveGatewayUrl();
