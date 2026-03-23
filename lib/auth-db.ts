import { execute, queryOne, query, DbUser, DbAccount, DbSubscription } from './db';
import bcrypt from 'bcryptjs';

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
  return queryOne<DbUser>(
    `SELECT id, email, password_hash, name, created_at
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
 * Create a new user with email/password and verification code
 */
export async function createUser(
  email: string,
  password: string,
  name?: string,
  verificationCode?: string
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
    `INSERT INTO users (email, password_hash, name, email_verified, verification_code, verification_code_expires)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, name, email_verified, created_at`,
    [
      email.toLowerCase(),
      passwordHash,
      name || null,
      false,
      verificationCode || null,
      verificationExpires,
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
export async function verifyPassword(
  email: string,
  password: string
): Promise<UserWithSubscription | null> {
  const user = await findUserByEmail(email);

  if (!user || !user.password_hash) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    return null;
  }

  return findUserById(user.id);
}

/**
 * Find or create OAuth user
 */
export async function findOrCreateOAuthUser(
  provider: string,
  providerAccountId: string,
  email: string,
  name?: string,
  accessToken?: string,
  refreshToken?: string,
  expiresAt?: number
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

  // Check if user exists with this email
  let user = await findUserByEmail(email);
  let userId: string;

  if (!user) {
    // Create new user (OAuth users are verified by default)
    const newUser = await queryOne<{ id: string; email: string; name: string | null; created_at: Date }>(
      `INSERT INTO users (email, name, email_verified)
       VALUES ($1, $2, TRUE)
       RETURNING id, email, name, created_at`,
      [email.toLowerCase(), name || null]
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

  if (user.verification_code !== code) {
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
     WHERE email = $3 AND email_verified = FALSE`,
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
 * Verify password reset token and return user
 */
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
