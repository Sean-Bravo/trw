/**
 * Public crypto-exchange source registry.
 *
 * Mirrors backend/configs/exchanges.yaml, which is the source of truth and
 * what GET /v1/sources serves. Every public surface that names a supported
 * exchange or counts them (homepage, pricing, FAQ, SEO schema, dashboard
 * selector, docs) reads this list, and __tests__/lib/exchange-registry.test.ts
 * fails if it drifts from the YAML.
 *
 * Rule: an exchange appears here only if it has a parser. "Support means
 * tested support" — verified exchanges have a fixture-backed parse test in
 * CI; beta exchanges have a parser but no fixture yet.
 */

export type ExchangeStatus = 'verified' | 'beta' | 'experimental';

export interface ExchangeSource {
  /** Matches the `id` returned by GET /v1/sources and the `exchange` request parameter. */
  id: string;
  name: string;
  status: ExchangeStatus;
}

export const EXCHANGE_SOURCES: readonly ExchangeSource[] = [
  { id: 'binance', name: 'Binance', status: 'verified' },
  { id: 'coinbase', name: 'Coinbase', status: 'verified' },
  { id: 'kraken', name: 'Kraken', status: 'verified' },
  { id: 'kucoin', name: 'KuCoin', status: 'verified' },
  { id: 'bybit', name: 'Bybit', status: 'verified' },
  { id: 'cashapp', name: 'Cash App', status: 'verified' },
  { id: 'robinhood', name: 'Robinhood', status: 'verified' },
  { id: 'paypal', name: 'PayPal', status: 'verified' },
  { id: 'venmo', name: 'Venmo', status: 'beta' },
  { id: 'crypto.com', name: 'Crypto.com', status: 'verified' },
  { id: 'gemini', name: 'Gemini', status: 'verified' },
  { id: 'ftx', name: 'FTX', status: 'verified' },
  { id: 'bitfinex', name: 'Bitfinex', status: 'verified' },
  { id: 'okx', name: 'OKX', status: 'verified' },
];

export const VERIFIED_EXCHANGES = EXCHANGE_SOURCES.filter((e) => e.status === 'verified');
export const BETA_EXCHANGES = EXCHANGE_SOURCES.filter((e) => e.status === 'beta');

/** Use this wherever copy says "N exchanges" so the number can never go stale. */
export const EXCHANGE_COUNT = EXCHANGE_SOURCES.length;
