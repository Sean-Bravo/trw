import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getClientIdentifier } from '@/lib/rate-limit';
import { query } from '@/lib/db';
import { API_GATEWAY_URL } from '@/lib/lambda-client';


/**
 * POST /api/bank/process
 * Process an uploaded bank statement PDF
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user (allow anonymous for /upload landing page)
    const session = await getServerSession(authOptions);
    const identifier = getClientIdentifier(request);
    const userId = session?.user?.id || `anon-${identifier}`;

    // Parse request body
    const body = await request.json();
    const { jobId, s3Key, outputFormat, filename } = body;

    if (!jobId || !s3Key) {
      return NextResponse.json({ error: 'Missing jobId or s3Key' }, { status: 400 });
    }

    // Create bank job record in database (status: processing)
    // Skip for anonymous users — bank_jobs.user_id has FK to users(id)
    if (session?.user?.id) {
      try {
        await query(
          `INSERT INTO bank_jobs (id, user_id, filename, status, output_format)
           VALUES ($1, $2, $3, 'processing', $4)
           ON CONFLICT (id) DO NOTHING`,
          [jobId, session.user.id, filename || 'bank_statement.pdf', outputFormat || 'qbo']
        );
      } catch (dbError) {
        console.error('[Bank Process] DB insert error:', dbError);
      }
    }

    // Validate output format
    const validFormats = ['qbo', 'xero', 'excel'];
    if (outputFormat && !validFormats.includes(outputFormat)) {
      return NextResponse.json(
        { error: `Invalid output format. Valid: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    // Call AWS Lambda to process
    const lambdaResponse = await fetch(`${API_GATEWAY_URL}/bank/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        s3Key,
        outputFormat: outputFormat || 'qbo',
      }),
    });

    const data = await lambdaResponse.json();

    if (!lambdaResponse.ok) {
      console.error('[Bank Process] Lambda error:', data);

      // Update job status to failed (skip for anonymous users)
      if (session?.user?.id) {
        try {
          await query(
            `UPDATE bank_jobs SET status = 'failed', error = $1, completed_at = NOW() WHERE id = $2`,
            [data.error || 'Processing failed', jobId]
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
    if (session?.user?.id) {
      try {
        await query(
          `UPDATE bank_jobs
           SET status = 'completed',
               detected_bank = $1,
               transaction_count = $2,
               result_key = $3,
               completed_at = NOW()
           WHERE id = $4`,
          [
            data.detectedBank || null,
            data.transactionCount || null,
            data.resultKey || null,
            jobId
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
