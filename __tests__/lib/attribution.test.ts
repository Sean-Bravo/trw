/**
 * lib/attribution.ts — first-touch acquisition attribution.
 */
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE_DAYS,
  BANK_FUNNEL_PATHS,
  buildAttribution,
  captureAttribution,
  inferFunnel,
  parseAttributionCookie,
  parseAttributionFromCookieHeader,
  readAttributionFromDocument,
  serializeAttributionCookie,
} from '@/lib/attribution';

const NOW = new Date('2026-10-14T12:00:00Z');

describe('inferFunnel', () => {
  it('maps the bank pages to the bank funnel and everything else to developer', () => {
    expect(BANK_FUNNEL_PATHS).toEqual(['/bank-statement-to-csv', '/upload']);
    expect(inferFunnel('/bank-statement-to-csv')).toBe('bank');
    expect(inferFunnel('/bank-statement-to-csv/')).toBe('bank');
    expect(inferFunnel('/upload')).toBe('bank');
    expect(inferFunnel('/')).toBe('developer');
    expect(inferFunnel('/pricing')).toBe('developer');
    expect(inferFunnel('/docs/api')).toBe('developer');
    expect(inferFunnel('/uploads-are-not-the-bank-page')).toBe('developer');
  });
});

describe('buildAttribution', () => {
  it('prefers utm parameters', () => {
    const attr = buildAttribution({
      search: '?utm_source=google&utm_medium=cpc&utm_campaign=bank-oct',
      pathname: '/bank-statement-to-csv',
      referrer: 'https://www.google.com/',
      now: NOW,
    });
    expect(attr).toEqual({
      source: 'google', medium: 'cpc', campaign: 'bank-oct',
      landing: '/bank-statement-to-csv', funnel: 'bank', ts: NOW.toISOString(),
    });
  });

  it('falls back to the referrer host, then to direct', () => {
    expect(buildAttribution({ search: '', pathname: '/', referrer: 'https://www.reddit.com/r/x', now: NOW }))
      .toMatchObject({ source: 'reddit.com', medium: 'referral', campaign: null, funnel: 'developer' });
    expect(buildAttribution({ search: '', pathname: '/', referrer: '', now: NOW }))
      .toMatchObject({ source: 'direct', medium: null, campaign: null });
    expect(buildAttribution({ search: '', pathname: '/', referrer: 'not a url', now: NOW }).source).toBe('direct');
  });

  it('trims and caps field length so a hostile query string cannot bloat the cookie', () => {
    const attr = buildAttribution({ search: `?utm_source=${'x'.repeat(500)}&utm_medium=%20%20`, pathname: '/', now: NOW });
    expect(attr.source).toHaveLength(100);
    expect(attr.medium).toBeNull();
  });
});

describe('cookie round trip', () => {
  const attr = buildAttribution({ search: '?utm_source=bing', pathname: '/upload', now: NOW });

  it('serializes and parses back to the same value', () => {
    expect(parseAttributionCookie(serializeAttributionCookie(attr))).toEqual(attr);
    expect(parseAttributionFromCookieHeader(`a=1; ${ATTRIBUTION_COOKIE}=${serializeAttributionCookie(attr)}; b=2`)).toEqual(attr);
  });

  it('rejects missing, malformed, or off-shape values', () => {
    expect(parseAttributionCookie(undefined)).toBeNull();
    expect(parseAttributionCookie('')).toBeNull();
    expect(parseAttributionCookie('%7Bnot json')).toBeNull();
    expect(parseAttributionCookie(encodeURIComponent(JSON.stringify({ source: 'x' })))).toBeNull();
    expect(parseAttributionCookie(encodeURIComponent(JSON.stringify({ source: 'x', landing: '/', funnel: 'admin' })))).toBeNull();
    expect(parseAttributionFromCookieHeader('other=1')).toBeNull();
    expect(parseAttributionFromCookieHeader(null)).toBeNull();
  });
});

describe('captureAttribution (browser)', () => {
  const clearCookie = () => {
    document.cookie = `${ATTRIBUTION_COOKIE}=; Max-Age=0; Path=/`;
  };

  beforeEach(clearCookie);
  afterEach(clearCookie);

  it('sets a first-touch cookie from the current page', () => {
    window.history.pushState({}, '', '/bank-statement-to-csv?utm_source=google&utm_medium=cpc');
    const attr = captureAttribution();
    expect(attr).toMatchObject({ source: 'google', medium: 'cpc', funnel: 'bank', landing: '/bank-statement-to-csv' });
    expect(readAttributionFromDocument()).toEqual(attr);
    expect(ATTRIBUTION_MAX_AGE_DAYS).toBe(30);
  });

  it('never overwrites an existing first touch', () => {
    window.history.pushState({}, '', '/bank-statement-to-csv?utm_source=google');
    const first = captureAttribution();
    window.history.pushState({}, '', '/pricing?utm_source=twitter');
    expect(captureAttribution()).toEqual(first);
    expect(readAttributionFromDocument()?.source).toBe('google');
  });
});
