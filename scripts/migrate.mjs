// scripts/migrate.mjs
// Applies pending db/migrations/*.sql in filename order and records them in schema_migrations.
// Version = leading digits of the filename ("019_add_foo.sql" -> "019").
// Uses @neondatabase/serverless (already a dependency) over Node's built-in WebSocket,
// so no new packages are needed. Requires Node 22+.
// Run: DATABASE_URL_UNPOOLED=... npm run migrate
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client, neonConfig } from "@neondatabase/serverless";

const DIR = join(process.cwd(), "db", "migrations");
const LOCK_ID = 7_301_026; // arbitrary, constant across runs

if (!globalThis.WebSocket) throw new Error("migrate: needs Node 22+ (global WebSocket)");
neonConfig.webSocketConstructor = globalThis.WebSocket;

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL_UNPOOLED not set");

  const files = readdirSync(DIR)
    .filter((f) => /^\d+.*\.sql$/.test(f))
    .sort();

  const seen = new Map();
  for (const f of files) {
    const v = f.match(/^(\d+)/)[1];
    if (seen.has(v)) throw new Error(`Duplicate version ${v}: ${seen.get(v)} and ${f}`);
    seen.set(v, f);
  }

  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    await db.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);

    const { rows } = await db.query("SELECT version FROM schema_migrations");
    const applied = new Set(rows.map((r) => r.version));
    const pending = [...seen].filter(([v]) => !applied.has(v));

    if (!pending.length) {
      console.log("migrate: up to date");
      return;
    }

    for (const [version, file] of pending) {
      const sql = readFileSync(join(DIR, file), "utf8");
      console.log(`migrate: applying ${file}`);
      await db.query("BEGIN");
      try {
        await db.query(sql);
        await db.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version]);
        await db.query("COMMIT");
      } catch (err) {
        await db.query("ROLLBACK");
        throw new Error(`migrate: ${file} failed: ${err.message}`);
      }
    }
    console.log(`migrate: applied ${pending.length}`);
  } finally {
    await db.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
    await db.end();
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
