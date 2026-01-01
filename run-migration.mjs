import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  await client.connect();
  console.log('Connected to database\n');

  const sqlPath = '/Users/sean/Desktop/TaxReadyWallet/backend/lambda/migration.sql';
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Split by semicolon but keep the statements together
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    try {
      const result = await client.query(stmt);
      if (result.rows && result.rows.length > 0) {
        console.log('    Result:', JSON.stringify(result.rows, null, 2));
      }
      console.log('    ✓ Success\n');
    } catch (error) {
      // Handle "already exists" errors gracefully
      if (error.message.includes('already exists') || error.code === '42P07') {
        console.log('    ⏭ Already exists, skipping\n');
      } else {
        console.error(`    ✗ Error: ${error.message}\n`);
      }
    }
  }

  console.log('Migration complete!');
}

runMigration()
  .catch(console.error)
  .finally(() => client.end());
