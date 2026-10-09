/**
 * Legacy "Pro" tier guard.
 *
 * The consumer-era Pro tier ($49 per tax year, annotated CSV, "adjusted cost
 * basis", multi-year reconciliation) was retired: lib/feature-flags.ts gives
 * every dashboard user every dashboard feature, and lib/tier-registry.ts is
 * the only price list. Three docs pages were deleted and redirected
 * (next.config.ts). This test fails if the tier — or any price that isn't in
 * the registry — creeps back into docs or blog copy, and if a deleted page's
 * slug is linked or listed again.
 *
 * Regression: 17 docs pages and two blog posts still sold "TaxFormatter Pro
 * ($49)" four months after the tier was removed, and the bank-statement post
 * carried a Pro $89/yr / Premium $189/yr table that never existed.
 */
import fs from 'fs';
import path from 'path';
import { TIERS } from '@/lib/tier-registry';
import { DOCS_SECTIONS } from '@/lib/docs-config';

const ROOT = path.resolve(__dirname, '..');

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(rel, exts));
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(rel);
  }
  return out;
}

const CONTENT = [...walk('content/docs', ['.md', '.mdx']), ...walk('content/blog', ['.md', '.mdx'])];

const RETIRED_SLUGS = [
  'free-vs-pro-differences',
  'pro-tier-flagged-csv',
  'free-tier-export-format',
];

// "Coinbase Pro", "ZenLedger Pro", "tax pro", and "Pro tip" are all fine —
// what must not come back is TaxFormatter's own Pro tier.
const BANNED: Array<[RegExp, string]> = [
  [/TaxFormatter Pro\b/, 'TaxFormatter Pro'],
  [/\bPro [Tt]ier\b/, 'Pro tier'],
  [/\bPro CSV\b/, 'Pro CSV'],
  [/\bFree (vs|or) Pro\b/, 'Free vs/or Pro'],
  [/\bPro\/Premium\b|\bPro or Premium\b|\bPremium users\b/, 'Pro/Premium plan'],
  [/per tax year/i, '"per tax year" pricing'],
  // "$49/yr" is Bank2CSV's price in a competitor table; ours was "$49/year".
  [/\$49(?![\d,]|\/yr\b)/, '$49 price'],
  [/\$(89|189)\/yr/, 'Pro $89 / Premium $189 pricing'],
  [/\$9\/file/, '$9/file pricing'],
  [/adjusted cost basis/i, '"adjusted cost basis" feature claim'],
  [/pre-adjusted/i, '"pre-adjusted" feature claim'],
  [/multi-year reconciliation/i, '"multi-year reconciliation" feature claim'],
];

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('the retired Pro tier stays retired', () => {
  it.each(RETIRED_SLUGS)('docs page "%s" is gone', (slug) => {
    const hits = CONTENT.filter((f) => f.includes(slug));
    expect(hits).toEqual([]);
  });

  it.each(RETIRED_SLUGS)('docs nav no longer lists "%s"', (slug) => {
    const listed = DOCS_SECTIONS.flatMap((s) => s.pages.map((p) => p.slug));
    expect(listed).not.toContain(slug);
  });

  it.each(RETIRED_SLUGS)('next.config.ts redirects "%s"', (slug) => {
    expect(read('next.config.ts')).toContain(`/${slug}"`);
  });

  it.each(CONTENT)('%s carries no legacy Pro claim', (rel) => {
    const text = read(rel);
    const hits = BANNED.filter(([re]) => re.test(text)).map(([, label]) => label);
    expect(hits).toEqual([]);
    for (const slug of RETIRED_SLUGS) {
      expect(text).not.toContain(`/${slug}`);
    }
  });

  it.each(CONTENT)('%s quotes only registry prices for TaxFormatter plans', (rel) => {
    const text = read(rel);
    // "$X/mo", "$X/month", "$X per month" — any monthly price must be ours.
    for (const m of text.matchAll(/\$(\d{1,3}(?:,\d{3})?)\s*(?:\/|per)\s*(?:mo|month)\b/g)) {
      const usd = Number(m[1].replace(/,/g, ''));
      expect(TIERS.map((t) => t.priceUsd)).toContain(usd);
    }
  });
});
