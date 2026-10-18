import { execute, queryOne, query, DbUser, DbAccount, DbSubscription } from './db';
import type { Attribution } from './attribution';
import bcrypt from 'bcryptjs';
import { constantTimeStringEqual } from './validation';
import { verifyBackupCode, verifyToken } from './2fa';

// User response type (without password_hash)
export interface UserWithSubscription {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt: Date;
}

/**
 * Find user by email (basic - returns DbUser for internal auth use)
 */
export async function findUserByEmail(email: string): Promise<DbUser | null> {
  // F40: verifyPassword reads the lockout columns from this row, and F31
  // reads email_verified — leaving any of them out makes those gates dead code.
  return queryOne<DbUser>(
    `SELECT id, email, password_hash, name, email_verified,
            failed_login_attempts, locked_until, created_at
     FROM users
     WHERE email = $1`,
    [email.toLowerCase()]
  );
}

/**
 * Find user by email with subscription info
 */
export async function findUserByEmailWithSubscription(email: string): Promise<UserWithSubscription | null> {
  const result = await queryOne<{
    id: string;
    email: string;
    name: string | null;
    email_verified: boolean;
    created_at: Date;
  }>(
    `SELECT u.id, u.email, u.name, u.email_verified, u.created_at
     FROM users u
     WHERE u.email = $1`,
    [email.toLowerCase()]
  );

  if (!result) return null;

  return {
    id: result.id,
    email: result.email,
    name: result.name,
    emailVerified: result.email_verified ?? false,
    createdAt: result.created_at,
  };
}

/**
 * Find user by ID with subscription info
 */
export async function findUserById(id: string): Promise<UserWithSubscription | null> {
  const result = await queryOne<{
    id: string;
    email: string;
    name: string | null;
    email_verified: boolean;
    created_at: Date;
  }>(
    `SELECT u.id, u.email, u.name, u.email_verified, u.created_at
     FROM users u
     WHERE u.id = $1`,
    [id]
  );

  if (!result) return null;

  return {
    id: result.id,
    email: result.email,
    name: result.name,
    emailVerified: result.email_verified ?? false,
    createdAt: result.created_at,
  };
}

/**
 * Unified user tier — same enum for dashboard and API.
 * Mirrors api_keys.tier (the canonical billing source).
 */
export type UserTier = 'free' | 'starter' | 'growth' | 'business';

/**
 * Resolve a user's effective tier from their active API keys. When a user
 * holds multiple active keys (e.g., a free key + a paid key), the highest
 * tier wins — the user paid for the better tier and should see it everywhere.
 *
 * Defaults to 'free' if no active key exists (anonymous, or pre-Phase-4
 * accounts that predate auto-provisioning).
 */
export async function getUserTier(userId: string): Promise<UserTier> {
  const row = await queryOne<{ tier: UserTier }>(
    `SELECT tier FROM api_keys
     WHERE user_id = $1 AND is_active = true
     ORDER BY CASE tier
       WHEN 'business' THEN 4
       WHEN 'growth'   THEN 3
       WHEN 'starter'  THEN 2
       ELSE 1
     END DESC
     LIMIT 1`,
    [userId]
  );
  return row?.tier ?? 'free';
}

/**
 * Create a new user with email/password and verification code
 */
export async function createUser(
  email: string,
  password: string,
  name?: string,
  verificationCode?: string,
  attribution?: Attribution | null
): Promise<UserWithSubscription> {
  const passwordHash = await bcrypt.hash(password, 12);

  // Set verification code expiry to 15 minutes from now
  const verificationExpires = verificationCode
    ? new Date(Date.now() + 15 * 60 * 1000)
    : null;

  // Insert user
  const user = await queryOne<{
    id: string;
    email: string;
    name: string | null;
    email_verified: boolean;
    created_at: Date;
  }>(
    `INSERT INTO users (email, password_hash, name, email_verified, verification_code, verification_code_expires,
                        acquisition_source, acquisition_medium, acquisition_campaign, acquisition_landing, funnel)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, email, name, email_verified, created_at`,
    [
      email.toLowerCase(),
      passwordHash,
      name || null,
      false,
      verificationCode || null,
      verificationExpires,
      ...attributionParams(attribution),
    ]
  );

  if (!user) {
    throw new Error('Failed to create user');
  }

  // Create default free subscription
  await execute(
    `INSERT INTO subscriptions (user_id, tier, status)
     VALUES ($1, 'free', 'active')`,
    [user.id]
  );

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.email_verified,
    createdAt: user.created_at,
  };
}

/**
 * Verify password for a user
 */
// H-7: per-account brute force protection. After MAX_LOGIN_ATTEMPTS
// failures the account is locked for LOCKOUT_DURATION_MIN minutes.
// Wrong passwords and wrong 2FA codes both count. The counter is reset
// only when a session is actually issued (authorizeCredentials), not on a
// correct password alone — otherwise anyone holding the password could
// reset it between rounds of 2FA-code guesses (F40).
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MIN = 30;

/** Count one failed login (bad password or bad 2FA code); lock at the threshold. */
export async function recordFailedLogin(userId: string): Promise<void> {
  // One atomic UPDATE so concurrent failures cannot bypass the threshold.
  await execute(
    `UPDATE users
     SET failed_login_attempts = failed_login_attempts + 1,
         locked_until = CASE
           WHEN failed_login_attempts + 1 >= $2
           THEN now() + ($3 || ' minutes')::interval
           ELSE locked_until
         END
     WHERE id = $1`,
    [userId, MAX_LOGIN_ATTEMPTS, String(LOCKOUT_DURATION_MIN)]
  );
}

async function clearFailedLogins(userId: string): Promise<void> {
  await execute(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
    [userId]
  );
}

export async function verifyPassword(
  email: string,
  password: string
): Promise<UserWithSubscription | null> {
  const user = await findUserByEmail(email);

  if (!user || !user.password_hash) {
    return null;
  }

  // H-7: reject early if the account is currently locked. Returning the
  // same `null` we'd return for an invalid password avoids leaking lock
  // state to enumeration attempts.
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    await recordFailedLogin(user.id);
    return null;
  }

  return findUserById(user.id);
}

// F30: proof that /api/auth/2fa/login-verify accepted a second factor.
// Only the SHA-256 is stored; the raw token goes to the browser once and
// is handed straight to signIn(), so a short expiry is plenty.
const TWO_FACTOR_LOGIN_TOKEN_TTL_MIN = 2;

async function sha256Hex(value: string): Promise<string> {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Mint a single-use 2FA login token (db/migrations/016). Returns the raw token. */
export async function createTwoFactorLoginToken(userId: string): Promise<string> {
  const crypto = await import('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  await execute(
    `UPDATE users
     SET two_factor_login_token_hash = $1,
         two_factor_login_token_expires = now() + ($2 || ' minutes')::interval
     WHERE id = $3`,
    [await sha256Hex(token), String(TWO_FACTOR_LOGIN_TOKEN_TTL_MIN), userId]
  );
  return token;
}

/** True once per token: verifies it in constant time, then clears it. */
export async function consumeTwoFactorLoginToken(
  userId: string,
  token: string
): Promise<boolean> {
  const row = await queryOne<{
    two_factor_login_token_hash: string | null;
    two_factor_login_token_expires: Date | null;
  }>(
    `SELECT two_factor_login_token_hash, two_factor_login_token_expires
     FROM users WHERE id = $1`,
    [userId]
  );
  if (!row?.two_factor_login_token_hash || !row.two_factor_login_token_expires) {
    return false;
  }

  const hash = await sha256Hex(token);
  const valid =
    constantTimeStringEqual(row.two_factor_login_token_hash, hash) &&
    new Date(row.two_factor_login_token_expires) > new Date();

  // Clear on any attempt so a token is never tried twice. The hash match in
  // the WHERE makes two concurrent sign-ins with one token race to a single
  // winner: only the request whose UPDATE clears the row gets a session.
  // RETURNING is required: execute() counts returned rows.
  const cleared = await execute(
    `UPDATE users
     SET two_factor_login_token_hash = NULL, two_factor_login_token_expires = NULL
     WHERE id = $1 AND two_factor_login_token_hash = $2
     RETURNING id`,
    [userId, row.two_factor_login_token_hash]
  );
  return valid && cleared.rowCount === 1;
}

/**
 * The full server-side gate for a credentials sign-in (NextAuth authorize()).
 * Returns null unless the password is right, the account is not locked, the
 * email is verified (F31) and, when 2FA is on, a login-verify token is
 * presented and consumed (F30).
 */
export async function authorizeCredentials(
  email: string,
  password: string,
  twoFactorToken?: string
): Promise<UserWithSubscription | null> {
  const user = await verifyPassword(email, password);
  if (!user) return null;

  if (!user.emailVerified) return null;

  const twoFactor = await queryOne<{ two_factor_enabled: boolean }>(
    `SELECT two_factor_enabled FROM users WHERE id = $1`,
    [user.id]
  );
  if (!twoFactor) return null;
  if (twoFactor.two_factor_enabled) {
    if (!twoFactorToken || !(await consumeTwoFactorLoginToken(user.id, twoFactorToken))) {
      return null;
    }
  }

  await clearFailedLogins(user.id);
  return user;
}

export type TwoFactorReauthResult = 'ok' | 'invalid' | 'locked' | 'not_enabled';

/**
 * Fresh proof before 2FA is turned off or its backup codes replaced (scan C
 * F1), so a stolen session alone cannot strip the second factor. Needs the
 * current password and a TOTP or unused backup code. Accounts with no
 * password (Google-only) prove with the code alone. A wrong answer counts
 * toward the same lockout as a failed login. The caller's UPDATE clears or
 * replaces backup_codes, which uses up a backup code given here.
 */
export async function verifyTwoFactorReauth(
  userId: string,
  password: string,
  code: string
): Promise<TwoFactorReauthResult> {
  const user = await queryOne<{
    password_hash: string | null;
    locked_until: Date | null;
    two_factor_enabled: boolean;
    two_factor_secret: string | null;
    backup_codes: string[] | null;
  }>(
    `SELECT password_hash, locked_until, two_factor_enabled, two_factor_secret, backup_codes
     FROM users WHERE id = $1`,
    [userId]
  );
  if (!user?.two_factor_enabled) return 'not_enabled';
  if (user.locked_until && new Date(user.locked_until) > new Date()) return 'locked';

  // Check both before deciding, so the result never says which one was wrong.
  const passwordOk = user.password_hash
    ? await bcrypt.compare(password, user.password_hash)
    : true;
  const totpOk = !!user.two_factor_secret && verifyToken(code, user.two_factor_secret);
  const backupOk = !!user.backup_codes && verifyBackupCode(code, user.backup_codes).valid;

  if (!passwordOk || !(totpOk || backupOk)) {
    await recordFailedLogin(userId);
    return 'invalid';
  }

  await clearFailedLogins(userId);
  return 'ok';
}

/**
 * Find or create OAuth user
 */
/** The five attribution columns, in INSERT order; all NULL when unknown. */
function attributionParams(attribution?: Attribution | null): Array<string | null> {
  return [
    attribution?.source ?? null,
    attribution?.medium ?? null,
    attribution?.campaign ?? null,
    attribution?.landing ?? null,
    attribution?.funnel ?? null,
  ];
}

export async function findOrCreateOAuthUser(
  provider: string,
  providerAccountId: string,
  email: string,
  name?: string,
  accessToken?: string,
  refreshToken?: string,
  expiresAt?: number,
  attribution?: Attribution | null,
  providerEmailVerified = false
): Promise<UserWithSubscription> {
  // Check if account already exists
  const existingAccount = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM accounts
     WHERE provider = $1 AND provider_account_id = $2`,
    [provider, providerAccountId]
  );

  if (existingAccount) {
    // Update tokens if provided
    if (accessToken) {
      await execute(
        `UPDATE accounts
         SET access_token = $1, refresh_token = $2, expires_at = $3
         WHERE provider = $4 AND provider_account_id = $5`,
        [
          accessToken,
          refreshToken || null,
          expiresAt ? new Date(expiresAt * 1000) : null,
          provider,
          providerAccountId,
        ]
      );
    }

    const user = await findUserById(existingAccount.user_id);
    if (!user) {
      throw new Error('User not found for existing account');
    }
    return user;
  }

  // F31: from here on the email address alone decides which row this
  // Google account lands on, so the address has to be proven on both sides.
  // Google must assert it, or a new row would be marked verified on an
  // unproven claim.
  if (!providerEmailVerified) {
    throw new Error('OAuth provider did not verify the email address');
  }

  // Check if user exists with this email
  const user = await findUserByEmail(email);
  let userId: string;

  // F31 (account pre-hijacking): anyone can register a password account for
  // an address they do not own; it stays unverified. Linking Google to that
  // row would hand the real owner's account to whoever chose the password.
  // Refuse the link rather than adopt the row: the squatter may have used
  // the row before the verified-login gate shipped (API keys, 2FA secret,
  // uploads), and clearing just the password would leave those behind. The
  // owner recovers with "Forgot password" (which replaces the squatter's
  // password) and the emailed verification code; Google then links.
  if (user && !user.email_verified) {
    throw new Error('Refusing to link OAuth account to an unverified user');
  }

  if (!user) {
    // Create new user (OAuth users are verified by default)
    const newUser = await queryOne<{ id: string; email: string; name: string | null; created_at: Date }>(
      `INSERT INTO users (email, name, email_verified,
                          acquisition_source, acquisition_medium, acquisition_campaign, acquisition_landing, funnel)
       VALUES ($1, $2, TRUE, $3, $4, $5, $6, $7)
       RETURNING id, email, name, created_at`,
      [email.toLowerCase(), name || null, ...attributionParams(attribution)]
    );

    if (!newUser) {
      throw new Error('Failed to create user');
    }

    userId = newUser.id;

    // Create default subscription
    await execute(
      `INSERT INTO subscriptions (user_id, tier, status)
       VALUES ($1, 'free', 'active')`,
      [newUser.id]
    );
  } else {
    userId = user.id;
  }

  // Link OAuth account
  await execute(
    `INSERT INTO accounts (user_id, provider, provider_account_id, access_token, refresh_token, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (provider, provider_account_id) DO UPDATE
     SET access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         expires_at = EXCLUDED.expires_at`,
    [
      userId,
      provider,
      providerAccountId,
      accessToken || null,
      refreshToken || null,
      expiresAt ? new Date(expiresAt * 1000) : null,
    ]
  );

  const fullUser = await findUserById(userId);
  if (!fullUser) {
    throw new Error('Failed to retrieve user after OAuth link');
  }
  return fullUser;
}


/**
 * Check if email exists
 */
export async function emailExists(email: string): Promise<boolean> {
  const result = await queryOne<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) as exists`,
    [email.toLowerCase()]
  );
  return result?.exists || false;
}

/**
 * Verify user email with 6-digit code
 */
export async function verifyEmailCode(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string; user?: UserWithSubscription }> {
  // Find user with this email and check code
  const user = await queryOne<{
    id: string;
    verification_code: string | null;
    verification_code_expires: Date | null;
    email_verified: boolean;
  }>(
    `SELECT id, verification_code, verification_code_expires, email_verified
     FROM users
     WHERE email = $1`,
    [email.toLowerCase()]
  );

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (user.email_verified) {
    return { success: false, error: 'Email already verified' };
  }

  if (!user.verification_code) {
    return { success: false, error: 'No verification code found' };
  }

  // H-5: constant-time comparison prevents byte-by-byte timing leak.
  if (!constantTimeStringEqual(user.verification_code, code)) {
    return { success: false, error: 'Invalid verification code' };
  }

  if (user.verification_code_expires && new Date() > user.verification_code_expires) {
    return { success: false, error: 'Verification code expired' };
  }

  // Mark email as verified and clear code
  await execute(
    `UPDATE users
     SET email_verified = TRUE,
         verification_code = NULL,
         verification_code_expires = NULL
     WHERE id = $1`,
    [user.id]
  );

  const fullUser = await findUserById(user.id);
  return { success: true, user: fullUser || undefined };
}

/**
 * Resend verification code to user
 */
export async function updateVerificationCode(
  email: string,
  newCode: string
): Promise<{ success: boolean; error?: string }> {
  const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

  const result = await execute(
    `UPDATE users
     SET verification_code = $1,
         verification_code_expires = $2
     WHERE email = $3 AND email_verified = FALSE RETURNING id`,
    [newCode, verificationExpires, email.toLowerCase()]
  );

  if (result.rowCount === 0) {
    return { success: false, error: 'User not found or already verified' };
  }

  return { success: true };
}

/**
 * Check if user's email is verified
 */
export async function isEmailVerified(email: string): Promise<boolean> {
  const result = await queryOne<{ email_verified: boolean }>(
    `SELECT email_verified FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  return result?.email_verified ?? false;
}

/**
 * Create password reset token for a user
 */
export async function createPasswordResetToken(
  email: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  // Check if user exists
  const user = await findUserByEmail(email);
  if (!user) {
    // Return success anyway to prevent email enumeration
    return { success: true };
  }

  // Generate secure random token
  const crypto = await import('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await execute(
    `UPDATE users
     SET reset_token = $1, reset_token_expires = $2
     WHERE email = $3`,
    [token, expires, email.toLowerCase()]
  );

  return { success: true, token };
}

/**
 * Verify password reset token and return user.
 *
 * M-6: when the user lands on the reset page (the GET that calls this
 * function), shrink the token's expiry window to 10 minutes from now.
 * That gives a legitimate user enough time to type a new password but
 * makes the token useless to an attacker who intercepts it later in
 * email forwarding, referrer headers, or shared URL caches.
 *
 * This is "near-single-use" without requiring frontend changes. A truly
 * single-use design (rotate to a one-time follow-up token returned to
 * the browser) is tracked as a future improvement.
 *
 * SECURITY_AUDIT.md §M-6
 */
const RESET_TOKEN_VIEW_WINDOW_MIN = 10;

export async function verifyResetToken(
  token: string
): Promise<{ success: boolean; userId?: string; email?: string; error?: string }> {
  const user = await queryOne<{
    id: string;
    email: string;
    reset_token_expires: Date | null;
  }>(
    `SELECT id, email, reset_token_expires
     FROM users
     WHERE reset_token = $1`,
    [token]
  );

  if (!user) {
    return { success: false, error: 'Invalid or expired reset link' };
  }

  if (!user.reset_token_expires || new Date() > user.reset_token_expires) {
    return { success: false, error: 'Reset link has expired' };
  }

  // M-6: shrink the expiry window. Only shrinks (never extends) so
  // calling verifyResetToken multiple times can't keep the window open.
  await execute(
    `UPDATE users
     SET reset_token_expires = LEAST(
       reset_token_expires,
       now() + ($2 || ' minutes')::interval
     )
     WHERE id = $1`,
    [user.id, String(RESET_TOKEN_VIEW_WINDOW_MIN)]
  );

  return { success: true, userId: user.id, email: user.email };
}

/**
 * Reset user password with token
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  // Verify token first
  const verification = await verifyResetToken(token);
  if (!verification.success) {
    return { success: false, error: verification.error };
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Update password and clear reset token
  await execute(
    `UPDATE users
     SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL
     WHERE id = $2`,
    [passwordHash, verification.userId]
  );

  return { success: true };
}
