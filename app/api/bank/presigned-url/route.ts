import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';
import { API_GATEWAY_URL, internalGatewayHeaders } from '@/lib/lambda-client';
import { query } from '@/lib/db';
import { bankJobOwner, isJobId } from '../_lib/owner';


/**
 * POST /api/bank/presigned-url
 * Generate a presigned URL for bank statement PDF upload
 */
export async function POST(request: NextRequest) {
  const identifier = getClientIdentifier(request);
  const session = await getServerSession(authOptions);

  // M-15: anon callers get a much tighter limit (3/hour) than authed
  // users (10/hour) to deter proxy-rotated abuse of the free tier.
  const limiter = session?.user?.id ? rateLimiters.fileUpload : rateLimiters.fileUploadAnon;
  const rateLimit = await limiter.check(identifier);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Upload limit reached. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    // userId comes from session if available, else derived from request IP.
    const owner = bankJobOwner(session?.user?.id, identifier);
    const userId = owner.metadataUserId;

    // Parse request body
    const body = await request.json();
    const { filename } = body;

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid filename' }, { status: 400 });
    }

    // Validate file extension - PDF only
    if (!filename.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    // Call AWS Lambda
    const lambdaResponse = await fetch(`${API_GATEWAY_URL}/bank/presigned-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...internalGatewayHeaders() },
      body: JSON.stringify({
        filename,
        contentType: 'application/pdf',
        userId,
      }),
    });

    if (!lambdaResponse.ok) {
      const errorData = await lambdaResponse.json().catch(() => ({}));
      console.error('[Bank Presigned URL] Lambda error:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Failed to generate upload URL' },
        { status: lambdaResponse.status }
      );
    }

    const data = await lambdaResponse.json();

    // Issue #2: record the owner and exact key now, so /api/bank/process can
    // refuse a jobId or key the caller didn't get from us. No record, no URL.
    if (!isJobId(data.jobId) || typeof data.key !== 'string' || !data.key.startsWith(`bank/${data.jobId}/`)) {
      console.error('[Bank Presigned URL] Unexpected Lambda response shape');
      return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 502 });
    }
    await query(
      `INSERT INTO bank_job_uploads (job_id, user_id, anon_id_hash, s3_key)
       VALUES ($1, $2, $3, $4)`,
      [data.jobId, owner.userId, owner.anonIdHash, data.key]
    );

    console.log(`[Bank Presigned URL] Generated for user ${userId}, file ${filename}`);

    return NextResponse.json({
      uploadUrl: data.uploadUrl,
      jobId: data.jobId,
      key: data.key,
      expiresIn: data.expiresIn,
    });

  } catch (error) {
    console.error('[Bank Presigned URL] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
