/**
 * Claims guard: public copy says only what is literally true.
 *
 * TaxFormatter has no SOC 2 report, no penetration test, no SLA, no secure
 * enclaves, no usage stats worth quoting, and never takes exchange or bank
 * credentials. AWS and Stripe hold the certifications; we say that, not
 * "SOC2 compliant". This test fails if template residue or an unbacked claim
 * creeps back onto a live surface, and if a marketing component goes dead
 * (unimported) — dead components are where stale claims hide.
 *
 * Regression: the live homepage TrustEngine section said "Zero-persistence
 * Lambda", "AWS Secure Enclaves", "SOC2 Compliant Infrastructure", "will
 * instantly reject any key with elevated permissions" (we never take keys)
 * and documented an X-TF-Processing-Time header that doesn't exist; nine
 * unimported components still carried "10,000+ files processed", "99.9%
 * accuracy" and "We trace the blockchain".
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(rel, exts));
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(rel);
  }
  return out;
}

const LIVE_SURFACES = [
  ...walk('components/marketing', ['.tsx']),
  ...walk('components/seo', ['.tsx']),
  'app/page.tsx',
  'app/about/page.tsx',
  'app/security/page.tsx',
  'app/privacy-policy/page.tsx',
  'app/terms/page.tsx',
  'app/upload/page.tsx',
  'app/playground/page.tsx',
  'README.md',
  'ARCHITECTURE.md',
  ...walk('content/docs', ['.md']),
  ...walk('content/blog', ['.mdx']),
];

const BANNED: Array<[RegExp, string]> = [
  [/SOC ?2[\s-]?(compliant|certified)/i, 'SOC 2 compliance claim (AWS/Stripe hold SOC 2, we do not)'],
  [/ISO ?27001/i, 'ISO 27001 claim'],
  [/secure enclave/i, '"secure enclave" claim'],
  [/penetration test|pen[\s-]?test/i, 'penetration testing claim'],
  [/\bSLA\b/, 'SLA claim'],
  [/(bank|military|enterprise)[\s-]grade/i, '"-grade" puffery'],
  [/end-to-end encrypt/i, '"end-to-end encryption" claim'],
  [/GDPR[\s-]?(ready|compliant)/i, 'GDPR claim'],
  [/\b\d{1,3},\d{3}\+ (files|uploads|users|developers|customers)/i, 'usage-count claim'],
  [/\b9\d(\.\d+)?%\+? (accuracy|accurate|uptime)/i, 'accuracy / uptime percentage claim'],
  [/zero[\s-]?access/i, '"zero-access" claim'],
  [/instantly reject/i, 'key-permission rejection claim (we never take keys)'],
  [/X-TF-Processing-Time/, 'non-existent response header'],
  [/trace the blockchain/i, 'blockchain tracing claim'],
  [/within 48 hours/i, '48-hour turnaround promise'],
  [/foundingDate|datePublished: '20/, 'unverified founding/publication date'],
];

describe('live copy carries no unbacked claim', () => {
  it.each(LIVE_SURFACES)('%s', (rel) => {
    const text = read(rel);
    const hits = BANNED.filter(([re]) => re.test(text)).map(([, label]) => label);
    expect(hits).toEqual([]);
  });
});

describe('every marketing component is rendered somewhere', () => {
  const components = fs
    .readdirSync(path.join(ROOT, 'components/marketing'))
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => f.replace(/\.tsx$/, ''));
  const sources = [...walk('app', ['.tsx']), ...walk('components', ['.tsx'])];

  it.each(components)('components/marketing/%s.tsx is imported by a page or component', (name) => {
    const importers = sources.filter((rel) => {
      if (rel === path.join('components/marketing', `${name}.tsx`)) return false;
      const src = read(rel);
      return src.includes(`marketing/${name}'`) || src.includes(`./${name}'`);
    });
    expect(importers.length).toBeGreaterThan(0);
  });
});
