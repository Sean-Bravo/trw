import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getClientIdentifier } from '@/lib/rate-limit';
import { query, queryOne } from '@/lib/db';
import { API_GATEWAY_URL, internalGatewayHeaders } from '@/lib/lambda-client';
import { bankJobOwner, isJobId } from '../_lib/owner';


/**
 * POST /api/bank/process
 * Process an uploaded bank statement PDF
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user (allow anonymous for /upload landing page)
    const session = await getServerSession(authOptions);
    const identifier = getClientIdentifier(request);
    const owner = bankJobOwner(session?.user?.id, identifier);
    const userId = owner.metadataUserId;

    // Parse request body. Any client-sent s3Key is ignored (issue #2): the
    // key comes from the record /api/bank/presigned-url wrote for this job.
    const body = await request.json();
    const { jobId, outputFormat, filename } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }
    if (!isJobId(jobId)) {
      return NextResponse.json({ error: 'Invalid jobId' }, { status: 400 });
    }

    // Validate output format
    const validFormats = ['qbo', 'xero', 'excel'];
    if (outputFormat && !validFormats.includes(outputFormat)) {
      return NextResponse.json(
        { error: `Invalid output format. Valid: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    // Only the caller who presigned this job may process it. Unknown jobs get
    // the same 403 as someone else's, like the other bank job routes.
    const upload = await queryOne<{ user_id: string | null; anon_id_hash: string | null; s3_key: string }>(
      'SELECT user_id, anon_id_hash, s3_key FROM bank_job_uploads WHERE job_id = $1',
      [jobId],
    );
    const isOwner = !!upload && (owner.userId
      ? upload.user_id === owner.userId
      : upload.user_id === null && upload.anon_id_hash === owner.anonIdHash);
    if (!upload || !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create bank job record in database (status: processing)
    // Skip for anonymous users — bank_jobs.user_id has FK to users(id)
    if (owner.userId) {
      try {
        await query(
          `INSERT INTO bank_jobs (id, user_id, filename, status, output_format)
           VALUES ($1, $2, $3, 'processing', $4)
           ON CONFLICT (id) DO NOTHING`,
          [jobId, owner.userId, filename || 'bank_statement.pdf', outputFormat || 'qbo']
        );
      } catch (dbError) {
        console.error('[Bank Process] DB insert error:', dbError);
      }
    }

    // Call AWS Lambda to process. userId is the S3 object's user-id metadata
    // set at presign time; the Lambda refuses the job if they differ.
    const lambdaResponse = await fetch(`${API_GATEWAY_URL}/bank/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...internalGatewayHeaders() },
      body: JSON.stringify({
        jobId,
        s3Key: upload.s3_key,
        userId,
        outputFormat: outputFormat || 'qbo',
      }),
    });

    const data = await lambdaResponse.json();

    if (!lambdaResponse.ok) {
      console.error('[Bank Process] Lambda error:', data);

      // Update job status to failed (skip for anonymous users)
      if (owner.userId) {
        try {
          await query(
            `UPDATE bank_jobs SET status = 'failed', error = $1, completed_at = NOW()
             WHERE id = $2 AND user_id = $3`,
            [data.error || 'Processing failed', jobId, owner.userId]
          );
        } catch (dbError) {
          console.error('[Bank Process] DB update error:', dbError);
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: data.error || 'Processing failed',
          warnings: data.warnings || [],
        },
        { status: lambdaResponse.status }
      );
    }

    // Update job status to completed with metadata (skip for anonymous users)
    if (owner.userId) {
      try {
        await query(
          `UPDATE bank_jobs
           SET status = 'completed',
               detected_bank = $1,
               transaction_count = $2,
               result_key = $3,
               config_version = $4,
               completed_at = NOW()
           WHERE id = $5 AND user_id = $6`,
          [
            data.detectedBank || null,
            data.transactionCount || null,
            data.resultKey || null,
            data.configVersion || null,
            jobId,
            owner.userId,
          ]
        );
      } catch (dbError) {
        console.error('[Bank Process] DB update error:', dbError);
      }
    }

    console.log(`[Bank Process] Job ${jobId} processed successfully for user ${userId}`);

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Bank Process] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
