-- Migration: Create exchange_configs table
-- Database: Neon PostgreSQL
-- Description: Stores fingerprint-to-exchange mappings for CSV format detection caching

-- Create the exchange_configs table
CREATE TABLE IF NOT EXISTS exchange_configs (
    id SERIAL PRIMARY KEY,
    fingerprint VARCHAR(64) NOT NULL UNIQUE,
    exchange_name VARCHAR(100) NOT NULL,
    mapping_config JSONB NOT NULL DEFAULT '{}',
    usage_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on fingerprint for fast lookups
CREATE INDEX IF NOT EXISTS idx_exchange_configs_fingerprint
    ON exchange_configs(fingerprint);

-- Create index on usage_count for analytics queries
CREATE INDEX IF NOT EXISTS idx_exchange_configs_usage_count
    ON exchange_configs(usage_count DESC);

-- Create index on exchange_name for filtering
CREATE INDEX IF NOT EXISTS idx_exchange_configs_exchange_name
    ON exchange_configs(exchange_name);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_exchange_configs_updated_at ON exchange_configs;
CREATE TRIGGER update_exchange_configs_updated_at
    BEFORE UPDATE ON exchange_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE exchange_configs IS 'Stores cached CSV fingerprint-to-exchange mappings for fast format detection';
COMMENT ON COLUMN exchange_configs.fingerprint IS 'MD5 hash of normalized CSV headers';
COMMENT ON COLUMN exchange_configs.exchange_name IS 'Detected exchange name (e.g., Coinbase, Binance)';
COMMENT ON COLUMN exchange_configs.mapping_config IS 'JSON column mapping configuration';
COMMENT ON COLUMN exchange_configs.usage_count IS 'Number of times this format has been processed';
