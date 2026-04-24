// H-14: previously this script hardcoded an absolute path that pointed
// at a project directory ("TaxReadyWallet") that no longer exists, AND
// imported `pg` which isn't a project dependency. Any CI job or recovery
// script that depended on it would fail silently.
//
// Now:
//   - Reads the SQL file from the first CLI arg or MIGRATION_SQL_PATH
//   - Uses @neondatabase/serverless (the project's actual DB driver)
//   - Refuses to run with no path (no silent default)
//
// Usage (run from the project root):
//   node scripts/run-migration.mjs db/migrations/010_add_auth_columns.sql
//
// SECURITY_AUDIT.md §H-14
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  const cliArg = process.argv[2];
  const envPath = process.env.MIGRATION_SQL_PATH;
  const sqlPath = cliArg
    ? path.resolve(cliArg)
    : envPath
      ? path.resolve(envPath)
      : null;

  if (!sqlPath) {
    console.error(
      'Usage: node scripts/run-migration.mjs <path/to/migration.sql>\n' +
      '   or: MIGRATION_SQL_PATH=path/to/migration.sql node scripts/run-migration.mjs',
    );
    process.exit(1);
  }
  if (!fs.existsSync(sqlPath)) {
    console.error(`Migration file not found: ${sqlPath}`);
    process.exit(1);
  }

  const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('NEON_DATABASE_URL or DATABASE_URL must be set.');
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  console.log(`Connected to database\nMigration: ${sqlPath}\n`);

  const sqlText = fs.readFileSync(sqlPath, 'utf8');

  // Split by semicolon but keep the statements together
  const statements = sqlText
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    try {
      const rows = await sql(stmt);
      if (Array.isArray(rows) && rows.length > 0) {
        console.log('    Result:', JSON.stringify(rows, null, 2));
      }
      console.log('    ✓ Success\n');
    } catch (error) {
      // Handle "already exists" errors gracefully
      if (error.message?.includes('already exists') || error.code === '42P07') {
        console.log('    ⏭ Already exists, skipping\n');
      } else {
        console.error(`    ✗ Error: ${error.message}\n`);
        process.exitCode = 1;
      }
    }
  }

  console.log('Migration complete!');
}

runMigration().catch((err) => {
  console.error(err);
  process.exit(1);
});
