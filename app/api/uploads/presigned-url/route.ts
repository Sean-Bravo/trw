import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';
import { API_GATEWAY_URL } from '@/lib/lambda-client';

// Custom domain doesn't need /prod prefix - it's mapped directly

/**
 * POST /api/uploads/presigned-url
 * Proxies to AWS Lambda to generate a presigned URL for S3 upload
 */
export async function POST(request: NextRequest) {
  const identifier = getClientIdentifier(request);
  const session = await getServerSession(authOptions);

  // M-15: anon callers get a much tighter limit (3/hour) than authed
  // users (10/hour). SECURITY_AUDIT.md §M-15
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
    const userId = session?.user?.id || `anon-${identifier}`;

    // 2. Parse request body
    const body = await request.json();
    const { filename, fileSize } = body;

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid filename' },
        { status: 400 }
      );
    }

    if (!fileSize || typeof fileSize !== 'number' || fileSize <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid file size' },
        { status: 400 }
      );
    }

    // 3. Validate file extension
    if (!filename.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are supported' },
        { status: 400 }
      );
    }

    // 4. Call AWS Lambda via API Gateway
    // Route: POST /presigned-url (see backend/handlers/webhook.py)
    const lambdaResponse = await fetch(`${API_GATEWAY_URL}/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename,
        contentType: 'text/csv',
        userId,
      }),
    });

    if (!lambdaResponse.ok) {
      const errorData = await lambdaResponse.json().catch(() => ({}));
      console.error('[Presigned URL] Lambda error:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Failed to generate upload URL' },
        { status: lambdaResponse.status }
      );
    }

    const data = await lambdaResponse.json();

    console.log(`[Presigned URL] Generated for user ${userId}, file ${filename}`);

    // 5. Return presigned URL (transform to match frontend expectations)
    // Lambda returns: { uploadUrl, jobId, key, expiresIn }
    return NextResponse.json({
      presignedPost: {
        url: data.uploadUrl,
        fields: {}, // S3 PUT URL doesn't need fields
      },
      uploadId: data.key, // S3 key as uploadId
      jobId: data.jobId,
      maxSize: fileSize,
      s3Key: data.key,
    });

  } catch (error) {
    console.error('[Presigned URL] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
