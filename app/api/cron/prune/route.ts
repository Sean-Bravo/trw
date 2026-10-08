import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { RETENTION_DAYS } from '@/lib/retention';

/**
 * Retention policy: everything a user sends us is deleted within 30 days.
 * S3 lifecycle rules handle files; this daily cron handles the Neon rows the
 * Lambdas and webhooks write. Invoked by Vercel Cron (see vercel.json) with
 * `Authorization: Bearer $CRON_SECRET`.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// [table, timestamp column] — names are constants, never user input.
const RETAINED_TABLES: Array<[string, string]> = [
  ['transactions', 'created_at'],
  ['api_requests', 'created_at'],
  ['processed_webhook_events', 'processed_at'],
];

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const deleted: Record<string, number> = {};
  for (const [table, column] of RETAINED_TABLES) {
    const row = await queryOne<{ n: number }>(
      `WITH d AS (DELETE FROM ${table} WHERE ${column} < now() - interval '${RETENTION_DAYS} days' RETURNING 1) SELECT count(*)::int AS n FROM d`,
      []
    );
    deleted[table] = row?.n ?? 0;
  }

  return NextResponse.json({ ok: true, retention_days: RETENTION_DAYS, deleted });
}
