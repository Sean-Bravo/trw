import { execute, queryOne, query, DbUser, DbAccount, DbSubscription } from './db';
import bcrypt from 'bcryptjs';

// User response type (without password_hash)
export interface UserWithSubscription {
  id: string;
  email: string;
  name: string | null;
  subscriptionTier: 'free' | 'pro' | 'premium';
  stripeCustomerId: string | null;
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
    created_at: Date;
    tier: 'free' | 'pro' | 'premium' | null;
    stripe_customer_id: string | null;
  }>(
    `SELECT u.id, u.email, u.name, u.created_at,
            s.tier, s.stripe_customer_id
     FROM users u
     LEFT JOIN subscriptions s ON s.user_id = u.id
     WHERE u.email = $1`,
    [email.toLowerCase()]
  );

  if (!result) return null;

  return {
    id: result.id,
    email: result.email,
    name: result.name,
    subscriptionTier: result.tier || 'free',
    stripeCustomerId: result.stripe_customer_id,
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
    created_at: Date;
    tier: 'free' | 'pro' | 'premium' | null;
    stripe_customer_id: string | null;
  }>(
    `SELECT u.id, u.email, u.name, u.created_at,
            s.tier, s.stripe_customer_id
     FROM users u
     LEFT JOIN subscriptions s ON s.user_id = u.id
     WHERE u.id = $1`,
    [id]
  );

  if (!result) return null;

  return {
    id: result.id,
    email: result.email,
    name: result.name,
    subscriptionTier: result.tier || 'free',
    stripeCustomerId: result.stripe_customer_id,
    createdAt: result.created_at,
  };
}

/**
 * Create a new user with email/password
 */
export async function createUser(
  email: string,
  password: string,
  name?: string
): Promise<UserWithSubscription> {
  const passwordHash = await bcrypt.hash(password, 12);

  // Insert user
  const user = await queryOne<{ id: string; email: string; name: string | null; created_at: Date }>(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, created_at`,
    [email.toLowerCase(), passwordHash, name || null]
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
    subscriptionTier: 'free',
    stripeCustomerId: null,
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

  if (!user) {
    // Create new user
    const newUser = await queryOne<{ id: string; email: string; name: string | null; created_at: Date }>(
      `INSERT INTO users (email, name)
       VALUES ($1, $2)
       RETURNING id, email, name, created_at`,
      [email.toLowerCase(), name || null]
    );

    if (!newUser) {
      throw new Error('Failed to create user');
    }

    // Create default subscription
    await execute(
      `INSERT INTO subscriptions (user_id, tier, status)
       VALUES ($1, 'free', 'active')`,
      [newUser.id]
    );

    user = { ...newUser, password_hash: null };
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
      user.id,
      provider,
      providerAccountId,
      accessToken || null,
      refreshToken || null,
      expiresAt ? new Date(expiresAt * 1000) : null,
    ]
  );

  const fullUser = await findUserById(user.id);
  if (!fullUser) {
    throw new Error('Failed to retrieve user after OAuth link');
  }
  return fullUser;
}

/**
 * Update user subscription from Stripe webhook
 */
export async function updateSubscription(
  userId: string,
  tier: 'free' | 'pro' | 'premium',
  status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused',
  stripeCustomerId?: string,
  stripeSubscriptionId?: string,
  currentPeriodEnd?: Date
): Promise<void> {
  await execute(
    `INSERT INTO subscriptions (user_id, tier, status, stripe_customer_id, stripe_subscription_id, current_period_end)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE
     SET tier = EXCLUDED.tier,
         status = EXCLUDED.status,
         stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, subscriptions.stripe_customer_id),
         stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, subscriptions.stripe_subscription_id),
         current_period_end = COALESCE(EXCLUDED.current_period_end, subscriptions.current_period_end)`,
    [
      userId,
      tier,
      status || 'active',
      stripeCustomerId || null,
      stripeSubscriptionId || null,
      currentPeriodEnd || null,
    ]
  );
}

/**
 * Find user by Stripe customer ID
 */
export async function findUserByStripeCustomerId(
  stripeCustomerId: string
): Promise<UserWithSubscription | null> {
  const result = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM subscriptions WHERE stripe_customer_id = $1`,
    [stripeCustomerId]
  );

  if (!result) return null;

  return findUserById(result.user_id);
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
