/**
 * Acquisition attribution — which funnel and source a visitor arrived through.
 *
 * First touch only: the first page a visitor lands on sets a 30-day cookie
 * (`tf_attr`) with the UTM parameters, the referrer host, the landing path
 * and the funnel that path belongs to. Signup reads it server-side and
 * stores it on the user (db/migrations/014_add_user_attribution.sql);
 * lib/analytics.ts attaches it to every GA4 event. Nothing here identifies
 * a person: no IDs, no emails, no full referrer URLs.
 *
 * Pure except for the two DOM helpers at the bottom, so API routes and
 * tests can use the parsing without a browser.
 */

export const ATTRIBUTION_COOKIE = 'tf_attr';
export const ATTRIBUTION_MAX_AGE_DAYS = 30;

export type Funnel = 'bank' | 'developer';

export interface Attribution {
  /** utm_source, else the referrer host, else "direct". */
  source: string;
  /** utm_medium, else "referral" when a referrer host is known, else null. */
  medium: string | null;
  campaign: string | null;
  /** Landing pathname. */
  landing: string;
  funnel: Funnel;
  /** ISO timestamp of the first touch. */
  ts: string;
}

/** Pages that belong to the bank / accountant funnel; everything else is developer. */
export const BANK_FUNNEL_PATHS = ['/bank-statement-to-csv', '/upload'];

const MAX_FIELD = 100;

function clean(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, MAX_FIELD);
  return trimmed.length ? trimmed : null;
}

export function inferFunnel(pathname: string): Funnel {
  const path = pathname.replace(/\/+$/, '') || '/';
  return BANK_FUNNEL_PATHS.some((p) => path === p || path.startsWith(`${p}/`)) ? 'bank' : 'developer';
}

function referrerHost(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

export function buildAttribution(input: {
  search: string;
  pathname: string;
  referrer?: string | null;
  now?: Date;
}): Attribution {
  const params = new URLSearchParams(input.search);
  const host = referrerHost(input.referrer);
  const utmSource = clean(params.get('utm_source'));
  const utmMedium = clean(params.get('utm_medium'));
  return {
    source: utmSource ?? host ?? 'direct',
    medium: utmMedium ?? (host ? 'referral' : null),
    campaign: clean(params.get('utm_campaign')),
    landing: input.pathname.slice(0, MAX_FIELD) || '/',
    funnel: inferFunnel(input.pathname),
    ts: (input.now ?? new Date()).toISOString(),
  };
}

export function serializeAttributionCookie(attr: Attribution): string {
  return encodeURIComponent(JSON.stringify(attr));
}

/** Parse a cookie value; null for anything missing, malformed or off-shape. */
export function parseAttributionCookie(value: string | null | undefined): Attribution | null {
  if (!value) return null;
  try {
    const raw = JSON.parse(decodeURIComponent(value)) as Partial<Attribution>;
    if (typeof raw.source !== 'string' || typeof raw.landing !== 'string') return null;
    if (raw.funnel !== 'bank' && raw.funnel !== 'developer') return null;
    return {
      source: raw.source.slice(0, MAX_FIELD),
      medium: typeof raw.medium === 'string' ? raw.medium.slice(0, MAX_FIELD) : null,
      campaign: typeof raw.campaign === 'string' ? raw.campaign.slice(0, MAX_FIELD) : null,
      landing: raw.landing.slice(0, MAX_FIELD),
      funnel: raw.funnel,
      ts: typeof raw.ts === 'string' ? raw.ts : '',
    };
  } catch {
    return null;
  }
}

/** Read the attribution cookie out of a `document.cookie`-style string. */
export function parseAttributionFromCookieHeader(cookieHeader: string | null | undefined): Attribution | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === ATTRIBUTION_COOKIE) return parseAttributionCookie(rest.join('='));
  }
  return null;
}

// --- browser helpers -------------------------------------------------------

export function readAttributionFromDocument(): Attribution | null {
  if (typeof document === 'undefined') return null;
  try {
    return parseAttributionFromCookieHeader(document.cookie);
  } catch {
    return null;
  }
}

/**
 * Set the first-touch cookie if there is none yet and return the attribution
 * in force. Safe to call on every page; later visits never overwrite it.
 */
export function captureAttribution(): Attribution | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  try {
    const existing = parseAttributionFromCookieHeader(document.cookie);
    if (existing) return existing;
    const attr = buildAttribution({
      search: window.location.search,
      pathname: window.location.pathname,
      referrer: document.referrer,
    });
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie =
      `${ATTRIBUTION_COOKIE}=${serializeAttributionCookie(attr)}; Max-Age=${ATTRIBUTION_MAX_AGE_DAYS * 86400}; Path=/; SameSite=Lax${secure}`;
    return attr;
  } catch {
    return null;
  }
}
