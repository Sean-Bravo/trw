/**
 * Retention copy guard.
 *
 * Every surface that talks about data retention must match the policy in
 * lib/retention.ts ("everything you send us is deleted within 30 days").
 * This test fails if any superseded claim — 24-hour deletion, 1-year
 * retention, "zero-retention", "Delete after download", client-side
 * processing — creeps back into one of these files.
 */
import fs from 'fs';
import path from 'path';
import { RETENTION_DAYS } from '@/lib/retention';

const SURFACES = [
  'app/security/page.tsx',
  'app/privacy-policy/page.tsx',
  'app/terms/page.tsx',
  'app/about/page.tsx',
  'app/upload/page.tsx',
  'components/marketing/SecurityFeatures.tsx',
  'content/docs/faq/index.md',
  'content/docs/api/index.md',
  'content/blog/taxformatter-launch-announcement.mdx',
  'content/blog/bank-statement-pdf-to-excel-converter.mdx',
  'ARCHITECTURE.md',
];

const BANNED: Array<[RegExp, string]> = [
  [/\b24[\s-]?(hours|hrs)\b/i, '24-hour deletion claim'],
  [/\b(for|up to) (1|one) year\b/i, '1-year retention claim'],
  [/zero[\s-]?retention/i, '"zero-retention" claim'],
  [/zero[\s-]?persistence/i, '"zero persistence" claim'],
  [/zero[\s-]?knowledge/i, '"zero-knowledge" claim'],
  [/user[\s-]?controlled retention/i, '"user-controlled retention" claim'],
  [/delete after download/i, 'removed "Delete after download" toggle'],
  [/deleted after download/i, '"deleted after download" claim'],
  [/never leaves your browser/i, 'client-side processing claim'],
];

function read(file: string): string {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}

describe('retention copy matches the policy', () => {
  it('policy is 30 days', () => {
    expect(RETENTION_DAYS).toBe(30);
  });

  it.each(SURFACES)('%s carries no superseded retention claim', (file) => {
    const text = read(file);
    const hits = BANNED.filter(([re]) => re.test(text)).map(([, label]) => label);
    expect(hits).toEqual([]);
  });

  it.each(SURFACES)('%s states the policy number', (file) => {
    expect(read(file)).toMatch(new RegExp(`\\b${RETENTION_DAYS}[\\s-]?days?\\b`, 'i'));
  });
});
