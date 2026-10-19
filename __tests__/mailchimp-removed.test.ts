/**
 * Mailchimp removal guard.
 *
 * Mailchimp was removed from the stack: its only live use was /api/waitlist,
 * whose footer form was never rendered, and /api/subscribe had no caller.
 * Transactional email goes through lib/email.ts and is unaffected. This test
 * fails if either route, the SDK, the env vars, or a Mailchimp reference in
 * app code (including the privacy policy's subprocessor list) comes back.
 *
 * Regression: with the MAILCHIMP_* env vars unset, /api/waitlist answered
 * "You're subscribed" while dropping the email, and the SDK's error objects
 * leaked the API key into Vercel logs (PR #136).
 */
import fs from 'fs';
import path from 'path';

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

describe('Mailchimp stays removed', () => {
  it.each(['app/api/waitlist', 'app/api/subscribe', 'lib/mailchimp.ts', 'types/mailchimp.d.ts'])(
    '%s does not exist',
    (rel) => {
      expect(fs.existsSync(path.join(ROOT, rel))).toBe(false);
    },
  );

  it('package.json has no Mailchimp dependency', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(deps.filter((name) => /mailchimp/i.test(name))).toEqual([]);
  });

  it('.env.example has no MAILCHIMP_ vars', () => {
    expect(fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8')).not.toMatch(/MAILCHIMP_/);
  });

  it('app code has no Mailchimp, /api/waitlist or /api/subscribe references', () => {
    const files = ['app', 'components', 'lib', 'types', 'hooks'].flatMap((dir) =>
      fs.existsSync(path.join(ROOT, dir)) ? walk(dir, ['.ts', '.tsx']) : [],
    );
    const hits = files.filter((rel) =>
      /mailchimp|\/api\/waitlist|\/api\/subscribe/i.test(fs.readFileSync(path.join(ROOT, rel), 'utf8')),
    );
    expect(hits).toEqual([]);
  });
});
