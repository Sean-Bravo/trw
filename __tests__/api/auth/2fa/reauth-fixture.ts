/**
 * Shared fake users row for the 2FA re-auth route tests (disable and
 * regenerate-codes). The routes run against the real verifyTwoFactorReauth
 * and lib/2fa, with only the DB and bcrypt faked, so a test sees exactly
 * which UPDATEs the lockout and the route issue.
 *
 * Not a test file itself: jest's testMatch only picks up *.test.ts.
 */

import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import * as db from '@/lib/db';
import { hashBackupCodes } from '@/lib/2fa';

export const PASSWORD = 'right-password';
export const BACKUP_CODE = 'ABCD-EF01-2345';
// Fixed base32 secret: generateSecret() trips a Buffer realm check under jsdom.
const TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

export type ReauthRow = {
  password_hash: string | null;
  locked_until: Date | null;
  failed_login_attempts: number;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  backup_codes: string[] | null;
};

export function setupReauthDb() {
  const mockQueryOne = db.queryOne as jest.MockedFunction<typeof db.queryOne>;
  const mockExecute = db.execute as jest.MockedFunction<typeof db.execute>;

  const row: ReauthRow = {
    password_hash: 'hash',
    locked_until: null,
    failed_login_attempts: 0,
    two_factor_enabled: true,
    two_factor_secret: TOTP_SECRET,
    backup_codes: hashBackupCodes([BACKUP_CODE]),
  };

  jest
    .spyOn(bcrypt, 'compare')
    .mockImplementation(async (pw: string) => pw === PASSWORD);

  mockQueryOne.mockImplementation(async (sql: string) => {
    if (/SELECT password_hash, locked_until, two_factor_enabled/.test(sql)) {
      return { ...row } as never;
    }
    return null;
  });

  // Mirror recordFailedLogin / clearFailedLogins on the fake row, so the
  // real lockout threshold in lib/auth-db.ts is what the tests exercise.
  mockExecute.mockImplementation(async (sql: string, params?: unknown[]) => {
    if (/failed_login_attempts = failed_login_attempts \+ 1/.test(sql)) {
      row.failed_login_attempts += 1;
      if (row.failed_login_attempts >= (params?.[1] as number)) {
        row.locked_until = new Date(Date.now() + 30 * 60 * 1000);
      }
    } else if (/SET failed_login_attempts = 0/.test(sql)) {
      row.failed_login_attempts = 0;
      row.locked_until = null;
    }
    return { rowCount: 1, rows: [] } as never;
  });

  const totp = () => authenticator.generate(row.two_factor_secret!);
  const wrongTotp = () => (totp() === '000000' ? '111111' : '000000');
  const executedSql = () => mockExecute.mock.calls.map(([sql]) => sql as string);
  const countedFailure = () =>
    executedSql().some((sql) => /failed_login_attempts = failed_login_attempts \+ 1/.test(sql));

  return { row, mockExecute, totp, wrongTotp, executedSql, countedFailure };
}
