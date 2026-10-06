/**
 * Drift guard: lib/exchange-registry.ts must mirror backend/configs/exchanges.yaml,
 * no public surface may hand-write an exchange count, and no public surface
 * (marketing, docs, blog) may name an exchange that has no parser.
 *
 * Regression: the homepage logo grid and file ticker showed Bitstamp, eToro
 * and Gate.io, a blog post listed Uphold, and the docs promised Huobi by
 * Q2 2026 — none have a parser. "14 exchanges" was hard-coded in nine files.
 */

import fs from 'fs';
import path from 'path';
import {
  EXCHANGE_SOURCES,
  VERIFIED_EXCHANGES,
  BETA_EXCHANGES,
  EXCHANGE_COUNT,
} from '@/lib/exchange-registry';

const ROOT = path.resolve(__dirname, '..', '..');
const YAML_PATH = path.join(ROOT, 'backend', 'configs', 'exchanges.yaml');

interface YamlExchange {
  id: string;
  name: string;
  status: string;
}

/** Minimal reader for the `exchanges:` list — avoids adding a YAML dependency. */
function readYamlExchanges(): YamlExchange[] {
  const text = fs.readFileSync(YAML_PATH, 'utf8');
  return text
    .split(/\n(?=\s*- id:)/)
    .filter((block) => /^\s*- id:/.test(block))
    .map((block) => {
      const id = /- id:\s*(\S+)/.exec(block)?.[1] ?? '';
      const name = /^\s+name:\s*(.+?)\s*$/m.exec(block)?.[1] ?? '';
      const status = /^\s+status:\s*(\S+)/m.exec(block)?.[1] ?? 'beta';
      return { id, name, status };
    });
}

// Exchanges that have appeared in copy before without a parser.
const KNOWN_UNSUPPORTED = ['Bitstamp', 'eToro', 'Gate.io', 'Uphold', 'Huobi'];

const PUBLIC_SURFACES = [
  'app/layout.tsx',
  'app/about/page.tsx',
  'components/marketing/APICapabilities.tsx',
  'components/marketing/APIHero.tsx',
  'components/marketing/APIPricing.tsx',
  'components/marketing/FAQ.tsx',
  'components/marketing/Hero.tsx',
  'components/marketing/Integrations.tsx',
  'components/marketing/LogoGrid.tsx',
  'components/dashboard/ExchangeSelector.tsx',
  'components/seo/SoftwareApplicationSchema.tsx',
  'components/seo/StructuredData.tsx',
  'components/seo/WebAPISchema.tsx',
  'content/docs/getting-started/supported-exchanges.md',
];

function listFiles(dir: string, ext: string): string[] {
  return fs
    .readdirSync(path.join(ROOT, dir))
    .filter((f) => f.endsWith(ext))
    .map((f) => path.join(dir, f));
}

const BLOG_POSTS = listFiles('content/blog', '.mdx');

describe('exchange registry mirrors backend/configs/exchanges.yaml', () => {
  const yamlExchanges = readYamlExchanges();

  it('finds the YAML registry (test is wired to the real file)', () => {
    expect(yamlExchanges.length).toBeGreaterThan(0);
  });

  it('lists exactly the exchanges in the YAML, with the same ids', () => {
    expect(EXCHANGE_SOURCES.map((e) => e.id).sort()).toEqual(yamlExchanges.map((e) => e.id).sort());
  });

  it('matches each exchange name and status to its YAML row', () => {
    for (const y of yamlExchanges) {
      const ts = EXCHANGE_SOURCES.find((e) => e.id === y.id);
      expect(ts).toBeDefined();
      expect(ts!.name).toBe(y.name);
      expect(ts!.status).toBe(y.status);
    }
  });

  it('never lists the generic fallback as a source', () => {
    expect(EXCHANGE_SOURCES.map((e) => e.id)).not.toContain('generic');
  });

  it('splits verified and beta without losing anyone', () => {
    expect(VERIFIED_EXCHANGES.length + BETA_EXCHANGES.length).toBe(EXCHANGE_COUNT);
    expect(BETA_EXCHANGES.map((e) => e.id)).toEqual(['venmo']);
  });
});

describe('public surfaces generate from the registry', () => {
  it.each(PUBLIC_SURFACES)('%s names no exchange without a parser', (rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const name of KNOWN_UNSUPPORTED) {
      expect(src).not.toContain(name);
    }
  });

  it.each(PUBLIC_SURFACES.filter((f) => f.endsWith('.tsx')))('%s does not hard-code the exchange count', (rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    expect(src).not.toMatch(/\b\d+\+? (crypto )?exchanges?\b/i);
    expect(src).not.toMatch(/\b\d+\+? known formats\b/i);
    expect(src).not.toMatch(/\b\d+\+? (bank statement PDF parsers|banks?)\b/i);
  });
});

describe('docs: supported-exchanges.md mirrors the registry', () => {
  const md = fs.readFileSync(path.join(ROOT, 'content/docs/getting-started/supported-exchanges.md'), 'utf8');
  const rows = [...md.matchAll(/^\| \*\*(.+?)\*\* \| `(.+?)` \| (Verified|Beta|Experimental) \|/gm)].map((m) => ({
    name: m[1],
    id: m[2],
    status: m[3].toLowerCase(),
  }));

  it('lists every registry exchange exactly once, with its id and status', () => {
    expect(rows.map((r) => r.id).sort()).toEqual(EXCHANGE_SOURCES.map((e) => e.id).sort());
    for (const row of rows) {
      const ex = EXCHANGE_SOURCES.find((e) => e.id === row.id)!;
      expect(row.name).toBe(ex.name);
      expect(row.status).toBe(ex.status);
    }
  });

  it('makes no roadmap promises', () => {
    expect(md).not.toMatch(/coming soon/i);
    expect(md).not.toMatch(/\bETA\b/);
  });
});

describe('blog posts only name supported sources', () => {
  it.each(BLOG_POSTS)('%s names no exchange without a parser', (rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const name of KNOWN_UNSUPPORTED) {
      expect(src).not.toContain(name);
    }
  });

  it.each(BLOG_POSTS)('%s does not claim "50+" or "dozens" of banks', (rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    expect(src).not.toMatch(/(50\+|over 50|dozens (of|more)) (other )?(banks?|bank formats|financial institutions)\b/i);
    expect(src).not.toMatch(/\bbanks? \(50\+\)/i);
  });
});
