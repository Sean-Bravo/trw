const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('Error: NEON_DATABASE_URL or DATABASE_URL not set');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  console.log('Running migration: add-2fa-email-columns');
  console.log('---');

  try {
    // Add two_factor_login_code column
    console.log('Adding two_factor_login_code column...');
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_login_code VARCHAR(6)`;
    console.log('  ✓ two_factor_login_code added');

    // Add two_factor_login_code_expires column
    console.log('Adding two_factor_login_code_expires column...');
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_login_code_expires TIMESTAMP WITH TIME ZONE`;
    console.log('  ✓ two_factor_login_code_expires added');

    // Create index for 2FA login code lookups
    console.log('Creating 2FA login code index...');
    await sql`CREATE INDEX IF NOT EXISTS idx_users_two_factor_login_code ON users(two_factor_login_code) WHERE two_factor_login_code IS NOT NULL`;
    console.log('  ✓ 2FA login code index created');

    console.log('---');
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
