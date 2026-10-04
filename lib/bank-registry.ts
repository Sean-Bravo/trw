/**
 * Public bank-statement source registry.
 *
 * Mirrors backend/configs/banks/*.yaml, which is the source of truth and
 * what GET /v1/sources serves. Every public surface that names a supported
 * bank (homepage, FAQ, upload page) reads this list, and
 * __tests__/lib/bank-registry.test.ts fails if it drifts from the YAMLs.
 *
 * Rule: a bank appears here only if it has a parser config. "Support means
 * tested support" — verified banks have been run against real statements;
 * beta banks are configured but not yet verified.
 */

export type BankStatus = 'verified' | 'beta';

export interface BankSource {
  /** Matches the `id` returned by GET /v1/sources (bank name, lower-cased, spaces → underscores). */
  id: string;
  name: string;
  status: BankStatus;
}

export const BANK_SOURCES: readonly BankSource[] = [
  { id: 'chase', name: 'Chase', status: 'verified' },
  { id: 'mercury', name: 'Mercury', status: 'verified' },
  { id: 'navy_federal', name: 'Navy Federal', status: 'verified' },
  { id: 'bank_of_america', name: 'Bank of America', status: 'beta' },
  { id: 'wells_fargo', name: 'Wells Fargo', status: 'beta' },
  { id: 'citi', name: 'Citi', status: 'beta' },
];

export const VERIFIED_BANKS = BANK_SOURCES.filter((b) => b.status === 'verified');
export const BETA_BANKS = BANK_SOURCES.filter((b) => b.status === 'beta');

/** "Chase, Mercury, and Navy Federal" */
export function formatBankList(banks: readonly BankSource[]): string {
  const names = banks.map((b) => b.name);
  if (names.length <= 1) return names.join('');
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}
