/**
 * Drift guard: lib/bank-registry.ts must mirror backend/configs/banks/*.yaml,
 * and no public surface may name a bank that has no parser config.
 *
 * Regression: the homepage listed 7 banks (incl. Capital One, which has no
 * config) and the upload page listed 13, while /v1/sources served 0.
 */

import fs from 'fs';
import path from 'path';
import { BANK_SOURCES, VERIFIED_BANKS, BETA_BANKS, formatBankList } from '@/lib/bank-registry';

const ROOT = path.resolve(__dirname, '..', '..');
const CONFIG_DIR = path.join(ROOT, 'backend', 'configs', 'banks');

interface YamlBank {
  file: string;
  id: string;
  name: string;
  status: string;
}

/** Minimal reader for the `bank:` block — avoids adding a YAML dependency. */
function readYamlBanks(): YamlBank[] {
  return fs
    .readdirSync(CONFIG_DIR)
    .filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))
    .map((file) => {
      const text = fs.readFileSync(path.join(CONFIG_DIR, file), 'utf8');
      const block = text.split(/\n(?=\S)/).find((b) => b.startsWith('bank:')) ?? '';
      const name = /^\s+name:\s*"([^"]+)"/m.exec(block)?.[1] ?? '';
      const status = /^\s+status:\s*"([^"]+)"/m.exec(block)?.[1] ?? 'beta';
      return { file, id: name.toLowerCase().replace(/ /g, '_'), name, status };
    });
}

// Banks that have appeared in copy before without a parser config.
const KNOWN_UNSUPPORTED = ['Capital One', 'US Bank', 'PNC', 'TD Bank', 'Regions', 'HSBC', 'BMO'];

const PUBLIC_SURFACES = [
  'components/marketing/APICapabilities.tsx',
  'components/marketing/FAQ.tsx',
  'components/marketing/AgentSection.tsx',
  'app/upload/page.tsx',
];

describe('bank registry mirrors backend/configs/banks', () => {
  const yamlBanks = readYamlBanks();

  it('finds the YAML configs (test is wired to the real files)', () => {
    expect(yamlBanks.length).toBeGreaterThan(0);
  });

  it('lists exactly the banks that have a config, with the same ids', () => {
    const tsIds = BANK_SOURCES.map((b) => b.id).sort();
    const yamlIds = yamlBanks.map((b) => b.id).sort();
    expect(tsIds).toEqual(yamlIds);
  });

  it('matches each bank name and status to its YAML', () => {
    for (const y of yamlBanks) {
      const ts = BANK_SOURCES.find((b) => b.id === y.id);
      expect(ts).toBeDefined();
      expect(ts!.name).toBe(y.name);
      expect(ts!.status).toBe(y.status);
    }
  });

  it('marks exactly the three real-statement-tested banks as verified', () => {
    expect(VERIFIED_BANKS.map((b) => b.id).sort()).toEqual(['chase', 'mercury', 'navy_federal']);
    expect(BETA_BANKS.length).toBe(BANK_SOURCES.length - VERIFIED_BANKS.length);
  });
});

describe('public surfaces only name supported banks', () => {
  it.each(PUBLIC_SURFACES)('%s names no bank without a parser config', (rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const bank of KNOWN_UNSUPPORTED) {
      expect(src).not.toContain(bank);
    }
  });
});

describe('formatBankList', () => {
  it('joins names in prose', () => {
    expect(formatBankList(VERIFIED_BANKS)).toBe('Chase, Mercury, and Navy Federal');
    expect(formatBankList(VERIFIED_BANKS.slice(0, 2))).toBe('Chase and Mercury');
    expect(formatBankList(VERIFIED_BANKS.slice(0, 1))).toBe('Chase');
  });
});
