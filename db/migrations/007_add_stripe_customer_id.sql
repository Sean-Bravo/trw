-- Add stripe_customer_id to users table for efficient customer portal lookups
-- instead of searching by email via Stripe API
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
