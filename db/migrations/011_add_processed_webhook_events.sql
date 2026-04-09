-- Migration: Persistent Stripe webhook idempotency (M-1)
-- Created: 2026-04-09
--
-- The webhook handler previously stored processed event IDs in a
-- module-scope `Set<string>`. That breaks three ways:
--   1. Cold start wipes it (every new Vercel function instance starts empty)
--   2. Concurrent warm instances don't share state
--   3. The 10k cap silently evicts old entries
--
-- Stripe retries webhooks aggressively for 3 days. Without persistent
-- idempotency, a slow handler that returns after Vercel times out will
-- be retried — and the next attempt will not recognize the event as a
-- duplicate, leading to double-applied tier upgrades or duplicate
-- billing events.
--
-- INSERT ... ON CONFLICT DO NOTHING gives atomic check-and-set so two
-- concurrent handlers cannot both win.
--
-- See SECURITY_AUDIT.md §M-1 and RELIABILITY.md §2.1.

CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id            text PRIMARY KEY,
  event_type    text NOT NULL,
  processed_at  timestamptz NOT NULL DEFAULT now()
);

-- Index used by the cleanup job. Stripe only retries within 3 days,
-- so anything older than ~30 days can be safely deleted to keep the
-- table small.
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_processed_at
  ON processed_webhook_events (processed_at);
