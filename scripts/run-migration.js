const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('Error: NEON_DATABASE_URL or DATABASE_URL not set');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  console.log('Running migration: add-verification-columns');
  console.log('---');

  try {
    // Add email_verified column
    console.log('Adding email_verified column...');
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`;
    console.log('  ✓ email_verified added');

    // Add verification_code column
    console.log('Adding verification_code column...');
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6)`;
    console.log('  ✓ verification_code added');

    // Add verification_code_expires column
    console.log('Adding verification_code_expires column...');
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_expires TIMESTAMP WITH TIME ZONE`;
    console.log('  ✓ verification_code_expires added');

    // Create index for verification code lookups
    console.log('Creating verification code index...');
    await sql`CREATE INDEX IF NOT EXISTS idx_users_verification_code ON users(verification_code) WHERE verification_code IS NOT NULL`;
    console.log('  ✓ verification code index created');

    console.log('---');
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
